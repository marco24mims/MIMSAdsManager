package api

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/mims/ad-manager/internal/storage"
)

// ReportsHandler handles reporting API requests
type ReportsHandler struct {
	store *storage.PostgresStore
}

// NewReportsHandler creates a new ReportsHandler
func NewReportsHandler(store *storage.PostgresStore) *ReportsHandler {
	return &ReportsHandler{store: store}
}

// GetSummary returns overall stats
func (h *ReportsHandler) GetSummary(c *fiber.Ctx) error {
	// Parse date range (default to last 7 days)
	startDate, endDate := h.parseDateRange(c)

	summary, err := h.store.GetReportSummary(c.Context(), startDate, endDate)
	if err != nil {
		return NewInternalError("Failed to get summary report")
	}

	return c.JSON(fiber.Map{
		"summary":    summary,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}

// GetDailyReport returns daily stats
func (h *ReportsHandler) GetDailyReport(c *fiber.Ctx) error {
	startDate, endDate := h.parseDateRange(c)

	daily, err := h.store.GetDailyReport(c.Context(), startDate, endDate)
	if err != nil {
		return NewInternalError("Failed to get daily report")
	}

	if daily == nil {
		daily = []storage.DailyStats{}
	}

	return c.JSON(fiber.Map{
		"daily":      daily,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}

// GetCampaignReport returns stats for a specific campaign
func (h *ReportsHandler) GetCampaignReport(c *fiber.Ctx) error {
	campaignID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return NewBadRequest("Invalid campaign ID")
	}

	startDate, endDate := h.parseDateRange(c)

	report, err := h.store.GetCampaignReport(c.Context(), campaignID, startDate, endDate)
	if err != nil {
		return NewInternalError("Failed to get campaign report")
	}
	if report == nil {
		return NewNotFound("Campaign not found")
	}

	return c.JSON(fiber.Map{
		"campaign":   report,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}

// parseDateRange extracts start and end dates from query params
func (h *ReportsHandler) parseDateRange(c *fiber.Ctx) (time.Time, time.Time) {
	now := time.Now()
	endDate := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	startDate := endDate.AddDate(0, 0, -7)

	if start := c.Query("start_date"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			startDate = parsed
		}
	}

	if end := c.Query("end_date"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endDate = parsed.AddDate(0, 0, 1) // Include the end date
		}
	}

	return startDate, endDate
}
