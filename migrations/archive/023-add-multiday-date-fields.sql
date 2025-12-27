-- Add tour_start_date and tour_end_date columns for multi-day tours
-- These fields are used when tour_duration_type is 'multi'

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tour_start_date DATE,
ADD COLUMN IF NOT EXISTS tour_end_date DATE;

COMMENT ON COLUMN bookings.tour_start_date IS 'Start date for multi-day tours (when tour_duration_type is multi)';
COMMENT ON COLUMN bookings.tour_end_date IS 'End date for multi-day tours (when tour_duration_type is multi)';

-- Add indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_tour_start_date ON bookings(tour_start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_end_date ON bookings(tour_end_date);

-- Add the same to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS tour_start_date DATE,
ADD COLUMN IF NOT EXISTS tour_end_date DATE;

COMMENT ON COLUMN reservations.tour_start_date IS 'Start date for multi-day tours';
COMMENT ON COLUMN reservations.tour_end_date IS 'End date for multi-day tours';

CREATE INDEX IF NOT EXISTS idx_reservations_tour_start_date ON reservations(tour_start_date);
CREATE INDEX IF NOT EXISTS idx_reservations_tour_end_date ON reservations(tour_end_date);




