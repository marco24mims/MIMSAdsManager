package models

import "time"

// LineItem represents a line item within a campaign
type LineItem struct {
	ID                 int              `json:"id"`
	CampaignID         int              `json:"campaign_id"`
	Name               string           `json:"name"`
	Priority           int              `json:"priority"`
	FrequencyCap       int              `json:"frequency_cap"`
	FrequencyCapPeriod string           `json:"frequency_cap_period"`
	Status             string           `json:"status"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
	TargetingRules     []TargetingRule  `json:"targeting_rules,omitempty"`
	Creatives          []Creative       `json:"creatives,omitempty"`
}

// TargetingRule represents a targeting rule for a line item
type TargetingRule struct {
	ID         int      `json:"id"`
	LineItemID int      `json:"line_item_id"`
	Key        string   `json:"key"`
	Operator   string   `json:"operator"`
	Values     []string `json:"values"`
}

// CreateLineItemRequest represents the request to create a line item
type CreateLineItemRequest struct {
	CampaignID         int    `json:"campaign_id"`
	Name               string `json:"name"`
	Priority           int    `json:"priority,omitempty"`
	FrequencyCap       int    `json:"frequency_cap,omitempty"`
	FrequencyCapPeriod string `json:"frequency_cap_period,omitempty"`
	Status             string `json:"status,omitempty"`
}

// UpdateLineItemRequest represents the request to update a line item
type UpdateLineItemRequest struct {
	Name               string `json:"name,omitempty"`
	Priority           int    `json:"priority,omitempty"`
	FrequencyCap       int    `json:"frequency_cap,omitempty"`
	FrequencyCapPeriod string `json:"frequency_cap_period,omitempty"`
	Status             string `json:"status,omitempty"`
}

// SetTargetingRulesRequest represents the request to set targeting rules
type SetTargetingRulesRequest struct {
	Rules []TargetingRuleInput `json:"rules"`
}

// TargetingRuleInput represents input for a targeting rule
type TargetingRuleInput struct {
	Key      string   `json:"key"`
	Operator string   `json:"operator"`
	Values   []string `json:"values"`
}
