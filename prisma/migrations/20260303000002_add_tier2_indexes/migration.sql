-- Migration: Tier 2 Performance Indexes
-- Tables: booking_timeline, reservations, wineries

-- booking_timeline (audit trail queries)
CREATE INDEX IF NOT EXISTS idx_booking_timeline_booking ON booking_timeline(booking_id, created_at DESC);

-- reservations (payment lookups)
CREATE INDEX IF NOT EXISTS idx_reservations_booking ON reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at DESC);

-- wineries public page lookup
CREATE INDEX IF NOT EXISTS idx_wineries_active_slug ON wineries(is_active, slug);
