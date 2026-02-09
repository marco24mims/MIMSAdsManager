-- MIMS Ad Manager - Database Schema
-- POC Version

-- Ad Units (inventory hierarchy like GAM)
CREATE TABLE ad_units (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sizes JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Line Items
CREATE TABLE line_items (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 5,
    weight INTEGER DEFAULT 100,
    frequency_cap INTEGER DEFAULT 0,
    frequency_cap_period VARCHAR(20) DEFAULT 'day',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Line Item to Ad Unit targeting (many-to-many)
CREATE TABLE line_item_ad_units (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES line_items(id) ON DELETE CASCADE,
    ad_unit_id INTEGER REFERENCES ad_units(id) ON DELETE CASCADE,
    UNIQUE(line_item_id, ad_unit_id)
);

-- Targeting Rules (key-value targeting)
CREATE TABLE targeting_rules (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES line_items(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    operator VARCHAR(20) DEFAULT 'IN',
    values JSONB NOT NULL
);

-- Creatives
CREATE TABLE creatives (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES line_items(id) ON DELETE CASCADE,
    name VARCHAR(255),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    click_url VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events (impressions, clicks, viewable)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    impression_id VARCHAR(50),
    line_item_id INTEGER,
    creative_id INTEGER,
    user_id VARCHAR(100),
    country VARCHAR(10),
    platform VARCHAR(20),
    ad_unit VARCHAR(100),
    section VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for reporting
CREATE INDEX idx_events_type_created ON events(event_type, created_at);
CREATE INDEX idx_events_line_item ON events(line_item_id, created_at);
CREATE INDEX idx_events_impression_id ON events(impression_id);
CREATE INDEX idx_events_country ON events(country, created_at);
CREATE INDEX idx_events_section ON events(section, created_at);
CREATE INDEX idx_events_ad_unit ON events(ad_unit, created_at);
CREATE INDEX idx_line_items_campaign ON line_items(campaign_id);
CREATE INDEX idx_line_items_status ON line_items(status);
CREATE INDEX idx_creatives_line_item ON creatives(line_item_id);
CREATE INDEX idx_targeting_rules_line_item ON targeting_rules(line_item_id);
CREATE INDEX idx_ad_units_code ON ad_units(code);

-- Insert sample Ad Units (codes match demo page options)
INSERT INTO ad_units (code, name, description, sizes) VALUES
    ('homepage_leaderboard', 'Homepage Leaderboard', 'Leaderboard banner on homepage', '[[728, 90]]'),
    ('article_leaderboard', 'Article Leaderboard', 'Leaderboard banner on article pages', '[[728, 90]]'),
    ('homepage_sidebar', 'Homepage Sidebar', 'Sidebar rectangle on homepage', '[[300, 250]]'),
    ('article_sidebar', 'Article Sidebar', 'Sidebar rectangle on article pages', '[[300, 250]]'),
    ('mobile_banner', 'Mobile Banner', 'Mobile leaderboard', '[[320, 50], [320, 100]]');

-- Insert sample Campaigns
INSERT INTO campaigns (name, status) VALUES
    ('Demo Campaign', 'active'),
    ('Test Campaign', 'active');

-- Insert sample Line Items with weights for rotation
INSERT INTO line_items (campaign_id, name, priority, weight, frequency_cap, status) VALUES
    (1, 'Homepage Banner', 10, 100, 3, 'active'),
    (1, 'News Section Banner', 10, 150, 5, 'active'),
    (2, 'Sports Section Ad', 5, 50, 0, 'active'),
    (2, 'Article Only Ad', 10, 100, 0, 'active');

-- Link line items to ad units
-- Homepage Banner (id=1) targets homepage ad units only
INSERT INTO line_item_ad_units (line_item_id, ad_unit_id) VALUES
    (1, 1), (1, 3);  -- homepage_leaderboard and homepage_sidebar

-- News Banner (id=2) targets all ad units (homepage and article)
INSERT INTO line_item_ad_units (line_item_id, ad_unit_id) VALUES
    (2, 1), (2, 2), (2, 3), (2, 4);  -- all leaderboards and sidebars

-- Sports Ad (id=3) targets all ad units
INSERT INTO line_item_ad_units (line_item_id, ad_unit_id) VALUES
    (3, 1), (3, 2), (3, 3), (3, 4);  -- all leaderboards and sidebars

-- Article Only Ad (id=4) targets article ad units only
INSERT INTO line_item_ad_units (line_item_id, ad_unit_id) VALUES
    (4, 2), (4, 4);  -- article_leaderboard and article_sidebar

-- Insert Targeting Rules
INSERT INTO targeting_rules (line_item_id, key, operator, values) VALUES
    (1, 'section', 'IN', '["home", "news"]'),
    (1, 'country', 'IN', '["sg", "my", "ph", "id"]'),
    (2, 'section', 'IN', '["news", "home"]'),
    (2, 'country', 'IN', '["sg", "my", "ph", "id"]'),
    (3, 'section', 'IN', '["sports", "entertainment"]'),
    (3, 'country', 'IN', '["sg", "my", "ph", "id"]'),
    (4, 'section', 'IN', '["news", "entertainment"]'),
    (4, 'country', 'IN', '["sg", "my"]');

-- Insert sample Creatives with reliable placeholder images
INSERT INTO creatives (line_item_id, name, width, height, image_url, click_url) VALUES
    (1, 'Homepage Leaderboard', 728, 90, 'https://picsum.photos/728/90?random=1', 'https://example.com/landing1'),
    (1, 'Homepage Rectangle', 300, 250, 'https://picsum.photos/300/250?random=2', 'https://example.com/landing1'),
    (2, 'News Leaderboard', 728, 90, 'https://picsum.photos/728/90?random=3', 'https://example.com/landing2'),
    (2, 'News Rectangle', 300, 250, 'https://picsum.photos/300/250?random=4', 'https://example.com/landing2'),
    (3, 'Sports Leaderboard', 728, 90, 'https://picsum.photos/728/90?random=5', 'https://example.com/landing3'),
    (3, 'Sports Rectangle', 300, 250, 'https://picsum.photos/300/250?random=6', 'https://example.com/landing3'),
    (4, 'Article Only Leaderboard', 728, 90, 'https://picsum.photos/728/90?random=7', 'https://example.com/landing4'),
    (4, 'Article Only Rectangle', 300, 250, 'https://picsum.photos/300/250?random=8', 'https://example.com/landing4');
