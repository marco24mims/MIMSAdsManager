package models

// AdRequest represents a request for ads
type AdRequest struct {
	Slots     []AdSlot          `json:"slots"`
	Targeting map[string]string `json:"targeting"`
	UserID    string            `json:"user_id"`
	Platform  string            `json:"platform"`
	Country   string            `json:"country"`
}

// AdSlot represents a single ad slot in a request
type AdSlot struct {
	ID     string `json:"id"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	AdUnit string `json:"ad_unit,omitempty"`
}

// AdResponse represents the response containing matched ads
type AdResponse struct {
	Ads []AdResult `json:"ads"`
}

// AdResult represents a single ad result for a slot
type AdResult struct {
	SlotID       string `json:"slot_id"`
	ImpressionID string `json:"impression_id"`
	LineItemID   int    `json:"line_item_id"`
	CreativeID   int    `json:"creative_id"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	ImageURL     string `json:"image_url"`
	ClickURL     string `json:"click_url"`
	TrackingURLs Tracking `json:"tracking"`
}

// Tracking contains tracking URLs for the ad
type Tracking struct {
	Impression string `json:"impression"`
	Viewable   string `json:"viewable"`
	Click      string `json:"click"`
}
