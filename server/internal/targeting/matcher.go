package targeting

import (
	"github.com/mims/ad-manager/internal/models"
)

// Matcher handles targeting logic
type Matcher struct{}

// NewMatcher creates a new Matcher
func NewMatcher() *Matcher {
	return &Matcher{}
}

// Match filters line items based on targeting rules and slot dimensions
func (m *Matcher) Match(targeting map[string]string, lineItems []models.LineItem, width, height int) []models.LineItem {
	var matched []models.LineItem

	for _, li := range lineItems {
		// Check if line item has any creatives matching the size
		hasMatchingCreative := false
		for _, creative := range li.Creatives {
			if creative.Width == width && creative.Height == height && creative.Status == "active" {
				hasMatchingCreative = true
				break
			}
		}
		if !hasMatchingCreative {
			continue
		}

		// Check targeting rules
		if m.matchesTargeting(targeting, li.TargetingRules) {
			matched = append(matched, li)
		}
	}

	return matched
}

// matchesTargeting checks if the request targeting matches all line item rules
func (m *Matcher) matchesTargeting(targeting map[string]string, rules []models.TargetingRule) bool {
	// No rules means match all
	if len(rules) == 0 {
		return true
	}

	// All rules must match (AND logic)
	for _, rule := range rules {
		requestValue, exists := targeting[rule.Key]
		if !exists {
			// Key not provided in request - rule doesn't match
			return false
		}

		matched := false
		switch rule.Operator {
		case "EQ":
			// Must equal one of the values
			for _, v := range rule.Values {
				if requestValue == v {
					matched = true
					break
				}
			}
		case "IN":
			// Request value must be in the list
			for _, v := range rule.Values {
				if requestValue == v {
					matched = true
					break
				}
			}
		case "NOT_IN":
			// Request value must NOT be in the list
			matched = true
			for _, v := range rule.Values {
				if requestValue == v {
					matched = false
					break
				}
			}
		default:
			// Unknown operator, treat as IN
			for _, v := range rule.Values {
				if requestValue == v {
					matched = true
					break
				}
			}
		}

		if !matched {
			return false
		}
	}

	return true
}

// SelectCreative selects the best creative for the given dimensions
func (m *Matcher) SelectCreative(lineItem models.LineItem, width, height int) *models.Creative {
	for _, creative := range lineItem.Creatives {
		if creative.Width == width && creative.Height == height && creative.Status == "active" {
			return &creative
		}
	}
	return nil
}

// MatchResponsive filters line items that have at least one active creative with width <= maxWidth
// If allowedSizes is non-empty, only creatives matching one of those sizes are considered.
func (m *Matcher) MatchResponsive(targeting map[string]string, lineItems []models.LineItem, maxWidth int, allowedSizes [][]int) []models.LineItem {
	var matched []models.LineItem

	for _, li := range lineItems {
		hasMatchingCreative := false
		for _, creative := range li.Creatives {
			if creative.Width <= maxWidth && creative.Status == "active" && m.sizeAllowed(creative.Width, creative.Height, allowedSizes) {
				hasMatchingCreative = true
				break
			}
		}
		if !hasMatchingCreative {
			continue
		}

		if m.matchesTargeting(targeting, li.TargetingRules) {
			matched = append(matched, li)
		}
	}

	return matched
}

// SelectCreativeResponsive picks the largest-area creative that fits within maxWidth
// If allowedSizes is non-empty, only creatives matching one of those sizes are considered.
func (m *Matcher) SelectCreativeResponsive(lineItem models.LineItem, maxWidth int, allowedSizes [][]int) *models.Creative {
	var best *models.Creative
	bestArea := 0

	for i, creative := range lineItem.Creatives {
		if creative.Width <= maxWidth && creative.Status == "active" && m.sizeAllowed(creative.Width, creative.Height, allowedSizes) {
			area := creative.Width * creative.Height
			if area > bestArea {
				bestArea = area
				best = &lineItem.Creatives[i]
			}
		}
	}
	return best
}

// sizeAllowed checks if a creative size matches the ad unit's allowed sizes.
// If allowedSizes is empty, all sizes are allowed.
func (m *Matcher) sizeAllowed(width, height int, allowedSizes [][]int) bool {
	if len(allowedSizes) == 0 {
		return true
	}
	for _, s := range allowedSizes {
		if len(s) >= 2 && s[0] == width && s[1] == height {
			return true
		}
	}
	return false
}
