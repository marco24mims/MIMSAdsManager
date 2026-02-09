package api

import (
	"github.com/gofiber/fiber/v2"
)

// ErrorHandler is the custom error handler
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error": message,
	})
}

// APIError represents an API error response
type APIError struct {
	Error string `json:"error"`
}

// NewBadRequest returns a bad request error
func NewBadRequest(message string) error {
	return fiber.NewError(fiber.StatusBadRequest, message)
}

// NewNotFound returns a not found error
func NewNotFound(message string) error {
	return fiber.NewError(fiber.StatusNotFound, message)
}

// NewInternalError returns an internal server error
func NewInternalError(message string) error {
	return fiber.NewError(fiber.StatusInternalServerError, message)
}
