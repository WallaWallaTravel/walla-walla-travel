-- ============================================================================
-- Performance Optimization Indexes
-- 
-- Adds critical indexes for common query patterns
-- Run this after code refactoring is complete
-- ============================================================================

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_brand_id ON bookings(brand_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_date ON bookings(customer_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_brand_date ON bookings(brand_id, date DESC);

-- Time cards indexes
CREATE INDEX IF NOT EXISTS idx_time_cards_driver_id ON time_cards(driver_id);
CREATE INDEX IF NOT EXISTS idx_time_cards_clock_in ON time_cards(clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_cards_driver_date ON time_cards(driver_id, DATE(clock_in_time));
CREATE INDEX IF NOT EXISTS idx_time_cards_active ON time_cards(driver_id, clock_out_time) WHERE clock_out_time IS NULL;

-- Inspections indexes
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_driver_id ON inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(type);
CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id ON inspections(time_card_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_date ON inspections(vehicle_id, DATE(created_at));

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Proposals indexes
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Reservations indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_reservations_booking_id ON reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_reservations_winery_id ON reservations(winery_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);

-- ============================================================================
-- Analyze tables to update statistics
-- ============================================================================

ANALYZE bookings;
ANALYZE time_cards;
ANALYZE inspections;
ANALYZE customers;
ANALYZE proposals;
ANALYZE vehicles;
ANALYZE users;
ANALYZE payments;

-- ============================================================================
-- Index maintenance note
-- ============================================================================

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan ASC;

-- Drop unused indexes after monitoring for 1-2 weeks




