-- ============================================================================
-- Migration 079: Proposal Service-Level Billing
-- Moves billing from per-stop to service line items (inclusions).
-- Stops become itinerary-only; all billing goes through inclusions.
-- ============================================================================

-- Add cost_note to stops (informational, not billed)
ALTER TABLE trip_proposal_stops ADD COLUMN IF NOT EXISTS cost_note TEXT;

-- Add pricing_type to inclusions for per-person/per-day calculations
ALTER TABLE trip_proposal_inclusions ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'flat'
  CHECK (pricing_type IN ('flat', 'per_person', 'per_day'));
