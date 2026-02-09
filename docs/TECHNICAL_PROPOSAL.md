# MIMS Ad Manager - Technical Proposal

## Internal Ad Serving Platform

**Document Version:** 1.0
**Date:** February 2026
**Prepared for:** IT Director Review
**Project Timeline:** 3 Months

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Tracking Implementation](#tracking-implementation)
7. [Client Integration](#client-integration)
8. [Database Design](#database-design)
9. [Infrastructure Requirements](#infrastructure-requirements)
10. [Security Considerations](#security-considerations)
11. [Scalability & Performance](#scalability--performance)
12. [Project Timeline](#project-timeline)
13. [Risk Assessment](#risk-assessment)
14. [Appendix](#appendix)

---

## Executive Summary

### Problem Statement

MIMS currently uses Google Ad Manager (GAM) to serve internal banner advertisements across our website (mims.com) and country-specific mobile applications. While GAM is feature-rich, we face limitations in:

- **Custom ad serving policies** - GAM's policies don't always align with our internal requirements
- **Data ownership** - Ad performance data resides on Google's infrastructure
- **Cost control** - As impression volume grows, GAM costs increase
- **Latency optimization** - Limited control over ad serving speed for our APAC user base

### Proposed Solution

Build an in-house **MIMS Ad Manager** - a lightweight, high-performance ad serving platform tailored to our specific needs. This system will:

- Serve banner ads to web and mobile platforms
- Support flexible key-value targeting (similar to GAM)
- Provide sub-50ms ad decision latency
- Give full control over ad policies and data
- Reduce long-term operational costs

### Key Metrics

| Metric | Current State | Target |
|--------|---------------|--------|
| Monthly Impressions (Web) | ~1,000,000 | 1,000,000+ |
| Monthly Impressions (Mobile) | ~1,000,000 | 1,000,000+ |
| Ad Decision Latency | 100-200ms (GAM) | <50ms |
| Data Ownership | External (Google) | Internal |
| Targeting Flexibility | Limited by GAM | Unlimited key-value pairs |

---

## Business Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Serve banner ads on mims.com (all country paths) | Critical |
| FR-02 | Serve banner ads in mobile apps (iOS & Android) | Critical |
| FR-03 | Support multiple ad unit sizes (300x250, 728x90, 320x50, etc.) | Critical |
| FR-04 | Key-value targeting (country, section, content type, etc.) | Critical |
| FR-05 | Campaign scheduling (start/end dates, dayparting) | High |
| FR-06 | Frequency capping (per user/session) | High |
| FR-07 | Priority-based ad selection | High |
| FR-08 | Impression and click tracking | Critical |
| FR-09 | Reporting dashboard | Critical |
| FR-10 | Creative management (upload, preview, approve) | High |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Ad decision response time | <50ms (p99) |
| NFR-02 | System availability | 99.9% uptime |
| NFR-03 | Concurrent requests | 500 req/sec peak |
| NFR-04 | Creative load time | <200ms |
| NFR-05 | Data retention | 2 years |

### Geographic Coverage

| Country | Website Path | Mobile App |
|---------|--------------|------------|
| Singapore | mims.com/singapore | MIMS SG App |
| Hong Kong | mims.com/hongkong | MIMS HK App |
| Malaysia | mims.com/malaysia | MIMS MY App |
| Philippines | mims.com/philippines | MIMS PH App |
| India | mims.com/india | MIMS IN App |
| Indonesia | mims.com/indonesia | MIMS ID App |
| Thailand | mims.com/thailand | MIMS TH App |
| Vietnam | mims.com/vietnam | MIMS VN App |

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MIMS AD MANAGER PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CLIENT LAYER                                  │   │
│  │                                                                      │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │   │
│  │   │   Website   │    │   Android   │    │     iOS     │            │   │
│  │   │  (JS Tag)   │    │    (SDK)    │    │    (SDK)    │            │   │
│  │   │             │    │             │    │             │            │   │
│  │   │ mims.com/*  │    │  MIMS Apps  │    │  MIMS Apps  │            │   │
│  │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │   │
│  │          │                  │                  │                    │   │
│  └──────────┼──────────────────┼──────────────────┼────────────────────┘   │
│             │                  │                  │                        │
│             └──────────────────┼──────────────────┘                        │
│                                ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      NETWORK LAYER                                   │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │              LOAD BALANCER (Nginx / HAProxy)                │   │   │
│  │   │                                                             │   │   │
│  │   │  • SSL Termination    • Health Checks    • Rate Limiting   │   │   │
│  │   └─────────────────────────────┬───────────────────────────────┘   │   │
│  │                                 │                                   │   │
│  └─────────────────────────────────┼───────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                      APPLICATION LAYER                              │   │
│  │                                 │                                   │   │
│  │    ┌────────────────────────────┼────────────────────────────┐     │   │
│  │    │                            ▼                            │     │   │
│  │    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │   │
│  │    │  │  Ad Server   │  │  Ad Server   │  │  Ad Server   │  │     │   │
│  │    │  │  Instance 1  │  │  Instance 2  │  │  Instance 3  │  │     │   │
│  │    │  │    (Go)      │  │    (Go)      │  │    (Go)      │  │     │   │
│  │    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │     │   │
│  │    │         │                 │                 │          │     │   │
│  │    │         └─────────────────┼─────────────────┘          │     │   │
│  │    │                           │                            │     │   │
│  │    │     AD SERVING CLUSTER    │    Port: 8080              │     │   │
│  │    └───────────────────────────┼────────────────────────────┘     │   │
│  │                                │                                   │   │
│  │    ┌───────────────────────────┼────────────────────────────┐     │   │
│  │    │                           ▼                            │     │   │
│  │    │  ┌──────────────┐  ┌──────────────┐                   │     │   │
│  │    │  │  Admin API   │  │  Admin API   │                   │     │   │
│  │    │  │  Instance 1  │  │  Instance 2  │                   │     │   │
│  │    │  │    (Go)      │  │    (Go)      │                   │     │   │
│  │    │  └──────────────┘  └──────────────┘                   │     │   │
│  │    │                                                        │     │   │
│  │    │     ADMIN API CLUSTER     Port: 8081                  │     │   │
│  │    └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  │    ┌────────────────────────────────────────────────────────┐     │   │
│  │    │                                                        │     │   │
│  │    │  ┌──────────────────────────────────────────────────┐ │     │   │
│  │    │  │           ADMIN DASHBOARD (React)                │ │     │   │
│  │    │  │                                                  │ │     │   │
│  │    │  │  • Campaign Management   • Creative Library      │ │     │   │
│  │    │  │  • Reporting & Analytics • User Management       │ │     │   │
│  │    │  │  • Targeting Rules       • System Settings       │ │     │   │
│  │    │  └──────────────────────────────────────────────────┘ │     │   │
│  │    │                                                        │     │   │
│  │    │     ADMIN DASHBOARD         Port: 3000                │     │   │
│  │    └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                        DATA LAYER                                   │   │
│  │                                 │                                   │   │
│  │    ┌────────────────────────────┼────────────────────────────┐     │   │
│  │    │                            ▼                            │     │   │
│  │    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │   │
│  │    │  │    Redis     │  │  PostgreSQL  │  │    MinIO     │  │     │   │
│  │    │  │   Cluster    │  │   Primary    │  │   Storage    │  │     │   │
│  │    │  │              │  │              │  │              │  │     │   │
│  │    │  │ • Cache      │  │ • Campaigns  │  │ • Creatives  │  │     │   │
│  │    │  │ • Sessions   │  │ • Line Items │  │ • Banners    │  │     │   │
│  │    │  │ • Freq Caps  │  │ • Targeting  │  │ • Videos     │  │     │   │
│  │    │  │ • Counters   │  │ • Users      │  │ • HTML5 Ads  │  │     │   │
│  │    │  └──────────────┘  └──────┬───────┘  └──────────────┘  │     │   │
│  │    │                          │                             │     │   │
│  │    │                          ▼                             │     │   │
│  │    │                   ┌──────────────┐                     │     │   │
│  │    │                   │  PostgreSQL  │                     │     │   │
│  │    │                   │   Replica    │                     │     │   │
│  │    │                   │  (Read-only) │                     │     │   │
│  │    │                   └──────────────┘                     │     │   │
│  │    │                                                        │     │   │
│  │    └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  │    ┌────────────────────────────────────────────────────────┐     │   │
│  │    │                   ANALYTICS LAYER                      │     │   │
│  │    │                                                        │     │   │
│  │    │  ┌──────────────────────────────────────────────────┐ │     │   │
│  │    │  │              ClickHouse Cluster                  │ │     │   │
│  │    │  │                                                  │ │     │   │
│  │    │  │  • Impressions Log    • Click Events             │ │     │   │
│  │    │  │  • Conversion Data    • Real-time Aggregations   │ │     │   │
│  │    │  └──────────────────────────────────────────────────┘ │     │   │
│  │    │                                                        │     │   │
│  │    └────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Technology | Purpose | Instances |
|-----------|------------|---------|-----------|
| Ad Server | Go 1.21+ | Ad selection, targeting, tracking | 3 (scalable) |
| Admin API | Go 1.21+ | Campaign management REST API | 2 |
| Admin Dashboard | React 18 | Operator interface | 1 |
| Primary Database | PostgreSQL 15 | Campaign/targeting data | 1 Primary + 1 Replica |
| Cache Layer | Redis 7 | Fast lookups, rate limiting | 3-node cluster |
| Object Storage | MinIO | Creative assets (images, HTML5) | 1 cluster |
| Analytics DB | ClickHouse | Event logging, reporting | 1 cluster |
| Load Balancer | Nginx | Traffic distribution, SSL | 2 (HA pair) |

---

## Technology Stack

### Why Go for the Ad Server?

We recommend **Go (Golang)** for the core ad serving engine based on the following criteria:

#### Performance Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AD SERVER RESPONSE TIME COMPARISON                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Language        Avg Response    Memory/Instance    Concurrent Reqs    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Go              ████ 2ms        ██ 30MB            ████████████ 10K   │
│                                                                         │
│  Rust            ███ 1.5ms       █ 20MB             █████████████ 12K  │
│                                                                         │
│  Node.js         ██████ 8ms      ████ 80MB          ██████ 5K          │
│                                                                         │
│  Java            █████ 6ms       ████████ 200MB     ███████ 6K         │
│                                                                         │
│  Python          ████████ 15ms   ██████ 150MB       ███ 2K             │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Lower is better for Response Time and Memory                          │
│  Higher is better for Concurrent Requests                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Go Advantages for Ad Serving

| Factor | Benefit |
|--------|---------|
| **Compiled Language** | No runtime interpreter; executes at near-native speed |
| **Goroutines** | Lightweight concurrency handles thousands of simultaneous requests |
| **Low Memory** | ~30MB per instance vs 200MB+ for JVM-based solutions |
| **Simple Deployment** | Single binary with no dependencies |
| **Strong Typing** | Catches errors at compile time |
| **Standard Library** | Built-in HTTP server, JSON handling, cryptography |
| **Industry Proven** | Used by Cloudflare, Google, Uber for high-traffic services |

#### Go vs Alternatives

| Criteria | Go | Node.js | Java | Python |
|----------|----|---------|----- |--------|
| Raw Performance | Excellent | Good | Good | Fair |
| Memory Efficiency | Excellent | Good | Poor | Fair |
| Development Speed | Good | Excellent | Good | Excellent |
| Concurrency Model | Excellent | Good | Good | Poor |
| Deployment Simplicity | Excellent | Good | Fair | Fair |
| Team Learning Curve | Moderate | Low | Moderate | Low |
| **Overall for Ad Serving** | **Best Fit** | Acceptable | Overkill | Not Recommended |

### Complete Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TECHNOLOGY STACK                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LAYER              TECHNOLOGY           VERSION    LICENSE             │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ FRONTEND                                                         │   │
│  │                                                                  │   │
│  │  Admin Dashboard    React + TypeScript     18.x      MIT        │   │
│  │  UI Components      Ant Design             5.x       MIT        │   │
│  │  Charts             Apache ECharts         5.x       Apache 2.0 │   │
│  │  State Management   Zustand                4.x       MIT        │   │
│  │  HTTP Client        Axios                  1.x       MIT        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ BACKEND                                                          │   │
│  │                                                                  │   │
│  │  Ad Server          Go                     1.21+     BSD        │   │
│  │  HTTP Framework     Fiber                  2.x       MIT        │   │
│  │  Admin API          Go + Fiber             1.21+     MIT        │   │
│  │  ORM                GORM                   1.x       MIT        │   │
│  │  Validation         go-playground          10.x      MIT        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DATA STORES                                                      │   │
│  │                                                                  │   │
│  │  Primary Database   PostgreSQL             15.x      PostgreSQL │   │
│  │  Cache              Redis                  7.x       BSD        │   │
│  │  Object Storage     MinIO                  Latest    AGPL v3    │   │
│  │  Analytics DB       ClickHouse             23.x      Apache 2.0 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ MOBILE SDKs                                                      │   │
│  │                                                                  │   │
│  │  Android SDK        Kotlin                 1.9+      Apache 2.0 │   │
│  │  iOS SDK            Swift                  5.9+      Apache 2.0 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ INFRASTRUCTURE                                                   │   │
│  │                                                                  │   │
│  │  Load Balancer      Nginx                  1.24+     BSD        │   │
│  │  Containerization   Docker                 24.x      Apache 2.0 │   │
│  │  Orchestration      Docker Compose         2.x       Apache 2.0 │   │
│  │  Monitoring         Prometheus + Grafana   Latest    Apache 2.0 │   │
│  │  Logging            Loki                   Latest    AGPL v3    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CLIENT INTEGRATIONS                                              │   │
│  │                                                                  │   │
│  │  Web Tag            JavaScript (Vanilla)   ES6+      Proprietary│   │
│  │  Android SDK        Kotlin                 1.9+      Proprietary│   │
│  │  iOS SDK            Swift                  5.9+      Proprietary│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Ad Request Flow (Web)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WEB AD REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐                                                          │
│  │  User    │                                                          │
│  │ Browser  │                                                          │
│  └────┬─────┘                                                          │
│       │                                                                 │
│       │ 1. Page Load                                                   │
│       ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    mims.com/singapore                             │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  <div id="ad-slot-homepage-banner">                        │  │  │
│  │  │    <!-- Ad will render here -->                            │  │  │
│  │  │  </div>                                                    │  │  │
│  │  │                                                            │  │  │
│  │  │  <script src="https://ads.mims.com/tag.js"></script>       │  │  │
│  │  │  <script>                                                  │  │  │
│  │  │    MIMSAds.defineSlot('homepage-banner', [728, 90]);       │  │  │
│  │  │    MIMSAds.setTargeting('country', 'sg');                  │  │  │
│  │  │    MIMSAds.setTargeting('section', 'news');                │  │  │
│  │  │    MIMSAds.display('homepage-banner');                     │  │  │
│  │  │  </script>                                                 │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       │                                                                 │
│       │ 2. Ad Request (HTTPS)                                          │
│       │    POST /v1/ad                                                 │
│       │    {                                                           │
│       │      "ad_unit": "homepage-banner",                             │
│       │      "size": [728, 90],                                        │
│       │      "targeting": {                                            │
│       │        "country": "sg",                                        │
│       │        "section": "news"                                       │
│       │      }                                                         │
│       │    }                                                           │
│       ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      LOAD BALANCER                                │  │
│  │                   (ads.mims.com:443)                              │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                        │
│                               │ 3. Route to Ad Server                  │
│                               ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        AD SERVER (Go)                             │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                            │  │  │
│  │  │  4. Parse Request                                          │  │  │
│  │  │     ↓                                                      │  │  │
│  │  │  5. Check Redis Cache ─────────────────────┐               │  │  │
│  │  │     ↓                                      │               │  │  │
│  │  │  6. Get Active Campaigns                   │               │  │  │
│  │  │     (from cache or PostgreSQL)             │               │  │  │
│  │  │     ↓                                      ▼               │  │  │
│  │  │  7. Filter by Targeting         ┌─────────────────┐       │  │  │
│  │  │     • ad_unit = homepage-banner │     Redis       │       │  │  │
│  │  │     • country = sg              │  ┌───────────┐  │       │  │  │
│  │  │     • section = news            │  │ Campaigns │  │       │  │  │
│  │  │     ↓                           │  │   Cache   │  │       │  │  │
│  │  │  8. Check Frequency Caps        │  └───────────┘  │       │  │  │
│  │  │     ↓                           │  ┌───────────┐  │       │  │  │
│  │  │  9. Select Winner (by priority) │  │ Freq Caps │  │       │  │  │
│  │  │     ↓                           │  └───────────┘  │       │  │  │
│  │  │ 10. Build Response              └─────────────────┘       │  │  │
│  │  │                                                            │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                        │
│                               │ 11. Ad Response (JSON)                 │
│                               │     {                                  │
│                               │       "ad_id": "ad_12345",             │
│                               │       "creative_url": "https://...",   │
│                               │       "click_url": "https://...",      │
│                               │       "impression_url": "https://..."  │
│                               │     }                                  │
│                               ▼                                        │
│  ┌──────────────┐                                                      │
│  │   Browser    │ 12. Render Banner                                   │
│  │              │     • Load creative image                           │
│  │  ┌────────┐  │     • Fire impression pixel                         │
│  │  │ BANNER │  │     • Attach click handler                          │
│  │  └────────┘  │                                                      │
│  └──────┬───────┘                                                      │
│         │                                                              │
│         │ 13. Impression Tracked                                       │
│         │     GET /v1/impression?id=ad_12345                          │
│         ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       CLICKHOUSE                                  │  │
│  │                                                                   │  │
│  │  INSERT INTO impressions (ad_id, timestamp, country, ...)        │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  TOTAL LATENCY TARGET: <50ms (steps 2-11)                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ad Request Flow (Mobile SDK)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MOBILE AD REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     MOBILE APP (iOS/Android)                    │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  // Initialize SDK                                        │  │    │
│  │  │  MIMSAds.initialize("app_key_sg")                         │  │    │
│  │  │                                                           │  │    │
│  │  │  // Request Banner Ad                                     │  │    │
│  │  │  val bannerView = MIMSBannerView(context)                 │  │    │
│  │  │  bannerView.adUnitId = "mobile-article-banner"            │  │    │
│  │  │  bannerView.setTargeting("section", "drug-info")          │  │    │
│  │  │  bannerView.setTargeting("content_id", "12345")           │  │    │
│  │  │  bannerView.loadAd()                                      │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                              │                                  │    │
│  └──────────────────────────────┼──────────────────────────────────┘    │
│                                 │                                       │
│                                 │ 1. SDK sends ad request               │
│                                 │    POST /v1/mobile/ad                 │
│                                 │    Headers:                           │
│                                 │      X-App-Key: app_key_sg            │
│                                 │      X-Device-ID: (hashed)            │
│                                 │      X-App-Version: 2.5.0             │
│                                 │    Body:                              │
│                                 │      {                                │
│                                 │        "ad_unit": "mobile-banner",    │
│                                 │        "size": [320, 50],             │
│                                 │        "targeting": {...}             │
│                                 │      }                                │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         AD SERVER                                 │  │
│  │                                                                   │  │
│  │   ┌─────────────────────────────────────────────────────────┐    │  │
│  │   │  2. Validate App Key                                     │    │  │
│  │   │  3. Resolve Country from App Key (sg)                    │    │  │
│  │   │  4. Match Campaigns (same logic as web)                  │    │  │
│  │   │  5. Apply Mobile-specific rules:                         │    │  │
│  │   │     • Device frequency cap                               │    │  │
│  │   │     • App version targeting                              │    │  │
│  │   │     • OS targeting (iOS/Android)                         │    │  │
│  │   │  6. Return ad response                                   │    │  │
│  │   └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                   │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                        │
│                               │ 7. Ad Response                         │
│                               ▼                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     MOBILE APP                                  │    │
│  │                                                                 │    │
│  │   ┌────────────────────────────────────────────────────────┐   │    │
│  │   │                                                        │   │    │
│  │   │  8. SDK receives response                              │   │    │
│  │   │  9. Download creative (cached if already exists)       │   │    │
│  │   │ 10. Render banner in BannerView                        │   │    │
│  │   │ 11. Fire impression event                              │   │    │
│  │   │                                                        │   │    │
│  │   │  ┌──────────────────────────────────────────────────┐ │   │    │
│  │   │  │  ┌────────────────────────────────────────────┐  │ │   │    │
│  │   │  │  │           BANNER AD DISPLAYED              │  │ │   │    │
│  │   │  │  └────────────────────────────────────────────┘  │ │   │    │
│  │   │  │                    320x50                        │ │   │    │
│  │   │  └──────────────────────────────────────────────────┘ │   │    │
│  │   │                                                        │   │    │
│  │   │ 12. On tap → Open click URL in browser                │   │    │
│  │   │ 13. Fire click event                                  │   │    │
│  │   │                                                        │   │    │
│  │   └────────────────────────────────────────────────────────┘   │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Campaign Management Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CAMPAIGN MANAGEMENT FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐                                                    │
│  │    Operator    │                                                    │
│  │  (5 users)     │                                                    │
│  └───────┬────────┘                                                    │
│          │                                                              │
│          │ 1. Login to Admin Dashboard                                 │
│          ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ADMIN DASHBOARD (React)                        │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                                                             │ │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │ │  │
│  │  │  │Campaigns│ │Creatives│ │Targeting│ │ Reports │           │ │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │ │  │
│  │  │                                                             │ │  │
│  │  │  ┌───────────────────────────────────────────────────────┐ │ │  │
│  │  │  │ CREATE NEW CAMPAIGN                                   │ │ │  │
│  │  │  │                                                       │ │ │  │
│  │  │  │ Campaign Name: [Q1 Product Launch                  ]  │ │ │  │
│  │  │  │ Advertiser:    [MIMS Internal                      ]  │ │ │  │
│  │  │  │ Start Date:    [2026-02-15] End Date: [2026-03-15]   │ │ │  │
│  │  │  │ Priority:      [High (8)                           ]  │ │ │  │
│  │  │  │                                                       │ │ │  │
│  │  │  │ [+ Add Line Item]                                     │ │ │  │
│  │  │  └───────────────────────────────────────────────────────┘ │ │  │
│  │  │                                                             │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                   │
│                                     │ 2. API Call                       │
│                                     │    POST /api/campaigns            │
│                                     ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        ADMIN API (Go)                             │  │
│  │                                                                   │  │
│  │   3. Validate request                                            │  │
│  │   4. Check user permissions                                      │  │
│  │   5. Save to PostgreSQL                                          │  │
│  │   6. Invalidate Redis cache                                      │  │
│  │   7. Return success                                              │  │
│  │                                                                   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                   │
│         ┌───────────────────────────┼───────────────────────────┐      │
│         │                           │                           │      │
│         ▼                           ▼                           ▼      │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐  │
│  │ PostgreSQL  │           │    Redis    │           │  Ad Server  │  │
│  │             │           │             │           │             │  │
│  │ Campaign    │           │ Cache       │           │ Picks up    │  │
│  │ saved       │           │ invalidated │           │ new campaign│  │
│  │             │           │             │           │ on next req │  │
│  └─────────────┘           └─────────────┘           └─────────────┘  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  CAMPAIGN HIERARCHY (matches GAM structure):                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CAMPAIGN (Order)                                                 │   │
│  │ └── LINE ITEM                                                    │   │
│  │     ├── Targeting Rules (key-value)                             │   │
│  │     ├── Scheduling (dates, dayparting)                          │   │
│  │     ├── Frequency Cap                                           │   │
│  │     ├── Priority                                                │   │
│  │     └── CREATIVES                                               │   │
│  │         ├── Banner Image (728x90)                               │   │
│  │         ├── Banner Image (300x250)                              │   │
│  │         └── HTML5 Ad                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Reporting & Analytics Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     REPORTING & ANALYTICS FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        EVENT COLLECTION                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │
│  │   Web    │  │ Android  │  │   iOS    │                             │
│  │  Users   │  │   Users  │  │  Users   │                             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                             │
│       │             │             │                                    │
│       │ Impressions & Clicks      │                                    │
│       └─────────────┼─────────────┘                                    │
│                     ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        AD SERVER                                  │  │
│  │                                                                   │  │
│  │   /v1/impression?ad_id=123&line_item=456&...                     │  │
│  │   /v1/click?ad_id=123&redirect=https://...                       │  │
│  │                                                                   │  │
│  │   Events buffered in memory, batch inserted every 1 second       │  │
│  │                                                                   │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                        │
│                               │ Batch Insert                           │
│                               ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       CLICKHOUSE                                  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ TABLE: impressions                                          │ │  │
│  │  │ ─────────────────────────────────────────────────────────── │ │  │
│  │  │ timestamp    │ ad_id  │ line_item │ country │ device │ ... │ │  │
│  │  │ ─────────────────────────────────────────────────────────── │ │  │
│  │  │ 2026-02-09   │ 12345  │ 100       │ sg      │ mobile │     │ │  │
│  │  │ 2026-02-09   │ 12346  │ 101       │ hk      │ web    │     │ │  │
│  │  │ ...          │ ...    │ ...       │ ...     │ ...    │     │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ TABLE: clicks                                               │ │  │
│  │  │ ─────────────────────────────────────────────────────────── │ │  │
│  │  │ timestamp    │ ad_id  │ line_item │ country │ device │ ... │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                         REPORTING                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌────────────────┐                                                    │
│  │    Operator    │                                                    │
│  └───────┬────────┘                                                    │
│          │                                                              │
│          │ View Reports                                                │
│          ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ADMIN DASHBOARD                                │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ CAMPAIGN PERFORMANCE REPORT                                 │ │  │
│  │  │                                                             │ │  │
│  │  │ Date Range: [2026-02-01] to [2026-02-09]                   │ │  │
│  │  │ Campaign: [Q1 Product Launch]                               │ │  │
│  │  │                                                             │ │  │
│  │  │ ┌─────────────────────────────────────────────────────────┐│ │  │
│  │  │ │                                                         ││ │  │
│  │  │ │  Impressions   Clicks    CTR      Countries             ││ │  │
│  │  │ │  ──────────────────────────────────────────────────     ││ │  │
│  │  │ │     125,432      1,254   1.00%    SG: 45%               ││ │  │
│  │  │ │                                   MY: 25%               ││ │  │
│  │  │ │     ████████████████              PH: 15%               ││ │  │
│  │  │ │     ▲                             Others: 15%           ││ │  │
│  │  │ │   Feb 1  Feb 3  Feb 5  Feb 7  Feb 9                     ││ │  │
│  │  │ │                                                         ││ │  │
│  │  │ └─────────────────────────────────────────────────────────┘│ │  │
│  │  │                                                             │ │  │
│  │  │ [Export CSV]  [Export PDF]  [Schedule Report]              │ │  │
│  │  │                                                             │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  WHY CLICKHOUSE?                                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  Query: "Sum impressions by country for last 30 days"          │   │
│  │                                                                 │   │
│  │  PostgreSQL:  ~2,500ms  (full table scan)                      │   │
│  │  ClickHouse:     ~15ms  (columnar, compressed)                 │   │
│  │                                                                 │   │
│  │  At 2M impressions/month, ClickHouse provides:                 │   │
│  │  • 100x faster aggregation queries                             │   │
│  │  • 10x better compression (less storage)                       │   │
│  │  • Real-time analytics without impacting ad serving            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tracking Implementation

### Overview

The MIMS Ad Manager implements three core tracking mechanisms:

| Tracking Type | Purpose | Implementation |
|---------------|---------|----------------|
| **Impressions** | Count ad loads | Tracking pixel |
| **Viewability** | Measure actual ad visibility | Intersection Observer API |
| **Clicks** | Track user engagement | Click redirect |
| **Frequency Capping** | Limit ad exposure per user | Redis counters |

### Viewability Tracking

Viewability measures whether an ad was actually seen by the user, not just loaded on the page. We follow the IAB/MRC standard:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIEWABILITY STANDARD                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  An ad is considered "viewable" when:                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │   >= 50% of pixels visible   +   >= 1 second continuous view   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Example scenarios:                                                     │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐│
│  │    ┌─────────┐     │  │ ┌─────────┐        │  │         ┌────────┐││
│  │    │   AD    │     │  │ │   AD    │        │  │         │   AD   │││
│  │    │  100%   │     │  │ │   60%   │        │  │         │   30%  │││
│  │    │ visible │     │  │ │ visible │        │  │         │visible │││
│  │    └─────────┘     │  │ └─────────┘        │  │         └────────┘││
│  │                    │  │ ─────────── fold   │  │ ─────────── fold  ││
│  │   VIEWABLE         │  │   VIEWABLE         │  │   NOT VIEWABLE    ││
│  │   (if 1s+ viewed)  │  │   (if 1s+ viewed)  │  │   (< 50% visible) ││
│  └────────────────────┘  └────────────────────┘  └────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Viewability Implementation

**Web (JavaScript):** Uses Intersection Observer API (supported by all modern browsers)

```javascript
// Simplified logic inside Ad Tag (tag.js)
const observer = new IntersectionObserver((entries) => {
  if (entries[0].intersectionRatio >= 0.5) {
    // Start 1-second timer
    setTimeout(() => {
      if (stillVisible) {
        fetch('/v1/viewable?id=' + impressionId);
      }
    }, 1000);
  }
}, { threshold: 0.5 });
```

**Mobile SDKs:** Use native visibility detection
- Android: `View.getGlobalVisibleRect()` with Handler timer
- iOS: `UIView` visibility checks with Timer

### Frequency Capping

Frequency capping limits how many times a user sees the same ad within a time period.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FREQUENCY CAPPING FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Configuration (per Line Item):                                         │
│  "Show max 3 impressions per user per 24 hours"                        │
│                                                                         │
│  ┌─────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ Browser │         │  Ad Server  │         │    Redis    │           │
│  └────┬────┘         └──────┬──────┘         └──────┬──────┘           │
│       │                     │                       │                   │
│       │ 1. Request ad       │                       │                   │
│       │    uid=abc123       │                       │                   │
│       │────────────────────>│                       │                   │
│       │                     │                       │                   │
│       │                     │ 2. GET fc:101:abc123  │                   │
│       │                     │──────────────────────>│                   │
│       │                     │                       │                   │
│       │                     │ 3. Returns: 2         │                   │
│       │                     │<──────────────────────│                   │
│       │                     │                       │                   │
│       │                     │ 4. 2 < 3 = OK to show │                   │
│       │                     │                       │                   │
│       │ 5. Return ad        │                       │                   │
│       │<────────────────────│                       │                   │
│       │                     │                       │                   │
│       │ 6. Fire impression  │                       │                   │
│       │────────────────────>│                       │                   │
│       │                     │                       │                   │
│       │                     │ 7. INCR fc:101:abc123 │                   │
│       │                     │──────────────────────>│ Now = 3          │
│       │                     │                       │                   │
│       │                     │ (Next request: 3 >= 3 = SKIP this ad)    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Simple User Identification (For Frequency Capping Only)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SIMPLE USER IDENTIFICATION                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WEB: First-Party Cookie (Automatic)                                   │
│  ───────────────────────────────────────────────────────────────────── │
│  • Ad Tag auto-generates random UUID on first visit                    │
│  • Stored in cookie: mims_uid=a1b2c3d4-5678-90ab-cdef                  │
│  • Expires in 1 year                                                   │
│  • No login or consent required (first-party, functional cookie)       │
│                                                                         │
│  MOBILE: App-Generated ID (No Permissions Required)                    │
│  ───────────────────────────────────────────────────────────────────── │
│  • SDK generates random UUID on first app launch                       │
│  • Android: Stored in SharedPreferences                                │
│  • iOS: Stored in UserDefaults                                         │
│  • No IDFA/GAID needed, no tracking permission prompts                 │
│                                                                         │
│  KEY BENEFITS:                                                          │
│  ───────────────────────────────────────────────────────────────────── │
│  [✓] No login required                                                  │
│  [✓] No tracking permissions needed                                     │
│  [✓] Fully automatic                                                    │
│  [✓] Privacy-friendly (random ID, not linked to identity)              │
│  [✓] Sufficient for frequency capping                                   │
│                                                                         │
│  LIMITATIONS (acceptable for Phase 1):                                  │
│  ───────────────────────────────────────────────────────────────────── │
│  [!] User clears cookies = new ID = frequency cap resets               │
│  [!] Different devices = different IDs (no cross-device capping)       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Redis Key Structure

```
Key Format:   fc:{line_item_id}:{user_id}
Value:        Integer (impression count)
TTL:          Auto-expires based on cap period

Example:
┌──────────────────────────────────┬───────┬─────────────────┐
│ Key                              │ Value │ TTL (seconds)   │
├──────────────────────────────────┼───────┼─────────────────┤
│ fc:101:a1b2c3d4-5678             │ 3     │ 64800 (18 hrs)  │
│ fc:101:e5f6g7h8-1234             │ 1     │ 82800 (23 hrs)  │
│ fc:102:a1b2c3d4-5678             │ 2     │ 43200 (12 hrs)  │
└──────────────────────────────────┴───────┴─────────────────┘

Supported Cap Periods: Per Hour, Per Day, Per Week, Per Month, Lifetime
```

### Complete Event Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TRACKING EVENTS TIMELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  0ms          50ms                1050ms                 5000ms         │
│  │            │                   │                      │              │
│  ▼            ▼                   ▼                      ▼              │
│  Page      Impression          Viewable               Click            │
│  Load      Event               Event                  Event            │
│            (ad rendered)       (1s at 50%+)           (user taps)      │
│                                                                         │
│  Data captured per event:                                               │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  IMPRESSION:           VIEWABLE:              CLICK:                   │
│  • impression_id       • impression_id        • click_id               │
│  • timestamp           • timestamp            • impression_id          │
│  • line_item_id        • view_duration_ms     • timestamp              │
│  • campaign_id         • visible_percent      • destination_url        │
│  • creative_id                                                         │
│  • ad_unit                                                             │
│  • country                                                             │
│  • platform                                                            │
│  • page_url                                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tracking Metrics Summary

| Metric | Calculation | Available |
|--------|-------------|-----------|
| **Impressions** | Count of impression events | Yes |
| **Viewable Impressions** | Count of viewable events | Yes |
| **Viewability Rate** | Viewable / Impressions × 100% | Yes |
| **Clicks** | Count of click events | Yes |
| **CTR** | Clicks / Impressions × 100% | Yes |
| **Viewable CTR** | Clicks / Viewable × 100% | Yes |
| **By Country** | Group by country | Yes |
| **By Platform** | Group by platform | Yes |
| **By Ad Unit** | Group by ad_unit | Yes |

---

## Client Integration

This section describes how to integrate MIMS Ad Manager with your website and mobile apps.

### Web Integration Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEB AD DISPLAY FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. PAGE LOADS                                                          │
│     |                                                                   │
│     v                                                                   │
│  2. AD TAG SCRIPT LOADS (tag.js)                                       │
│     |                                                                   │
│     v                                                                   │
│  3. DEFINE AD SLOTS (where ads can appear)                             │
│     |                                                                   │
│     v                                                                   │
│  4. SET TARGETING (country, section, key-values)                       │
│     |                                                                   │
│     v                                                                   │
│  5. REQUEST ADS FROM SERVER                                            │
│     |                                                                   │
│     v                                                                   │
│  6. SERVER RETURNS AD DATA                                             │
│     |                                                                   │
│     v                                                                   │
│  7. RENDER ADS IN SLOTS                                                │
│     |                                                                   │
│     v                                                                   │
│  8. TRACK IMPRESSIONS, VIEWABILITY, AND CLICKS                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Add the Tag to Your Page

Include the MIMS Ad Tag in the `<head>` section of every page that will display ads:

```html
<!-- MIMS Ad Tag - Add to <head> section -->
<script async src="https://ads.mims.com/tag.js"></script>
<script>
  window.MIMSAds = window.MIMSAds || { cmd: [] };
</script>
```

### Step 2: Create Ad Slot Containers

Add `<div>` elements where you want ads to appear:

```html
<!-- Leaderboard banner at top of page -->
<div id="ad-leaderboard"></div>

<!-- Sidebar banner -->
<div id="ad-sidebar"></div>

<!-- Footer banner -->
<div id="ad-footer"></div>
```

### Step 3: Configure and Display Ads

Add the configuration script to define slots and request ads:

```html
<script>
  MIMSAds.cmd.push(function() {

    // Define ad slots with sizes
    MIMSAds.defineSlot('leaderboard', {
      element: 'ad-leaderboard',
      sizes: [[728, 90], [320, 50]]  // Desktop and mobile sizes
    });

    MIMSAds.defineSlot('sidebar', {
      element: 'ad-sidebar',
      sizes: [[300, 250]]
    });

    MIMSAds.defineSlot('footer', {
      element: 'ad-footer',
      sizes: [[728, 90], [320, 50]]
    });

    // Set page-level targeting (key-values)
    MIMSAds.setTargeting('country', 'sg');
    MIMSAds.setTargeting('section', 'drug-info');
    MIMSAds.setTargeting('content_type', 'article');

    // Request and display all ads
    MIMSAds.display();

  });
</script>
```

### Complete Page Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>MIMS Singapore - Drug Information</title>

  <!-- MIMS Ad Tag -->
  <script async src="https://ads.mims.com/tag.js"></script>
  <script>
    window.MIMSAds = window.MIMSAds || { cmd: [] };
  </script>
</head>

<body>
  <!-- Header -->
  <header>
    <h1>MIMS Singapore</h1>
  </header>

  <!-- Leaderboard Banner -->
  <div id="ad-leaderboard"></div>

  <!-- Main Content -->
  <main>
    <article>
      <h2>Drug Information Article</h2>
      <p>Article content here...</p>
    </article>

    <aside>
      <div id="ad-sidebar"></div>
    </aside>
  </main>

  <!-- Footer Banner -->
  <div id="ad-footer"></div>

  <!-- Ad Configuration -->
  <script>
    MIMSAds.cmd.push(function() {

      MIMSAds.defineSlot('leaderboard', {
        element: 'ad-leaderboard',
        sizes: [[728, 90], [320, 50]]
      });

      MIMSAds.defineSlot('sidebar', {
        element: 'ad-sidebar',
        sizes: [[300, 250]]
      });

      MIMSAds.defineSlot('footer', {
        element: 'ad-footer',
        sizes: [[728, 90], [320, 50]]
      });

      MIMSAds.setTargeting('country', 'sg');
      MIMSAds.setTargeting('section', 'drug-info');

      MIMSAds.display();
    });
  </script>
</body>
</html>
```

### Ad Request Flow (Behind the Scenes)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AD REQUEST/RESPONSE FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                          ┌──────────────┐            │
│  │   Browser    │                          │  Ad Server   │            │
│  └──────┬───────┘                          └──────┬───────┘            │
│         │                                         │                     │
│         │  POST /v1/ads                           │                     │
│         │  {                                      │                     │
│         │    "slots": [                           │                     │
│         │      {"id": "leaderboard", "sizes": [[728,90],[320,50]]},    │
│         │      {"id": "sidebar", "sizes": [[300,250]]},                │
│         │      {"id": "footer", "sizes": [[728,90]]}                   │
│         │    ],                                   │                     │
│         │    "targeting": {                       │                     │
│         │      "country": "sg",                   │                     │
│         │      "section": "drug-info"             │                     │
│         │    },                                   │                     │
│         │    "uid": "abc123-def456-..."           │                     │
│         │  }                                      │                     │
│         │─────────────────────────────────────────>                     │
│         │                                         │                     │
│         │                                         │ 1. Match campaigns  │
│         │                                         │ 2. Check freq caps  │
│         │                                         │ 3. Select winners   │
│         │                                         │ 4. Build response   │
│         │                                         │                     │
│         │  Response: 200 OK                       │                     │
│         │  {                                      │                     │
│         │    "ads": [                             │                     │
│         │      {                                  │                     │
│         │        "slot": "leaderboard",           │                     │
│         │        "width": 728,                    │                     │
│         │        "height": 90,                    │                     │
│         │        "html": "<a href='...'><img/>",  │                     │
│         │        "impressionUrl": "/v1/imp?id=x", │                     │
│         │        "viewableUrl": "/v1/view?id=x"   │                     │
│         │      },                                 │                     │
│         │      { "slot": "sidebar", ... },        │                     │
│         │      { "slot": "footer", ... }          │                     │
│         │    ]                                    │                     │
│         │  }                                      │                     │
│         │<─────────────────────────────────────────                     │
│         │                                         │                     │
│         │  Tag then:                              │                     │
│         │  • Injects HTML into each slot          │                     │
│         │  • Fires impression pixels              │                     │
│         │  • Starts viewability tracking          │                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rendered Page Result

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RENDERED PAGE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     MIMS Singapore                       [Login]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │               LEADERBOARD BANNER (728x90)                        │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────┐ ┌───────────────────┐ │
│  │                                             │ │                   │ │
│  │  Drug Information Article                   │ │                   │ │
│  │  ----------------------------               │ │     SIDEBAR       │ │
│  │                                             │ │    (300x250)      │ │
│  │  Lorem ipsum dolor sit amet...              │ │                   │ │
│  │                                             │ │                   │ │
│  │                                             │ │                   │ │
│  │                                             │ └───────────────────┘ │
│  │                                             │                       │
│  └─────────────────────────────────────────────┘                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │                 FOOTER BANNER (728x90)                           │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Responsive Ads (Mobile vs Desktop)

Use size mapping to serve different ad sizes based on screen width:

```html
<script>
  MIMSAds.cmd.push(function() {

    MIMSAds.defineSlot('leaderboard', {
      element: 'ad-leaderboard',
      sizes: [[728, 90], [320, 50]],
      sizeMapping: [
        { viewport: [1024, 0], sizes: [[728, 90]] },   // Desktop: 728x90
        { viewport: [768, 0], sizes: [[468, 60]] },    // Tablet: 468x60
        { viewport: [0, 0], sizes: [[320, 50]] }       // Mobile: 320x50
      ]
    });

    MIMSAds.display();
  });
</script>
```

### Common Ad Sizes

| Size | Name | Common Usage |
|------|------|--------------|
| 728x90 | Leaderboard | Top/bottom of page (desktop) |
| 320x50 | Mobile Leaderboard | Top/bottom of page (mobile) |
| 300x250 | Medium Rectangle | Sidebar, in-content |
| 160x600 | Wide Skyscraper | Sidebar |
| 300x600 | Half Page | Sidebar |
| 320x100 | Large Mobile Banner | Mobile pages |

### Mobile App Integration

Mobile apps integrate using native SDKs that follow a similar pattern:

**Android (Kotlin)**

```kotlin
class ArticleActivity : AppCompatActivity() {

    private lateinit var bannerView: MIMSBannerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_article)

        // Initialize SDK
        MIMSAds.initialize(this, "app_key_sg")

        // Setup banner
        bannerView = findViewById(R.id.banner_view)
        bannerView.adUnitId = "mobile-article-banner"
        bannerView.setAdSize(AdSize.BANNER_320x50)

        // Set targeting
        bannerView.setTargeting("section", "drug-info")
        bannerView.setTargeting("article_id", "12345")

        // Load ad
        bannerView.loadAd()
    }
}
```

**iOS (Swift)**

```swift
class ArticleViewController: UIViewController {

    @IBOutlet weak var bannerView: MIMSBannerView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Initialize SDK
        MIMSAds.initialize(appKey: "app_key_sg")

        // Setup banner
        bannerView.adUnitId = "mobile-article-banner"
        bannerView.adSize = .banner320x50

        // Set targeting
        bannerView.setTargeting(key: "section", value: "drug-info")
        bannerView.setTargeting(key: "article_id", value: "12345")

        // Load ad
        bannerView.loadAd()
    }
}
```

### API Reference (Tag.js)

| Method | Description | Example |
|--------|-------------|---------|
| `defineSlot(id, options)` | Define an ad placement | `MIMSAds.defineSlot('banner', {element: 'ad-div', sizes: [[728,90]]})` |
| `setTargeting(key, value)` | Set page-level targeting | `MIMSAds.setTargeting('country', 'sg')` |
| `display()` | Request and render all defined ads | `MIMSAds.display()` |
| `refresh(slotId)` | Refresh a specific ad slot | `MIMSAds.refresh('banner')` |
| `destroySlot(slotId)` | Remove an ad slot | `MIMSAds.destroySlot('banner')` |

---

## Database Design

### PostgreSQL Schema (Core Data)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL SCHEMA DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐         ┌─────────────────────────┐       │
│  │       advertisers       │         │         users           │       │
│  ├─────────────────────────┤         ├─────────────────────────┤       │
│  │ id (PK)                 │         │ id (PK)                 │       │
│  │ name                    │         │ email                   │       │
│  │ contact_email           │         │ password_hash           │       │
│  │ created_at              │         │ role                    │       │
│  │ updated_at              │         │ created_at              │       │
│  └───────────┬─────────────┘         └─────────────────────────┘       │
│              │                                                          │
│              │ 1:N                                                      │
│              ▼                                                          │
│  ┌─────────────────────────┐                                           │
│  │       campaigns         │                                           │
│  ├─────────────────────────┤                                           │
│  │ id (PK)                 │                                           │
│  │ advertiser_id (FK)      │                                           │
│  │ name                    │                                           │
│  │ status                  │──────── enum: draft, active, paused,      │
│  │ start_date              │               completed, archived         │
│  │ end_date                │                                           │
│  │ created_by (FK → users) │                                           │
│  │ created_at              │                                           │
│  │ updated_at              │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              │ 1:N                                                      │
│              ▼                                                          │
│  ┌─────────────────────────┐         ┌─────────────────────────┐       │
│  │      line_items         │         │       ad_units          │       │
│  ├─────────────────────────┤         ├─────────────────────────┤       │
│  │ id (PK)                 │         │ id (PK)                 │       │
│  │ campaign_id (FK)        │    ┌───▶│ code (unique)           │       │
│  │ name                    │    │    │ name                    │       │
│  │ status                  │    │    │ sizes (JSONB)           │       │
│  │ priority (1-16)         │    │    │ platforms               │       │
│  │ start_date              │    │    │ created_at              │       │
│  │ end_date                │    │    └─────────────────────────┘       │
│  │ goal_type               │    │                                      │
│  │ goal_value              │    │                                      │
│  │ frequency_cap           │    │    ┌─────────────────────────┐       │
│  │ frequency_cap_period    │    │    │   targeting_rules       │       │
│  │ created_at              │    │    ├─────────────────────────┤       │
│  │ updated_at              │    │    │ id (PK)                 │       │
│  └───────────┬─────────────┘    │    │ line_item_id (FK)       │       │
│              │                  │    │ ad_unit_id (FK) ────────┘       │
│              │                  │    │ key                     │       │
│              │ 1:N              │    │ operator                │       │
│              │                  │    │ values (JSONB)          │       │
│              │    ┌─────────────┘    │ created_at              │       │
│              │    │                  └─────────────────────────┘       │
│              │    │                            ▲                       │
│              │    │                            │                       │
│              ▼    │                            │ 1:N                   │
│  ┌─────────────────────────┐                   │                       │
│  │ line_item_creatives     │                   │                       │
│  ├─────────────────────────┤                   │                       │
│  │ line_item_id (FK)       │───────────────────┘                       │
│  │ creative_id (FK)        │                                           │
│  │ weight                  │                                           │
│  └───────────┬─────────────┘                                           │
│              │                                                          │
│              │ N:1                                                      │
│              ▼                                                          │
│  ┌─────────────────────────┐                                           │
│  │       creatives         │                                           │
│  ├─────────────────────────┤                                           │
│  │ id (PK)                 │                                           │
│  │ name                    │                                           │
│  │ type                    │──────── enum: image, html5, video         │
│  │ width                   │                                           │
│  │ height                  │                                           │
│  │ file_url                │──────── MinIO storage URL                 │
│  │ click_url               │                                           │
│  │ alt_text                │                                           │
│  │ status                  │──────── enum: pending, approved, rejected │
│  │ created_by (FK → users) │                                           │
│  │ created_at              │                                           │
│  │ updated_at              │                                           │
│  └─────────────────────────┘                                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  KEY-VALUE TARGETING EXAMPLE:                                          │
│                                                                         │
│  targeting_rules table:                                                │
│  ┌────┬──────────────┬──────────┬──────────┬────────────────────────┐  │
│  │ id │ line_item_id │ key      │ operator │ values                 │  │
│  ├────┼──────────────┼──────────┼──────────┼────────────────────────┤  │
│  │ 1  │ 100          │ country  │ IN       │ ["sg", "my", "ph"]     │  │
│  │ 2  │ 100          │ section  │ IN       │ ["news", "articles"]   │  │
│  │ 3  │ 100          │ ad_unit  │ EQ       │ ["homepage-banner"]    │  │
│  │ 4  │ 101          │ country  │ NOT_IN   │ ["in"]                 │  │
│  └────┴──────────────┴──────────┴──────────┴────────────────────────┘  │
│                                                                         │
│  Operators: EQ, NOT_EQ, IN, NOT_IN, CONTAINS, REGEX                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### ClickHouse Schema (Analytics)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLICKHOUSE SCHEMA                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TABLE: impressions                                                    │
│  ──────────────────────────────────────────────────────────────────    │
│  ENGINE = MergeTree()                                                  │
│  PARTITION BY toYYYYMM(timestamp)                                      │
│  ORDER BY (timestamp, line_item_id, country)                           │
│                                                                         │
│  ┌────────────────┬────────────┬───────────────────────────────────┐   │
│  │ Column         │ Type       │ Description                       │   │
│  ├────────────────┼────────────┼───────────────────────────────────┤   │
│  │ timestamp      │ DateTime64 │ Event time (millisecond precision)│   │
│  │ impression_id  │ UUID       │ Unique impression identifier      │   │
│  │ ad_id          │ UInt64     │ Creative ID                       │   │
│  │ line_item_id   │ UInt64     │ Line item ID                      │   │
│  │ campaign_id    │ UInt64     │ Campaign ID                       │   │
│  │ ad_unit        │ String     │ Ad unit code                      │   │
│  │ country        │ LowCard... │ Country code (sg, my, ph, etc.)   │   │
│  │ platform       │ LowCard... │ web, android, ios                 │   │
│  │ device_type    │ LowCard... │ desktop, mobile, tablet           │   │
│  │ user_id        │ String     │ Hashed user/device ID             │   │
│  │ page_url       │ String     │ Page where ad was shown           │   │
│  │ targeting_kv   │ Map(S,S)   │ Key-value pairs from request      │   │
│  └────────────────┴────────────┴───────────────────────────────────┘   │
│                                                                         │
│  TABLE: clicks                                                         │
│  ──────────────────────────────────────────────────────────────────    │
│  ENGINE = MergeTree()                                                  │
│  PARTITION BY toYYYYMM(timestamp)                                      │
│  ORDER BY (timestamp, line_item_id)                                    │
│                                                                         │
│  ┌────────────────┬────────────┬───────────────────────────────────┐   │
│  │ Column         │ Type       │ Description                       │   │
│  ├────────────────┼────────────┼───────────────────────────────────┤   │
│  │ timestamp      │ DateTime64 │ Click time                        │   │
│  │ click_id       │ UUID       │ Unique click identifier           │   │
│  │ impression_id  │ UUID       │ Links to impression               │   │
│  │ ad_id          │ UInt64     │ Creative ID                       │   │
│  │ line_item_id   │ UInt64     │ Line item ID                      │   │
│  │ campaign_id    │ UInt64     │ Campaign ID                       │   │
│  │ country        │ LowCard... │ Country code                      │   │
│  │ platform       │ LowCard... │ web, android, ios                 │   │
│  │ destination    │ String     │ Click destination URL             │   │
│  └────────────────┴────────────┴───────────────────────────────────┘   │
│                                                                         │
│  MATERIALIZED VIEW: daily_stats                                        │
│  ──────────────────────────────────────────────────────────────────    │
│  Pre-aggregated daily statistics for fast dashboard queries            │
│                                                                         │
│  ┌────────────────┬────────────┬───────────────────────────────────┐   │
│  │ date           │ Date       │ Aggregation date                  │   │
│  │ campaign_id    │ UInt64     │ Campaign ID                       │   │
│  │ line_item_id   │ UInt64     │ Line item ID                      │   │
│  │ country        │ String     │ Country code                      │   │
│  │ platform       │ String     │ Platform                          │   │
│  │ impressions    │ UInt64     │ Total impressions                 │   │
│  │ clicks         │ UInt64     │ Total clicks                      │   │
│  │ unique_users   │ UInt64     │ Unique user count                 │   │
│  └────────────────┴────────────┴───────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Requirements

### Hardware Specifications

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE REQUIREMENTS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MINIMUM VIABLE PRODUCTION (MVP)                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ COMPUTE SERVERS                                                  │   │
│  │                                                                  │   │
│  │ Role              Qty   CPU    RAM    Disk    Purpose            │   │
│  │ ────────────────────────────────────────────────────────────     │   │
│  │ Ad Server         2     4C     8GB    50GB    Ad serving API     │   │
│  │ Admin API         1     2C     4GB    50GB    Campaign mgmt      │   │
│  │ Admin Dashboard   1     2C     4GB    50GB    React frontend     │   │
│  │ Load Balancer     1     2C     4GB    20GB    Nginx (can be HA)  │   │
│  │                                                                  │   │
│  │ Total Compute: 5 servers                                         │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DATABASE SERVERS                                                 │   │
│  │                                                                  │   │
│  │ Role              Qty   CPU    RAM    Disk    Purpose            │   │
│  │ ────────────────────────────────────────────────────────────     │   │
│  │ PostgreSQL        1     4C     16GB   200GB   Primary DB         │   │
│  │ PostgreSQL        1     4C     16GB   200GB   Read Replica       │   │
│  │ Redis             1     2C     8GB    20GB    Cache cluster      │   │
│  │ ClickHouse        1     4C     16GB   500GB   Analytics          │   │
│  │ MinIO             1     2C     4GB    500GB   Object storage     │   │
│  │                                                                  │   │
│  │ Total Database: 5 servers                                        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  TOTAL MVP: 10 SERVERS                                                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  PRODUCTION (Recommended for HA)                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │ Role              Qty   CPU    RAM    Disk    Notes              │   │
│  │ ────────────────────────────────────────────────────────────     │   │
│  │ Ad Server         3     4C     8GB    50GB    Horizontal scale   │   │
│  │ Admin API         2     2C     4GB    50GB    HA pair            │   │
│  │ Admin Dashboard   2     2C     4GB    50GB    HA pair            │   │
│  │ Load Balancer     2     2C     4GB    20GB    HA pair (Keepalive)│   │
│  │ PostgreSQL        2     4C     32GB   500GB   Primary + Replica  │   │
│  │ Redis             3     2C     16GB   50GB    3-node cluster     │   │
│  │ ClickHouse        2     8C     32GB   1TB     2-node cluster     │   │
│  │ MinIO             4     2C     8GB    1TB     4-node cluster     │   │
│  │                                                                  │   │
│  │ Total Production: 20 servers                                     │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  NETWORK REQUIREMENTS                                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  • Server location: Singapore (central to all target countries)        │
│  • Bandwidth: 100 Mbps minimum (for creative delivery)                 │
│  • Public IPs: 2 (Load balancer primary + failover)                    │
│  • Internal network: 1 Gbps between servers                            │
│  • SSL certificates: Wildcard for *.mims.com                           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  LATENCY ESTIMATES (Singapore DC → End Users)                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌──────────────┬────────────┬────────────────────────────────────┐    │
│  │ Country      │ Latency    │ Notes                              │    │
│  ├──────────────┼────────────┼────────────────────────────────────┤    │
│  │ Singapore    │ <5ms       │ Local                              │    │
│  │ Malaysia     │ 10-20ms    │ Excellent                          │    │
│  │ Thailand     │ 20-30ms    │ Good                               │    │
│  │ Vietnam      │ 30-40ms    │ Good                               │    │
│  │ Indonesia    │ 20-40ms    │ Good                               │    │
│  │ Philippines  │ 40-60ms    │ Acceptable                         │    │
│  │ Hong Kong    │ 30-40ms    │ Good                               │    │
│  │ India        │ 50-80ms    │ Consider edge node if needed       │    │
│  └──────────────┴────────────┴────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  NETWORK SECURITY                                                      │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         INTERNET                                 │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      FIREWALL / WAF                               │  │
│  │                                                                   │  │
│  │  • DDoS protection                                               │  │
│  │  • Rate limiting (1000 req/min per IP)                          │  │
│  │  • SQL injection prevention                                      │  │
│  │  • XSS filtering                                                 │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                       │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DMZ (Public Zone)                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Load Balancer                                              │  │  │
│  │  │ • SSL termination (TLS 1.3)                                │  │  │
│  │  │ • Only ports 80 (redirect) and 443 open                    │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                       │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  APPLICATION ZONE (Private)                       │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  Ad Server   │  │  Admin API   │  │  Dashboard   │           │  │
│  │  │              │  │              │  │              │           │  │
│  │  │ Port: 8080   │  │ Port: 8081   │  │ Port: 3000   │           │  │
│  │  │ (internal)   │  │ (internal)   │  │ (internal)   │           │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │                                                                   │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                       │
│                                 ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DATA ZONE (Most Restricted)                    │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  PostgreSQL  │  │    Redis     │  │ ClickHouse   │           │  │
│  │  │              │  │              │  │              │           │  │
│  │  │ No public IP │  │ No public IP │  │ No public IP │           │  │
│  │  │ App zone only│  │ App zone only│  │ App zone only│           │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  APPLICATION SECURITY                                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Authentication                                                  │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │  • Admin Dashboard: JWT tokens with 24h expiry                  │   │
│  │  • Mobile SDK: App keys (per-country, rotatable)                │   │
│  │  • Web Tag: Domain whitelist validation                         │   │
│  │  • API: HMAC signatures for sensitive operations                │   │
│  │                                                                  │   │
│  │  Authorization                                                   │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │  • Role-based access control (Admin, Operator, Viewer)          │   │
│  │  • Audit logging for all campaign changes                       │   │
│  │                                                                  │   │
│  │  Data Protection                                                 │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │  • No PII collection (user IDs are hashed)                      │   │
│  │  • Database encryption at rest                                  │   │
│  │  • TLS for all internal communication                           │   │
│  │  • Regular security patching schedule                           │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Scalability & Performance

### Performance Targets

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE REQUIREMENTS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AD SERVING PERFORMANCE                                                │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Metric                     Target         Measurement           │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │  Ad Decision Latency        <50ms          p99 response time     │   │
│  │  Throughput                 500 req/sec    Per server instance   │   │
│  │  Error Rate                 <0.1%          5xx responses         │   │
│  │  Availability               99.9%          Monthly uptime        │   │
│  │  Creative Load Time         <200ms         Image/HTML5 assets    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  CAPACITY PLANNING                                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Current Load: ~2M impressions/month                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Breakdown:                                                      │   │
│  │  • Average: 67,000 impressions/day                              │   │
│  │  • Average: 2,800 impressions/hour                              │   │
│  │  • Average: 46 impressions/minute                               │   │
│  │  • Peak (5x): 230 impressions/minute                            │   │
│  │                                                                  │   │
│  │  With 2 Ad Server instances (500 req/sec each):                 │   │
│  │  • Capacity: 60,000 requests/minute                             │   │
│  │  • Headroom: 260x current peak load                             │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  SCALING STRATEGY                                                      │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Load Level          Action                                      │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │  <10M imp/month      MVP infrastructure (2 ad servers)          │   │
│  │  10-50M imp/month    Add 2 more ad servers, Redis cluster       │   │
│  │  50-100M imp/month   Add edge caching (CDN), ClickHouse cluster │   │
│  │  >100M imp/month     Multi-region deployment (SG + HK)          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  CACHING STRATEGY                                                      │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Layer 1: In-Memory (Go)                                        │   │
│  │  • Active campaigns cached in application memory                │   │
│  │  • Refresh every 30 seconds                                     │   │
│  │  • Latency: <1ms                                                │   │
│  │                                                                  │   │
│  │  Layer 2: Redis                                                 │   │
│  │  • Targeting rules, frequency caps                              │   │
│  │  • TTL: 5 minutes                                               │   │
│  │  • Latency: 1-2ms                                               │   │
│  │                                                                  │   │
│  │  Layer 3: PostgreSQL                                            │   │
│  │  • Source of truth                                              │   │
│  │  • Only hit on cache miss                                       │   │
│  │  • Latency: 5-10ms                                              │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Timeline

### 3-Month Development Plan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PROJECT TIMELINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TEAM STRUCTURE                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  • Developers: 2 full-time                                             │
│  • Operators: 5 (for testing and training in Month 3)                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  MONTH 1: FOUNDATION                                        Weeks 1-4  │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Week 1-2: Core Infrastructure                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Set up development environment                                │   │
│  │ □ Initialize Go project structure                               │   │
│  │ □ Set up PostgreSQL schema                                      │   │
│  │ □ Set up Redis                                                  │   │
│  │ □ Create basic CRUD API for campaigns                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 3-4: Ad Server Core                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Implement ad request endpoint                                 │   │
│  │ □ Build targeting engine (key-value matching)                   │   │
│  │ □ Implement priority-based selection                            │   │
│  │ □ Add basic impression/click tracking                           │   │
│  │ □ Set up ClickHouse for events                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Deliverable: Working ad server that can match and serve ads           │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  MONTH 2: WEB INTEGRATION + ADMIN                           Weeks 5-8  │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Week 5-6: Admin Dashboard                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Set up React project                                          │   │
│  │ □ Campaign management UI                                        │   │
│  │ □ Line item creation with targeting                             │   │
│  │ □ Creative upload (MinIO integration)                           │   │
│  │ □ User authentication                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 7-8: Web Tag + Reporting                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Build JavaScript tag library                                  │   │
│  │ □ Implement frequency capping                                   │   │
│  │ □ Add scheduling (start/end dates)                              │   │
│  │ □ Build reporting dashboard                                     │   │
│  │ □ Integration testing with mims.com                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Deliverable: Full web ad serving with admin UI and basic reports      │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  MONTH 3: MOBILE + LAUNCH                                   Weeks 9-12 │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Week 9-10: Mobile SDKs                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Android SDK (Kotlin)                                          │   │
│  │ □ iOS SDK (Swift)                                               │   │
│  │ □ SDK documentation                                             │   │
│  │ □ Sample app integration                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Week 11-12: Testing + Training                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Load testing                                                  │   │
│  │ □ Security audit                                                │   │
│  │ □ Operator training (5 users)                                   │   │
│  │ □ Documentation                                                 │   │
│  │ □ Production deployment                                         │   │
│  │ □ Parallel run with GAM                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Deliverable: Production-ready system with mobile SDK support          │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  GANTT CHART                                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Task                    W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12│
│  ──────────────────────────────────────────────────────────────────────│
│  Infrastructure          ████████                                       │
│  Ad Server Core                  ████████                               │
│  Admin Dashboard                         ████████                       │
│  Web Tag                                         ████                   │
│  Reporting                                           ████               │
│  Android SDK                                             ████           │
│  iOS SDK                                                 ████           │
│  Testing                                                     ████       │
│  Training & Launch                                               ████   │
│                                                                         │
│  ──────────────────────────────────────────────────────────────────────│
│  █ = Development        ░ = Testing        ▓ = Deployment              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Risk Assessment

### Risk Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RISK ASSESSMENT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Risk                    Impact   Likelihood   Mitigation        │   │
│  │  ────────────────────────────────────────────────────────────    │   │
│  │                                                                  │   │
│  │  Timeline overrun        High     Medium       • Prioritize MVP  │   │
│  │  (3 months tight)                              • Cut mobile SDK  │   │
│  │                                                  to Phase 2 if   │   │
│  │                                                  needed          │   │
│  │                                                                  │   │
│  │  Go learning curve       Medium   Medium       • Use well-known  │   │
│  │  (if team new to Go)                             frameworks      │   │
│  │                                                • Pair programming│   │
│  │                                                • Consider Node.js│   │
│  │                                                  alternative     │   │
│  │                                                                  │   │
│  │  Performance issues      High     Low          • Load test early │   │
│  │                                                • Redis caching   │   │
│  │                                                • Profile code    │   │
│  │                                                                  │   │
│  │  Security vulnerabilities High    Medium       • Security review │   │
│  │                                                • Input validation│   │
│  │                                                • Regular updates │   │
│  │                                                                  │   │
│  │  Integration issues      Medium   Medium       • Parallel run    │   │
│  │  with existing sites                             with GAM        │   │
│  │                                                • Gradual rollout │   │
│  │                                                                  │   │
│  │  Mobile SDK complexity   High     High         • Start with 1    │   │
│  │  (2 platforms)                                   platform        │   │
│  │                                                • Consider React  │   │
│  │                                                  Native          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  RECOMMENDED RISK MITIGATIONS                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  1. PHASED ROLLOUT                                                     │
│     • Week 1-8: Web only (proves core system)                          │
│     • Week 9-12: Add mobile (lower risk)                               │
│     • If behind schedule, mobile can be Phase 2                        │
│                                                                         │
│  2. PARALLEL OPERATION                                                 │
│     • Run MIMS Ad Manager alongside GAM for 2-4 weeks                  │
│     • Compare impression counts, CTR, latency                          │
│     • Gradual traffic shift (10% → 50% → 100%)                         │
│                                                                         │
│  3. FALLBACK PLAN                                                      │
│     • Keep GAM configuration active                                    │
│     • If issues arise, switch back within minutes                      │
│     • Document rollback procedure                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Ad Unit** | A defined placement on a page/app where ads can appear |
| **Campaign** | A collection of line items for an advertiser |
| **Line Item** | A set of targeting rules, dates, and creatives that determine ad delivery |
| **Creative** | The actual ad content (image, HTML5, video) |
| **Impression** | One instance of an ad being displayed |
| **CTR** | Click-through rate (clicks / impressions) |
| **Frequency Cap** | Limit on how many times a user sees the same ad |
| **Key-Value Targeting** | Flexible targeting using custom key-value pairs |

### B. Technology References

| Technology | Documentation |
|------------|---------------|
| Go | https://go.dev/doc/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| Redis | https://redis.io/documentation |
| ClickHouse | https://clickhouse.com/docs/ |
| MinIO | https://min.io/docs/minio/linux/index.html |
| React | https://react.dev/ |

### C. Comparison with Google Ad Manager

| Feature | Google Ad Manager | MIMS Ad Manager |
|---------|-------------------|-----------------|
| Ad Serving | Yes | Yes |
| Key-Value Targeting | Yes | Yes |
| Frequency Capping | Yes | Yes |
| Scheduling | Yes | Yes |
| Reporting | Yes | Yes |
| Mobile SDK | Yes | Yes (custom) |
| Programmatic/RTB | Yes | No (not needed) |
| Third-party Networks | Yes | No (not needed) |
| Custom Policies | Limited | Full control |
| Data Ownership | Google | MIMS |
| Latency Control | Limited | Full control |
| Cost | Per-impression fees | Infrastructure only |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| IT Director | | | |
| Project Sponsor | | | |
| Development Lead | | | |

---

**Document End**
