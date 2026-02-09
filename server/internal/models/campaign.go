package models

import "time"

// Campaign represents an advertising campaign
type Campaign struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateCampaignRequest represents the request to create a campaign
type CreateCampaignRequest struct {
	Name   string `json:"name"`
	Status string `json:"status,omitempty"`
}

// UpdateCampaignRequest represents the request to update a campaign
type UpdateCampaignRequest struct {
	Name   string `json:"name,omitempty"`
	Status string `json:"status,omitempty"`
}
