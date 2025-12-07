-- Add columns for hotel concierge and other referral details
-- This allows us to capture specific information when guests select these referral sources

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS hotel_concierge_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS referral_other_details TEXT;

COMMENT ON COLUMN bookings.hotel_concierge_name IS 'Name of hotel or concierge when referral_source is hotel_concierge';
COMMENT ON COLUMN bookings.referral_other_details IS 'Free-form details when referral_source is other';

-- Add the same columns to reservations table for consistency
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS hotel_concierge_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS referral_other_details TEXT;

COMMENT ON COLUMN reservations.hotel_concierge_name IS 'Name of hotel or concierge when referral_source is hotel_concierge';
COMMENT ON COLUMN reservations.referral_other_details IS 'Free-form details when referral_source is other';




