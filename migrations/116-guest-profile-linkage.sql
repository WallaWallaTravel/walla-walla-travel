-- Migration 116: Guest Profile Linkage
-- Links guest profiles to trip_proposal_guests and shared_tours_tickets,
-- and optionally links shared_tours to trip_proposals for portal bridge.

-- Add guest_profile_id to trip_proposal_guests
ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS guest_profile_id INTEGER REFERENCES guest_profiles(id);
CREATE INDEX IF NOT EXISTS idx_tpg_guest_profile ON trip_proposal_guests(guest_profile_id);

-- Add guest_profile_id to shared_tour_tickets
ALTER TABLE shared_tour_tickets
  ADD COLUMN IF NOT EXISTS guest_profile_id INTEGER REFERENCES guest_profiles(id);
CREATE INDEX IF NOT EXISTS idx_stt_guest_profile ON shared_tour_tickets(guest_profile_id);

-- Add optional trip_proposal_id to shared_tours (for portal bridge)
ALTER TABLE shared_tours
  ADD COLUMN IF NOT EXISTS trip_proposal_id INTEGER REFERENCES trip_proposals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_shared_tours_proposal ON shared_tours(trip_proposal_id) WHERE trip_proposal_id IS NOT NULL;

-- Track migration
INSERT INTO _migrations (name, applied_at) VALUES ('116-guest-profile-linkage', NOW())
  ON CONFLICT (name) DO NOTHING;
