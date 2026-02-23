-- Migration 086: Add skip_deposit_on_accept toggle to trip_proposals
-- Controls whether accepting a proposal requires deposit payment or immediately unlocks planning tools

ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS skip_deposit_on_accept BOOLEAN DEFAULT FALSE;
