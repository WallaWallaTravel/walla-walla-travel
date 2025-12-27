-- Proposals System Migration
-- Creates tables for proposal generation and tracking

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  
  -- Tour Details
  tour_date DATE NOT NULL,
  flexible_dates BOOLEAN DEFAULT FALSE,
  duration_hours INTEGER NOT NULL,
  party_size INTEGER NOT NULL,
  pickup_location TEXT,
  selected_wineries JSONB,
  
  -- Pricing
  base_price DECIMAL(10, 2) NOT NULL,
  additional_services JSONB,
  services_total DECIMAL(10, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  discount_reason TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  
  -- Proposal Content
  proposal_title VARCHAR(255),
  introduction TEXT,
  special_notes TEXT,
  terms_and_conditions TEXT,
  valid_until DATE,
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, accepted, declined, expired, converted
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  expired_at TIMESTAMP,
  
  -- Client Acceptance
  accepted_by_name VARCHAR(255),
  accepted_by_email VARCHAR(255),
  acceptance_signature TEXT,
  acceptance_ip_address INET,
  
  -- Conversion
  converted_to_booking_id INTEGER REFERENCES bookings(id),
  converted_at TIMESTAMP,
  
  -- Admin tracking
  created_by_admin_id INTEGER REFERENCES users(id),
  
  -- Indexes
  CONSTRAINT proposals_proposal_number_key UNIQUE (proposal_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_client_email ON proposals(client_email);
CREATE INDEX IF NOT EXISTS idx_proposals_tour_date ON proposals(tour_date);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON proposals(valid_until);

-- Proposal activity log (for tracking views, sends, etc.)
CREATE TABLE IF NOT EXISTS proposal_activity_log (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- sent, viewed, accepted, declined, reminder_sent, etc.
  activity_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_activity_proposal_id ON proposal_activity_log(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_activity_type ON proposal_activity_log(activity_type);

-- Function to auto-expire proposals
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS void AS $$
BEGIN
  UPDATE proposals
  SET status = 'expired',
      expired_at = NOW()
  WHERE status IN ('draft', 'sent', 'viewed')
    AND valid_until < CURRENT_DATE
    AND expired_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE proposals IS 'Stores client proposals with cost estimates';
COMMENT ON COLUMN proposals.status IS 'Proposal lifecycle: draft -> sent -> viewed -> accepted/declined/expired';
COMMENT ON COLUMN proposals.selected_wineries IS 'JSON array of selected winery objects';
COMMENT ON COLUMN proposals.additional_services IS 'JSON array of service objects with included flag';

