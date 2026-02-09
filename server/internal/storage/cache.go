package storage

import (
	"context"
	"sync"

	"github.com/mims/ad-manager/internal/models"
)

// InMemoryCache provides in-memory caching for active campaigns
type InMemoryCache struct {
	mu        sync.RWMutex
	lineItems []models.LineItem
}

// NewInMemoryCache creates a new InMemoryCache
func NewInMemoryCache() *InMemoryCache {
	return &InMemoryCache{
		lineItems: make([]models.LineItem, 0),
	}
}

// LoadCampaigns loads active campaigns from the database
func (c *InMemoryCache) LoadCampaigns(ctx context.Context, store *PostgresStore) error {
	items, err := store.GetActiveLineItemsWithCreatives(ctx)
	if err != nil {
		return err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.lineItems = items
	return nil
}

// GetActiveLineItems returns all cached active line items
func (c *InMemoryCache) GetActiveLineItems() []models.LineItem {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Return a copy to avoid race conditions
	result := make([]models.LineItem, len(c.lineItems))
	copy(result, c.lineItems)
	return result
}

// Refresh reloads the cache
func (c *InMemoryCache) Refresh(ctx context.Context, store *PostgresStore) error {
	return c.LoadCampaigns(ctx, store)
}
