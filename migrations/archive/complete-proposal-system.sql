-- Migration: Complete Proposal System
-- Date: November 2, 2025
-- Purpose: Add all fields for full proposal control including editable text fields

-- Add enhanced proposal fields
ALTER TABLE proposals 
  -- Gratuity fields
  ADD COLUMN IF NOT EXISTS include_gratuity_request BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS suggested_gratuity_percentage DECIMAL(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS gratuity_optional BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS client_gratuity_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_gratuity_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS acceptance_step VARCHAR(50) DEFAULT 'pending',
  
  -- Editable text fields (per-proposal control)
  ADD COLUMN IF NOT EXISTS proposal_title TEXT,
  ADD COLUMN IF NOT EXISTS introduction TEXT,
  ADD COLUMN IF NOT EXISTS wine_tour_description TEXT,
  ADD COLUMN IF NOT EXISTS transfer_description TEXT,
  ADD COLUMN IF NOT EXISTS wait_time_description TEXT,
  ADD COLUMN IF NOT EXISTS special_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS footer_notes TEXT,
  
  -- Additional fields
  ADD COLUMN IF NOT EXISTS lunch_coordination BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lunch_coordination_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photography_package BOOLEAN DEFAULT FALSE,
  
  -- UUID for secure public links
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_proposals_acceptance_step ON proposals(acceptance_step);
CREATE INDEX IF NOT EXISTS idx_proposals_include_gratuity ON proposals(include_gratuity_request);
CREATE INDEX IF NOT EXISTS idx_proposals_uuid ON proposals(uuid);

-- Add unique constraint on UUID
ALTER TABLE proposals ADD CONSTRAINT proposals_uuid_unique UNIQUE (uuid);

-- Add comments for documentation
COMMENT ON COLUMN proposals.include_gratuity_request IS 'Whether to prompt client for gratuity during acceptance';
COMMENT ON COLUMN proposals.suggested_gratuity_percentage IS 'Admin-suggested gratuity percentage';
COMMENT ON COLUMN proposals.gratuity_optional IS 'Whether client can decline gratuity';
COMMENT ON COLUMN proposals.client_gratuity_amount IS 'Actual gratuity amount client chose';
COMMENT ON COLUMN proposals.client_gratuity_percentage IS 'Percentage client chose';
COMMENT ON COLUMN proposals.acceptance_step IS 'Current step in acceptance flow: pending, signed, gratuity_added, completed';
COMMENT ON COLUMN proposals.proposal_title IS 'Editable proposal title (per proposal)';
COMMENT ON COLUMN proposals.introduction IS 'Editable introduction text (per proposal)';
COMMENT ON COLUMN proposals.wine_tour_description IS 'Editable wine tour description (per proposal)';
COMMENT ON COLUMN proposals.transfer_description IS 'Editable transfer description (per proposal)';
COMMENT ON COLUMN proposals.wait_time_description IS 'Editable wait time description (per proposal)';
COMMENT ON COLUMN proposals.special_notes IS 'Special notes for this client';
COMMENT ON COLUMN proposals.cancellation_policy IS 'Editable cancellation policy (per proposal)';
COMMENT ON COLUMN proposals.footer_notes IS 'Editable footer notes (per proposal)';
COMMENT ON COLUMN proposals.uuid IS 'Secure UUID for public proposal links';

-- Create proposal text templates table
CREATE TABLE IF NOT EXISTS proposal_text_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL UNIQUE,
  title TEXT,
  introduction TEXT,
  wine_tour_description TEXT,
  transfer_description TEXT,
  wait_time_description TEXT,
  terms_and_conditions TEXT,
  cancellation_policy TEXT,
  footer_notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default template
INSERT INTO proposal_text_templates (
  template_name,
  title,
  introduction,
  wine_tour_description,
  transfer_description,
  wait_time_description,
  terms_and_conditions,
  cancellation_policy,
  footer_notes,
  is_default
) VALUES (
  'default',
  'Walla Walla Wine Country Experience',
  'Thank you for your interest in Walla Walla Travel! We are excited to create a memorable wine country experience for you and your guests.',
  'Visit 3 premier wineries in the Walla Walla Valley. Your private guide will provide insights into the region''s rich wine-making heritage while ensuring a comfortable and memorable experience.',
  'Professional transportation service with experienced drivers and comfortable, well-maintained vehicles.',
  'Professional wait time service while you attend meetings, events, or other activities.',
  'Full payment is required 48 hours before the tour date. Cancellations made 7+ days before the tour date will receive a full refund minus a 10% processing fee. Cancellations made 3-6 days before will receive a 50% refund. Cancellations made less than 3 days before are non-refundable.',
  'Cancellations made 7+ days in advance: Full refund minus 10% processing fee. 3-6 days: 50% refund. Less than 3 days: Non-refundable.',
  'Looking forward to hosting you!',
  TRUE
) ON CONFLICT (template_name) DO NOTHING;

-- Create proposal versions table for tracking changes
CREATE TABLE IF NOT EXISTS proposal_versions (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changed_by VARCHAR(255),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changes_summary TEXT,
  snapshot JSONB,  -- Full proposal data at this version
  UNIQUE(proposal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_changed_at ON proposal_versions(changed_at);

-- Add trigger to auto-increment version number
CREATE OR REPLACE FUNCTION increment_proposal_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if status is 'sent' or later (not for drafts)
  IF NEW.status IN ('sent', 'viewed', 'accepted') AND 
     (OLD.status IS NULL OR OLD.* IS DISTINCT FROM NEW.*) THEN
    
    INSERT INTO proposal_versions (
      proposal_id,
      version_number,
      changed_by,
      changes_summary,
      snapshot
    )
    SELECT 
      NEW.id,
      COALESCE(MAX(version_number), 0) + 1,
      CURRENT_USER,
      'Proposal updated',
      row_to_json(NEW.*)::jsonb
    FROM proposal_versions
    WHERE proposal_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposal_version_trigger
  AFTER UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION increment_proposal_version();

-- Update existing proposals to have UUIDs if they don't
UPDATE proposals SET uuid = gen_random_uuid() WHERE uuid IS NULL;

COMMENT ON TABLE proposal_text_templates IS 'Reusable text templates for proposals';
COMMENT ON TABLE proposal_versions IS 'Version history for proposal changes';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Proposal system migration completed successfully!';
  RAISE NOTICE 'Added: Gratuity fields, editable text fields, templates, version tracking';
END $$;

