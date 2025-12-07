-- Add missing indexes identified in comprehensive audit (Nov 14, 2025)
-- These indexes will improve query performance for commonly filtered columns

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_tour_start_date ON bookings(tour_start_date) WHERE tour_start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tour_end_date ON bookings(tour_end_date) WHERE tour_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

COMMENT ON INDEX idx_bookings_tour_start_date IS 'Partial index for multi-day tours start date queries';
COMMENT ON INDEX idx_bookings_tour_end_date IS 'Partial index for multi-day tours end date queries';
COMMENT ON INDEX idx_bookings_customer_email IS 'Index for customer lookup by email';
COMMENT ON INDEX idx_bookings_created_at IS 'Index for recent bookings queries (DESC for latest first)';

-- Itinerary stops table indexes
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_lunch ON itinerary_stops(is_lunch_stop) WHERE is_lunch_stop = TRUE;
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_winery_id ON itinerary_stops(winery_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_order ON itinerary_stops(itinerary_id, stop_order);

COMMENT ON INDEX idx_itinerary_stops_lunch IS 'Partial index for finding lunch stops';
COMMENT ON INDEX idx_itinerary_stops_winery_id IS 'Index for winery stop lookups';
COMMENT ON INDEX idx_itinerary_stops_order IS 'Composite index for ordered stop queries';

-- Reservations table indexes
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_reservations_tour_date ON reservations(tour_date);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);

COMMENT ON INDEX idx_reservations_email IS 'Index for reservation lookup by email';
COMMENT ON INDEX idx_reservations_tour_date IS 'Index for date-based reservation queries';
COMMENT ON INDEX idx_reservations_created_at IS 'Index for recent reservations';

-- Hotels/Lodging table indexes
CREATE INDEX IF NOT EXISTS idx_hotels_active ON hotels(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_hotels_type ON hotels(type);

COMMENT ON INDEX idx_hotels_active IS 'Partial index for active hotels only';
COMMENT ON INDEX idx_hotels_type IS 'Index for filtering hotels by type';

-- Wineries table indexes
CREATE INDEX IF NOT EXISTS idx_wineries_active ON wineries(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_wineries_name_search ON wineries USING gin(to_tsvector('english', name));

COMMENT ON INDEX idx_wineries_active IS 'Partial index for active wineries only';
COMMENT ON INDEX idx_wineries_name_search IS 'Full-text search index for winery names';

-- Customers table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

COMMENT ON INDEX idx_customers_email IS 'Index for customer lookup by email';
COMMENT ON INDEX idx_customers_phone IS 'Index for customer lookup by phone';

-- User activity logs indexes (for performance monitoring)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);

COMMENT ON INDEX idx_user_activity_logs_user IS 'Index for user activity queries';
COMMENT ON INDEX idx_user_activity_logs_timestamp IS 'Index for recent activity queries';
COMMENT ON INDEX idx_user_activity_logs_action IS 'Index for filtering by action type';

-- Print summary of indexes created
DO $$
BEGIN
  RAISE NOTICE '=== Migration 025: Missing Indexes Added ===';
  RAISE NOTICE 'Added %s new indexes for improved query performance', 19;
  RAISE NOTICE 'Target tables: bookings, itinerary_stops, reservations, hotels, wineries, customers, user_activity_logs';
END $$;




