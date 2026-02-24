-- Migration 088: Per-item tax control and planning fee mode
-- Allows each inclusion to be marked taxable/non-taxable and tax-included/tax-excluded
-- Adds percentage-based planning fee option

-- Per-inclusion tax control
ALTER TABLE trip_proposal_inclusions
  ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tax_included_in_price BOOLEAN DEFAULT FALSE;

-- Planning fee mode on proposals
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS planning_fee_mode VARCHAR(20) DEFAULT 'flat'
    CHECK (planning_fee_mode IN ('flat', 'percentage')),
  ADD COLUMN IF NOT EXISTS planning_fee_percentage DECIMAL(5,2) DEFAULT 0;
