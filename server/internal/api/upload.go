package api

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// UploadHandler handles file uploads
type UploadHandler struct {
	uploadDir string
	baseURL   string
}

// NewUploadHandler creates a new UploadHandler
func NewUploadHandler(uploadDir string) *UploadHandler {
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)

	return &UploadHandler{
		uploadDir: uploadDir,
	}
}

// UploadImage handles image upload
func (h *UploadHandler) UploadImage(c *fiber.Ctx) error {
	// Get the file from form
	file, err := c.FormFile("image")
	if err != nil {
		return NewBadRequest("No image file provided")
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if !allowedExts[ext] {
		return NewBadRequest("Invalid file type. Allowed: jpg, jpeg, png, gif, webp")
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		return NewBadRequest("File too large. Maximum size is 5MB")
	}

	// Generate unique filename
	filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), uuid.New().String()[:8], ext)
	filepath := filepath.Join(h.uploadDir, filename)

	// Save the file
	if err := c.SaveFile(file, filepath); err != nil {
		return NewInternalError("Failed to save file")
	}

	// Return relative URL - works with nginx proxy
	imageURL := fmt.Sprintf("/uploads/%s", filename)

	return c.JSON(fiber.Map{
		"success":   true,
		"filename":  filename,
		"image_url": imageURL,
	})
}

// ListUploads returns all uploaded files
func (h *UploadHandler) ListUploads(c *fiber.Ctx) error {
	files, err := os.ReadDir(h.uploadDir)
	if err != nil {
		return NewInternalError("Failed to list uploads")
	}

	var uploads []fiber.Map
	for _, file := range files {
		if !file.IsDir() {
			info, _ := file.Info()
			uploads = append(uploads, fiber.Map{
				"filename":   file.Name(),
				"image_url":  fmt.Sprintf("/uploads/%s", file.Name()),
				"size":       info.Size(),
				"created_at": info.ModTime(),
			})
		}
	}

	if uploads == nil {
		uploads = []fiber.Map{}
	}

	return c.JSON(uploads)
}

// DeleteUpload deletes an uploaded file
func (h *UploadHandler) DeleteUpload(c *fiber.Ctx) error {
	filename := c.Params("filename")
	if filename == "" {
		return NewBadRequest("Filename is required")
	}

	// Prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return NewBadRequest("Invalid filename")
	}

	filepath := filepath.Join(h.uploadDir, filename)

	if err := os.Remove(filepath); err != nil {
		if os.IsNotExist(err) {
			return NewNotFound("File not found")
		}
		return NewInternalError("Failed to delete file")
	}

	return c.SendStatus(fiber.StatusNoContent)
}
