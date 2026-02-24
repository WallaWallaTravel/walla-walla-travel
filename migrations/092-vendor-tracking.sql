-- Migration 092: Vendor tracking per stop
-- Adds vendor contact info, quote status tracking, and interaction log

-- Vendor fields on stops
ALTER TABLE trip_proposal_stops
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS quote_status VARCHAR(30) DEFAULT 'none'
    CHECK (quote_status IN ('none', 'requested', 'quoted', 'accepted', 'confirmed', 'paid')),
  ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS quote_notes TEXT;

-- Vendor interaction log
CREATE TABLE IF NOT EXISTS vendor_interactions (
  id SERIAL PRIMARY KEY,
  trip_proposal_stop_id INTEGER NOT NULL REFERENCES trip_proposal_stops(id) ON DELETE CASCADE,
  interaction_type VARCHAR(30) NOT NULL
    CHECK (interaction_type IN ('note', 'email_sent', 'email_received', 'phone_call', 'quote_received')),
  content TEXT NOT NULL,
  contacted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_interactions_stop
  ON vendor_interactions(trip_proposal_stop_id);
