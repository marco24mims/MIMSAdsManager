package models

import "time"

// TargetingKey represents a targeting key with its known values
type TargetingKey struct {
	ID        int       `json:"id"`
	Key       string    `json:"key"`
	Values    []string  `json:"values"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateTargetingKeyRequest represents a request to create a targeting key
type CreateTargetingKeyRequest struct {
	Key    string   `json:"key"`
	Values []string `json:"values"`
}

// UpdateTargetingKeyRequest represents a request to update a targeting key
type UpdateTargetingKeyRequest struct {
	Values []string `json:"values"`
}
