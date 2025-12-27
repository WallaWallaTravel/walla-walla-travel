-- Add modular sections to proposals
-- Migration: add-proposal-modules.sql
-- Date: November 1, 2025

-- Add fields for optional modules
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '{}';
-- Stores which modules are enabled: {"corporate": true, "multi_day": true, etc.}

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS corporate_details JSONB;
-- Company name, logo, contact person, PO number, billing info

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS multi_day_itinerary JSONB;
-- Day-by-day breakdown, accommodation, transportation between days

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS b2b_details JSONB;
-- Partner info, commission structure, co-branding requirements

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS special_event_details JSONB;
-- Event type, occasion, special requests, VIP needs

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS group_coordination JSONB;
-- Attendee list, dietary restrictions, special needs, room assignments

-- Add comments
COMMENT ON COLUMN proposals.modules IS 'Enabled optional modules: {"corporate": true, "multi_day": false, etc.}';
COMMENT ON COLUMN proposals.corporate_details IS 'Corporate-specific information';
COMMENT ON COLUMN proposals.multi_day_itinerary IS 'Multi-day tour breakdown';
COMMENT ON COLUMN proposals.b2b_details IS 'Business partnership details';
COMMENT ON COLUMN proposals.special_event_details IS 'Wedding, anniversary, milestone info';
COMMENT ON COLUMN proposals.group_coordination IS 'Group management and logistics';

-- Create index for faster module queries
CREATE INDEX IF NOT EXISTS idx_proposals_modules ON proposals USING GIN (modules);

