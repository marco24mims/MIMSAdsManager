package api

import (
	"fmt"
	"math/rand"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/mims/ad-manager/internal/frequency"
	"github.com/mims/ad-manager/internal/models"
	"github.com/mims/ad-manager/internal/storage"
	"github.com/mims/ad-manager/internal/targeting"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// AdsHandler handles ad serving requests
type AdsHandler struct {
	store     *storage.PostgresStore
	cache     *storage.InMemoryCache
	freqCap   *frequency.Capper
	matcher   *targeting.Matcher
	serverURL string
}

// NewAdsHandler creates a new AdsHandler
func NewAdsHandler(store *storage.PostgresStore, cache *storage.InMemoryCache, freqCap *frequency.Capper) *AdsHandler {
	return &AdsHandler{
		store:     store,
		cache:     cache,
		freqCap:   freqCap,
		matcher:   targeting.NewMatcher(),
		serverURL: "",
	}
}

// GetAds handles ad requests
func (h *AdsHandler) GetAds(c *fiber.Ctx) error {
	var req models.AdRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if len(req.Slots) == 0 {
		return NewBadRequest("At least one slot is required")
	}

	// Get user ID (from request or generate one)
	userID := req.UserID
	if userID == "" {
		// In a real implementation, this would come from a cookie
		userID = c.Get("X-User-ID", uuid.New().String())
	}

	// Get all active line items from cache
	lineItems := h.cache.GetActiveLineItems()

	// Build server URL for tracking
	protocol := "http"
	if c.Protocol() == "https" {
		protocol = "https"
	}
	host := c.Hostname()
	serverURL := fmt.Sprintf("%s://%s", protocol, host)

	var results []models.AdResult

	// Process each slot
	for _, slot := range req.Slots {
		isResponsive := slot.Width == 0 && slot.Height == 0 && slot.MaxWidth > 0

		// Look up ad unit sizes for responsive filtering
		var adUnitSizes [][]int
		if isResponsive && slot.AdUnit != "" {
			if adUnit := h.cache.GetAdUnitByCode(slot.AdUnit); adUnit != nil {
				adUnitSizes = adUnit.Sizes
			}
		}

		// Match line items based on targeting and ad unit
		var matched []models.LineItem
		if isResponsive {
			matched = h.matcher.MatchResponsive(req.Targeting, lineItems, slot.MaxWidth, adUnitSizes)
		} else {
			matched = h.matcher.Match(req.Targeting, lineItems, slot.Width, slot.Height)
		}

		// Filter by ad unit if provided
		if slot.AdUnit != "" {
			matched = h.filterByAdUnit(matched, slot.AdUnit)
		}

		// Sort by priority (highest first)
		sort.Slice(matched, func(i, j int) bool {
			return matched[i].Priority > matched[j].Priority
		})

		// Filter by frequency cap
		var eligible []models.LineItem
		for _, li := range matched {
			if h.freqCap.Check(li.ID, userID, li.FrequencyCap) {
				eligible = append(eligible, li)
			}
		}

		if len(eligible) == 0 {
			continue
		}

		// Select line item using SOV-aware selection among same priority
		selectedLineItem := selectWithSOV(eligible)
		if selectedLineItem == nil {
			continue
		}

		// Select creative
		var selectedCreative *models.Creative
		if isResponsive {
			selectedCreative = h.matcher.SelectCreativeResponsive(*selectedLineItem, slot.MaxWidth, adUnitSizes)
		} else {
			selectedCreative = h.matcher.SelectCreative(*selectedLineItem, slot.Width, slot.Height)
		}
		if selectedCreative == nil {
			continue
		}


		// Generate impression ID
		impressionID := uuid.New().String()

		// Increment frequency cap counter
		h.freqCap.Increment(selectedLineItem.ID, userID)

		// Build tracking URLs with key-value data
		trackingBase := fmt.Sprintf("%s/v1", serverURL)
		section := req.Targeting["section"]
		country := req.Country
		if country == "" || country == "unknown" {
			if tc, ok := req.Targeting["country"]; ok && tc != "" {
				country = tc
			}
		}
		platform := req.Platform
		if platform == "" || platform == "unknown" {
			if tp, ok := req.Targeting["platform"]; ok && tp != "" {
				platform = tp
			}
		}
		adUnit := slot.AdUnit
		tracking := models.Tracking{
			Impression: fmt.Sprintf("%s/imp?id=%s&li=%d&c=%d&u=%s&p=%s&co=%s&sec=%s&au=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, platform, country, section, adUnit),
			Viewable: fmt.Sprintf("%s/view?id=%s&li=%d&c=%d&u=%s&p=%s&co=%s&sec=%s&au=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, platform, country, section, adUnit),
			Click: fmt.Sprintf("%s/click?id=%s&li=%d&c=%d&u=%s&p=%s&co=%s&sec=%s&au=%s&url=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, platform, country, section, adUnit, selectedCreative.ClickURL),
		}

		result := models.AdResult{
			SlotID:       slot.ID,
			ImpressionID: impressionID,
			LineItemID:   selectedLineItem.ID,
			CreativeID:   selectedCreative.ID,
			Width:        selectedCreative.Width,
			Height:       selectedCreative.Height,
			ImageURL:     selectedCreative.ImageURL,
			ClickURL:     tracking.Click,
			TrackingURLs: tracking,
		}

		results = append(results, result)
	}

	return c.JSON(models.AdResponse{Ads: results})
}

// selectWeightedRandom selects a line item using weighted random selection
// among items with the highest priority
func selectWeightedRandom(lineItems []models.LineItem) *models.LineItem {
	if len(lineItems) == 0 {
		return nil
	}

	// Get the highest priority
	highestPriority := lineItems[0].Priority

	// Filter to only highest priority items
	var samePriority []models.LineItem
	for _, li := range lineItems {
		if li.Priority == highestPriority {
			samePriority = append(samePriority, li)
		} else {
			break // Already sorted by priority desc
		}
	}

	if len(samePriority) == 1 {
		return &samePriority[0]
	}

	// Calculate total weight
	totalWeight := 0
	for _, li := range samePriority {
		weight := li.Weight
		if weight <= 0 {
			weight = 100 // Default weight
		}
		totalWeight += weight
	}

	// Random selection based on weight
	r := rand.Intn(totalWeight)
	cumulative := 0
	for i := range samePriority {
		weight := samePriority[i].Weight
		if weight <= 0 {
			weight = 100
		}
		cumulative += weight
		if r < cumulative {
			return &samePriority[i]
		}
	}

	return &samePriority[0]
}

// selectWithSOV selects a line item using SOV-aware selection.
// Items with SOVPercentage > 0 get their exact share of impressions.
// Items with SOVPercentage == 0 fill the remaining inventory by weight.
// If total SOV < 100 and no weight-based items exist, the gap returns nil (no ad).
func selectWithSOV(lineItems []models.LineItem) *models.LineItem {
	if len(lineItems) == 0 {
		return nil
	}

	// Get the highest priority
	highestPriority := lineItems[0].Priority

	// Filter to only highest priority items
	var samePriority []models.LineItem
	for _, li := range lineItems {
		if li.Priority == highestPriority {
			samePriority = append(samePriority, li)
		} else {
			break // Already sorted by priority desc
		}
	}

	// Separate SOV and non-SOV items
	var sovItems []models.LineItem
	var nonSOVItems []models.LineItem
	for _, li := range samePriority {
		if li.SOVPercentage > 0 {
			sovItems = append(sovItems, li)
		} else {
			nonSOVItems = append(nonSOVItems, li)
		}
	}

	// If no SOV items, use standard weighted random (always fills)
	if len(sovItems) == 0 {
		return selectWeightedRandom(samePriority)
	}

	// Calculate total SOV (cap at 100)
	totalSOV := 0
	for _, li := range sovItems {
		totalSOV += li.SOVPercentage
	}
	if totalSOV > 100 {
		totalSOV = 100
	}

	// Roll random 0-99
	roll := rand.Intn(100)

	if roll < totalSOV {
		// Pick from SOV items proportional to their SOV percentages
		cumulative := 0
		for i := range sovItems {
			cumulative += sovItems[i].SOVPercentage
			if cumulative > 100 {
				cumulative = 100
			}
			if roll < cumulative {
				return &sovItems[i]
			}
		}
		return &sovItems[0]
	}

	// Roll >= totalSOV: fill with non-SOV items or return nil
	if len(nonSOVItems) > 0 {
		return selectWeightedRandom(nonSOVItems)
	}

	// No non-SOV items to fill the gap — intentionally return no ad
	return nil
}

// filterByAdUnit filters line items by ad unit code
func (h *AdsHandler) filterByAdUnit(lineItems []models.LineItem, adUnitCode string) []models.LineItem {
	// Look up ad unit ID by code from cache
	adUnit := h.cache.GetAdUnitByCode(adUnitCode)
	if adUnit == nil {
		// Ad unit not found, return all items (no filtering)
		return lineItems
	}

	var filtered []models.LineItem
	for _, li := range lineItems {
		// If line item has no ad unit restrictions, it can serve everywhere
		if len(li.AdUnitIDs) == 0 {
			filtered = append(filtered, li)
			continue
		}

		// Check if this ad unit is in the line item's allowed ad units
		for _, allowedID := range li.AdUnitIDs {
			if allowedID == adUnit.ID {
				filtered = append(filtered, li)
				break
			}
		}
	}

	return filtered
}
