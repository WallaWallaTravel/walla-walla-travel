-- Fix businesses table - remove users foreign key constraint if it exists
-- Make user references nullable and remove constraints

-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS businesses 
  DROP CONSTRAINT IF EXISTS businesses_invited_by_fkey;

ALTER TABLE IF EXISTS businesses 
  DROP CONSTRAINT IF EXISTS businesses_approved_by_fkey;

ALTER TABLE IF EXISTS business_voice_entries 
  DROP CONSTRAINT IF EXISTS business_voice_entries_reviewed_by_fkey;

ALTER TABLE IF EXISTS business_text_entries 
  DROP CONSTRAINT IF EXISTS business_text_entries_reviewed_by_fkey;

ALTER TABLE IF EXISTS business_files 
  DROP CONSTRAINT IF EXISTS business_files_reviewed_by_fkey;

ALTER TABLE IF EXISTS business_attributes 
  DROP CONSTRAINT IF EXISTS business_attributes_verified_by_fkey;

ALTER TABLE IF EXISTS tour_operator_insights 
  DROP CONSTRAINT IF EXISTS tour_operator_insights_created_by_fkey;

-- Now these columns just store integers without foreign key constraints
-- This allows the system to work without a users table

