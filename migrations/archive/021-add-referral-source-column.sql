-- Add referral_source column to bookings table
-- This is the main referral source field (google, ai_search, social_media, etc.)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50);

COMMENT ON COLUMN bookings.referral_source IS 'Main referral source: google, ai_search, social_media, friend_referral, hotel_concierge, winery_recommendation, repeat_customer, other';

-- Add index for analytics
CREATE INDEX IF NOT EXISTS idx_bookings_referral_source ON bookings(referral_source);

-- Add the same to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50);

COMMENT ON COLUMN reservations.referral_source IS 'Main referral source: google, ai_search, social_media, friend_referral, hotel_concierge, winery_recommendation, repeat_customer, other';

CREATE INDEX IF NOT EXISTS idx_reservations_referral_source ON reservations(referral_source);




