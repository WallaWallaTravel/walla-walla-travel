-- Migration: 071-driver-tips-and-tour-completion
-- Created: 2026-02-05
-- Author: Claude Code
-- Purpose: Add tables for driver tip collection and tour completion tracking

BEGIN;

-- Record this migration (using subquery for auto-incrementing id)
INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1, '071-driver-tips-and-tour-completion', 'Add driver_tips, tour_expenses, and tour_completions tables for mobile tip collection feature'
FROM _migrations
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE migration_name = '071-driver-tips-and-tour-completion');

-- ============================================================================
-- DRIVER TIPS TABLE
-- Stores tip payments from guests via QR code/payment link
-- ============================================================================
CREATE TABLE IF NOT EXISTS driver_tips (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(100),
  card_brand VARCHAR(20),
  card_last4 VARCHAR(4),
  payment_status VARCHAR(50) DEFAULT 'pending',
  tip_source VARCHAR(50) DEFAULT 'qr_code',
  payroll_exported BOOLEAN DEFAULT false,
  payroll_exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for driver_tips
CREATE INDEX IF NOT EXISTS idx_driver_tips_booking ON driver_tips(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_tips_driver ON driver_tips(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_tips_status ON driver_tips(payment_status);
CREATE INDEX IF NOT EXISTS idx_driver_tips_payroll ON driver_tips(payroll_exported) WHERE payroll_exported = false;
CREATE INDEX IF NOT EXISTS idx_driver_tips_created ON driver_tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_tips_stripe_intent ON driver_tips(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- TOUR EXPENSES TABLE
-- Stores lunch costs and other driver-entered expenses with receipt photos
-- ============================================================================
CREATE TABLE IF NOT EXISTS tour_expenses (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  receipt_url VARCHAR(500),
  receipt_storage_path VARCHAR(500),
  reimbursement_status VARCHAR(50) DEFAULT 'pending',
  reimbursed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tour_expenses
CREATE INDEX IF NOT EXISTS idx_tour_expenses_booking ON tour_expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_expenses_driver ON tour_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_tour_expenses_type ON tour_expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_tour_expenses_status ON tour_expenses(reimbursement_status);
CREATE INDEX IF NOT EXISTS idx_tour_expenses_created ON tour_expenses(created_at DESC);

-- ============================================================================
-- TOUR COMPLETIONS TABLE
-- Tracks when tours are completed and stores tip payment link/QR code info
-- ============================================================================
CREATE TABLE IF NOT EXISTS tour_completions (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lunch_cost_total DECIMAL(10,2),
  tip_code VARCHAR(20) UNIQUE,
  tip_payment_link VARCHAR(500),
  tip_qr_code_url VARCHAR(500),
  driver_notes TEXT,
  tips_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tour_completions
CREATE INDEX IF NOT EXISTS idx_tour_completions_booking ON tour_completions(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_completions_driver ON tour_completions(driver_id);
CREATE INDEX IF NOT EXISTS idx_tour_completions_tip_code ON tour_completions(tip_code) WHERE tip_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tour_completions_completed ON tour_completions(completed_at DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE driver_tips IS 'Stores tip payments from guests collected via QR code/payment link at tour end';
COMMENT ON COLUMN driver_tips.tip_source IS 'How the tip was collected: qr_code, payment_link, manual';
COMMENT ON COLUMN driver_tips.payroll_exported IS 'Whether this tip has been exported to payroll system';

COMMENT ON TABLE tour_expenses IS 'Driver-entered expenses like lunch costs with receipt photo uploads';
COMMENT ON COLUMN tour_expenses.expense_type IS 'Type of expense: lunch, parking, toll, other';
COMMENT ON COLUMN tour_expenses.reimbursement_status IS 'Status: pending, approved, reimbursed, denied';

COMMENT ON TABLE tour_completions IS 'Tracks tour completion and stores tip collection payment link info';
COMMENT ON COLUMN tour_completions.tip_code IS 'Short unique code for tip payment URL (e.g., ABC123)';
COMMENT ON COLUMN tour_completions.tips_enabled IS 'Whether tip collection is enabled for this tour';

COMMIT;
