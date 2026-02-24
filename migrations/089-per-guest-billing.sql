-- Migration 089: Per-guest billing infrastructure
-- Adds individual billing per guest, payment tracking, and couple/group payment support

-- ============================================================================
-- Guest billing columns
-- ============================================================================

ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount_owed DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_owed_override DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_group_id UUID;

-- ============================================================================
-- Proposal-level billing toggles
-- ============================================================================

ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS individual_billing_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_sponsored_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_deadline DATE;

-- ============================================================================
-- Guest payments table (one record per payment transaction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_payments (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES trip_proposal_guests(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  payment_type VARCHAR(30) NOT NULL DEFAULT 'guest_share'
    CHECK (payment_type IN ('guest_share', 'group_payment', 'admin_adjustment', 'refund')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  paid_by_guest_id INTEGER REFERENCES trip_proposal_guests(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_payments_proposal ON guest_payments(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_guest_payments_guest ON guest_payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_payments_stripe ON guest_payments(stripe_payment_intent_id);

-- ============================================================================
-- Guest payment groups (couples/subgroups sharing a payment link)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_payment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  group_access_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_payment_groups_proposal ON guest_payment_groups(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_guest_payment_groups_token ON guest_payment_groups(group_access_token);
