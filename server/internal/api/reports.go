package api

import (
	"fmt"
	"strconv"
	"strings"
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
	adUnit := c.Query("ad_unit", "")

	summary, err := h.store.GetReportSummary(c.Context(), startDate, endDate, adUnit)
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
	adUnit := c.Query("ad_unit", "")

	daily, err := h.store.GetDailyReport(c.Context(), startDate, endDate, adUnit)
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

// GetKeyValueReport returns stats grouped by a key
func (h *ReportsHandler) GetKeyValueReport(c *fiber.Ctx) error {
	key := c.Query("key", "country")
	startDate, endDate := h.parseDateRange(c)
	adUnit := c.Query("ad_unit", "")

	stats, err := h.store.GetKeyValueReport(c.Context(), key, startDate, endDate, adUnit)
	if err != nil {
		return NewInternalError("Failed to get key-value report")
	}

	if stats == nil {
		stats = []storage.KeyValueStats{}
	}

	return c.JSON(fiber.Map{
		"key":        key,
		"data":       stats,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.AddDate(0, 0, -1).Format("2006-01-02"),
	})
}

// GetLineItemReport returns stats grouped by line item
func (h *ReportsHandler) GetLineItemReport(c *fiber.Ctx) error {
	startDate, endDate := h.parseDateRange(c)
	adUnit := c.Query("ad_unit", "")
	creativeSize := c.Query("creative_size", "")

	stats, err := h.store.GetLineItemReport(c.Context(), startDate, endDate, adUnit, creativeSize)
	if err != nil {
		return NewInternalError("Failed to get line item report")
	}

	if stats == nil {
		stats = []storage.LineItemStats{}
	}

	return c.JSON(fiber.Map{
		"data":       stats,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.AddDate(0, 0, -1).Format("2006-01-02"),
	})
}

// GetCreativeSizes returns distinct creative sizes
func (h *ReportsHandler) GetCreativeSizes(c *fiber.Ctx) error {
	sizes, err := h.store.GetCreativeSizes(c.Context())
	if err != nil {
		return NewInternalError("Failed to get creative sizes")
	}

	if sizes == nil {
		sizes = []storage.CreativeSize{}
	}

	return c.JSON(sizes)
}

// ExportReport exports report data as CSV
func (h *ReportsHandler) ExportReport(c *fiber.Ctx) error {
	startDate, endDate := h.parseDateRange(c)
	groupBy := c.Query("group_by", "daily")
	format := c.Query("format", "csv")

	data, err := h.store.GetExportData(c.Context(), startDate, endDate, groupBy)
	if err != nil {
		return NewInternalError("Failed to get export data")
	}

	if format == "json" {
		return c.JSON(fiber.Map{
			"data":       data,
			"start_date": startDate.Format("2006-01-02"),
			"end_date":   endDate.AddDate(0, 0, -1).Format("2006-01-02"),
		})
	}

	// Generate CSV
	var csv strings.Builder
	csv.WriteString("Date,Campaign,Line Item,Country,Section,Platform,Impressions,Clicks,Viewable,CTR\n")

	for _, row := range data {
		csv.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s,%s,%d,%d,%d,%.2f%%\n",
			row.Date,
			escapeCsv(row.CampaignName),
			escapeCsv(row.LineItemName),
			row.Country,
			row.Section,
			row.Platform,
			row.Impressions,
			row.Clicks,
			row.Viewable,
			row.CTR,
		))
	}

	filename := fmt.Sprintf("report_%s_to_%s.csv",
		startDate.Format("2006-01-02"),
		endDate.AddDate(0, 0, -1).Format("2006-01-02"))

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	return c.SendString(csv.String())
}

// escapeCsv escapes a string for CSV
func escapeCsv(s string) string {
	if strings.Contains(s, ",") || strings.Contains(s, "\"") || strings.Contains(s, "\n") {
		return "\"" + strings.ReplaceAll(s, "\"", "\"\"") + "\""
	}
	return s
}
