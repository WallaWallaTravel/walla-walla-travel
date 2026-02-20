-- ============================================================================
-- Migration 077: Brand Separation
--
-- Ensures the brands table exists with proper schema, seeds all 3 brands,
-- adds brand_id FK to business tables missing it (payments, crm_contacts),
-- migrates crm_deals.brand VARCHAR to brand_id FK, and creates brand_metrics.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE BRANDS TABLE (IF NOT EXISTS)
-- The table may already exist (created manually), this captures the schema.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  brand_code VARCHAR(10) NOT NULL UNIQUE,
  brand_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  legal_name VARCHAR(200),
  tagline VARCHAR(255),
  website_url VARCHAR(255),
  booking_url VARCHAR(255),
  email_from VARCHAR(255),
  email_support VARCHAR(255),
  phone VARCHAR(30),
  phone_display VARCHAR(30),
  logo_url VARCHAR(500),
  icon_url VARCHAR(500),
  primary_color VARCHAR(10),
  secondary_color VARCHAR(10),
  accent_color VARCHAR(10),
  target_market VARCHAR(255),
  description TEXT,
  meta_description VARCHAR(300),
  short_description VARCHAR(500),
  terms_url VARCHAR(255),
  cancellation_policy_url VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT true,
  show_on_wwt BOOLEAN NOT NULL DEFAULT false,
  default_brand BOOLEAN NOT NULL DEFAULT false,
  operating_entity VARCHAR(200),
  insurance_policy_number VARCHAR(100),
  license_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. SEED 3 BRANDS (idempotent upsert)
-- IDs: 1=WWT, 2=Herding Cats, 3=NW Touring
-- ============================================================================

INSERT INTO brands (id, brand_code, brand_name, display_name, legal_name,
  email_from, email_support, phone, phone_display, website_url,
  primary_color, secondary_color, tagline, active, show_on_wwt,
  default_brand, operating_entity)
VALUES
  (1, 'wwt', 'Walla Walla Travel', 'Walla Walla Travel', 'Walla Walla Travel LLC',
   'bookings@wallawalla.travel', 'info@wallawalla.travel',
   '+15092008000', '(509) 200-8000', 'https://wallawalla.travel',
   '#7c3aed', '#5b21b6', 'Your Walla Walla wine country resource',
   true, true, true, 'Walla Walla Travel LLC'),

  (2, 'hcwt', 'Herding Cats Wine Tours', 'Herding Cats Wine Tours', 'NW Touring & Concierge LLC',
   'tours@hctours.com', 'tours@hctours.com',
   '+15092008000', '(509) 200-8000', 'https://herdingcatswine.com',
   '#6B1F3A', '#3A3633', 'Mastering the art of group wine touring',
   true, true, false, 'NW Touring & Concierge LLC'),

  (3, 'nwtc', 'NW Touring & Concierge', 'NW Touring & Concierge', 'NW Touring & Concierge LLC',
   'reservations@nwtouring.com', 'info@nwtouring.com',
   '+15095403600', '(509) 540-3600', 'https://nwtouring.com',
   '#1e40af', '#1e3a8a', 'Premium wine tours & private transportation',
   true, true, false, 'NW Touring & Concierge LLC')
ON CONFLICT (id) DO UPDATE SET
  brand_code = EXCLUDED.brand_code,
  brand_name = EXCLUDED.brand_name,
  display_name = EXCLUDED.display_name,
  legal_name = EXCLUDED.legal_name,
  email_from = EXCLUDED.email_from,
  email_support = EXCLUDED.email_support,
  phone = EXCLUDED.phone,
  phone_display = EXCLUDED.phone_display,
  website_url = EXCLUDED.website_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  tagline = EXCLUDED.tagline,
  operating_entity = EXCLUDED.operating_entity,
  updated_at = NOW();

-- Ensure sequence is past the seeded IDs
SELECT setval('brands_id_seq', GREATEST(nextval('brands_id_seq'), 4));

-- ============================================================================
-- 3. ENSURE bookings.brand_id HAS PROPER FK (may exist without FK)
-- ============================================================================

-- Add column if not exists (bookings.brand_id may already exist without FK)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS brand_id INTEGER;

-- Add FK constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bookings_brand'
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings_brand
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill: default existing NULL brand_id to 1 (Walla Walla Travel)
UPDATE bookings SET brand_id = 1 WHERE brand_id IS NULL;

-- Backfill Herding Cats bookings from booking_source
UPDATE bookings b SET brand_id = 2
FROM booking_sources bs
WHERE b.booking_source_id = bs.id
  AND bs.code = 'herding_cats'
  AND b.brand_id = 1;

CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);

-- ============================================================================
-- 4. ADD brand_id TO payments
-- ============================================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;

-- Backfill from booking's brand_id
UPDATE payments p SET brand_id = b.brand_id
FROM bookings b
WHERE p.booking_id = b.id
  AND p.brand_id IS NULL
  AND b.brand_id IS NOT NULL;

-- Default remaining to WWT
UPDATE payments SET brand_id = 1 WHERE brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_brand ON payments(brand_id);

-- ============================================================================
-- 5. ADD brand_id TO crm_contacts
-- ============================================================================

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;

-- Default existing contacts to WWT
UPDATE crm_contacts SET brand_id = 1 WHERE brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_brand ON crm_contacts(brand_id);

-- ============================================================================
-- 6. MIGRATE crm_deals.brand VARCHAR → brand_id FK
-- ============================================================================

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;

-- Migrate existing brand VARCHAR values to brand_id
UPDATE crm_deals SET brand_id = CASE
  WHEN brand = 'walla_walla_travel' THEN 1
  WHEN brand = 'herding_cats' THEN 2
  WHEN brand = 'nw_touring' THEN 3
  ELSE 1
END
WHERE brand_id IS NULL AND brand IS NOT NULL;

-- Default remaining to WWT
UPDATE crm_deals SET brand_id = 1 WHERE brand_id IS NULL;

-- Keep the old brand column for now (will be removed in a future cleanup)
-- but update the CHECK constraint to include herding_cats
ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS crm_deals_brand_check;
ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_brand_check
  CHECK (brand IS NULL OR brand IN ('nw_touring', 'walla_walla_travel', 'herding_cats'));

CREATE INDEX IF NOT EXISTS idx_crm_deals_brand_id ON crm_deals(brand_id);

-- ============================================================================
-- 7. ADD brand_id TO proposals (old proposals table, if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'proposals'
  ) THEN
    BEGIN
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;
      UPDATE proposals SET brand_id = 1 WHERE brand_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_proposals_brand ON proposals(brand_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'proposals.brand_id already exists or could not be added: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================================
-- 8. CREATE brand_metrics TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_metrics (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  website_visit INTEGER DEFAULT 0,
  booking_page_visit INTEGER DEFAULT 0,
  reservation_created INTEGER DEFAULT 0,
  booking_created INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_brand_metrics_date ON brand_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_brand_metrics_brand ON brand_metrics(brand_id);

-- ============================================================================
-- 9. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE brands IS 'Multi-brand portfolio: WWT (id=1), Herding Cats (id=2), NW Touring (id=3)';
COMMENT ON COLUMN bookings.brand_id IS 'Which brand this booking belongs to (FK to brands)';
COMMENT ON COLUMN payments.brand_id IS 'Which brand this payment belongs to (FK to brands)';
COMMENT ON COLUMN crm_contacts.brand_id IS 'Primary brand association for this contact';
COMMENT ON COLUMN crm_deals.brand_id IS 'Which brand this deal is for (replaces VARCHAR brand column)';

COMMIT;
