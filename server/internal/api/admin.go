package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/mims/ad-manager/internal/models"
	"github.com/mims/ad-manager/internal/storage"
)

// AdminHandler handles admin API requests
type AdminHandler struct {
	store *storage.PostgresStore
	cache *storage.InMemoryCache
}

// NewAdminHandler creates a new AdminHandler
func NewAdminHandler(store *storage.PostgresStore, cache *storage.InMemoryCache) *AdminHandler {
	return &AdminHandler{store: store, cache: cache}
}

// Campaign handlers

// ListCampaigns returns all campaigns
func (h *AdminHandler) ListCampaigns(c *fiber.Ctx) error {
	campaigns, err := h.store.ListCampaigns(c.Context())
	if err != nil {
		return NewInternalError("Failed to list campaigns")
	}
	if campaigns == nil {
		campaigns = []models.Campaign{}
	}
	return c.JSON(campaigns)
}

// GetCampaign returns a specific campaign
func (h *AdminHandler) GetCampaign(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid campaign ID")
	}

	campaign, err := h.store.GetCampaign(c.Context(), id)
	if err != nil {
		return NewInternalError("Failed to get campaign")
	}
	if campaign == nil {
		return NewNotFound("Campaign not found")
	}

	return c.JSON(campaign)
}

// CreateCampaign creates a new campaign
func (h *AdminHandler) CreateCampaign(c *fiber.Ctx) error {
	var req models.CreateCampaignRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if req.Name == "" {
		return NewBadRequest("Name is required")
	}

	campaign, err := h.store.CreateCampaign(c.Context(), &req)
	if err != nil {
		return NewInternalError("Failed to create campaign")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.Status(fiber.StatusCreated).JSON(campaign)
}

// UpdateCampaign updates a campaign
func (h *AdminHandler) UpdateCampaign(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid campaign ID")
	}

	var req models.UpdateCampaignRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	campaign, err := h.store.UpdateCampaign(c.Context(), id, &req)
	if err != nil {
		return NewInternalError("Failed to update campaign")
	}
	if campaign == nil {
		return NewNotFound("Campaign not found")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.JSON(campaign)
}

// DeleteCampaign deletes a campaign
func (h *AdminHandler) DeleteCampaign(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid campaign ID")
	}

	if err := h.store.DeleteCampaign(c.Context(), id); err != nil {
		return NewInternalError("Failed to delete campaign")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.SendStatus(fiber.StatusNoContent)
}

// Line Item handlers

// ListLineItems returns line items for a campaign
func (h *AdminHandler) ListLineItems(c *fiber.Ctx) error {
	campaignID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid campaign ID")
	}

	items, err := h.store.ListLineItems(c.Context(), campaignID)
	if err != nil {
		return NewInternalError("Failed to list line items")
	}
	if items == nil {
		items = []models.LineItem{}
	}
	return c.JSON(items)
}

// GetLineItem returns a specific line item
func (h *AdminHandler) GetLineItem(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	item, err := h.store.GetLineItem(c.Context(), id)
	if err != nil {
		return NewInternalError("Failed to get line item")
	}
	if item == nil {
		return NewNotFound("Line item not found")
	}

	// Load targeting rules
	rules, err := h.store.GetTargetingRules(c.Context(), id)
	if err == nil {
		item.TargetingRules = rules
	}

	// Load creatives
	creatives, err := h.store.ListCreatives(c.Context(), id)
	if err == nil {
		item.Creatives = creatives
	}

	return c.JSON(item)
}

// CreateLineItem creates a new line item
func (h *AdminHandler) CreateLineItem(c *fiber.Ctx) error {
	var req models.CreateLineItemRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if req.Name == "" {
		return NewBadRequest("Name is required")
	}
	if req.CampaignID == 0 {
		return NewBadRequest("Campaign ID is required")
	}

	item, err := h.store.CreateLineItem(c.Context(), &req)
	if err != nil {
		return NewInternalError("Failed to create line item")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.Status(fiber.StatusCreated).JSON(item)
}

// UpdateLineItem updates a line item
func (h *AdminHandler) UpdateLineItem(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	var req models.UpdateLineItemRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	item, err := h.store.UpdateLineItem(c.Context(), id, &req)
	if err != nil {
		return NewInternalError("Failed to update line item")
	}
	if item == nil {
		return NewNotFound("Line item not found")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.JSON(item)
}

// DeleteLineItem deletes a line item
func (h *AdminHandler) DeleteLineItem(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	if err := h.store.DeleteLineItem(c.Context(), id); err != nil {
		return NewInternalError("Failed to delete line item")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.SendStatus(fiber.StatusNoContent)
}

// Targeting Rules handlers

// GetTargetingRules returns targeting rules for a line item
func (h *AdminHandler) GetTargetingRules(c *fiber.Ctx) error {
	lineItemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	rules, err := h.store.GetTargetingRules(c.Context(), lineItemID)
	if err != nil {
		return NewInternalError("Failed to get targeting rules")
	}
	if rules == nil {
		rules = []models.TargetingRule{}
	}
	return c.JSON(rules)
}

// SetTargetingRules sets targeting rules for a line item
func (h *AdminHandler) SetTargetingRules(c *fiber.Ctx) error {
	lineItemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	var req models.SetTargetingRulesRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if err := h.store.SetTargetingRules(c.Context(), lineItemID, req.Rules); err != nil {
		return NewInternalError("Failed to set targeting rules")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	// Return updated rules
	rules, err := h.store.GetTargetingRules(c.Context(), lineItemID)
	if err != nil {
		return NewInternalError("Failed to get targeting rules")
	}

	return c.JSON(rules)
}

// Creative handlers

// ListCreatives returns creatives for a line item
func (h *AdminHandler) ListCreatives(c *fiber.Ctx) error {
	lineItemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	creatives, err := h.store.ListCreatives(c.Context(), lineItemID)
	if err != nil {
		return NewInternalError("Failed to list creatives")
	}
	if creatives == nil {
		creatives = []models.Creative{}
	}
	return c.JSON(creatives)
}

// GetCreative returns a specific creative
func (h *AdminHandler) GetCreative(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid creative ID")
	}

	creative, err := h.store.GetCreative(c.Context(), id)
	if err != nil {
		return NewInternalError("Failed to get creative")
	}
	if creative == nil {
		return NewNotFound("Creative not found")
	}

	return c.JSON(creative)
}

// CreateCreative creates a new creative
func (h *AdminHandler) CreateCreative(c *fiber.Ctx) error {
	var req models.CreateCreativeRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if req.LineItemID == 0 {
		return NewBadRequest("Line item ID is required")
	}
	if req.Width == 0 || req.Height == 0 {
		return NewBadRequest("Width and height are required")
	}
	if req.ImageURL == "" {
		return NewBadRequest("Image URL is required")
	}
	if req.ClickURL == "" {
		return NewBadRequest("Click URL is required")
	}

	creative, err := h.store.CreateCreative(c.Context(), &req)
	if err != nil {
		return NewInternalError("Failed to create creative")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.Status(fiber.StatusCreated).JSON(creative)
}

// UpdateCreative updates a creative
func (h *AdminHandler) UpdateCreative(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid creative ID")
	}

	var req models.UpdateCreativeRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	creative, err := h.store.UpdateCreative(c.Context(), id, &req)
	if err != nil {
		return NewInternalError("Failed to update creative")
	}
	if creative == nil {
		return NewNotFound("Creative not found")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.JSON(creative)
}

// DeleteCreative deletes a creative
func (h *AdminHandler) DeleteCreative(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid creative ID")
	}

	if err := h.store.DeleteCreative(c.Context(), id); err != nil {
		return NewInternalError("Failed to delete creative")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.SendStatus(fiber.StatusNoContent)
}

// Ad Unit handlers

// ListAdUnits returns all ad units
func (h *AdminHandler) ListAdUnits(c *fiber.Ctx) error {
	units, err := h.store.ListAdUnits(c.Context())
	if err != nil {
		return NewInternalError("Failed to list ad units")
	}
	if units == nil {
		units = []models.AdUnit{}
	}
	return c.JSON(units)
}

// GetAdUnit returns a specific ad unit
func (h *AdminHandler) GetAdUnit(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid ad unit ID")
	}

	unit, err := h.store.GetAdUnit(c.Context(), id)
	if err != nil {
		return NewInternalError("Failed to get ad unit")
	}
	if unit == nil {
		return NewNotFound("Ad unit not found")
	}

	return c.JSON(unit)
}

// CreateAdUnit creates a new ad unit
func (h *AdminHandler) CreateAdUnit(c *fiber.Ctx) error {
	var req models.CreateAdUnitRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if req.Code == "" {
		return NewBadRequest("Code is required")
	}
	if req.Name == "" {
		return NewBadRequest("Name is required")
	}

	unit, err := h.store.CreateAdUnit(c.Context(), &req)
	if err != nil {
		return NewInternalError("Failed to create ad unit")
	}

	return c.Status(fiber.StatusCreated).JSON(unit)
}

// UpdateAdUnit updates an ad unit
func (h *AdminHandler) UpdateAdUnit(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid ad unit ID")
	}

	var req models.UpdateAdUnitRequest
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	unit, err := h.store.UpdateAdUnit(c.Context(), id, &req)
	if err != nil {
		return NewInternalError("Failed to update ad unit")
	}
	if unit == nil {
		return NewNotFound("Ad unit not found")
	}

	return c.JSON(unit)
}

// DeleteAdUnit deletes an ad unit
func (h *AdminHandler) DeleteAdUnit(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid ad unit ID")
	}

	if err := h.store.DeleteAdUnit(c.Context(), id); err != nil {
		return NewInternalError("Failed to delete ad unit")
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetLineItemAdUnits returns ad units for a line item
func (h *AdminHandler) GetLineItemAdUnits(c *fiber.Ctx) error {
	lineItemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	ids, err := h.store.GetLineItemAdUnits(c.Context(), lineItemID)
	if err != nil {
		return NewInternalError("Failed to get line item ad units")
	}
	if ids == nil {
		ids = []int{}
	}

	return c.JSON(fiber.Map{"ad_unit_ids": ids})
}

// SetLineItemAdUnits sets ad units for a line item
func (h *AdminHandler) SetLineItemAdUnits(c *fiber.Ctx) error {
	lineItemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid line item ID")
	}

	var req struct {
		AdUnitIDs []int `json:"ad_unit_ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return NewBadRequest("Invalid request body")
	}

	if err := h.store.SetLineItemAdUnits(c.Context(), lineItemID, req.AdUnitIDs); err != nil {
		return NewInternalError("Failed to set line item ad units")
	}

	// Refresh cache
	h.cache.Refresh(c.Context(), h.store)

	return c.JSON(fiber.Map{"ad_unit_ids": req.AdUnitIDs})
}
