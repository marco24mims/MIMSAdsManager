package models

import "time"

// AdUnit represents an ad inventory unit (like GAM ad units)
type AdUnit struct {
	ID          int       `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Platform    string    `json:"platform"`
	Sizes       [][]int   `json:"sizes"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateAdUnitRequest represents a request to create an ad unit
type CreateAdUnitRequest struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Platform    string  `json:"platform"`
	Sizes       [][]int `json:"sizes"`
}

// UpdateAdUnitRequest represents a request to update an ad unit
type UpdateAdUnitRequest struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Platform    string  `json:"platform"`
	Sizes       [][]int `json:"sizes"`
	Status      string  `json:"status"`
}
