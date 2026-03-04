-- Migration 114: Create partner_profiles table
-- This table was referenced by existing code but never had a migration.

CREATE TABLE IF NOT EXISTS partner_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL DEFAULT 'winery',
  winery_id INTEGER,
  hotel_id INTEGER,
  restaurant_id INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  invited_by INTEGER,
  invited_at TIMESTAMP WITH TIME ZONE,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  setup_token VARCHAR(255),
  setup_token_expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_winery_id ON partner_profiles(winery_id);

-- Enable RLS (consistent with all other tables)
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
