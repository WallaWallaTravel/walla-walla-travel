-- Add is_lunch_stop field to itinerary_stops table
-- This allows marking specific stops as lunch stops

ALTER TABLE itinerary_stops 
ADD COLUMN IF NOT EXISTS is_lunch_stop BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_itinerary_stops_lunch ON itinerary_stops(is_lunch_stop) WHERE is_lunch_stop = TRUE;

COMMENT ON COLUMN itinerary_stops.is_lunch_stop IS 'Indicates if this stop is designated as the lunch stop for the tour';




