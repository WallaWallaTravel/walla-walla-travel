-- Migration: Add payment columns to proposals table
-- Run this with: psql $DATABASE_URL -f scripts/add-proposal-payment-columns.sql

-- Add payment-related columns to proposals if they don't exist
DO $$
BEGIN
  -- payment_intent_id: Stripe PaymentIntent ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'proposals' AND column_name = 'payment_intent_id') THEN
    ALTER TABLE proposals ADD COLUMN payment_intent_id VARCHAR(255);
  END IF;

  -- payment_status: pending, succeeded, failed, refunded
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'proposals' AND column_name = 'payment_status') THEN
    ALTER TABLE proposals ADD COLUMN payment_status VARCHAR(50) DEFAULT NULL;
  END IF;

  -- payment_amount: Amount paid (in dollars)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'proposals' AND column_name = 'payment_amount') THEN
    ALTER TABLE proposals ADD COLUMN payment_amount DECIMAL(10,2);
  END IF;

  -- payment_date: When payment was received
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'proposals' AND column_name = 'payment_date') THEN
    ALTER TABLE proposals ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index on payment_intent_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_proposals_payment_intent_id ON proposals(payment_intent_id);

-- Show result
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'proposals' AND column_name LIKE 'payment%'
ORDER BY column_name;
