-- Migration 095: Guest Capacity, Self-Registration & Dynamic Pricing
-- Adds min/max guest capacity, self-registration controls, and dynamic pricing support

ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS max_guests INTEGER,
  ADD COLUMN IF NOT EXISTS min_guests INTEGER,
  ADD COLUMN IF NOT EXISTS min_guests_deadline DATE,
  ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_approval_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_guest_count_to_guests BOOLEAN DEFAULT FALSE;

-- Add constraints
ALTER TABLE trip_proposals
  ADD CONSTRAINT chk_max_guests_positive CHECK (max_guests IS NULL OR max_guests > 0),
  ADD CONSTRAINT chk_min_guests_positive CHECK (min_guests IS NULL OR min_guests > 0),
  ADD CONSTRAINT chk_min_lte_max_guests CHECK (
    min_guests IS NULL OR max_guests IS NULL OR min_guests <= max_guests
  );

COMMENT ON COLUMN trip_proposals.max_guests IS 'Maximum number of guests allowed (capacity limit)';
COMMENT ON COLUMN trip_proposals.min_guests IS 'Minimum number of guests required for trip to proceed';
COMMENT ON COLUMN trip_proposals.min_guests_deadline IS 'Deadline by which min_guests must be met';
COMMENT ON COLUMN trip_proposals.dynamic_pricing_enabled IS 'When true, per-person cost is calculated from total / guest count';
COMMENT ON COLUMN trip_proposals.guest_approval_required IS 'When true, self-registered guests need admin approval';
COMMENT ON COLUMN trip_proposals.show_guest_count_to_guests IS 'When true, guest-facing pages show headcount info';
