-- =====================================================
-- INVOICING SYSTEM DATABASE MIGRATION
-- Date: October 31, 2025
-- Purpose: Add invoicing, hour tracking, and tip system
-- =====================================================

-- 1. Update bookings table with invoicing fields
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2) DEFAULT 6.0,
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS ready_for_final_invoice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_invoice_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_invoice_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS final_invoice_approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS final_invoice_approved_at TIMESTAMP;

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_type VARCHAR(20) NOT NULL, -- 'deposit' or 'final'
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment tracking
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  payment_method VARCHAR(50), -- card, ach, check, cash
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  
  -- Timestamps
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  due_date DATE,
  
  -- Files
  pdf_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT invoice_type_check CHECK (invoice_type IN ('deposit', 'final')),
  CONSTRAINT status_check CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- 3. Create tour_offers table for driver acceptance
CREATE TABLE IF NOT EXISTS tour_offers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id),
  
  -- Offer details
  offered_by INTEGER REFERENCES users(id), -- Admin who made the offer
  offered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- Response
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired, withdrawn
  response_at TIMESTAMP,
  response_notes TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT tour_offer_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  CONSTRAINT unique_pending_offer UNIQUE (booking_id, driver_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_tour_offers_booking_id ON tour_offers(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_offers_driver_id ON tour_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_tour_offers_status ON tour_offers(status);

-- 4. Update existing restaurants table (table already exists)
-- Add any missing columns for invoicing workflow
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS price_range VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_partner ON restaurants(is_partner);

-- 5. Update existing lunch_orders table (table already exists with different schema)
-- Add new columns for invoicing workflow
ALTER TABLE lunch_orders 
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_lunch_orders_booking_id ON lunch_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_restaurant_id ON lunch_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_status ON lunch_orders(status);

-- 6. Create function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix VARCHAR(4);
  sequence_num INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  -- Get year suffix (e.g., "2025" -> "25")
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_suffix || '-%';
  
  -- Generate invoice number: INV-25-00001
  new_invoice_number := 'INV-' || year_suffix || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  NEW.invoice_number := new_invoice_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating invoice numbers
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- 7. Create function to sync hours from time_cards to bookings
CREATE OR REPLACE FUNCTION sync_hours_to_booking()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Only process when clock_out_time is set (driver is clocking out)
  IF NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL THEN
    
    -- Find the booking for this driver on this date
    SELECT b.id, b.estimated_hours, b.hourly_rate
    INTO booking_record
    FROM bookings b
    WHERE b.driver_id = NEW.driver_id
    AND b.tour_date = NEW.clock_in_time::date
    AND b.status IN ('confirmed', 'in_progress')
    LIMIT 1;
    
    -- If booking found, update actual hours
    IF booking_record.id IS NOT NULL THEN
      UPDATE bookings
      SET 
        actual_hours = NEW.total_hours_worked,
        ready_for_final_invoice = true,
        updated_at = NOW()
      WHERE id = booking_record.id;
      
      RAISE NOTICE 'Synced % hours to booking #%', NEW.total_hours_worked, booking_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hour syncing
DROP TRIGGER IF EXISTS trigger_sync_hours_to_booking ON time_cards;
CREATE TRIGGER trigger_sync_hours_to_booking
  AFTER UPDATE ON time_cards
  FOR EACH ROW
  EXECUTE FUNCTION sync_hours_to_booking();

-- 8. Create view for pending final invoices (admin dashboard)
CREATE OR REPLACE VIEW pending_final_invoices AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.customer_name,
  b.customer_email,
  b.tour_date,
  b.estimated_hours,
  b.actual_hours,
  b.hourly_rate,
  b.base_price,
  b.total_price,
  
  -- Calculate final amount
  CASE 
    WHEN b.actual_hours IS NOT NULL THEN b.actual_hours * b.hourly_rate
    ELSE b.estimated_hours * b.hourly_rate
  END as calculated_amount,
  
  -- Check if ready
  b.ready_for_final_invoice,
  b.final_invoice_sent,
  b.final_invoice_sent_at,
  
  -- Time since tour
  EXTRACT(EPOCH FROM (NOW() - (b.tour_date + b.end_time::time))) / 3600 as hours_since_tour,
  
  -- Driver info
  u.name as driver_name,
  u.email as driver_email,
  
  -- Existing invoices
  (SELECT COUNT(*) FROM invoices WHERE booking_id = b.id AND invoice_type = 'final') as final_invoice_count
  
FROM bookings b
LEFT JOIN users u ON b.driver_id = u.id
WHERE b.status = 'completed'
AND b.tour_date < CURRENT_DATE
AND (b.tour_date + INTERVAL '48 hours') <= NOW()
AND b.ready_for_final_invoice = true
AND b.final_invoice_sent = false
ORDER BY b.tour_date DESC;

-- 9. Add comments for documentation
COMMENT ON TABLE invoices IS 'Stores all invoices (deposit and final) for bookings';
COMMENT ON TABLE tour_offers IS 'Tracks tour offers made to drivers for acceptance';
COMMENT ON TABLE restaurants IS 'Partner restaurants for lunch ordering';
COMMENT ON TABLE lunch_orders IS 'Client lunch orders placed through the portal';
COMMENT ON COLUMN bookings.actual_hours IS 'Actual service hours from driver time clock';
COMMENT ON COLUMN bookings.estimated_hours IS 'Estimated hours for pricing (default 6)';
COMMENT ON COLUMN bookings.hourly_rate IS 'Rate per hour for this booking';
COMMENT ON COLUMN bookings.ready_for_final_invoice IS 'Set to true when hours are synced and ready for admin approval';

-- 10. Update existing restaurant data with price ranges
UPDATE restaurants SET price_range = '$$$' WHERE name LIKE '%Saffron%' AND price_range IS NULL;
UPDATE restaurants SET price_range = '$$$$' WHERE name LIKE '%Brasserie%' AND price_range IS NULL;
UPDATE restaurants SET price_range = '$$$' WHERE name LIKE '%Passatempo%' AND price_range IS NULL;
UPDATE restaurants SET price_range = '$$$$' WHERE name LIKE '%Marc%' AND price_range IS NULL;
UPDATE restaurants SET price_range = '$$' WHERE name LIKE '%Olive%' AND price_range IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Created tables:';
  RAISE NOTICE '  - invoices';
  RAISE NOTICE '  - tour_offers';
  RAISE NOTICE '  - restaurants';
  RAISE NOTICE '  - lunch_orders';
  RAISE NOTICE 'Updated bookings table with invoicing columns';
  RAISE NOTICE 'Created triggers for auto-invoice numbering and hour syncing';
  RAISE NOTICE 'Created view: pending_final_invoices';
END $$;


