-- ============================================================================
-- MASTER CONSOLIDATION MIGRATION
-- ============================================================================
--
-- Purpose: Bring database to expected state with ALL missing tables
-- Created: 2025-12-25
-- Safe to run: YES (uses IF NOT EXISTS throughout)
--
-- This migration adds:
-- 1. Migration tracking system
-- 2. Monitoring & error logging tables
-- 3. Shared tours system
-- 4. Multi-entity billing system (NW Touring & Concierge + Walla Walla Travel)
-- 5. Business portal tables
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: MIGRATION TRACKING SYSTEM
-- ============================================================================
-- Track which migrations have been applied to prevent duplicate runs

CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied ON _migrations(applied_at);

-- Record this migration
INSERT INTO _migrations (migration_name, notes)
VALUES ('040-master-consolidation', 'Master consolidation of all missing tables')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- SECTION 2: MONITORING & ERROR LOGGING SYSTEM
-- ============================================================================
-- Required for application health monitoring and debugging

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_id VARCHAR(50) UNIQUE NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),

    -- Context
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    request_body JSONB,
    request_headers JSONB,

    -- Environment
    environment VARCHAR(20) DEFAULT 'production',
    service_name VARCHAR(100),
    hostname VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);

-- System health checks table
CREATE TABLE IF NOT EXISTS system_health_checks (
    id SERIAL PRIMARY KEY,
    check_type VARCHAR(50) NOT NULL,
    check_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked ON system_health_checks(checked_at DESC);

-- Cleanup old health checks (keep last 7 days)
-- This can be run periodically via cron or application
CREATE OR REPLACE FUNCTION cleanup_old_health_checks() RETURNS void AS $$
BEGIN
    DELETE FROM system_health_checks WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_unit VARCHAR(20),

    -- Dimensions
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,

    -- Context
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),

    -- Metadata
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_endpoint ON performance_metrics(endpoint);

-- Cleanup old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics() RETURNS void AS $$
BEGIN
    DELETE FROM performance_metrics WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 3: SHARED TOURS SYSTEM
-- ============================================================================
-- Allow multiple parties to book seats on scheduled public tours

-- Main shared tours table
CREATE TABLE IF NOT EXISTS shared_tours (
    id SERIAL PRIMARY KEY,

    -- Tour identification
    tour_code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scheduling
    tour_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_hours DECIMAL(4, 2) DEFAULT 6.0,

    -- Capacity
    max_guests INTEGER NOT NULL DEFAULT 14,
    min_guests INTEGER DEFAULT 2,
    current_guests INTEGER DEFAULT 0,

    -- Pricing
    price_per_person DECIMAL(10, 2) NOT NULL,
    deposit_per_person DECIMAL(10, 2),

    -- Logistics
    pickup_location TEXT,
    pickup_address VARCHAR(500),
    pickup_notes TEXT,

    -- Itinerary
    planned_wineries TEXT[], -- Array of winery names
    lunch_included BOOLEAN DEFAULT false,
    lunch_venue VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    published BOOLEAN DEFAULT false,

    -- Assignment
    driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,

    -- Metadata
    notes TEXT,
    internal_notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_tours_date ON shared_tours(tour_date);
CREATE INDEX IF NOT EXISTS idx_shared_tours_status ON shared_tours(status);
CREATE INDEX IF NOT EXISTS idx_shared_tours_published ON shared_tours(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_shared_tours_code ON shared_tours(tour_code);
CREATE INDEX IF NOT EXISTS idx_shared_tours_driver ON shared_tours(driver_id);

-- Shared tour availability (date-based scheduling)
CREATE TABLE IF NOT EXISTS shared_tours_availability (
    id SERIAL PRIMARY KEY,

    -- Date range this availability applies to
    start_date DATE NOT NULL,
    end_date DATE,

    -- Day of week (0=Sunday, 6=Saturday) or NULL for specific dates
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Time slot
    start_time TIME NOT NULL,
    duration_hours DECIMAL(4, 2) DEFAULT 6.0,

    -- Capacity & pricing
    max_guests INTEGER DEFAULT 14,
    price_per_person DECIMAL(10, 2) NOT NULL,

    -- Template settings
    default_pickup_location TEXT,
    default_wineries TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_avail_dates ON shared_tours_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_shared_avail_day ON shared_tours_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_shared_avail_active ON shared_tours_availability(is_active) WHERE is_active = true;

-- Tickets for shared tours (individual bookings)
CREATE TABLE IF NOT EXISTS shared_tours_tickets (
    id SERIAL PRIMARY KEY,

    -- Links
    shared_tour_id INTEGER NOT NULL REFERENCES shared_tours(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,

    -- Ticket details
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,

    -- Guest information
    primary_guest_name VARCHAR(255) NOT NULL,
    primary_guest_email VARCHAR(255),
    primary_guest_phone VARCHAR(50),
    additional_guests JSONB DEFAULT '[]', -- Array of {name, dietary_restrictions}

    -- Pickup
    pickup_location TEXT,
    pickup_address VARCHAR(500),
    pickup_notes TEXT,

    -- Pricing
    price_per_person DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2),
    amount_paid DECIMAL(10, 2) DEFAULT 0,

    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_paid', 'paid', 'refunded', 'partial_refund')),
    payment_intent_id VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'no_show', 'cancelled')),
    checked_in_at TIMESTAMP WITH TIME ZONE,

    -- Special requests
    dietary_restrictions TEXT,
    special_requests TEXT,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_tour ON shared_tours_tickets(shared_tour_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON shared_tours_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON shared_tours_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON shared_tours_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON shared_tours_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON shared_tours_tickets(primary_guest_email);

-- Update shared tour guest count when tickets change
CREATE OR REPLACE FUNCTION update_shared_tour_guest_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE shared_tours
        SET current_guests = (
            SELECT COALESCE(SUM(guest_count), 0)
            FROM shared_tours_tickets
            WHERE shared_tour_id = OLD.shared_tour_id
            AND status NOT IN ('cancelled')
        ),
        updated_at = NOW()
        WHERE id = OLD.shared_tour_id;
        RETURN OLD;
    ELSE
        UPDATE shared_tours
        SET current_guests = (
            SELECT COALESCE(SUM(guest_count), 0)
            FROM shared_tours_tickets
            WHERE shared_tour_id = NEW.shared_tour_id
            AND status NOT IN ('cancelled')
        ),
        updated_at = NOW()
        WHERE id = NEW.shared_tour_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tour_guests ON shared_tours_tickets;
CREATE TRIGGER trigger_update_tour_guests
    AFTER INSERT OR UPDATE OR DELETE ON shared_tours_tickets
    FOR EACH ROW EXECUTE FUNCTION update_shared_tour_guest_count();

-- ============================================================================
-- SECTION 4: MULTI-ENTITY BILLING SYSTEM
-- ============================================================================
-- Support for NW Touring & Concierge + Walla Walla Travel as separate entities
-- with commission tracking and proper financial separation

-- Service provider entities (NW Touring, WWT, etc.)
CREATE TABLE IF NOT EXISTS service_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    code VARCHAR(50) UNIQUE NOT NULL, -- 'nw_touring', 'walla_walla_travel'
    legal_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    dba_names TEXT[], -- Array of "doing business as" names

    -- Legal/Regulatory
    entity_type VARCHAR(50) DEFAULT 'llc', -- llc, corporation, sole_prop
    state_of_formation VARCHAR(2),
    ein VARCHAR(20), -- Encrypted in production

    -- DOT/FMCSA (for transportation providers)
    usdot_number VARCHAR(20),
    mc_number VARCHAR(20),
    is_motor_carrier BOOLEAN DEFAULT false,

    -- Insurance
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_expiration DATE,
    insurance_coverage_amount DECIMAL(15, 2),

    -- Contact
    primary_email VARCHAR(255),
    primary_phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(20),

    -- Payment processing
    stripe_account_id VARCHAR(255), -- For Stripe Connect
    stripe_account_type VARCHAR(20), -- 'standard', 'express', 'custom'
    default_payment_processor VARCHAR(50) DEFAULT 'stripe',

    -- Commission settings
    default_commission_rate DECIMAL(5, 4) DEFAULT 0.15, -- 15%
    commission_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'flat', 'tiered'

    -- Status
    is_active BOOLEAN DEFAULT true,
    onboarded_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_code ON service_entities(code);
CREATE INDEX IF NOT EXISTS idx_entities_active ON service_entities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_entities_usdot ON service_entities(usdot_number) WHERE usdot_number IS NOT NULL;

-- Insert default entities
INSERT INTO service_entities (code, legal_name, display_name, dba_names, entity_type, state_of_formation, usdot_number, mc_number, is_motor_carrier, primary_email, default_commission_rate)
VALUES
    ('nw_touring', 'NW Touring & Concierge LLC', 'NW Touring & Concierge', ARRAY['Herding Cats Wine Tours'], 'llc', 'OR', '3603851', '1225087', true, 'info@nwtouring.com', 0.00),
    ('walla_walla_travel', 'Walla Walla Travel LLC', 'Walla Walla Travel', NULL, 'llc', 'OR', NULL, NULL, false, 'info@wallawalla.travel', 0.15)
ON CONFLICT (code) DO NOTHING;

-- Service types (what can be booked)
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'transportation', 'planning', 'concierge'

    -- Default provider
    default_provider_id UUID REFERENCES service_entities(id),

    -- Pricing defaults
    default_hourly_rate DECIMAL(10, 2),
    default_flat_rate DECIMAL(10, 2),
    pricing_model VARCHAR(20) DEFAULT 'hourly', -- 'hourly', 'flat', 'per_person', 'custom'

    -- Commission
    default_commission_rate DECIMAL(5, 4),

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default service types
INSERT INTO service_types (code, name, category, pricing_model)
VALUES
    ('wine_tour', 'Wine Tour', 'transportation', 'hourly'),
    ('airport_transfer', 'Airport Transfer', 'transportation', 'flat'),
    ('charter', 'Charter Service', 'transportation', 'hourly'),
    ('trip_planning', 'Trip Planning', 'planning', 'flat'),
    ('concierge', 'Concierge Services', 'concierge', 'hourly')
ON CONFLICT (code) DO NOTHING;

-- Booking sources (where bookings originate)
CREATE TABLE IF NOT EXISTS booking_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Which entity owns this source
    owner_entity_id UUID REFERENCES service_entities(id),

    -- Commission this source earns
    commission_rate DECIMAL(5, 4),
    commission_type VARCHAR(20) DEFAULT 'percentage',

    -- Tracking
    source_url VARCHAR(500),

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default booking sources
INSERT INTO booking_sources (code, name, description)
VALUES
    ('wwt_website', 'Walla Walla Travel Website', 'Bookings from wallawalla.travel'),
    ('wwt_chatgpt', 'ChatGPT Integration', 'Bookings via ChatGPT/AI assistant'),
    ('nwt_direct', 'NW Touring Direct', 'Direct bookings to NW Touring'),
    ('nwt_phone', 'Phone Booking', 'Phone call bookings'),
    ('herding_cats', 'Herding Cats Wine Tours', 'Bookings under Herding Cats brand'),
    ('partner_referral', 'Partner Referral', 'Referrals from partner businesses'),
    ('repeat_customer', 'Repeat Customer', 'Returning customer direct booking')
ON CONFLICT (code) DO NOTHING;

-- Commission rate overrides (per source/service/provider combination)
CREATE TABLE IF NOT EXISTS commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What this rate applies to (any can be null for wildcards)
    booking_source_id UUID REFERENCES booking_sources(id),
    service_type_id UUID REFERENCES service_types(id),
    provider_entity_id UUID REFERENCES service_entities(id),
    referrer_entity_id UUID REFERENCES service_entities(id),

    -- The rate
    commission_rate DECIMAL(5, 4) NOT NULL,
    commission_type VARCHAR(20) DEFAULT 'percentage',
    flat_amount DECIMAL(10, 2), -- For flat commission type

    -- Validity
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,

    -- Priority (higher = more specific, takes precedence)
    priority INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_source ON commission_rates(booking_source_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_service ON commission_rates(service_type_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_provider ON commission_rates(provider_entity_id);
CREATE INDEX IF NOT EXISTS idx_commission_rates_active ON commission_rates(is_active, effective_from, effective_to);

-- Line items for bookings (which entity provides what)
CREATE TABLE IF NOT EXISTS booking_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    -- What service
    service_type_id UUID REFERENCES service_types(id),
    description VARCHAR(500) NOT NULL,

    -- Who provides it
    provider_entity_id UUID NOT NULL REFERENCES service_entities(id),

    -- Pricing
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,

    -- Tax
    tax_rate DECIMAL(5, 4) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,

    -- Commission
    commission_rate DECIMAL(5, 4) DEFAULT 0,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    commission_entity_id UUID REFERENCES service_entities(id),

    -- Status
    status VARCHAR(20) DEFAULT 'pending',

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_items_booking ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_line_items_provider ON booking_line_items(provider_entity_id);
CREATE INDEX IF NOT EXISTS idx_line_items_commission ON booking_line_items(commission_entity_id);

-- Commission ledger (track all commissions owed/paid)
CREATE TABLE IF NOT EXISTS commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What this commission is for
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    line_item_id UUID REFERENCES booking_line_items(id) ON DELETE SET NULL,

    -- Who owes and who receives
    from_entity_id UUID NOT NULL REFERENCES service_entities(id),
    to_entity_id UUID NOT NULL REFERENCES service_entities(id),

    -- Amount
    gross_amount DECIMAL(10, 2) NOT NULL, -- Original booking amount
    commission_rate DECIMAL(5, 4) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),

    -- Payment tracking
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    payment_method VARCHAR(50),

    -- Period tracking (for batch payments)
    period_start DATE,
    period_end DATE,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_booking ON commission_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_from ON commission_ledger(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_to ON commission_ledger(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON commission_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_pending ON commission_ledger(to_entity_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ledger_period ON commission_ledger(period_start, period_end);

-- Vehicle incidents (damage, cleaning, etc.)
CREATE TABLE IF NOT EXISTS vehicle_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Incident details
    incident_type VARCHAR(50) NOT NULL, -- 'cleaning', 'damage', 'smoking', 'illegal_activity'
    incident_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT NOT NULL,

    -- Location
    location VARCHAR(255),

    -- Assessment
    severity VARCHAR(20) DEFAULT 'minor', -- 'minor', 'moderate', 'major', 'severe'

    -- Financial
    fee_amount DECIMAL(10, 2),
    repair_cost DECIMAL(10, 2),
    total_charged DECIMAL(10, 2),

    -- Billing
    charged_to_customer BOOLEAN DEFAULT false,
    charge_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'charged', 'waived', 'disputed'
    payment_id INTEGER REFERENCES payments(id),

    -- Documentation
    photos TEXT[], -- Array of photo URLs
    documents TEXT[], -- Array of document URLs

    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_vehicle ON vehicle_incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_incidents_booking ON vehicle_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON vehicle_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON vehicle_incidents(charge_status);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON vehicle_incidents(incident_date DESC);

-- Standard incident fee schedule
CREATE TABLE IF NOT EXISTS incident_fee_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20),

    description TEXT NOT NULL,
    base_fee DECIMAL(10, 2) NOT NULL,

    -- Can be overridden
    is_negotiable BOOLEAN DEFAULT false,
    max_fee DECIMAL(10, 2),

    -- Policy text
    policy_text TEXT,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(incident_type, severity)
);

-- Insert standard fee schedule
INSERT INTO incident_fee_schedule (incident_type, severity, description, base_fee, policy_text)
VALUES
    ('cleaning', 'minor', 'Light cleaning required', 50.00, 'Minor spills or mess requiring additional cleaning'),
    ('cleaning', 'moderate', 'Professional cleaning required', 150.00, 'Significant mess requiring professional cleaning service'),
    ('cleaning', 'major', 'Deep cleaning/detailing required', 300.00, 'Extensive mess requiring deep cleaning or detailing'),
    ('vomit', NULL, 'Biohazard cleaning', 300.00, 'Vomit or bodily fluid cleanup requiring specialized cleaning'),
    ('smoking', NULL, 'Smoking/vaping in vehicle', 300.00, 'Smoking or vaping in vehicle requiring deodorizing treatment'),
    ('damage', 'minor', 'Minor interior damage', 250.00, 'Small tears, stains, or minor damage to interior'),
    ('damage', 'moderate', 'Moderate damage requiring repair', 500.00, 'Damage requiring professional repair'),
    ('damage', 'major', 'Major damage', 0.00, 'Charged at actual repair/replacement cost'),
    ('illegal_activity', NULL, 'Illegal activity incident fee', 500.00, 'Base fee for any illegal activity, plus actual damage costs')
ON CONFLICT (incident_type, severity) DO NOTHING;

-- ============================================================================
-- SECTION 5: BUSINESS PORTAL TABLES
-- ============================================================================
-- For partner businesses to manage their listings

CREATE TABLE IF NOT EXISTS business_portal (
    id SERIAL PRIMARY KEY,

    -- Link to business
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,

    -- Portal access
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(20) DEFAULT 'editor', -- 'viewer', 'editor', 'admin'

    -- Settings
    notifications_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'daily', -- 'instant', 'daily', 'weekly'

    -- Activity tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    invited_by INTEGER REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_portal_business ON business_portal(business_id);
CREATE INDEX IF NOT EXISTS idx_business_portal_user ON business_portal(user_id);
CREATE INDEX IF NOT EXISTS idx_business_portal_active ON business_portal(is_active) WHERE is_active = true;

-- ============================================================================
-- SECTION 6: ADD ENTITY TRACKING TO EXISTING TABLES
-- ============================================================================
-- Add provider_entity_id to bookings if it doesn't exist

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'provider_entity_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN provider_entity_id UUID REFERENCES service_entities(id);
        CREATE INDEX idx_bookings_provider_entity ON bookings(provider_entity_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'booking_source_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN booking_source_id UUID REFERENCES booking_sources(id);
        CREATE INDEX idx_bookings_source ON bookings(booking_source_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'referrer_entity_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN referrer_entity_id UUID REFERENCES service_entities(id);
    END IF;
END $$;

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS
-- ============================================================================

-- Calculate commission for a booking
CREATE OR REPLACE FUNCTION calculate_commission(
    p_booking_amount DECIMAL,
    p_booking_source_id UUID,
    p_service_type_id UUID DEFAULT NULL,
    p_provider_entity_id UUID DEFAULT NULL
) RETURNS TABLE(
    commission_rate DECIMAL,
    commission_amount DECIMAL,
    rate_source VARCHAR
) AS $$
DECLARE
    v_rate DECIMAL(5, 4);
    v_source VARCHAR(50);
BEGIN
    -- Try to find specific rate (highest priority first)
    SELECT cr.commission_rate INTO v_rate
    FROM commission_rates cr
    WHERE cr.is_active = true
      AND (cr.booking_source_id = p_booking_source_id OR cr.booking_source_id IS NULL)
      AND (cr.service_type_id = p_service_type_id OR cr.service_type_id IS NULL)
      AND (cr.provider_entity_id = p_provider_entity_id OR cr.provider_entity_id IS NULL)
      AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_DATE)
      AND (cr.effective_to IS NULL OR cr.effective_to >= CURRENT_DATE)
    ORDER BY cr.priority DESC,
             (CASE WHEN cr.booking_source_id IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN cr.service_type_id IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN cr.provider_entity_id IS NOT NULL THEN 1 ELSE 0 END) DESC
    LIMIT 1;

    IF v_rate IS NOT NULL THEN
        v_source := 'commission_rates';
    ELSE
        -- Fall back to booking source default
        SELECT bs.commission_rate INTO v_rate
        FROM booking_sources bs
        WHERE bs.id = p_booking_source_id;
        v_source := 'booking_source';
    END IF;

    IF v_rate IS NULL THEN
        -- Fall back to WWT default (15%)
        v_rate := 0.15;
        v_source := 'default';
    END IF;

    RETURN QUERY SELECT
        v_rate,
        ROUND(p_booking_amount * v_rate, 2),
        v_source;
END;
$$ LANGUAGE plpgsql;

-- Get entity by code
CREATE OR REPLACE FUNCTION get_entity_id(p_code VARCHAR) RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM service_entities WHERE code = p_code LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 8: AUDIT LOGGING ENHANCEMENT
-- ============================================================================
-- Add financial audit logging for critical operations

CREATE TABLE IF NOT EXISTS financial_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What happened
    action_type VARCHAR(50) NOT NULL, -- 'payment_attempt', 'payment_success', 'refund', 'commission_created', etc.
    correlation_id VARCHAR(100), -- Links related operations

    -- Who/what
    entity_type VARCHAR(50), -- 'booking', 'payment', 'refund', 'commission'
    entity_id VARCHAR(100),

    -- Actor
    user_id INTEGER REFERENCES users(id),
    service_entity_id UUID REFERENCES service_entities(id),

    -- Financial details
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Before/after state
    previous_state JSONB,
    new_state JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,
    request_path VARCHAR(500),

    -- Result
    success BOOLEAN,
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- This table is append-only for audit purposes
REVOKE UPDATE, DELETE ON financial_audit_log FROM PUBLIC;

CREATE INDEX IF NOT EXISTS idx_fin_audit_action ON financial_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_fin_audit_correlation ON financial_audit_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_entity ON financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_created ON financial_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_audit_user ON financial_audit_log(user_id);

-- ============================================================================
-- DONE
-- ============================================================================

COMMIT;

-- Record successful completion
INSERT INTO _migrations (migration_name, notes)
VALUES ('040-master-consolidation-complete', 'Master consolidation completed successfully')
ON CONFLICT (migration_name) DO UPDATE SET applied_at = NOW();
