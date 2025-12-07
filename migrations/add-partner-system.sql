/**
 * Partner System Migration
 * Adds partner role and partner profiles for local business directory management
 * 
 * Run: psql $DATABASE_URL -f migrations/add-partner-system.sql
 */

-- ============================================
-- 1. EXPAND USER ROLES
-- ============================================

-- Drop existing constraint and add partner role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'driver', 'partner'));

COMMENT ON COLUMN users.role IS 'User role: admin, driver, or partner';

-- ============================================
-- 2. PARTNER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS partner_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Business identification
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('winery', 'hotel', 'restaurant', 'activity', 'other')),
  
  -- Link to existing directory tables (only one should be set based on business_type)
  winery_id INTEGER REFERENCES wineries(id) ON DELETE SET NULL,
  hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
  
  -- Partner status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  
  -- Invitation tracking
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  setup_completed_at TIMESTAMP,
  
  -- Setup token for initial password creation
  setup_token VARCHAR(255),
  setup_token_expires_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one user = one partner profile
  CONSTRAINT unique_partner_user UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_business_type ON partner_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_status ON partner_profiles(status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_winery_id ON partner_profiles(winery_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_setup_token ON partner_profiles(setup_token);

-- Comments
COMMENT ON TABLE partner_profiles IS 'Partner business profiles for directory management';
COMMENT ON COLUMN partner_profiles.business_type IS 'Type of business: winery, hotel, restaurant, activity, other';
COMMENT ON COLUMN partner_profiles.status IS 'Partner account status: pending (invited), active, suspended';
COMMENT ON COLUMN partner_profiles.setup_token IS 'One-time token for initial account setup';

-- ============================================
-- 3. PARTNER ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS partner_activity_log (
  id SERIAL PRIMARY KEY,
  partner_profile_id INTEGER NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_activity_partner_id ON partner_activity_log(partner_profile_id);
CREATE INDEX IF NOT EXISTS idx_partner_activity_created_at ON partner_activity_log(created_at);

COMMENT ON TABLE partner_activity_log IS 'Audit log of partner portal actions';

-- ============================================
-- 4. UPDATE TRIGGER FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_partner_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_partner_profiles_updated_at ON partner_profiles;
CREATE TRIGGER trigger_partner_profiles_updated_at
  BEFORE UPDATE ON partner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_profiles_updated_at();

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Partner System Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  ✅ Added "partner" to user roles';
  RAISE NOTICE '  ✅ Created partner_profiles table';
  RAISE NOTICE '  ✅ Created partner_activity_log table';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Invite partners via admin panel';
  RAISE NOTICE '  2. Partners complete setup via email link';
  RAISE NOTICE '  3. Partners can manage their directory listings';
  RAISE NOTICE '';
END $$;

