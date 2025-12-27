-- Add tour_duration_type column to bookings table
-- This indicates whether the tour is single-day or multi-day

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tour_duration_type VARCHAR(20) DEFAULT 'single';

COMMENT ON COLUMN bookings.tour_duration_type IS 'Duration type: single (single day) or multi (multi-day tour)';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_tour_duration_type ON bookings(tour_duration_type);

-- Add the same to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS tour_duration_type VARCHAR(20) DEFAULT 'single';

COMMENT ON COLUMN reservations.tour_duration_type IS 'Duration type: single (single day) or multi (multi-day tour)';

CREATE INDEX IF NOT EXISTS idx_reservations_tour_duration_type ON reservations(tour_duration_type);




