-- Multi-Tenant Foundation Schema
-- Supports: Walla Walla Travel (DMC), NW Touring & Concierge, Herding Cats Wine Tours, future providers

-- ============================================
-- TENANTS (Legal Entities / LLCs)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,           -- 'walla-walla-travel', 'nw-touring'
  legal_name VARCHAR(255) NOT NULL,           -- 'NW Touring & Concierge LLC'
  display_name VARCHAR(255) NOT NULL,         -- 'NW Touring & Concierge'
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#1E3A5F',
  secondary_color VARCHAR(7) DEFAULT '#E07A5F',
  
  -- Financial
  stripe_account_id VARCHAR(100),             -- Stripe Connect account for this LLC
  tax_id VARCHAR(50),                         -- EIN
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_platform_owner BOOLEAN DEFAULT FALSE,    -- true for Walla Walla Travel
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BRANDS (Public-facing identities)
-- A tenant can have multiple brands (e.g., NW Touring has Herding Cats as a DBA)
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(50) UNIQUE NOT NULL,           -- 'herding-cats', 'nw-touring'
  name VARCHAR(255) NOT NULL,                 -- 'Herding Cats Wine Tours'
  tagline VARCHAR(500),
  description TEXT,
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  
  -- Domain/URLs
  website_url VARCHAR(255),
  booking_subdomain VARCHAR(100),             -- 'book.herdingcats.wine'
  
  -- Type
  brand_type VARCHAR(50) NOT NULL DEFAULT 'tour_provider',  -- 'tour_provider', 'lodging', 'activity', 'dmc'
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,          -- Show prominently on WWT
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TOUR PROVIDERS (Specific to tour companies)
-- ============================================
CREATE TABLE IF NOT EXISTS tour_providers (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Service Details
  service_types TEXT[],                       -- ['wine_tour', 'airport_transfer', 'custom']
  max_passengers INTEGER,
  service_area TEXT[],                        -- ['walla-walla', 'tri-cities']
  
  -- Vehicles
  vehicle_count INTEGER DEFAULT 0,
  
  -- Pricing
  base_hourly_rate DECIMAL(10,2),
  minimum_hours INTEGER DEFAULT 4,
  
  -- Availability
  advance_booking_days INTEGER DEFAULT 1,     -- Min days in advance
  max_booking_days INTEGER DEFAULT 365,       -- Max days in advance
  
  -- Policies
  cancellation_policy TEXT,
  deposit_percentage DECIMAL(5,2) DEFAULT 25.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LODGING PARTNERS
-- ============================================
CREATE TABLE IF NOT EXISTS lodging_partners (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Partner Type
  partner_type VARCHAR(50) NOT NULL,          -- 'direct', 'affiliate', 'referral'
  
  -- For affiliates
  affiliate_code VARCHAR(100),
  affiliate_platform VARCHAR(50),             -- 'booking.com', 'expedia', etc.
  
  -- For referrals (internal tracking only)
  referral_tracking_enabled BOOLEAN DEFAULT TRUE,
  
  -- Commission (for affiliates)
  commission_rate DECIMAL(5,2),               -- NULL for Haven Collection (internal tracking only)
  
  -- Property Details
  property_count INTEGER DEFAULT 1,
  property_types TEXT[],                      -- ['hotel', 'vacation_rental', 'b&b']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVITY PARTNERS (Future)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_partners (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  
  partner_type VARCHAR(50) NOT NULL,          -- 'direct', 'affiliate', 'referral'
  activity_types TEXT[],                      -- ['hot_air_balloon', 'horseback', 'golf']
  
  -- Referral tracking
  referral_tracking_enabled BOOLEAN DEFAULT TRUE,
  commission_rate DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REFERRAL TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS referral_clicks (
  id SERIAL PRIMARY KEY,
  
  -- What was clicked
  partner_type VARCHAR(50) NOT NULL,          -- 'lodging', 'activity', 'tour'
  partner_id INTEGER NOT NULL,                -- ID in respective partner table
  brand_id INTEGER REFERENCES brands(id),
  
  -- Tracking
  click_source VARCHAR(100),                  -- 'website', 'directory', 'email'
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Session
  session_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer_url TEXT,
  
  -- Conversion (updated later if they book)
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_value DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ASSOCIATE USERS WITH TENANTS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessible_tenant_ids INTEGER[];  -- For multi-tenant access

-- ============================================
-- ASSOCIATE EXISTING TABLES WITH TENANTS
-- ============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES tour_providers(id);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_brands_tenant ON brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_type ON brands(brand_type);
CREATE INDEX IF NOT EXISTS idx_tour_providers_brand ON tour_providers(brand_id);
CREATE INDEX IF NOT EXISTS idx_lodging_partners_brand ON lodging_partners(brand_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_partner ON referral_clicks(partner_type, partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_converted ON referral_clicks(converted) WHERE converted = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);

-- ============================================
-- SEED INITIAL DATA
-- ============================================

-- Walla Walla Travel (Platform Owner, DMC)
INSERT INTO tenants (slug, legal_name, display_name, is_platform_owner, primary_color, secondary_color)
VALUES ('walla-walla-travel', 'Walla Walla Travel LLC', 'Walla Walla Travel', TRUE, '#1E3A5F', '#E07A5F')
ON CONFLICT (slug) DO NOTHING;

-- NW Touring & Concierge (Tour Provider LLC)
INSERT INTO tenants (slug, legal_name, display_name, primary_color, secondary_color)
VALUES ('nw-touring', 'NW Touring & Concierge LLC', 'NW Touring & Concierge', '#B87333', '#1E3A5F')
ON CONFLICT (slug) DO NOTHING;

-- Create brands
INSERT INTO brands (tenant_id, slug, name, tagline, brand_type, is_featured)
SELECT id, 'walla-walla-travel', 'Walla Walla Travel', 'Your gateway to the valley', 'dmc', TRUE
FROM tenants WHERE slug = 'walla-walla-travel'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO brands (tenant_id, slug, name, tagline, brand_type, is_featured)
SELECT id, 'nw-touring', 'NW Touring & Concierge', 'Premium wine country transportation', 'tour_provider', TRUE
FROM tenants WHERE slug = 'nw-touring'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO brands (tenant_id, slug, name, tagline, brand_type, is_featured)
SELECT id, 'herding-cats', 'Herding Cats Wine Tours', 'Unforgettable wine adventures', 'tour_provider', TRUE
FROM tenants WHERE slug = 'nw-touring'  -- Same LLC, different brand (DBA)
ON CONFLICT (slug) DO NOTHING;

-- Haven Collection (Referral Partner - internal tracking only)
INSERT INTO tenants (slug, legal_name, display_name)
VALUES ('haven-collection', 'The Haven Collection', 'The Haven Collection')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO brands (tenant_id, slug, name, tagline, brand_type, is_featured)
SELECT id, 'haven-collection', 'The Haven Collection', 'Luxury vacation rentals', 'lodging', TRUE
FROM tenants WHERE slug = 'haven-collection'
ON CONFLICT (slug) DO NOTHING;

-- Create tour provider records
INSERT INTO tour_providers (brand_id, service_types, max_passengers, base_hourly_rate, minimum_hours)
SELECT id, ARRAY['wine_tour', 'airport_transfer', 'custom_charter'], 14, 125.00, 4
FROM brands WHERE slug = 'nw-touring'
ON CONFLICT DO NOTHING;

INSERT INTO tour_providers (brand_id, service_types, max_passengers, base_hourly_rate, minimum_hours)
SELECT id, ARRAY['wine_tour', 'custom_charter'], 10, 110.00, 4
FROM brands WHERE slug = 'herding-cats'
ON CONFLICT DO NOTHING;

-- Create lodging partner record for Haven Collection (referral tracking only)
INSERT INTO lodging_partners (brand_id, partner_type, referral_tracking_enabled, property_types)
SELECT id, 'referral', TRUE, ARRAY['vacation_rental', 'luxury_home']
FROM brands WHERE slug = 'haven-collection'
ON CONFLICT DO NOTHING;




