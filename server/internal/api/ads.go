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
		// Match line items based on targeting and ad unit
		matched := h.matcher.Match(req.Targeting, lineItems, slot.Width, slot.Height)

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

		// Select line item using weighted random among same priority
		selectedLineItem := selectWeightedRandom(eligible)
		if selectedLineItem == nil {
			continue
		}

		// Select creative
		selectedCreative := h.matcher.SelectCreative(*selectedLineItem, slot.Width, slot.Height)
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
		tracking := models.Tracking{
			Impression: fmt.Sprintf("%s/imp?id=%s&li=%d&c=%d&u=%s&p=%s&co=%s&sec=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, req.Platform, req.Country, section),
			Viewable: fmt.Sprintf("%s/view?id=%s&li=%d&c=%d&u=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID),
			Click: fmt.Sprintf("%s/click?id=%s&li=%d&c=%d&u=%s&url=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, selectedCreative.ClickURL),
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
