-- Migration 087: Guest identity tokens and per-order ordering mode
-- Enables per-guest access links and individual lunch ordering

-- Per-guest access tokens for individual identification
ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS guest_access_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tpg_guest_access_token
  ON trip_proposal_guests(guest_access_token);

-- Backfill existing rows that have NULL tokens
UPDATE trip_proposal_guests
  SET guest_access_token = gen_random_uuid()
  WHERE guest_access_token IS NULL;

-- Per-order ordering mode: coordinator (default) or individual
ALTER TABLE proposal_lunch_orders
  ADD COLUMN IF NOT EXISTS ordering_mode VARCHAR(20) DEFAULT 'coordinator'
    CHECK (ordering_mode IN ('coordinator', 'individual'));
