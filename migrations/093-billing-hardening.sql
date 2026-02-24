-- Migration 093: Billing Hardening
-- Fixes schema gaps found during comprehensive audit of phases 1-7
-- Date: 2026-02-24

-- CRITICAL: Prevent duplicate Stripe payment recording (double-charging)
-- The ON CONFLICT DO NOTHING in application code only works with a UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_payments_stripe_unique
  ON guest_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Add 'processing' status to payment_reminders (for atomic claim pattern)
-- This prevents duplicate email sends when two cron runs overlap
ALTER TABLE payment_reminders DROP CONSTRAINT IF EXISTS payment_reminders_status_check;
ALTER TABLE payment_reminders ADD CONSTRAINT payment_reminders_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'skipped', 'cancelled'));

-- NOT NULL on financial columns (safety net — these should never be null)
ALTER TABLE trip_proposal_guests
  ALTER COLUMN amount_owed SET DEFAULT 0,
  ALTER COLUMN amount_paid SET DEFAULT 0,
  ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- Backfill any existing NULLs before adding NOT NULL constraints
UPDATE trip_proposal_guests SET amount_owed = 0 WHERE amount_owed IS NULL;
UPDATE trip_proposal_guests SET amount_paid = 0 WHERE amount_paid IS NULL;
UPDATE trip_proposal_guests SET payment_status = 'unpaid' WHERE payment_status IS NULL;

ALTER TABLE trip_proposal_guests
  ALTER COLUMN amount_owed SET NOT NULL,
  ALTER COLUMN amount_paid SET NOT NULL,
  ALTER COLUMN payment_status SET NOT NULL;

-- Missing index for snoozed admin reminder cron processing
CREATE INDEX IF NOT EXISTS idx_admin_reminders_snoozed
  ON admin_reminders(status, snoozed_until)
  WHERE status = 'snoozed';

-- Missing index for vendor interaction lookups by user
CREATE INDEX IF NOT EXISTS idx_vendor_interactions_contacted_by
  ON vendor_interactions(contacted_by);

-- Index for payment reminders cron query (pending + scheduled_date)
CREATE INDEX IF NOT EXISTS idx_payment_reminders_pending_scheduled
  ON payment_reminders(status, scheduled_date)
  WHERE status = 'pending';
