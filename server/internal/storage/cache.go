package storage

import (
	"context"
	"sync"

	"github.com/mims/ad-manager/internal/models"
)

// InMemoryCache provides in-memory caching for active campaigns
type InMemoryCache struct {
	mu           sync.RWMutex
	lineItems    []models.LineItem
	adUnits      []models.AdUnit
	adUnitByCode map[string]models.AdUnit
}

// NewInMemoryCache creates a new InMemoryCache
func NewInMemoryCache() *InMemoryCache {
	return &InMemoryCache{
		lineItems:    make([]models.LineItem, 0),
		adUnits:      make([]models.AdUnit, 0),
		adUnitByCode: make(map[string]models.AdUnit),
	}
}

// LoadCampaigns loads active campaigns from the database
func (c *InMemoryCache) LoadCampaigns(ctx context.Context, store *PostgresStore) error {
	items, err := store.GetActiveLineItemsWithCreatives(ctx)
	if err != nil {
		return err
	}

	// Load ad units
	adUnits, err := store.ListAdUnits(ctx)
	if err != nil {
		return err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.lineItems = items
	c.adUnits = adUnits
	c.adUnitByCode = make(map[string]models.AdUnit)
	for _, au := range adUnits {
		c.adUnitByCode[au.Code] = au
	}
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

// GetAdUnitByCode returns an ad unit by its code
func (c *InMemoryCache) GetAdUnitByCode(code string) *models.AdUnit {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if au, ok := c.adUnitByCode[code]; ok {
		return &au
	}
	return nil
}
