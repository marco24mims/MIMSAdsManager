package storage

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mims/ad-manager/internal/models"
)

// PostgresStore handles database operations
type PostgresStore struct {
	pool *pgxpool.Pool
}

// NewPostgresStore creates a new PostgresStore
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

// Campaign operations

// ListCampaigns returns all campaigns
func (s *PostgresStore) ListCampaigns(ctx context.Context) ([]models.Campaign, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, status, created_at, updated_at
		FROM campaigns
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var campaigns []models.Campaign
	for rows.Next() {
		var c models.Campaign
		if err := rows.Scan(&c.ID, &c.Name, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

// GetCampaign returns a campaign by ID
func (s *PostgresStore) GetCampaign(ctx context.Context, id int) (*models.Campaign, error) {
	var c models.Campaign
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, status, created_at, updated_at
		FROM campaigns WHERE id = $1
	`, id).Scan(&c.ID, &c.Name, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// CreateCampaign creates a new campaign
func (s *PostgresStore) CreateCampaign(ctx context.Context, req *models.CreateCampaignRequest) (*models.Campaign, error) {
	status := req.Status
	if status == "" {
		status = "active"
	}

	var c models.Campaign
	err := s.pool.QueryRow(ctx, `
		INSERT INTO campaigns (name, status, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		RETURNING id, name, status, created_at, updated_at
	`, req.Name, status).Scan(&c.ID, &c.Name, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpdateCampaign updates an existing campaign
func (s *PostgresStore) UpdateCampaign(ctx context.Context, id int, req *models.UpdateCampaignRequest) (*models.Campaign, error) {
	var c models.Campaign
	err := s.pool.QueryRow(ctx, `
		UPDATE campaigns
		SET name = COALESCE(NULLIF($2, ''), name),
		    status = COALESCE(NULLIF($3, ''), status),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, status, created_at, updated_at
	`, id, req.Name, req.Status).Scan(&c.ID, &c.Name, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// DeleteCampaign deletes a campaign
func (s *PostgresStore) DeleteCampaign(ctx context.Context, id int) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM campaigns WHERE id = $1`, id)
	return err
}

// Ad Unit operations

// ListAdUnits returns all ad units
func (s *PostgresStore) ListAdUnits(ctx context.Context) ([]models.AdUnit, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, code, name, description, platform, sizes, status, created_at, updated_at
		FROM ad_units
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []models.AdUnit
	for rows.Next() {
		var u models.AdUnit
		var sizesJSON []byte
		if err := rows.Scan(&u.ID, &u.Code, &u.Name, &u.Description, &u.Platform, &sizesJSON, &u.Status, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(sizesJSON, &u.Sizes)
		units = append(units, u)
	}
	return units, nil
}

// GetAdUnit returns an ad unit by ID
func (s *PostgresStore) GetAdUnit(ctx context.Context, id int) (*models.AdUnit, error) {
	var u models.AdUnit
	var sizesJSON []byte
	err := s.pool.QueryRow(ctx, `
		SELECT id, code, name, description, platform, sizes, status, created_at, updated_at
		FROM ad_units WHERE id = $1
	`, id).Scan(&u.ID, &u.Code, &u.Name, &u.Description, &u.Platform, &sizesJSON, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(sizesJSON, &u.Sizes)
	return &u, nil
}

// GetAdUnitByCode returns an ad unit by code
func (s *PostgresStore) GetAdUnitByCode(ctx context.Context, code string) (*models.AdUnit, error) {
	var u models.AdUnit
	var sizesJSON []byte
	err := s.pool.QueryRow(ctx, `
		SELECT id, code, name, description, platform, sizes, status, created_at, updated_at
		FROM ad_units WHERE code = $1
	`, code).Scan(&u.ID, &u.Code, &u.Name, &u.Description, &u.Platform, &sizesJSON, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(sizesJSON, &u.Sizes)
	return &u, nil
}

// CreateAdUnit creates a new ad unit
func (s *PostgresStore) CreateAdUnit(ctx context.Context, req *models.CreateAdUnitRequest) (*models.AdUnit, error) {
	sizesJSON, _ := json.Marshal(req.Sizes)
	platform := req.Platform
	if platform == "" {
		platform = "web"
	}
	var u models.AdUnit
	var sizesOut []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO ad_units (code, name, description, platform, sizes, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
		RETURNING id, code, name, description, platform, sizes, status, created_at, updated_at
	`, req.Code, req.Name, req.Description, platform, sizesJSON).Scan(
		&u.ID, &u.Code, &u.Name, &u.Description, &u.Platform, &sizesOut, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(sizesOut, &u.Sizes)
	return &u, nil
}

// UpdateAdUnit updates an ad unit
func (s *PostgresStore) UpdateAdUnit(ctx context.Context, id int, req *models.UpdateAdUnitRequest) (*models.AdUnit, error) {
	sizesJSON, _ := json.Marshal(req.Sizes)
	var u models.AdUnit
	var sizesOut []byte
	err := s.pool.QueryRow(ctx, `
		UPDATE ad_units
		SET code = COALESCE(NULLIF($2, ''), code),
		    name = COALESCE(NULLIF($3, ''), name),
		    description = COALESCE($4, description),
		    platform = COALESCE(NULLIF($5, ''), platform),
		    sizes = COALESCE($6, sizes),
		    status = COALESCE(NULLIF($7, ''), status),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, code, name, description, platform, sizes, status, created_at, updated_at
	`, id, req.Code, req.Name, req.Description, req.Platform, sizesJSON, req.Status).Scan(
		&u.ID, &u.Code, &u.Name, &u.Description, &u.Platform, &sizesOut, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(sizesOut, &u.Sizes)
	return &u, nil
}

// DeleteAdUnit deletes an ad unit
func (s *PostgresStore) DeleteAdUnit(ctx context.Context, id int) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM ad_units WHERE id = $1`, id)
	return err
}

// GetLineItemAdUnits returns ad unit IDs for a line item
func (s *PostgresStore) GetLineItemAdUnits(ctx context.Context, lineItemID int) ([]int, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ad_unit_id FROM line_item_ad_units WHERE line_item_id = $1
	`, lineItemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// SetLineItemAdUnits sets ad unit targeting for a line item
func (s *PostgresStore) SetLineItemAdUnits(ctx context.Context, lineItemID int, adUnitIDs []int) error {
	// Delete existing
	_, err := s.pool.Exec(ctx, `DELETE FROM line_item_ad_units WHERE line_item_id = $1`, lineItemID)
	if err != nil {
		return err
	}

	// Insert new
	for _, adUnitID := range adUnitIDs {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO line_item_ad_units (line_item_id, ad_unit_id) VALUES ($1, $2)
		`, lineItemID, adUnitID)
		if err != nil {
			return err
		}
	}
	return nil
}

// Line Item operations

// ListLineItems returns line items for a campaign
func (s *PostgresStore) ListLineItems(ctx context.Context, campaignID int) ([]models.LineItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, campaign_id, name, priority, weight, frequency_cap, frequency_cap_period, status, created_at, updated_at
		FROM line_items
		WHERE campaign_id = $1
		ORDER BY priority DESC, created_at DESC
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.LineItem
	for rows.Next() {
		var li models.LineItem
		if err := rows.Scan(&li.ID, &li.CampaignID, &li.Name, &li.Priority, &li.Weight, &li.FrequencyCap, &li.FrequencyCapPeriod, &li.Status, &li.CreatedAt, &li.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, li)
	}
	return items, nil
}

// GetLineItem returns a line item by ID
func (s *PostgresStore) GetLineItem(ctx context.Context, id int) (*models.LineItem, error) {
	var li models.LineItem
	err := s.pool.QueryRow(ctx, `
		SELECT id, campaign_id, name, priority, weight, frequency_cap, frequency_cap_period, status, created_at, updated_at
		FROM line_items WHERE id = $1
	`, id).Scan(&li.ID, &li.CampaignID, &li.Name, &li.Priority, &li.Weight, &li.FrequencyCap, &li.FrequencyCapPeriod, &li.Status, &li.CreatedAt, &li.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &li, nil
}

// CreateLineItem creates a new line item
func (s *PostgresStore) CreateLineItem(ctx context.Context, req *models.CreateLineItemRequest) (*models.LineItem, error) {
	status := req.Status
	if status == "" {
		status = "active"
	}
	priority := req.Priority
	if priority == 0 {
		priority = 5
	}
	period := req.FrequencyCapPeriod
	if period == "" {
		period = "day"
	}

	var li models.LineItem
	err := s.pool.QueryRow(ctx, `
		INSERT INTO line_items (campaign_id, name, priority, weight, frequency_cap, frequency_cap_period, status, created_at, updated_at)
		VALUES ($1, $2, $3, 100, $4, $5, $6, NOW(), NOW())
		RETURNING id, campaign_id, name, priority, weight, frequency_cap, frequency_cap_period, status, created_at, updated_at
	`, req.CampaignID, req.Name, priority, req.FrequencyCap, period, status).Scan(
		&li.ID, &li.CampaignID, &li.Name, &li.Priority, &li.Weight, &li.FrequencyCap, &li.FrequencyCapPeriod, &li.Status, &li.CreatedAt, &li.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &li, nil
}

// UpdateLineItem updates an existing line item
func (s *PostgresStore) UpdateLineItem(ctx context.Context, id int, req *models.UpdateLineItemRequest) (*models.LineItem, error) {
	var li models.LineItem
	err := s.pool.QueryRow(ctx, `
		UPDATE line_items
		SET name = COALESCE(NULLIF($2, ''), name),
		    priority = CASE WHEN $3 > 0 THEN $3 ELSE priority END,
		    frequency_cap = CASE WHEN $4 >= 0 THEN $4 ELSE frequency_cap END,
		    frequency_cap_period = COALESCE(NULLIF($5, ''), frequency_cap_period),
		    status = COALESCE(NULLIF($6, ''), status),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, campaign_id, name, priority, weight, frequency_cap, frequency_cap_period, status, created_at, updated_at
	`, id, req.Name, req.Priority, req.FrequencyCap, req.FrequencyCapPeriod, req.Status).Scan(
		&li.ID, &li.CampaignID, &li.Name, &li.Priority, &li.Weight, &li.FrequencyCap, &li.FrequencyCapPeriod, &li.Status, &li.CreatedAt, &li.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &li, nil
}

// DeleteLineItem deletes a line item
func (s *PostgresStore) DeleteLineItem(ctx context.Context, id int) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM line_items WHERE id = $1`, id)
	return err
}

// Targeting Rules operations

// GetTargetingRules returns targeting rules for a line item
func (s *PostgresStore) GetTargetingRules(ctx context.Context, lineItemID int) ([]models.TargetingRule, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, line_item_id, key, operator, values
		FROM targeting_rules
		WHERE line_item_id = $1
	`, lineItemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []models.TargetingRule
	for rows.Next() {
		var tr models.TargetingRule
		var valuesJSON []byte
		if err := rows.Scan(&tr.ID, &tr.LineItemID, &tr.Key, &tr.Operator, &valuesJSON); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(valuesJSON, &tr.Values); err != nil {
			return nil, err
		}
		rules = append(rules, tr)
	}
	return rules, nil
}

// SetTargetingRules replaces targeting rules for a line item
func (s *PostgresStore) SetTargetingRules(ctx context.Context, lineItemID int, rules []models.TargetingRuleInput) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete existing rules
	_, err = tx.Exec(ctx, `DELETE FROM targeting_rules WHERE line_item_id = $1`, lineItemID)
	if err != nil {
		return err
	}

	// Insert new rules
	for _, rule := range rules {
		valuesJSON, err := json.Marshal(rule.Values)
		if err != nil {
			return err
		}
		operator := rule.Operator
		if operator == "" {
			operator = "IN"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO targeting_rules (line_item_id, key, operator, values)
			VALUES ($1, $2, $3, $4)
		`, lineItemID, rule.Key, operator, valuesJSON)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// Creative operations

// ListCreatives returns creatives for a line item
func (s *PostgresStore) ListCreatives(ctx context.Context, lineItemID int) ([]models.Creative, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, line_item_id, name, width, height, image_url, click_url, status, created_at, updated_at
		FROM creatives
		WHERE line_item_id = $1
		ORDER BY created_at DESC
	`, lineItemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creatives []models.Creative
	for rows.Next() {
		var c models.Creative
		if err := rows.Scan(&c.ID, &c.LineItemID, &c.Name, &c.Width, &c.Height, &c.ImageURL, &c.ClickURL, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		creatives = append(creatives, c)
	}
	return creatives, nil
}

// GetCreative returns a creative by ID
func (s *PostgresStore) GetCreative(ctx context.Context, id int) (*models.Creative, error) {
	var c models.Creative
	err := s.pool.QueryRow(ctx, `
		SELECT id, line_item_id, name, width, height, image_url, click_url, status, created_at, updated_at
		FROM creatives WHERE id = $1
	`, id).Scan(&c.ID, &c.LineItemID, &c.Name, &c.Width, &c.Height, &c.ImageURL, &c.ClickURL, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// CreateCreative creates a new creative
func (s *PostgresStore) CreateCreative(ctx context.Context, req *models.CreateCreativeRequest) (*models.Creative, error) {
	status := req.Status
	if status == "" {
		status = "active"
	}

	var c models.Creative
	err := s.pool.QueryRow(ctx, `
		INSERT INTO creatives (line_item_id, name, width, height, image_url, click_url, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, line_item_id, name, width, height, image_url, click_url, status, created_at, updated_at
	`, req.LineItemID, req.Name, req.Width, req.Height, req.ImageURL, req.ClickURL, status).Scan(
		&c.ID, &c.LineItemID, &c.Name, &c.Width, &c.Height, &c.ImageURL, &c.ClickURL, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpdateCreative updates an existing creative
func (s *PostgresStore) UpdateCreative(ctx context.Context, id int, req *models.UpdateCreativeRequest) (*models.Creative, error) {
	var c models.Creative
	err := s.pool.QueryRow(ctx, `
		UPDATE creatives
		SET name = COALESCE(NULLIF($2, ''), name),
		    width = CASE WHEN $3 > 0 THEN $3 ELSE width END,
		    height = CASE WHEN $4 > 0 THEN $4 ELSE height END,
		    image_url = COALESCE(NULLIF($5, ''), image_url),
		    click_url = COALESCE(NULLIF($6, ''), click_url),
		    status = COALESCE(NULLIF($7, ''), status),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, line_item_id, name, width, height, image_url, click_url, status, created_at, updated_at
	`, id, req.Name, req.Width, req.Height, req.ImageURL, req.ClickURL, req.Status).Scan(
		&c.ID, &c.LineItemID, &c.Name, &c.Width, &c.Height, &c.ImageURL, &c.ClickURL, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// DeleteCreative deletes a creative
func (s *PostgresStore) DeleteCreative(ctx context.Context, id int) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM creatives WHERE id = $1`, id)
	return err
}

// Event operations

// RecordEvent records a tracking event
func (s *PostgresStore) RecordEvent(ctx context.Context, event *models.Event) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO events (event_type, impression_id, line_item_id, creative_id, user_id, country, platform, ad_unit, section, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
	`, event.EventType, event.ImpressionID, event.LineItemID, event.CreativeID, event.UserID, event.Country, event.Platform, event.AdUnit, event.Section)
	return err
}

// GetActiveLineItemsWithCreatives returns all active line items with their targeting rules and creatives
func (s *PostgresStore) GetActiveLineItemsWithCreatives(ctx context.Context) ([]models.LineItem, error) {
	// Get active line items
	rows, err := s.pool.Query(ctx, `
		SELECT li.id, li.campaign_id, li.name, li.priority, li.weight, li.frequency_cap, li.frequency_cap_period, li.status, li.created_at, li.updated_at
		FROM line_items li
		JOIN campaigns c ON li.campaign_id = c.id
		WHERE li.status = 'active' AND c.status = 'active'
		ORDER BY li.priority DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.LineItem
	for rows.Next() {
		var li models.LineItem
		if err := rows.Scan(&li.ID, &li.CampaignID, &li.Name, &li.Priority, &li.Weight, &li.FrequencyCap, &li.FrequencyCapPeriod, &li.Status, &li.CreatedAt, &li.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, li)
	}

	// Get targeting rules, creatives, and ad unit IDs for each line item
	for i := range items {
		rules, err := s.GetTargetingRules(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].TargetingRules = rules

		creatives, err := s.ListCreatives(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].Creatives = creatives

		// Get ad unit IDs
		adUnitRows, err := s.pool.Query(ctx, `
			SELECT ad_unit_id FROM line_item_ad_units WHERE line_item_id = $1
		`, items[i].ID)
		if err != nil {
			return nil, err
		}
		for adUnitRows.Next() {
			var adUnitID int
			if err := adUnitRows.Scan(&adUnitID); err != nil {
				adUnitRows.Close()
				return nil, err
			}
			items[i].AdUnitIDs = append(items[i].AdUnitIDs, adUnitID)
		}
		adUnitRows.Close()
	}

	return items, nil
}

// Report structures
type ReportSummary struct {
	TotalImpressions int     `json:"total_impressions"`
	TotalClicks      int     `json:"total_clicks"`
	TotalViewable    int     `json:"total_viewable"`
	CTR              float64 `json:"ctr"`
	ViewabilityRate  float64 `json:"viewability_rate"`
}

type DailyStats struct {
	Date        string `json:"date"`
	Impressions int    `json:"impressions"`
	Clicks      int    `json:"clicks"`
	Viewable    int    `json:"viewable"`
}

type CampaignReport struct {
	CampaignID   int     `json:"campaign_id"`
	CampaignName string  `json:"campaign_name"`
	Impressions  int     `json:"impressions"`
	Clicks       int     `json:"clicks"`
	Viewable     int     `json:"viewable"`
	CTR          float64 `json:"ctr"`
}

// GetReportSummary returns overall stats
func (s *PostgresStore) GetReportSummary(ctx context.Context, startDate, endDate time.Time) (*ReportSummary, error) {
	var summary ReportSummary

	err := s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM events
		WHERE created_at >= $1 AND created_at < $2
	`, startDate, endDate).Scan(&summary.TotalImpressions, &summary.TotalClicks, &summary.TotalViewable)
	if err != nil {
		return nil, err
	}

	if summary.TotalImpressions > 0 {
		summary.CTR = float64(summary.TotalClicks) / float64(summary.TotalImpressions) * 100
		summary.ViewabilityRate = float64(summary.TotalViewable) / float64(summary.TotalImpressions) * 100
	}

	return &summary, nil
}

// GetDailyReport returns daily stats
func (s *PostgresStore) GetDailyReport(ctx context.Context, startDate, endDate time.Time) ([]DailyStats, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			DATE(created_at) as date,
			COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM events
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY DATE(created_at)
		ORDER BY date DESC
	`, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []DailyStats
	for rows.Next() {
		var s DailyStats
		var date time.Time
		if err := rows.Scan(&date, &s.Impressions, &s.Clicks, &s.Viewable); err != nil {
			return nil, err
		}
		s.Date = date.Format("2006-01-02")
		stats = append(stats, s)
	}
	return stats, nil
}

// GetCampaignReport returns stats for a specific campaign
func (s *PostgresStore) GetCampaignReport(ctx context.Context, campaignID int, startDate, endDate time.Time) (*CampaignReport, error) {
	var report CampaignReport
	report.CampaignID = campaignID

	// Get campaign name
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	if campaign == nil {
		return nil, nil
	}
	report.CampaignName = campaign.Name

	err = s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN e.event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM events e
		JOIN line_items li ON e.line_item_id = li.id
		WHERE li.campaign_id = $1 AND e.created_at >= $2 AND e.created_at < $3
	`, campaignID, startDate, endDate).Scan(&report.Impressions, &report.Clicks, &report.Viewable)
	if err != nil {
		return nil, err
	}

	if report.Impressions > 0 {
		report.CTR = float64(report.Clicks) / float64(report.Impressions) * 100
	}

	return &report, nil
}

// KeyValueStats represents stats for a key-value combination
type KeyValueStats struct {
	Key         string  `json:"key"`
	Value       string  `json:"value"`
	Impressions int     `json:"impressions"`
	Clicks      int     `json:"clicks"`
	Viewable    int     `json:"viewable"`
	CTR         float64 `json:"ctr"`
}

// LineItemStats represents stats for a line item
type LineItemStats struct {
	LineItemID   int     `json:"line_item_id"`
	LineItemName string  `json:"line_item_name"`
	CampaignName string  `json:"campaign_name"`
	Impressions  int     `json:"impressions"`
	Clicks       int     `json:"clicks"`
	Viewable     int     `json:"viewable"`
	CTR          float64 `json:"ctr"`
}

// GetKeyValueReport returns stats grouped by a specific key
func (s *PostgresStore) GetKeyValueReport(ctx context.Context, key string, startDate, endDate time.Time) ([]KeyValueStats, error) {
	var columnName string
	switch key {
	case "country":
		columnName = "country"
	case "section":
		columnName = "section"
	case "platform":
		columnName = "platform"
	default:
		columnName = "country"
	}

	query := `
		SELECT
			COALESCE(` + columnName + `, 'unknown') as value,
			COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM events
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY ` + columnName + `
		ORDER BY impressions DESC
	`

	rows, err := s.pool.Query(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []KeyValueStats
	for rows.Next() {
		var s KeyValueStats
		s.Key = key
		if err := rows.Scan(&s.Value, &s.Impressions, &s.Clicks, &s.Viewable); err != nil {
			return nil, err
		}
		if s.Impressions > 0 {
			s.CTR = float64(s.Clicks) / float64(s.Impressions) * 100
		}
		stats = append(stats, s)
	}
	return stats, nil
}

// GetLineItemReport returns stats grouped by line item
func (s *PostgresStore) GetLineItemReport(ctx context.Context, startDate, endDate time.Time) ([]LineItemStats, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			li.id,
			li.name,
			c.name as campaign_name,
			COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN e.event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM line_items li
		JOIN campaigns c ON li.campaign_id = c.id
		LEFT JOIN events e ON e.line_item_id = li.id AND e.created_at >= $1 AND e.created_at < $2
		GROUP BY li.id, li.name, c.name
		ORDER BY impressions DESC
	`, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []LineItemStats
	for rows.Next() {
		var s LineItemStats
		if err := rows.Scan(&s.LineItemID, &s.LineItemName, &s.CampaignName, &s.Impressions, &s.Clicks, &s.Viewable); err != nil {
			return nil, err
		}
		if s.Impressions > 0 {
			s.CTR = float64(s.Clicks) / float64(s.Impressions) * 100
		}
		stats = append(stats, s)
	}
	return stats, nil
}

// ExportRow represents a row in the export
type ExportRow struct {
	Date         string `json:"date"`
	CampaignName string `json:"campaign_name"`
	LineItemName string `json:"line_item_name"`
	Country      string `json:"country"`
	Section      string `json:"section"`
	Platform     string `json:"platform"`
	Impressions  int    `json:"impressions"`
	Clicks       int    `json:"clicks"`
	Viewable     int    `json:"viewable"`
	CTR          float64 `json:"ctr"`
}

// GetExportData returns detailed data for export
func (s *PostgresStore) GetExportData(ctx context.Context, startDate, endDate time.Time, groupBy string) ([]ExportRow, error) {
	var groupColumns, selectColumns string

	switch groupBy {
	case "daily":
		groupColumns = "DATE(e.created_at), c.name, li.name"
		selectColumns = "DATE(e.created_at) as date, c.name as campaign_name, li.name as line_item_name, '' as country, '' as section, '' as platform"
	case "country":
		groupColumns = "DATE(e.created_at), c.name, li.name, e.country"
		selectColumns = "DATE(e.created_at) as date, c.name as campaign_name, li.name as line_item_name, COALESCE(e.country, '') as country, '' as section, '' as platform"
	case "section":
		groupColumns = "DATE(e.created_at), c.name, li.name, e.section"
		selectColumns = "DATE(e.created_at) as date, c.name as campaign_name, li.name as line_item_name, '' as country, COALESCE(e.section, '') as section, '' as platform"
	case "full":
		groupColumns = "DATE(e.created_at), c.name, li.name, e.country, e.section, e.platform"
		selectColumns = "DATE(e.created_at) as date, c.name as campaign_name, li.name as line_item_name, COALESCE(e.country, '') as country, COALESCE(e.section, '') as section, COALESCE(e.platform, '') as platform"
	default:
		groupColumns = "DATE(e.created_at), c.name, li.name"
		selectColumns = "DATE(e.created_at) as date, c.name as campaign_name, li.name as line_item_name, '' as country, '' as section, '' as platform"
	}

	query := `
		SELECT
			` + selectColumns + `,
			COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) as impressions,
			COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) as clicks,
			COALESCE(SUM(CASE WHEN e.event_type = 'viewable' THEN 1 ELSE 0 END), 0) as viewable
		FROM events e
		JOIN line_items li ON e.line_item_id = li.id
		JOIN campaigns c ON li.campaign_id = c.id
		WHERE e.created_at >= $1 AND e.created_at < $2
		GROUP BY ` + groupColumns + `
		ORDER BY date DESC, impressions DESC
	`

	rows, err := s.pool.Query(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []ExportRow
	for rows.Next() {
		var r ExportRow
		var date time.Time
		if err := rows.Scan(&date, &r.CampaignName, &r.LineItemName, &r.Country, &r.Section, &r.Platform, &r.Impressions, &r.Clicks, &r.Viewable); err != nil {
			return nil, err
		}
		r.Date = date.Format("2006-01-02")
		if r.Impressions > 0 {
			r.CTR = float64(r.Clicks) / float64(r.Impressions) * 100
		}
		data = append(data, r)
	}
	return data, nil
}

// Targeting Keys operations

// ListTargetingKeys returns all targeting keys
func (s *PostgresStore) ListTargetingKeys(ctx context.Context) ([]models.TargetingKey, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, key, values, created_at, updated_at
		FROM targeting_keys
		ORDER BY key
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.TargetingKey
	for rows.Next() {
		var k models.TargetingKey
		var valuesJSON []byte
		if err := rows.Scan(&k.ID, &k.Key, &valuesJSON, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(valuesJSON, &k.Values)
		keys = append(keys, k)
	}
	return keys, nil
}

// GetTargetingKey returns a targeting key by key name
func (s *PostgresStore) GetTargetingKey(ctx context.Context, key string) (*models.TargetingKey, error) {
	var k models.TargetingKey
	var valuesJSON []byte
	err := s.pool.QueryRow(ctx, `
		SELECT id, key, values, created_at, updated_at
		FROM targeting_keys WHERE key = $1
	`, key).Scan(&k.ID, &k.Key, &valuesJSON, &k.CreatedAt, &k.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(valuesJSON, &k.Values)
	return &k, nil
}

// UpsertTargetingKey creates or updates a targeting key
func (s *PostgresStore) UpsertTargetingKey(ctx context.Context, key string, values []string) (*models.TargetingKey, error) {
	valuesJSON, _ := json.Marshal(values)
	var k models.TargetingKey
	var valuesOut []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO targeting_keys (key, values, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		ON CONFLICT (key) DO UPDATE SET
			values = (
				SELECT jsonb_agg(DISTINCT val)
				FROM (
					SELECT jsonb_array_elements_text(targeting_keys.values) AS val
					UNION
					SELECT jsonb_array_elements_text($2::jsonb) AS val
				) combined
			),
			updated_at = NOW()
		RETURNING id, key, values, created_at, updated_at
	`, key, valuesJSON).Scan(&k.ID, &k.Key, &valuesOut, &k.CreatedAt, &k.UpdatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(valuesOut, &k.Values)
	return &k, nil
}

// AddTargetingKeyValues adds values to a targeting key (creates if not exists)
func (s *PostgresStore) AddTargetingKeyValues(ctx context.Context, key string, values []string) error {
	_, err := s.UpsertTargetingKey(ctx, key, values)
	return err
}

// UpdateTargetingKeyValues replaces all values for a targeting key
func (s *PostgresStore) UpdateTargetingKeyValues(ctx context.Context, key string, values []string) (*models.TargetingKey, error) {
	valuesJSON, _ := json.Marshal(values)
	var k models.TargetingKey
	var valuesOut []byte
	err := s.pool.QueryRow(ctx, `
		UPDATE targeting_keys
		SET values = $2, updated_at = NOW()
		WHERE key = $1
		RETURNING id, key, values, created_at, updated_at
	`, key, valuesJSON).Scan(&k.ID, &k.Key, &valuesOut, &k.CreatedAt, &k.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(valuesOut, &k.Values)
	return &k, nil
}

// DeleteTargetingKey deletes a targeting key
func (s *PostgresStore) DeleteTargetingKey(ctx context.Context, key string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM targeting_keys WHERE key = $1`, key)
	return err
}
