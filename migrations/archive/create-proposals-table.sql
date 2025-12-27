-- Create Proposals Table
-- This is the base proposals system that will be enhanced later

CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  
  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  
  -- Proposal Details
  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')),
  
  -- Service Items (JSONB array of services)
  service_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  gratuity_amount DECIMAL(10, 2) DEFAULT 0,
  gratuity_percentage DECIMAL(5, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Gratuity Settings
  gratuity_enabled BOOLEAN DEFAULT false,
  gratuity_suggested_percentage DECIMAL(5, 2) DEFAULT 20.00,
  gratuity_optional BOOLEAN DEFAULT true,
  
  -- Notes & Terms
  notes TEXT,
  terms_and_conditions TEXT,
  internal_notes TEXT,
  
  -- Acceptance
  accepted_at TIMESTAMP,
  accepted_by VARCHAR(255),
  declined_at TIMESTAMP,
  declined_reason TEXT,
  
  -- Conversion
  converted_to_booking_id INTEGER,
  
  -- Metadata
  valid_until DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  view_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_client_email ON proposals(client_email);
CREATE INDEX idx_proposals_proposal_number ON proposals(proposal_number);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);
CREATE INDEX idx_proposals_valid_until ON proposals(valid_until);

-- Create proposal activity log table
CREATE TABLE IF NOT EXISTS proposal_activity_log (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposal_activity_proposal_id ON proposal_activity_log(proposal_id);
CREATE INDEX idx_proposal_activity_created_at ON proposal_activity_log(created_at);

-- Create proposal_media junction table
CREATE TABLE IF NOT EXISTS proposal_media (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
  media_id INTEGER REFERENCES media_library(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proposal_id, media_id)
);

CREATE INDEX idx_proposal_media_proposal_id ON proposal_media(proposal_id);
CREATE INDEX idx_proposal_media_media_id ON proposal_media(media_id);

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(proposal_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM proposals
  WHERE proposal_number LIKE 'PR' || year_str || '%';
  
  RETURN 'PR' || year_str || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER proposals_updated_at_trigger
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Add comments
COMMENT ON TABLE proposals IS 'Stores client proposals with multiple service items and flexible pricing';
COMMENT ON COLUMN proposals.service_items IS 'JSONB array of service items, each with date, type, duration, party_size, and pricing';
COMMENT ON COLUMN proposals.gratuity_enabled IS 'Whether to prompt client for gratuity during acceptance';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Proposals table created successfully!';
  RAISE NOTICE 'Tables: proposals, proposal_activity_log, proposal_media';
  RAISE NOTICE 'Functions: generate_proposal_number(), update_proposals_updated_at()';
END $$;

