-- ============================================================================
-- Migration: 059-business-directory.sql
-- Description: Pre-populated business directory with invitation-only partner onboarding
-- Created: 2026-01-31
-- ============================================================================

-- ============================================================================
-- 1. BUSINESSES TABLE
-- Stores all businesses (wineries, restaurants, lodging, boutiques, activities)
-- that may or may not become partners
-- ============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'other')),

  -- Contact
  address VARCHAR(500),
  city VARCHAR(100) NOT NULL DEFAULT 'Walla Walla',
  state VARCHAR(2) NOT NULL DEFAULT 'WA',
  zip VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Description
  short_description VARCHAR(500),

  -- Status Workflow: imported -> approved -> invited -> active
  -- Can also be: rejected (hidden but tracked)
  status VARCHAR(20) NOT NULL DEFAULT 'imported' CHECK (status IN ('imported', 'approved', 'invited', 'active', 'rejected')),

  -- Invitation Tracking
  invite_token VARCHAR(100) UNIQUE,
  invite_token_expires_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,
  invited_by INTEGER REFERENCES users(id),
  invitation_email_sent BOOLEAN DEFAULT FALSE,
  invitation_email_sent_at TIMESTAMP WITH TIME ZONE,

  -- Partner Linking (when invitation is accepted)
  partner_profile_id INTEGER REFERENCES partner_profiles(id),
  claimed_at TIMESTAMP WITH TIME ZONE,
  claimed_by INTEGER REFERENCES users(id),

  -- Data Provenance
  data_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'csv_import', 'api'
  import_batch_id VARCHAR(100),             -- Groups businesses from same import
  data_confidence INTEGER DEFAULT 80 CHECK (data_confidence >= 0 AND data_confidence <= 100),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER REFERENCES users(id),

  -- Link to existing entity tables (if already exists as winery/hotel/restaurant)
  winery_id INTEGER REFERENCES wineries(id),
  hotel_id INTEGER,  -- Will reference hotels table when it exists
  restaurant_id INTEGER, -- Will reference restaurants table when it exists

  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  hours_of_operation JSONB,
  photos JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_type ON businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_invite_token ON businesses(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_import_batch ON businesses(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_winery_id ON businesses(winery_id) WHERE winery_id IS NOT NULL;

-- ============================================================================
-- 2. BUSINESS INVITATION HISTORY
-- Tracks all invitation attempts (email sends, link generations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_invitation_history (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Invitation details
  invitation_type VARCHAR(20) NOT NULL CHECK (invitation_type IN ('email', 'link', 'resend')),
  recipient_email VARCHAR(255),
  invite_token VARCHAR(100),

  -- Status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_error TEXT,

  -- Link usage
  link_accessed_at TIMESTAMP WITH TIME ZONE,
  link_access_count INTEGER DEFAULT 0,

  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invitation_history_business ON business_invitation_history(business_id);
CREATE INDEX IF NOT EXISTS idx_invitation_history_token ON business_invitation_history(invite_token) WHERE invite_token IS NOT NULL;

-- ============================================================================
-- 3. IMPORT BATCHES
-- Tracks batch imports for auditing and rollback capability
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_import_batches (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) NOT NULL UNIQUE,

  -- Import details
  file_name VARCHAR(255),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('csv', 'json', 'manual')),

  -- Statistics
  total_rows INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')),
  error_details JSONB,

  -- Metadata
  imported_by INTEGER REFERENCES users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_batches_status ON business_import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_imported_by ON business_import_batches(imported_by);

-- ============================================================================
-- 4. UPDATE TRIGGER
-- Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_updated_at ON businesses;
CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Generate unique invite token
CREATE OR REPLACE FUNCTION generate_business_invite_token()
RETURNS VARCHAR(100) AS $$
DECLARE
  new_token VARCHAR(100);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (32 hex characters)
    new_token := encode(gen_random_bytes(16), 'hex');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM businesses WHERE invite_token = new_token) INTO token_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- View for admin dashboard - business counts by status
CREATE OR REPLACE VIEW business_status_counts AS
SELECT
  status,
  business_type,
  COUNT(*) as count
FROM businesses
GROUP BY status, business_type
ORDER BY status, business_type;

-- View for pending review (imported businesses needing action)
CREATE OR REPLACE VIEW businesses_pending_review AS
SELECT
  b.*,
  ib.file_name as import_file,
  ib.started_at as imported_at
FROM businesses b
LEFT JOIN business_import_batches ib ON b.import_batch_id = ib.batch_id
WHERE b.status = 'imported'
ORDER BY b.created_at DESC;

-- ============================================================================
-- 7. SEED DEFAULT BUSINESS TYPES (for reference)
-- ============================================================================

COMMENT ON TABLE businesses IS 'Pre-populated business directory for invitation-only partner onboarding.
Status workflow: imported -> approved -> invited -> active
Can also be: rejected (hidden but tracked)

Business types:
- winery: Wine producers and tasting rooms
- restaurant: Restaurants, cafes, food trucks
- hotel: Hotels, B&Bs, vacation rentals, lodging
- boutique: Retail shops, stores
- gallery: Art galleries, studios
- activity: Tours, classes, experiences
- other: Other business types';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Note: Adjust these based on your RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_invitation_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_import_batches TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE businesses_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE business_invitation_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE business_import_batches_id_seq TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
