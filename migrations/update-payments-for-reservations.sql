-- Update payments table to support both bookings and reservations
-- This allows us to track payments for both regular bookings and "Reserve & Refine" reservations

-- Make booking_id nullable
ALTER TABLE payments 
  ALTER COLUMN booking_id DROP NOT NULL;

-- Add reservation_id column
ALTER TABLE payments 
  ADD COLUMN reservation_id INTEGER REFERENCES reservations(id);

-- Add check constraint to ensure at least one of booking_id or reservation_id is set
ALTER TABLE payments 
  ADD CONSTRAINT payments_booking_or_reservation_check 
  CHECK (
    (booking_id IS NOT NULL AND reservation_id IS NULL) OR 
    (booking_id IS NULL AND reservation_id IS NOT NULL)
  );

-- Add index for reservation payments
CREATE INDEX idx_payments_reservation ON payments(reservation_id);

-- Add comment for clarity
COMMENT ON TABLE payments IS 'Payment transaction records for both bookings and reservations (Stripe integration)';
COMMENT ON COLUMN payments.booking_id IS 'Reference to bookings table (for direct bookings)';
COMMENT ON COLUMN payments.reservation_id IS 'Reference to reservations table (for Reserve & Refine flow)';


