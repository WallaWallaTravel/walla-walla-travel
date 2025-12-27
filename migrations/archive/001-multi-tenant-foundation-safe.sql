-- Multi-Tenant Foundation Schema (SAFE VERSION)
-- Works with existing brands table structure
-- Supports: Walla Walla Travel (DMC), NW Touring & Concierge, Herding Cats Wine Tours, future providers

-- ============================================
-- TENANTS (Legal Entities / LLCs)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  
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
  stripe_account_id VARCHAR(100),
  tax_id VARCHAR(50),
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_platform_owner BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BRANDS - Add tenant_id to existing brands table
-- (brands table already exists with brand_code, not slug)
-- ============================================
DO $$
BEGIN
  -- Add tenant_id to existing brands table if it doesn't have it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'tenant_id') THEN
    ALTER TABLE brands ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
  END IF;
  
  -- Add brand_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'brand_type') THEN
    ALTER TABLE brands ADD COLUMN brand_type VARCHAR(50) DEFAULT 'tour_provider';
  END IF;
  
  -- Add is_featured if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'is_featured') THEN
    ALTER TABLE brands ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- TOUR PROVIDERS (Specific to tour companies)
-- ============================================
CREATE TABLE IF NOT EXISTS tour_providers (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Service Details
  service_types TEXT[],
  max_passengers INTEGER,
  service_area TEXT[],
  
  -- Vehicles
  vehicle_count INTEGER DEFAULT 0,
  
  -- Pricing
  base_hourly_rate DECIMAL(10,2),
  minimum_hours INTEGER DEFAULT 4,
  
  -- Availability
  advance_booking_days INTEGER DEFAULT 1,
  max_booking_days INTEGER DEFAULT 365,
  
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
  
  partner_type VARCHAR(50) NOT NULL DEFAULT 'referral',
  affiliate_code VARCHAR(100),
  affiliate_platform VARCHAR(50),
  referral_tracking_enabled BOOLEAN DEFAULT TRUE,
  commission_rate DECIMAL(5,2),
  property_count INTEGER DEFAULT 1,
  property_types TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVITY PARTNERS (Future)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_partners (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  
  partner_type VARCHAR(50) NOT NULL DEFAULT 'referral',
  activity_types TEXT[],
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
  
  partner_type VARCHAR(50) NOT NULL,
  partner_id INTEGER NOT NULL,
  brand_id INTEGER REFERENCES brands(id),
  
  click_source VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  session_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer_url TEXT,
  
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_value DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ASSOCIATE EXISTING TABLES WITH TENANTS (SAFE)
-- ============================================
DO $$
BEGIN
  -- Users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'accessible_tenant_ids') THEN
    ALTER TABLE users ADD COLUMN accessible_tenant_ids INTEGER[];
  END IF;
  
  -- Bookings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tenant_id') THEN
    ALTER TABLE bookings ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'provider_id') THEN
    ALTER TABLE bookings ADD COLUMN provider_id INTEGER REFERENCES tour_providers(id);
  END IF;
  
  -- Proposals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'tenant_id') THEN
    ALTER TABLE proposals ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
  END IF;
  
  -- Vehicles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tenant_id') THEN
    ALTER TABLE vehicles ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);

-- ============================================
-- SEED INITIAL DATA (UPSERT)
-- ============================================

-- Walla Walla Travel (Platform Owner, DMC)
INSERT INTO tenants (slug, legal_name, display_name, is_platform_owner, primary_color, secondary_color)
VALUES ('walla-walla-travel', 'Walla Walla Travel LLC', 'Walla Walla Travel', TRUE, '#1E3A5F', '#E07A5F')
ON CONFLICT (slug) DO NOTHING;

-- NW Touring & Concierge (Tour Provider LLC)
INSERT INTO tenants (slug, legal_name, display_name, primary_color, secondary_color)
VALUES ('nw-touring', 'NW Touring & Concierge LLC', 'NW Touring & Concierge', '#B87333', '#1E3A5F')
ON CONFLICT (slug) DO NOTHING;

-- Haven Collection (Referral Partner)
INSERT INTO tenants (slug, legal_name, display_name)
VALUES ('haven-collection', 'The Haven Collection', 'The Haven Collection')
ON CONFLICT (slug) DO NOTHING;

-- Link existing brands to the primary tenant
UPDATE brands 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'walla-walla-travel' LIMIT 1)
WHERE tenant_id IS NULL;

-- Set brand types based on existing data
UPDATE brands SET brand_type = 'dmc' WHERE brand_code = 'WWT' OR brand_name ILIKE '%walla walla travel%';
UPDATE brands SET brand_type = 'tour_provider' WHERE brand_code = 'NWT' OR brand_name ILIKE '%nw touring%';
UPDATE brands SET brand_type = 'tour_provider' WHERE brand_code = 'HCW' OR brand_name ILIKE '%herding cats%';
