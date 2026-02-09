-- MIMS Ad Manager - Database Schema
-- POC Version

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
    frequency_cap INTEGER DEFAULT 0,
    frequency_cap_period VARCHAR(20) DEFAULT 'day',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Targeting Rules
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
CREATE INDEX idx_line_items_campaign ON line_items(campaign_id);
CREATE INDEX idx_line_items_status ON line_items(status);
CREATE INDEX idx_creatives_line_item ON creatives(line_item_id);
CREATE INDEX idx_targeting_rules_line_item ON targeting_rules(line_item_id);

-- Insert sample data for demo
INSERT INTO campaigns (name, status) VALUES
    ('Demo Campaign', 'active'),
    ('Test Campaign', 'active');

INSERT INTO line_items (campaign_id, name, priority, frequency_cap, status) VALUES
    (1, 'Homepage Banner', 10, 3, 'active'),
    (1, 'News Section Banner', 5, 5, 'active'),
    (2, 'Sidebar Ad', 3, 0, 'active');

INSERT INTO targeting_rules (line_item_id, key, operator, values) VALUES
    (1, 'section', 'IN', '["home", "news"]'),
    (1, 'country', 'IN', '["sg", "my", "ph"]'),
    (2, 'section', 'EQ', '["news"]'),
    (2, 'country', 'IN', '["sg"]'),
    (3, 'section', 'IN', '["sports", "entertainment"]');

INSERT INTO creatives (line_item_id, name, width, height, image_url, click_url) VALUES
    (1, 'Banner 728x90', 728, 90, 'https://via.placeholder.com/728x90/4A90A4/FFFFFF?text=MIMS+Ad+728x90', 'https://example.com/landing1'),
    (1, 'Banner 300x250', 300, 250, 'https://via.placeholder.com/300x250/4A90A4/FFFFFF?text=MIMS+Ad+300x250', 'https://example.com/landing1'),
    (2, 'News Banner 728x90', 728, 90, 'https://via.placeholder.com/728x90/2ECC71/FFFFFF?text=News+Banner', 'https://example.com/landing2'),
    (2, 'News Banner 300x250', 300, 250, 'https://via.placeholder.com/300x250/2ECC71/FFFFFF?text=News+Sidebar', 'https://example.com/landing2'),
    (3, 'Sports Banner 728x90', 728, 90, 'https://via.placeholder.com/728x90/E74C3C/FFFFFF?text=Sports+Ad', 'https://example.com/landing3'),
    (3, 'Sports Banner 300x250', 300, 250, 'https://via.placeholder.com/300x250/E74C3C/FFFFFF?text=Sports+Sidebar', 'https://example.com/landing3');
