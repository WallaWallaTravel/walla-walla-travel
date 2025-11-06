-- Add proposal acceptance fields
-- Migration: add-proposal-acceptance-fields.sql
-- Date: November 1, 2025

-- Add fields for tracking proposal acceptance
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_by_name VARCHAR(255);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_by_email VARCHAR(255);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_by_phone VARCHAR(50);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS gratuity_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS final_total DECIMAL(10,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP;

-- Add comments
COMMENT ON COLUMN proposals.accepted_at IS 'Timestamp when proposal was accepted';
COMMENT ON COLUMN proposals.accepted_by_name IS 'Name of person who accepted';
COMMENT ON COLUMN proposals.accepted_by_email IS 'Email of person who accepted';
COMMENT ON COLUMN proposals.accepted_by_phone IS 'Phone of person who accepted';
COMMENT ON COLUMN proposals.gratuity_amount IS 'Optional gratuity amount added during acceptance';
COMMENT ON COLUMN proposals.final_total IS 'Total including gratuity';
COMMENT ON COLUMN proposals.signature IS 'Digital signature (typed name)';
COMMENT ON COLUMN proposals.signature_date IS 'When signature was provided';

-- Create index for accepted proposals
CREATE INDEX IF NOT EXISTS idx_proposals_accepted_at ON proposals(accepted_at) WHERE accepted_at IS NOT NULL;

