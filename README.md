# MIMS Ad Manager

A proof-of-concept ad serving platform demonstrating key advertising capabilities including targeting, frequency capping, viewability tracking, and cross-platform SDKs.

## Features

- **Ad Serving**: RESTful API for serving ads with targeting support
- **Key-Value Targeting**: Match ads based on custom targeting rules
- **Frequency Capping**: Limit ad exposure per user per day
- **Viewability Tracking**: IAB-standard viewability (50% visible for 1 second)
- **Cross-Platform SDKs**: Web (JavaScript), Android (Kotlin), and iOS (Swift)
- **Admin Dashboard**: React-based UI for campaign management
- **Reporting**: Impressions, clicks, CTR, and viewability metrics

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Go 1.21+ (for server development)

### Running with Docker

```bash
# Clone the repository
cd mims-ad-manager

# Start all services
docker-compose up -d

# Access the services:
# - Dashboard: http://localhost:3000
# - API Server: http://localhost:8080
# - Demo Page: Open demo/index.html in browser
```

### Local Development

#### Server

```bash
cd server
go mod download
go run ./cmd/server
```

#### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

#### Web Tag

```bash
cd web-tag
npm install
npm run build
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        POC ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Clients                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Web Tag  │  │ Android  │  │   iOS    │  │  Admin   │       │
│  │  (JS)    │  │   SDK    │  │   SDK    │  │Dashboard │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │              │
│       └─────────────┴──────┬──────┴─────────────┘              │
│                            │                                    │
│  ┌─────────────────────────┴─────────────────────────┐         │
│  │              Ad Server (Go + Fiber)               │         │
│  │                                                   │         │
│  │  /v1/ads      - Ad requests                      │         │
│  │  /v1/imp      - Impression tracking              │         │
│  │  /v1/view     - Viewability tracking             │         │
│  │  /v1/click    - Click tracking                   │         │
│  │  /api/*       - Admin API                        │         │
│  │                                                   │         │
│  └─────────────────────────┬─────────────────────────┘         │
│                            │                                    │
│  ┌─────────────────────────┴─────────────────────────┐         │
│  │                    Data Layer                     │         │
│  │  ┌─────────────┐  ┌─────────────┐                │         │
│  │  │  PostgreSQL │  │  In-Memory  │                │         │
│  │  │             │  │    Cache    │                │         │
│  │  └─────────────┘  └─────────────┘                │         │
│  └───────────────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
mims-ad-manager/
├── docker-compose.yml          # Docker orchestration
├── README.md                   # This file
│
├── server/                     # Go backend
│   ├── cmd/server/main.go      # Entry point
│   ├── internal/
│   │   ├── api/                # HTTP handlers
│   │   ├── models/             # Data structures
│   │   ├── targeting/          # Targeting engine
│   │   ├── frequency/          # Frequency capping
│   │   └── storage/            # Database layer
│   └── migrations/             # SQL schema
│
├── dashboard/                  # React admin UI
│   └── src/
│       ├── pages/              # Page components
│       └── api.ts              # API client
│
├── web-tag/                    # JavaScript ad tag
│   ├── src/tag.ts              # Source
│   └── dist/tag.js             # Built output
│
├── sdk-android/                # Android SDK
│   ├── mimsads/                # SDK library
│   └── sample-app/             # Demo app
│
├── sdk-ios/                    # iOS SDK
│   ├── Sources/MIMSAds/        # SDK source
│   └── SampleApp/              # Demo app
│
└── demo/                       # Demo website
    └── index.html              # Test page
```

## API Reference

### Ad Serving

#### POST /v1/ads
Request ads for display.

**Request:**
```json
{
  "slots": [
    { "id": "slot1", "width": 728, "height": 90 }
  ],
  "targeting": {
    "section": "news",
    "country": "sg"
  },
  "user_id": "user123",
  "platform": "web"
}
```

**Response:**
```json
{
  "ads": [
    {
      "slot_id": "slot1",
      "impression_id": "uuid",
      "line_item_id": 1,
      "creative_id": 1,
      "width": 728,
      "height": 90,
      "image_url": "https://...",
      "click_url": "http://server/v1/click?...",
      "tracking": {
        "impression": "http://server/v1/imp?...",
        "viewable": "http://server/v1/view?...",
        "click": "http://server/v1/click?..."
      }
    }
  ]
}
```

### Tracking

- `GET /v1/imp?id=...` - Track impression (returns 1x1 pixel)
- `GET /v1/view?id=...` - Track viewable impression
- `GET /v1/click?id=...&url=...` - Track click and redirect

### Admin API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Get campaign |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| GET | `/api/campaigns/:id/line-items` | List line items |
| POST | `/api/line-items` | Create line item |
| POST | `/api/line-items/:id/targeting` | Set targeting rules |
| POST | `/api/creatives` | Create creative |
| GET | `/api/reports/summary` | Get summary stats |
| GET | `/api/reports/daily` | Get daily stats |

## SDK Usage

### JavaScript (Web)

```html
<script src="http://localhost:8080/static/tag.js"></script>
<script>
  MIMSAds.init({ serverUrl: 'http://localhost:8080' });
  MIMSAds.defineSlot('banner', { width: 728, height: 90 });
  MIMSAds.setTargeting('section', 'news');
  MIMSAds.display();
</script>

<div id="banner"></div>
```

### Android (Kotlin)

```kotlin
// Initialize
MIMSAds.initialize(context, "http://10.0.2.2:8080")

// Create banner
val bannerView = BannerView(context)
bannerView.setSlotId("android_banner")
bannerView.setAdSize(AdSize.BANNER)
bannerView.setTargeting(mapOf("section" to "news"))
bannerView.setAdListener(object : AdListener {
    override fun onAdLoaded() { }
    override fun onAdFailedToLoad(error: String) { }
    override fun onAdClicked() { }
})
bannerView.loadAd()
```

### iOS (Swift)

```swift
// Initialize
MIMSAds.shared.initialize(serverUrl: "http://localhost:8080")

// Create banner
let bannerView = BannerView()
bannerView.slotId = "ios_banner"
bannerView.adSize = .banner
bannerView.targeting = ["section": "news"]
bannerView.delegate = self
bannerView.loadAd()
```

## Targeting Rules

Targeting rules support the following operators:

| Operator | Description | Example |
|----------|-------------|---------|
| `IN` | Value must be in list | `country IN ["sg", "my"]` |
| `EQ` | Value must equal | `section EQ ["news"]` |
| `NOT_IN` | Value must not be in list | `section NOT_IN ["sports"]` |

## Demo Walkthrough

1. **Start the services**: `docker-compose up -d`

2. **Open the dashboard**: http://localhost:3000
   - View existing demo campaigns
   - Create new campaigns/line items/creatives
   - Set targeting rules

3. **Test ad serving**: Open `demo/index.html` in a browser
   - Select targeting values
   - Click "Load Ads" to fetch and display ads
   - Observe console for tracking events

4. **View reports**: http://localhost:3000/reports
   - See impression/click counts
   - View CTR and viewability rates
   - Filter by date range

## Database Schema

```sql
-- Campaigns
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Line Items
CREATE TABLE line_items (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 5,
    frequency_cap INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
);

-- Targeting Rules
CREATE TABLE targeting_rules (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES line_items(id),
    key VARCHAR(100) NOT NULL,
    operator VARCHAR(20) DEFAULT 'IN',
    values JSONB NOT NULL
);

-- Creatives
CREATE TABLE creatives (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES line_items(id),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    click_url VARCHAR(500) NOT NULL
);

-- Events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    impression_id VARCHAR(50),
    line_item_id INTEGER,
    creative_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Development

### Running Tests

```bash
# Server tests
cd server
go test ./...

# Dashboard tests
cd dashboard
npm test
```

### Building for Production

```bash
# Build all Docker images
docker-compose build

# Build server binary
cd server
go build -o bin/server ./cmd/server

# Build dashboard
cd dashboard
npm run build
```

## License

MIT License - See LICENSE file for details.
