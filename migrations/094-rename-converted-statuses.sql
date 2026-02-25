-- Migration 094: Rename duplicate "converted" statuses to distinct names
-- Estimate: converted → proposal_created
-- Proposal: converted → booked

-- Rename estimate status: converted → proposal_created
ALTER TABLE trip_estimates DROP CONSTRAINT IF EXISTS trip_estimates_status_check;
ALTER TABLE trip_estimates ADD CONSTRAINT trip_estimates_status_check
  CHECK (status IN ('draft', 'sent', 'viewed', 'deposit_paid', 'proposal_created'));
UPDATE trip_estimates SET status = 'proposal_created' WHERE status = 'converted';

-- Rename proposal status: converted → booked
ALTER TABLE trip_proposals DROP CONSTRAINT IF EXISTS trip_proposals_status_check;
ALTER TABLE trip_proposals ADD CONSTRAINT trip_proposals_status_check
  CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'booked'));
UPDATE trip_proposals SET status = 'booked' WHERE status = 'converted';
