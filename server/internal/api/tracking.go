package api

import (
	"net/url"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/mims/ad-manager/internal/models"
	"github.com/mims/ad-manager/internal/storage"
)

// TrackingHandler handles tracking events
type TrackingHandler struct {
	store *storage.PostgresStore
}

// NewTrackingHandler creates a new TrackingHandler
func NewTrackingHandler(store *storage.PostgresStore) *TrackingHandler {
	return &TrackingHandler{store: store}
}

// TrackImpression records an impression event
func (h *TrackingHandler) TrackImpression(c *fiber.Ctx) error {
	impressionID := c.Query("id")
	lineItemID, _ := strconv.Atoi(c.Query("li"))
	creativeID, _ := strconv.Atoi(c.Query("c"))
	userID := c.Query("u")
	platform := c.Query("p")
	country := c.Query("co")
	adUnit := c.Query("au")

	if impressionID == "" || lineItemID == 0 {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	event := &models.Event{
		EventType:    models.EventTypeImpression,
		ImpressionID: impressionID,
		LineItemID:   lineItemID,
		CreativeID:   creativeID,
		UserID:       userID,
		Platform:     platform,
		Country:      country,
		AdUnit:       adUnit,
	}

	if err := h.store.RecordEvent(c.Context(), event); err != nil {
		// Log error but don't fail - tracking should be fire and forget
		// In production, you'd queue this for retry
	}

	// Return 1x1 transparent pixel
	return h.sendPixel(c)
}

// TrackViewable records a viewable impression event
func (h *TrackingHandler) TrackViewable(c *fiber.Ctx) error {
	impressionID := c.Query("id")
	lineItemID, _ := strconv.Atoi(c.Query("li"))
	creativeID, _ := strconv.Atoi(c.Query("c"))
	userID := c.Query("u")

	if impressionID == "" || lineItemID == 0 {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	event := &models.Event{
		EventType:    models.EventTypeViewable,
		ImpressionID: impressionID,
		LineItemID:   lineItemID,
		CreativeID:   creativeID,
		UserID:       userID,
	}

	if err := h.store.RecordEvent(c.Context(), event); err != nil {
		// Log error but don't fail
	}

	// Return 1x1 transparent pixel
	return h.sendPixel(c)
}

// TrackClick records a click event and redirects to destination
func (h *TrackingHandler) TrackClick(c *fiber.Ctx) error {
	impressionID := c.Query("id")
	lineItemID, _ := strconv.Atoi(c.Query("li"))
	creativeID, _ := strconv.Atoi(c.Query("c"))
	userID := c.Query("u")
	redirectURL := c.Query("url")

	if impressionID == "" || lineItemID == 0 {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	event := &models.Event{
		EventType:    models.EventTypeClick,
		ImpressionID: impressionID,
		LineItemID:   lineItemID,
		CreativeID:   creativeID,
		UserID:       userID,
	}

	if err := h.store.RecordEvent(c.Context(), event); err != nil {
		// Log error but don't fail
	}

	// Redirect to destination URL
	if redirectURL != "" {
		// Decode URL if needed
		decodedURL, err := url.QueryUnescape(redirectURL)
		if err != nil {
			decodedURL = redirectURL
		}
		return c.Redirect(decodedURL, fiber.StatusFound)
	}

	return c.SendStatus(fiber.StatusOK)
}

// sendPixel sends a 1x1 transparent GIF
func (h *TrackingHandler) sendPixel(c *fiber.Ctx) error {
	// 1x1 transparent GIF
	pixel := []byte{
		0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
		0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
		0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
		0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
		0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
		0x01, 0x00, 0x3b,
	}

	c.Set("Content-Type", "image/gif")
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	return c.Send(pixel)
}
