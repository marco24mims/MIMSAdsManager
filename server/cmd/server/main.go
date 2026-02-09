package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/mims/ad-manager/internal/api"
	"github.com/mims/ad-manager/internal/frequency"
	"github.com/mims/ad-manager/internal/storage"
)

func main() {
	// Load .env file if exists
	godotenv.Load()

	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/mimsads?sslmode=disable"
	}

	// Connect to database with retry
	var pool *pgxpool.Pool
	var err error
	for i := 0; i < 10; i++ {
		pool, err = pgxpool.New(context.Background(), databaseURL)
		if err == nil {
			if err = pool.Ping(context.Background()); err == nil {
				break
			}
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Unable to connect to database after 10 attempts: %v", err)
	}
	defer pool.Close()

	log.Println("Connected to database")

	// Initialize storage
	store := storage.NewPostgresStore(pool)
	cache := storage.NewInMemoryCache()

	// Initialize frequency capper
	freqCapper := frequency.NewCapper()

	// Load active campaigns into cache
	if err := cache.LoadCampaigns(context.Background(), store); err != nil {
		log.Printf("Warning: Failed to load campaigns into cache: %v", err)
	}

	// Start cache refresh goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if err := cache.LoadCampaigns(context.Background(), store); err != nil {
				log.Printf("Warning: Failed to refresh cache: %v", err)
			}
		}
	}()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "MIMS Ad Manager v1.0",
		ErrorHandler: api.ErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Initialize handlers
	adsHandler := api.NewAdsHandler(store, cache, freqCapper)
	trackingHandler := api.NewTrackingHandler(store)
	adminHandler := api.NewAdminHandler(store, cache)
	reportsHandler := api.NewReportsHandler(store)
	uploadHandler := api.NewUploadHandler("./uploads")

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "timestamp": time.Now().Unix()})
	})

	// Serve static files (JavaScript tag)
	app.Static("/static", "./static")

	// Serve uploaded files
	app.Static("/uploads", "./uploads")

	// Ad serving routes
	v1 := app.Group("/v1")
	v1.Post("/ads", adsHandler.GetAds)
	v1.Get("/imp", trackingHandler.TrackImpression)
	v1.Get("/view", trackingHandler.TrackViewable)
	v1.Get("/click", trackingHandler.TrackClick)

	// Admin API routes
	apiGroup := app.Group("/api")

	// Campaigns
	apiGroup.Get("/campaigns", adminHandler.ListCampaigns)
	apiGroup.Post("/campaigns", adminHandler.CreateCampaign)
	apiGroup.Get("/campaigns/:id", adminHandler.GetCampaign)
	apiGroup.Put("/campaigns/:id", adminHandler.UpdateCampaign)
	apiGroup.Delete("/campaigns/:id", adminHandler.DeleteCampaign)

	// Line Items
	apiGroup.Get("/campaigns/:id/line-items", adminHandler.ListLineItems)
	apiGroup.Post("/line-items", adminHandler.CreateLineItem)
	apiGroup.Get("/line-items/:id", adminHandler.GetLineItem)
	apiGroup.Put("/line-items/:id", adminHandler.UpdateLineItem)
	apiGroup.Delete("/line-items/:id", adminHandler.DeleteLineItem)

	// Targeting Rules
	apiGroup.Get("/line-items/:id/targeting", adminHandler.GetTargetingRules)
	apiGroup.Post("/line-items/:id/targeting", adminHandler.SetTargetingRules)

	// Creatives
	apiGroup.Get("/line-items/:id/creatives", adminHandler.ListCreatives)
	apiGroup.Post("/creatives", adminHandler.CreateCreative)
	apiGroup.Get("/creatives/:id", adminHandler.GetCreative)
	apiGroup.Put("/creatives/:id", adminHandler.UpdateCreative)
	apiGroup.Delete("/creatives/:id", adminHandler.DeleteCreative)

	// Reports
	apiGroup.Get("/reports/summary", reportsHandler.GetSummary)
	apiGroup.Get("/reports/campaigns/:id", reportsHandler.GetCampaignReport)
	apiGroup.Get("/reports/daily", reportsHandler.GetDailyReport)
	apiGroup.Get("/reports/keyvalue", reportsHandler.GetKeyValueReport)
	apiGroup.Get("/reports/lineitems", reportsHandler.GetLineItemReport)
	apiGroup.Get("/reports/export", reportsHandler.ExportReport)

	// Uploads
	apiGroup.Post("/uploads", uploadHandler.UploadImage)
	apiGroup.Get("/uploads", uploadHandler.ListUploads)
	apiGroup.Delete("/uploads/:filename", uploadHandler.DeleteUpload)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
	}()

	// Start server
	log.Printf("MIMS Ad Manager starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
