-- Migration: 067-shared-tour-discounts.sql
-- Description: Add discount/refund tracking columns to shared_tours table
-- Created: 2026-02-04

-- Add discount columns to shared_tours table
ALTER TABLE shared_tours
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) CHECK (discount_type IN ('none', 'flat', 'percentage')),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_applied_by VARCHAR(255);

-- Set default discount_type for existing rows
UPDATE shared_tours SET discount_type = 'none' WHERE discount_type IS NULL;

-- Add refund tracking columns to shared_tours_tickets if not exists
ALTER TABLE shared_tours_tickets
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_price_per_person DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS original_total_amount DECIMAL(10, 2);

-- Add index for discount tracking queries
CREATE INDEX IF NOT EXISTS idx_shared_tours_discount_applied
  ON shared_tours(discount_applied_at)
  WHERE discount_type IS NOT NULL AND discount_type != 'none';

-- Add index for refund tracking
CREATE INDEX IF NOT EXISTS idx_shared_tours_tickets_refund
  ON shared_tours_tickets(refund_status)
  WHERE refund_status IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN shared_tours.discount_type IS 'Type of discount: none, flat ($ per person), percentage';
COMMENT ON COLUMN shared_tours.discount_amount IS 'Discount amount - either flat dollar amount or percentage value';
COMMENT ON COLUMN shared_tours.discount_reason IS 'Admin note explaining why discount was applied';
COMMENT ON COLUMN shared_tours.discount_applied_at IS 'Timestamp when discount was applied';
COMMENT ON COLUMN shared_tours.discount_applied_by IS 'Email/ID of admin who applied the discount';

COMMENT ON COLUMN shared_tours_tickets.refund_amount IS 'Amount refunded to customer via Stripe';
COMMENT ON COLUMN shared_tours_tickets.refund_id IS 'Stripe refund ID';
COMMENT ON COLUMN shared_tours_tickets.refund_status IS 'Stripe refund status: pending, succeeded, failed';
COMMENT ON COLUMN shared_tours_tickets.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN shared_tours_tickets.original_price_per_person IS 'Original price before discount (for record keeping)';
COMMENT ON COLUMN shared_tours_tickets.original_total_amount IS 'Original total before discount (for record keeping)';
