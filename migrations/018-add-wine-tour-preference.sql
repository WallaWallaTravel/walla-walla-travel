-- Add wine_tour_preference column to track specific wine tour preferences
-- Options: private, open_to_shared, open_to_offset, early_week_combo

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS wine_tour_preference VARCHAR(50);

COMMENT ON COLUMN bookings.wine_tour_preference IS 'Wine tour preference when tour_type is wine_tour (private, open_to_shared, open_to_offset, early_week_combo)';

-- Add the same column to reservations table for consistency
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS wine_tour_preference VARCHAR(50);

COMMENT ON COLUMN reservations.wine_tour_preference IS 'Wine tour preference when tour_type is wine_tour';




