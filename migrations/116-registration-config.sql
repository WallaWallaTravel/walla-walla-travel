-- Migration 116: Registration Deposit Configuration
-- Adds registration deposit settings to trip_proposals
-- Updates guest_payments CHECK to allow 'registration_deposit' type

-- Add registration deposit config to trip_proposals
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS registration_deposit_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS registration_deposit_type VARCHAR(20) DEFAULT 'flat'
    CHECK (registration_deposit_type IN ('flat', 'per_person')),
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT TRUE;

-- Update guest_payments CHECK constraint to include 'registration_deposit'
DO $$
BEGIN
  -- Drop existing constraint (may have different name depending on when it was created)
  ALTER TABLE guest_payments
    DROP CONSTRAINT IF EXISTS guest_payments_payment_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore if constraint doesn't exist
END $$;

ALTER TABLE guest_payments
  ADD CONSTRAINT guest_payments_payment_type_check
  CHECK (payment_type IN ('guest_share', 'group_payment', 'admin_adjustment', 'refund', 'registration_deposit'));

-- Link trip_proposal_guests to guest_profiles
ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS guest_profile_id INTEGER REFERENCES guest_profiles(id);

CREATE INDEX IF NOT EXISTS idx_tpg_guest_profile ON trip_proposal_guests(guest_profile_id);

-- Track migration
INSERT INTO _migrations (name) VALUES ('116-registration-config.sql')
ON CONFLICT (name) DO NOTHING;
