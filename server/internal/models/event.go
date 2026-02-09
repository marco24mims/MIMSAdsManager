package models

import "time"

// Event represents a tracking event (impression, click, viewable)
type Event struct {
	ID           int       `json:"id"`
	EventType    string    `json:"event_type"`
	ImpressionID string    `json:"impression_id"`
	LineItemID   int       `json:"line_item_id"`
	CreativeID   int       `json:"creative_id"`
	UserID       string    `json:"user_id"`
	Country      string    `json:"country"`
	Platform     string    `json:"platform"`
	AdUnit       string    `json:"ad_unit"`
	Section      string    `json:"section"`
	CreatedAt    time.Time `json:"created_at"`
}

// EventType constants
const (
	EventTypeImpression = "impression"
	EventTypeClick      = "click"
	EventTypeViewable   = "viewable"
)
