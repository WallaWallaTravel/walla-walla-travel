-- Migration: 043-winery-data-architecture-fixed.sql
-- Purpose: Add structured data fields, provenance tracking, and insider tips for SEO two-layer model
-- Author: Claude Code
-- Date: 2025-12-29
-- Note: Simplified version without FK constraints that may fail on production

-- ============================================
-- UP MIGRATION
-- ============================================

-- ============================================================================
-- PART 1: Add Missing Structured Fields to Wineries
-- ============================================================================

-- Experience & Capacity Fields
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS experience_tags TEXT[] DEFAULT '{}';
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS min_group_size INTEGER;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS max_group_size INTEGER;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS booking_advance_days_min INTEGER;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS booking_advance_days_max INTEGER;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS cancellation_policy VARCHAR(50);
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS pet_policy VARCHAR(50);

-- ============================================================================
-- PART 2: Data Provenance Fields
-- ============================================================================

ALTER TABLE wineries ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS verified_by INTEGER;  -- No FK for now
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS last_data_refresh TIMESTAMP WITH TIME ZONE;

-- Index for finding unverified wineries
CREATE INDEX IF NOT EXISTS idx_wineries_verified ON wineries(verified) WHERE verified = FALSE;
CREATE INDEX IF NOT EXISTS idx_wineries_experience_tags ON wineries USING GIN(experience_tags);

-- ============================================================================
-- PART 3: Create Winery Insider Tips Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS winery_insider_tips (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER NOT NULL,  -- References wineries(id) logically

  -- Content
  tip_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,

  -- Provenance
  created_by INTEGER,
  data_source VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Display
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_winery_insider_tips_winery ON winery_insider_tips(winery_id);
CREATE INDEX IF NOT EXISTS idx_winery_insider_tips_type ON winery_insider_tips(tip_type);
CREATE INDEX IF NOT EXISTS idx_winery_insider_tips_featured ON winery_insider_tips(is_featured) WHERE is_featured = TRUE;

-- ============================================================================
-- PART 4: Standardize winery_content Types
-- ============================================================================

-- Add content_type constraint for standardized types
ALTER TABLE winery_content DROP CONSTRAINT IF EXISTS winery_content_type_check;
ALTER TABLE winery_content ADD CONSTRAINT winery_content_type_check
  CHECK (content_type IN (
    'origin_story', 'philosophy', 'unique_story',
    'insider_tip', 'locals_know', 'best_time_to_visit', 'what_to_ask_for',
    'anecdote', 'fun_fact', 'signature_quote',
    'educational', 'misconception',
    'curator_notes', 'general', 'custom'
  ));

-- Add provenance fields to winery_content if missing
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS data_source VARCHAR(50);
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS verified_by INTEGER;
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE winery_content ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ============================================================================
-- PART 5: Partner Edit Tracking (Skip if partner_profiles doesn't exist)
-- ============================================================================

-- Check if partner_profiles exists before creating partner_pending_edits
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_profiles') THEN
    CREATE TABLE IF NOT EXISTS partner_pending_edits (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      partner_profile_id INTEGER NOT NULL,
      submitted_by INTEGER NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      field_name VARCHAR(100) NOT NULL,
      old_value JSONB,
      new_value JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      review_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_partner_pending_edits_status ON partner_pending_edits(status) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_partner_pending_edits_entity ON partner_pending_edits(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_partner_pending_edits_partner ON partner_pending_edits(partner_profile_id);
  ELSE
    RAISE NOTICE 'Skipping partner_pending_edits: partner_profiles table does not exist';
  END IF;
END $$;

-- ============================================================================
-- Verify migration
-- ============================================================================

SELECT 'Migration 043 complete. New columns added:' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'wineries'
  AND column_name IN ('experience_tags', 'min_group_size', 'max_group_size',
                      'data_source', 'verified', 'verified_by', 'verified_at',
                      'pet_policy', 'cancellation_policy');
