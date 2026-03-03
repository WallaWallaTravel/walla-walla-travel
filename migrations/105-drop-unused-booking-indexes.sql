-- Migration 105: Drop unused booking indexes
--
-- These indexes on the bookings table have zero query filter usage:
--   - idx_bookings_referral_source: referral_source is only written via INSERT,
--     never used in WHERE / ORDER BY / GROUP BY.
--   - idx_bookings_tour_start_date: tour_start_date filters exist only on the
--     reservations table (calendar events query), not on bookings.
--   - idx_bookings_tour_end_date: same as above.
--
-- Dropping them removes write overhead on every INSERT/UPDATE to bookings.

DROP INDEX IF EXISTS idx_bookings_referral_source;
DROP INDEX IF EXISTS idx_bookings_tour_start_date;
DROP INDEX IF EXISTS idx_bookings_tour_end_date;
