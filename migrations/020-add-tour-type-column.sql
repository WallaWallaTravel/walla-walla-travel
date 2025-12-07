-- Add tour_type column to bookings table
-- This stores the type of tour: wine_tour, private_transportation, corporate, airport_transfer

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tour_type VARCHAR(50) DEFAULT 'wine_tour';

COMMENT ON COLUMN bookings.tour_type IS 'Type of tour service: wine_tour, private_transportation, corporate, airport_transfer';

-- Add index for faster filtering by tour type
CREATE INDEX IF NOT EXISTS idx_bookings_tour_type ON bookings(tour_type);

-- Add the same to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS tour_type VARCHAR(50) DEFAULT 'wine_tour';

COMMENT ON COLUMN reservations.tour_type IS 'Type of tour service: wine_tour, private_transportation, corporate, airport_transfer';

CREATE INDEX IF NOT EXISTS idx_reservations_tour_type ON reservations(tour_type);




