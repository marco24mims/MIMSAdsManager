package models

import "time"

// Creative represents an ad creative
type Creative struct {
	ID         int       `json:"id"`
	LineItemID int       `json:"line_item_id"`
	Name       string    `json:"name"`
	Width      int       `json:"width"`
	Height     int       `json:"height"`
	ImageURL   string    `json:"image_url"`
	ClickURL   string    `json:"click_url"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateCreativeRequest represents the request to create a creative
type CreateCreativeRequest struct {
	LineItemID int    `json:"line_item_id"`
	Name       string `json:"name"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	ImageURL   string `json:"image_url"`
	ClickURL   string `json:"click_url"`
	Status     string `json:"status,omitempty"`
}

// UpdateCreativeRequest represents the request to update a creative
type UpdateCreativeRequest struct {
	Name     string `json:"name,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	ImageURL string `json:"image_url,omitempty"`
	ClickURL string `json:"click_url,omitempty"`
	Status   string `json:"status,omitempty"`
}
