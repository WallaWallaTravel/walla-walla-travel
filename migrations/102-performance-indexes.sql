-- Migration 102: Performance Indexes
-- Adds indexes to tables identified as having zero indexes despite active queries.
-- Targets: inspections (10+ queries), booking_wineries, time_cards (active card lookups)
--
-- Safe to run: All CREATE INDEX IF NOT EXISTS — idempotent.

BEGIN;

-- ===========================================================================
-- inspections (10+ queries, zero indexes)
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id
  ON inspections(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id
  ON inspections(time_card_id);

CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_type
  ON inspections(vehicle_id, type);

CREATE INDEX IF NOT EXISTS idx_inspections_timecard_type
  ON inspections(time_card_id, type);

CREATE INDEX IF NOT EXISTS idx_inspections_created_at
  ON inspections(created_at DESC);

-- ===========================================================================
-- booking_wineries (joined on every booking detail view)
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_booking_wineries_booking_order
  ON booking_wineries(booking_id, visit_order);

-- ===========================================================================
-- time_cards (active card lookups — partial indexes)
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_time_cards_driver_active
  ON time_cards(driver_id, clock_out_time) WHERE clock_out_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_cards_vehicle_active
  ON time_cards(vehicle_id, clock_out_time) WHERE clock_out_time IS NULL;

-- ===========================================================================
-- Record migration
-- ===========================================================================
INSERT INTO _migrations (id, migration_name, applied_at, notes)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM _migrations),
  '102-performance-indexes',
  NOW(),
  '8 indexes: inspections (5), booking_wineries (1), time_cards partial (2)'
)
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;
