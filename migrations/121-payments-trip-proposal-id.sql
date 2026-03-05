ALTER TABLE payments ADD COLUMN IF NOT EXISTS trip_proposal_id INTEGER REFERENCES trip_proposals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_trip_proposal ON payments(trip_proposal_id) WHERE trip_proposal_id IS NOT NULL;
