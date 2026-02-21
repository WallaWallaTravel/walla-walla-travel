-- ============================================================================
-- Migration 082: Trip Proposal Bug Fixes & Hardening
-- Date: 2026-02-21
--
-- Fixes:
--   1. CRITICAL: Add missing sent_at column to trip_proposals
--   2. HIGH: Add arranged_tasting to inclusion_type CHECK constraint
--   3. MEDIUM: Fix tax_rate default from 8.9% to 9.1%
--   4. MEDIUM: Consolidate cost_notes → cost_note on trip_proposal_stops
-- ============================================================================

BEGIN;

-- Fix #1: Add missing sent_at column
-- The service sets sent_at when status changes to 'sent', and the admin list
-- page displays it, but the column was never created in migration 053.
ALTER TABLE trip_proposals ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Fix #2: Add arranged_tasting to inclusion_type CHECK constraint
-- TypeScript INCLUSION_TYPES includes 'arranged_tasting' but the DB CHECK
-- from migration 053 only allows: transportation, chauffeur, gratuity,
-- planning_fee, custom. Inserting arranged_tasting throws a constraint error.
ALTER TABLE trip_proposal_inclusions DROP CONSTRAINT IF EXISTS trip_proposal_inclusions_inclusion_type_check;
ALTER TABLE trip_proposal_inclusions ADD CONSTRAINT trip_proposal_inclusions_inclusion_type_check
  CHECK (inclusion_type IN ('transportation', 'chauffeur', 'gratuity', 'planning_fee', 'arranged_tasting', 'custom'));

-- Fix #3: Update tax_rate default to 9.1% (was 8.9% from migration 053)
-- The service already defaults to 0.091 for new proposals, but the DB default
-- was wrong. CLAUDE.md confirms 9.1% is the correct rate.
ALTER TABLE trip_proposals ALTER COLUMN tax_rate SET DEFAULT 0.091;

-- Fix #4: Consolidate cost_notes → cost_note
-- Migration 053 created cost_notes (plural), migration 079 added cost_note
-- (singular). Both exist, causing confusion and split data. Consolidate to
-- cost_note (singular) which matches the service-level billing model.
UPDATE trip_proposal_stops
  SET cost_note = cost_notes
  WHERE cost_note IS NULL AND cost_notes IS NOT NULL;

ALTER TABLE trip_proposal_stops DROP COLUMN IF EXISTS cost_notes;

COMMIT;
