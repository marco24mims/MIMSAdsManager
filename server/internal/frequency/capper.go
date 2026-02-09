package frequency

import (
	"fmt"
	"sync"
	"time"
)

// Capper handles frequency capping
type Capper struct {
	mu       sync.RWMutex
	counts   map[string]int // key: "lineItemId:userId:date"
	lastDate string
}

// NewCapper creates a new Capper
func NewCapper() *Capper {
	c := &Capper{
		counts:   make(map[string]int),
		lastDate: time.Now().Format("2006-01-02"),
	}

	// Start goroutine to reset counts at midnight
	go c.startMidnightReset()

	return c
}

// Check returns true if the user is under the frequency cap
func (c *Capper) Check(lineItemID int, userID string, cap int) bool {
	if cap <= 0 {
		// No cap set
		return true
	}

	c.mu.RLock()
	defer c.mu.RUnlock()

	key := c.makeKey(lineItemID, userID)
	count := c.counts[key]
	return count < cap
}

// Increment increases the count for a user/line item combination
func (c *Capper) Increment(lineItemID int, userID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.makeKey(lineItemID, userID)
	c.counts[key]++
}

// GetCount returns the current count for a user/line item
func (c *Capper) GetCount(lineItemID int, userID string) int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := c.makeKey(lineItemID, userID)
	return c.counts[key]
}

// makeKey creates a unique key for the frequency counter
func (c *Capper) makeKey(lineItemID int, userID string) string {
	date := time.Now().Format("2006-01-02")
	return fmt.Sprintf("%d:%s:%s", lineItemID, userID, date)
}

// startMidnightReset runs a goroutine that resets counts at midnight
func (c *Capper) startMidnightReset() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		currentDate := time.Now().Format("2006-01-02")
		c.mu.Lock()
		if currentDate != c.lastDate {
			// New day - clear all counts
			c.counts = make(map[string]int)
			c.lastDate = currentDate
		}
		c.mu.Unlock()
	}
}

// Reset clears all frequency counts (for testing)
func (c *Capper) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.counts = make(map[string]int)
}
