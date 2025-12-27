-- Create reservations table for Reserve & Refine bookings
-- These are deposit-based bookings where customers secure a date
-- and then Ryan calls to customize details

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Tour Details
  party_size INTEGER NOT NULL,
  preferred_date DATE NOT NULL,
  alternate_date DATE,
  event_type VARCHAR(100),
  special_requests TEXT,
  
  -- Deposit & Payment
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(20), -- 'check', 'card'
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, confirmed, converted_to_booking, cancelled
  consultation_deadline TIMESTAMP,
  contacted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  
  -- Conversion to full booking
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  converted_at TIMESTAMP,
  
  -- Notes
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_preferred_date ON reservations(preferred_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_number ON reservations(reservation_number);

-- Comments
COMMENT ON TABLE reservations IS 'Reserve & Refine bookings - deposits to hold dates before customization';
COMMENT ON COLUMN reservations.consultation_deadline IS 'When Ryan should call by (typically 24 hours after creation)';
COMMENT ON COLUMN reservations.booking_id IS 'If converted to full booking, reference to bookings table';


