-- ============================================================================
-- Migration 072: Trip Estimates (Quick Tally System)
-- ============================================================================
-- Creates the trip_estimates and trip_estimate_items tables for the
-- Quick Tally → Deposit → Full Proposal workflow.
-- ============================================================================

-- ============================================================================
-- Table: trip_estimates
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_estimates (
  id SERIAL PRIMARY KEY,
  estimate_number VARCHAR(20) UNIQUE NOT NULL,

  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Trip details
  trip_type VARCHAR(50) DEFAULT 'wine_tour',
  trip_title VARCHAR(255),
  trip_description TEXT,
  start_date DATE,
  end_date DATE,
  party_size INTEGER DEFAULT 2,

  -- Pricing
  subtotal NUMERIC(10,2) DEFAULT 0,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_reason TEXT,

  -- Deposit payment
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_at TIMESTAMPTZ,
  payment_intent_id VARCHAR(255),

  -- Status workflow: draft → sent → viewed → deposit_paid → converted
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'deposit_paid', 'converted')),

  -- Link to full proposal (set when converted)
  trip_proposal_id INTEGER REFERENCES trip_proposals(id) ON DELETE SET NULL,

  -- Validity
  valid_until DATE,

  -- Branding & ownership
  brand_id INTEGER,
  created_by INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_estimates
CREATE INDEX IF NOT EXISTS idx_trip_estimates_number ON trip_estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_trip_estimates_status ON trip_estimates(status);
CREATE INDEX IF NOT EXISTS idx_trip_estimates_customer_email ON trip_estimates(customer_email);
CREATE INDEX IF NOT EXISTS idx_trip_estimates_created_at ON trip_estimates(created_at DESC);

-- ============================================================================
-- Table: trip_estimate_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_estimate_items (
  id SERIAL PRIMARY KEY,
  trip_estimate_id INTEGER NOT NULL REFERENCES trip_estimates(id) ON DELETE CASCADE,

  -- Category
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'transportation', 'airport_transfer', 'tasting_fees',
      'dining', 'lunch_catering', 'hotel', 'planning_fee', 'misc'
    )),

  -- Item details
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_label VARCHAR(50),
  unit_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_estimate_items
CREATE INDEX IF NOT EXISTS idx_trip_estimate_items_estimate ON trip_estimate_items(trip_estimate_id);

-- ============================================================================
-- Function: generate_trip_estimate_number()
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_trip_estimate_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  prefix VARCHAR(2) := 'TE';
  year_part VARCHAR(4) := TO_CHAR(NOW(), 'YYYY');
  sequence_num INTEGER;
  estimate_number VARCHAR(20);
BEGIN
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(estimate_number FROM 9) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM trip_estimates
  WHERE estimate_number LIKE prefix || '-' || year_part || '-%';

  -- Format: TE-2026-00001
  estimate_number := prefix || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');

  RETURN estimate_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trip_estimates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_estimates_updated_at ON trip_estimates;
CREATE TRIGGER trip_estimates_updated_at
  BEFORE UPDATE ON trip_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_estimates_timestamp();

DROP TRIGGER IF EXISTS trip_estimate_items_updated_at ON trip_estimate_items;
CREATE TRIGGER trip_estimate_items_updated_at
  BEFORE UPDATE ON trip_estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_estimates_timestamp();
