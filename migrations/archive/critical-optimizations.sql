-- ============================================================================
-- Critical Database Optimizations
-- Version: 2.0
-- Created: November 12, 2025
-- Description: Adds critical indexes, constraints, and optimizations
-- Expected Impact: 5-10x query performance improvement
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- PART 1: CRITICAL PERFORMANCE INDEXES
-- Using CONCURRENTLY to avoid locking tables in production
-- ============================================================================

-- Bookings Table (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tour_date_status 
  ON bookings(tour_date, status) 
  WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer_created 
  ON bookings(customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at 
  ON bookings(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status 
  ON bookings(status) 
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_brand 
  ON bookings(brand_id) 
  WHERE brand_id IS NOT NULL;

-- Payments Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_booking_status 
  ON payments(booking_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_reservation 
  ON payments(reservation_id) 
  WHERE reservation_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_status 
  ON payments(created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status 
  ON payments(status) 
  WHERE status IN ('pending', 'processing');

-- Customers Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_lower 
  ON customers(LOWER(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_last_booking 
  ON customers(last_booking_date DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_vip_status 
  ON customers(vip_status) 
  WHERE vip_status = true;

-- Reservations Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_preferred_date 
  ON reservations(preferred_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_customer 
  ON reservations(customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_brand 
  ON reservations(brand_id) 
  WHERE brand_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_status 
  ON reservations(status) 
  WHERE status IN ('pending', 'contacted');

-- Proposals Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_status_created 
  ON proposals(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_customer 
  ON proposals(customer_id);

-- Wineries Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wineries_active_featured 
  ON wineries(is_active, is_featured);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wineries_slug 
  ON wineries(slug);

-- AI Queries (for analytics dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_queries_created_rating 
  ON ai_queries(created_at DESC, rating);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_queries_visitor 
  ON ai_queries(visitor_id) 
  WHERE visitor_id IS NOT NULL;

-- Visitor Tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitors_email 
  ON visitors(email) 
  WHERE email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visitors_created 
  ON visitors(created_at DESC);

-- ============================================================================
-- PART 2: DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Bookings Constraints
DO $$ BEGIN
  ALTER TABLE bookings 
    ADD CONSTRAINT chk_party_size 
    CHECK (party_size > 0 AND party_size <= 50);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings 
    ADD CONSTRAINT chk_duration_hours 
    CHECK (duration_hours >= 4 AND duration_hours <= 24);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings 
    ADD CONSTRAINT chk_total_price 
    CHECK (total_price >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payments Constraints
DO $$ BEGIN
  ALTER TABLE payments 
    ADD CONSTRAINT chk_amount_positive 
    CHECK (amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments 
    ADD CONSTRAINT chk_currency 
    CHECK (currency IN ('USD', 'CAD'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Customers Constraints
DO $$ BEGIN
  ALTER TABLE customers 
    ADD CONSTRAINT chk_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customers 
    ADD CONSTRAINT chk_total_spent 
    CHECK (total_spent >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reservations Constraints
DO $$ BEGIN
  ALTER TABLE reservations 
    ADD CONSTRAINT chk_deposit_positive 
    CHECK (deposit_amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reservations 
    ADD CONSTRAINT chk_reservation_party_size 
    CHECK (party_size > 0 AND party_size <= 50);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Proposals Constraints
DO $$ BEGIN
  ALTER TABLE proposals 
    ADD CONSTRAINT chk_proposal_total 
    CHECK (total >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 3: MISSING FOREIGN KEYS
-- ============================================================================

-- Bookings to Brands
DO $$ BEGIN
  ALTER TABLE bookings 
    ADD CONSTRAINT fk_bookings_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reservations to Brands
DO $$ BEGIN
  ALTER TABLE reservations 
    ADD CONSTRAINT fk_reservations_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Proposals to Brands
DO $$ BEGIN
  ALTER TABLE proposals 
    ADD CONSTRAINT fk_proposals_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 4: MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Revenue by Month (for dashboard)
DROP MATERIALIZED VIEW IF EXISTS revenue_by_month CASCADE;
CREATE MATERIALIZED VIEW revenue_by_month AS
SELECT
  DATE_TRUNC('month', tour_date) as month,
  COUNT(*) as booking_count,
  SUM(total_price) as total_revenue,
  AVG(total_price) as avg_booking_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM bookings
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', tour_date)
ORDER BY month DESC;

CREATE INDEX ON revenue_by_month(month);

-- Active Customers (for marketing)
DROP MATERIALIZED VIEW IF EXISTS active_customers CASCADE;
CREATE MATERIALIZED VIEW active_customers AS
SELECT
  c.*,
  COUNT(b.id) as total_bookings,
  SUM(b.total_price) as lifetime_value,
  MAX(b.tour_date) as last_tour_date
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
GROUP BY c.id
HAVING COUNT(b.id) > 0
ORDER BY lifetime_value DESC;

CREATE INDEX ON active_customers(email);
CREATE INDEX ON active_customers(lifetime_value DESC);

-- Popular Wineries
DROP MATERIALIZED VIEW IF EXISTS popular_wineries CASCADE;
CREATE MATERIALIZED VIEW popular_wineries AS
SELECT
  w.*,
  COUNT(bw.booking_id) as booking_count,
  AVG(b.total_price) as avg_booking_value
FROM wineries w
LEFT JOIN booking_wineries bw ON w.id = bw.winery_id
LEFT JOIN bookings b ON bw.booking_id = b.id
WHERE b.status = 'completed'
GROUP BY w.id
ORDER BY booking_count DESC;

CREATE INDEX ON popular_wineries(booking_count DESC);

-- ============================================================================
-- PART 5: QUERY OPTIMIZATION
-- ============================================================================

-- Update table statistics for query planner
ANALYZE bookings;
ANALYZE payments;
ANALYZE customers;
ANALYZE reservations;
ANALYZE proposals;
ANALYZE wineries;

-- ============================================================================
-- PART 6: HELPFUL FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_by_month;
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_customers;
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_wineries;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (run daily)
-- CRON: 0 2 * * * psql -c "SELECT refresh_analytics_views();"

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check index usage (run after a few days)
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as times_used,
--   idx_tup_read as tuples_read
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check slow queries
-- SELECT 
--   query,
--   calls,
--   mean_exec_time,
--   max_exec_time
-- FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;

-- ============================================================================
-- End of migration
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Critical optimizations applied successfully!';
  RAISE NOTICE 'Expected performance improvement: 5-10x for common queries';
  RAISE NOTICE 'Remember to refresh materialized views daily: SELECT refresh_analytics_views();';
END $$;


