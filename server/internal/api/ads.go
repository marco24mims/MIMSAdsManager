package api

import (
	"fmt"
	"sort"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/mims/ad-manager/internal/frequency"
	"github.com/mims/ad-manager/internal/models"
	"github.com/mims/ad-manager/internal/storage"
	"github.com/mims/ad-manager/internal/targeting"
)

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
		// Match line items based on targeting
		matched := h.matcher.Match(req.Targeting, lineItems, slot.Width, slot.Height)

		// Sort by priority (highest first)
		sort.Slice(matched, func(i, j int) bool {
			return matched[i].Priority > matched[j].Priority
		})

		// Find first line item that passes frequency cap
		var selectedLineItem *models.LineItem
		var selectedCreative *models.Creative

		for _, li := range matched {
			// Check frequency cap
			if !h.freqCap.Check(li.ID, userID, li.FrequencyCap) {
				continue
			}

			// Select creative
			creative := h.matcher.SelectCreative(li, slot.Width, slot.Height)
			if creative == nil {
				continue
			}

			selectedLineItem = &li
			selectedCreative = creative
			break
		}

		if selectedLineItem == nil || selectedCreative == nil {
			// No matching ad for this slot
			continue
		}

		// Generate impression ID
		impressionID := uuid.New().String()

		// Increment frequency cap counter
		h.freqCap.Increment(selectedLineItem.ID, userID)

		// Build tracking URLs
		trackingBase := fmt.Sprintf("%s/v1", serverURL)
		tracking := models.Tracking{
			Impression: fmt.Sprintf("%s/imp?id=%s&li=%d&c=%d&u=%s&p=%s&co=%s",
				trackingBase, impressionID, selectedLineItem.ID, selectedCreative.ID, userID, req.Platform, req.Country),
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
