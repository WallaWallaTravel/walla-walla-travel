-- ============================================================================
-- Migration: 064-shared-tours-enhancements.sql
-- Description: Enhance shared tours system with hotel partners, lunch menus,
--              payment integration, and proper view naming
-- Created: 2026-02-02
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE COMPATIBILITY VIEWS
-- The service layer uses slightly different naming - create views for compatibility
-- ============================================================================

-- View for shared tours (schedule)
CREATE OR REPLACE VIEW shared_tour_schedule AS
SELECT
    id,
    tour_date,
    start_time,
    duration_hours,
    max_guests,
    min_guests,
    price_per_person AS base_price_per_person,
    -- Calculate lunch price as base + $20
    (price_per_person + 20.00) AS lunch_price_per_person,
    lunch_included AS lunch_included_default,
    title,
    description,
    pickup_location AS meeting_location,
    planned_wineries AS wineries_preview,
    status,
    published AS is_published,
    48 AS booking_cutoff_hours,  -- Default 48 hours
    24 AS cancellation_cutoff_hours,  -- Default 24 hours
    driver_id,
    vehicle_id,
    notes,
    created_at,
    updated_at
FROM shared_tours;

-- View for tickets that matches service expectations
CREATE OR REPLACE VIEW shared_tour_tickets AS
SELECT
    id,
    shared_tour_id AS tour_id,
    ticket_number,
    guest_count AS ticket_count,
    primary_guest_name AS customer_name,
    primary_guest_email AS customer_email,
    primary_guest_phone AS customer_phone,
    additional_guests AS guest_names_json,  -- JSON array
    lunch_included AS includes_lunch,
    price_per_person,
    total_price AS subtotal,
    ROUND(total_price * 0.089, 2) AS tax_amount,
    ROUND(total_price * 1.089, 2) AS total_amount,
    payment_status,
    NULL AS payment_method,  -- Not tracked in original schema
    payment_intent_id AS stripe_payment_intent_id,
    CASE WHEN payment_status = 'paid' THEN updated_at ELSE NULL END AS paid_at,
    status,
    checked_in_at AS check_in_at,
    cancelled_at,
    cancellation_reason,
    NULL AS refund_amount,  -- Not tracked
    dietary_restrictions,
    special_requests,
    NULL AS referral_source,  -- Not tracked
    NULL AS promo_code,  -- Not tracked
    created_at,
    updated_at
FROM shared_tours_tickets;

-- Availability view with calculated fields for booking
CREATE OR REPLACE VIEW shared_tours_availability_view AS
SELECT
    st.id,
    st.tour_date,
    st.start_time,
    st.duration_hours,
    st.max_guests,
    st.min_guests,
    st.price_per_person AS base_price_per_person,
    (st.price_per_person + 20.00) AS lunch_price_per_person,
    st.lunch_included AS lunch_included_default,
    st.title,
    st.description,
    st.pickup_location AS meeting_location,
    st.planned_wineries AS wineries_preview,
    st.status,
    st.published AS is_published,
    48 AS booking_cutoff_hours,
    24 AS cancellation_cutoff_hours,
    st.driver_id,
    st.vehicle_id,
    st.notes,
    st.created_at,
    st.updated_at,
    -- Calculated availability fields
    COALESCE(st.current_guests, 0) AS tickets_sold,
    (st.max_guests - COALESCE(st.current_guests, 0)) AS spots_available,
    COALESCE(
        (SELECT SUM(total_price) FROM shared_tours_tickets WHERE shared_tour_id = st.id AND payment_status = 'paid'),
        0
    ) AS revenue,
    (COALESCE(st.current_guests, 0) >= st.min_guests) AS minimum_met,
    -- Booking cutoff calculation
    (st.tour_date::timestamp + st.start_time - INTERVAL '48 hours') AS booking_cutoff_at,
    -- Is accepting bookings?
    (
        st.published = true
        AND st.status NOT IN ('cancelled', 'completed')
        AND (st.max_guests - COALESCE(st.current_guests, 0)) > 0
        AND (st.tour_date::timestamp + st.start_time - INTERVAL '48 hours') > NOW()
    ) AS accepting_bookings
FROM shared_tours st
WHERE st.tour_date >= CURRENT_DATE
ORDER BY st.tour_date, st.start_time;

-- ============================================================================
-- SECTION 2: ADD MISSING COLUMNS TO shared_tours
-- ============================================================================

-- Add lunch menu options (JSONB array of menu items)
ALTER TABLE shared_tours ADD COLUMN IF NOT EXISTS lunch_menu_options JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shared_tours.lunch_menu_options IS 'Array of lunch menu options: [{id, name, description, dietary}]';

-- Add reference to vehicle availability block
ALTER TABLE shared_tours ADD COLUMN IF NOT EXISTS vehicle_availability_block_id INTEGER REFERENCES vehicle_availability_blocks(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 3: ADD MISSING COLUMNS TO shared_tours_tickets
-- ============================================================================

-- Add lunch selection
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS lunch_selection VARCHAR(100);
COMMENT ON COLUMN shared_tours_tickets.lunch_selection IS 'Selected lunch menu option ID';

-- Add lunch selections for each guest (JSONB)
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS guest_lunch_selections JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shared_tours_tickets.guest_lunch_selections IS 'Array of lunch selections per guest: [{guest_name, selection}]';

-- Add referral source tracking
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);

-- Add promo code tracking
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);

-- Add actual tax and total columns
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2);
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS final_total DECIMAL(10, 2);

-- Add lunch_included if not exists
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS lunch_included BOOLEAN DEFAULT false;

-- ============================================================================
-- SECTION 4: HOTEL PARTNERS SYSTEM
-- ============================================================================

-- Hotel partners table
CREATE TABLE IF NOT EXISTS hotel_partners (
    id SERIAL PRIMARY KEY,

    -- Basic info
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,

    -- Invitation workflow
    invite_token VARCHAR(100) UNIQUE,
    invite_sent_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ,

    -- Authentication (hashed password)
    password_hash VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Commission settings (for future use)
    commission_rate DECIMAL(5, 2) DEFAULT 0.00,  -- Percentage
    commission_type VARCHAR(20) DEFAULT 'none' CHECK (commission_type IN ('none', 'percentage', 'flat')),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_partners_email ON hotel_partners(email);
CREATE INDEX IF NOT EXISTS idx_hotel_partners_active ON hotel_partners(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hotel_partners_token ON hotel_partners(invite_token) WHERE invite_token IS NOT NULL;

-- Add hotel partner reference to tickets
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS hotel_partner_id INTEGER REFERENCES hotel_partners(id) ON DELETE SET NULL;
ALTER TABLE shared_tours_tickets ADD COLUMN IF NOT EXISTS booked_by_hotel BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_hotel ON shared_tours_tickets(hotel_partner_id) WHERE hotel_partner_id IS NOT NULL;

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to check shared tour availability
CREATE OR REPLACE FUNCTION check_shared_tour_availability(
    p_tour_id INTEGER,
    p_requested_tickets INTEGER
) RETURNS TABLE (
    available BOOLEAN,
    spots_remaining INTEGER,
    reason TEXT
) AS $$
DECLARE
    v_tour shared_tours%ROWTYPE;
    v_current_guests INTEGER;
    v_spots_available INTEGER;
    v_cutoff_time TIMESTAMPTZ;
BEGIN
    -- Get tour details
    SELECT * INTO v_tour FROM shared_tours WHERE id = p_tour_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 'Tour not found';
        RETURN;
    END IF;

    -- Check if tour is published
    IF NOT v_tour.published THEN
        RETURN QUERY SELECT false, 0, 'Tour is not available for booking';
        RETURN;
    END IF;

    -- Check status
    IF v_tour.status IN ('cancelled', 'completed') THEN
        RETURN QUERY SELECT false, 0, 'Tour is ' || v_tour.status;
        RETURN;
    END IF;

    -- Calculate spots available
    v_current_guests := COALESCE(v_tour.current_guests, 0);
    v_spots_available := v_tour.max_guests - v_current_guests;

    -- Check if enough spots
    IF v_spots_available < p_requested_tickets THEN
        RETURN QUERY SELECT false, v_spots_available,
            CASE
                WHEN v_spots_available = 0 THEN 'Tour is sold out'
                ELSE 'Only ' || v_spots_available || ' spots remaining'
            END;
        RETURN;
    END IF;

    -- Check booking cutoff (48 hours before)
    v_cutoff_time := v_tour.tour_date::timestamp + v_tour.start_time - INTERVAL '48 hours';
    IF NOW() > v_cutoff_time THEN
        RETURN QUERY SELECT false, v_spots_available, 'Booking deadline has passed';
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT true, v_spots_available, 'Available';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate ticket price
CREATE OR REPLACE FUNCTION calculate_ticket_price(
    p_tour_id INTEGER,
    p_ticket_count INTEGER,
    p_includes_lunch BOOLEAN DEFAULT true
) RETURNS TABLE (
    price_per_person DECIMAL(10, 2),
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2)
) AS $$
DECLARE
    v_base_price DECIMAL(10, 2);
    v_lunch_surcharge DECIMAL(10, 2) := 20.00;
    v_tax_rate DECIMAL(5, 4) := 0.089;  -- 8.9% tax
    v_price_per DECIMAL(10, 2);
    v_subtotal DECIMAL(10, 2);
    v_tax DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
BEGIN
    -- Get base price from tour
    SELECT st.price_per_person INTO v_base_price
    FROM shared_tours st
    WHERE st.id = p_tour_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tour not found';
    END IF;

    -- Calculate price per person
    v_price_per := v_base_price;
    IF p_includes_lunch THEN
        v_price_per := v_price_per + v_lunch_surcharge;
    END IF;

    -- Calculate totals
    v_subtotal := v_price_per * p_ticket_count;
    v_tax := ROUND(v_subtotal * v_tax_rate, 2);
    v_total := v_subtotal + v_tax;

    RETURN QUERY SELECT v_price_per, v_subtotal, v_tax, v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT := 'ST';
    v_date_part TEXT;
    v_random_part TEXT;
    v_ticket_number TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_date_part := TO_CHAR(NOW(), 'YYMMDD');
        v_random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        v_ticket_number := v_prefix || v_date_part || v_random_part;

        -- Check if exists
        SELECT EXISTS(
            SELECT 1 FROM shared_tours_tickets WHERE ticket_number = v_ticket_number
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON shared_tours_tickets;
CREATE TRIGGER trigger_set_ticket_number
    BEFORE INSERT ON shared_tours_tickets
    FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

-- ============================================================================
-- SECTION 6: MANIFEST VIEW
-- ============================================================================

-- Create a comprehensive manifest view for tour operations
CREATE OR REPLACE VIEW shared_tour_manifest AS
SELECT
    t.id AS ticket_id,
    t.shared_tour_id AS tour_id,
    t.ticket_number,
    t.guest_count AS ticket_count,
    t.primary_guest_name AS customer_name,
    t.primary_guest_email AS customer_email,
    t.primary_guest_phone AS customer_phone,
    t.additional_guests,
    t.lunch_included,
    t.lunch_selection,
    t.guest_lunch_selections,
    t.dietary_restrictions,
    t.special_requests,
    t.pickup_location,
    t.pickup_notes,
    t.payment_status,
    t.status AS ticket_status,
    t.checked_in_at,
    t.hotel_partner_id,
    t.booked_by_hotel,
    hp.name AS hotel_name,
    -- Tour details
    st.title AS tour_title,
    st.tour_date,
    st.start_time,
    st.lunch_venue,
    st.lunch_menu_options
FROM shared_tours_tickets t
JOIN shared_tours st ON st.id = t.shared_tour_id
LEFT JOIN hotel_partners hp ON hp.id = t.hotel_partner_id
WHERE t.status != 'cancelled'
ORDER BY t.primary_guest_name;

-- ============================================================================
-- SECTION 7: LUNCH ORDER SUMMARY VIEW
-- ============================================================================

-- View to aggregate lunch orders for a tour
CREATE OR REPLACE VIEW shared_tour_lunch_summary AS
SELECT
    st.id AS tour_id,
    st.tour_date,
    st.title,
    st.lunch_venue,
    COUNT(DISTINCT t.id) AS total_tickets,
    SUM(t.guest_count) AS total_guests,
    SUM(CASE WHEN t.lunch_included THEN t.guest_count ELSE 0 END) AS guests_with_lunch,
    -- Aggregate lunch selections (requires app-level processing for details)
    jsonb_agg(
        DISTINCT jsonb_build_object(
            'ticket_id', t.id,
            'guest_count', t.guest_count,
            'lunch_selection', t.lunch_selection,
            'guest_lunch_selections', t.guest_lunch_selections,
            'dietary_restrictions', t.dietary_restrictions
        )
    ) FILTER (WHERE t.lunch_included) AS lunch_details
FROM shared_tours st
LEFT JOIN shared_tours_tickets t ON t.shared_tour_id = st.id AND t.status != 'cancelled'
GROUP BY st.id, st.tour_date, st.title, st.lunch_venue;

-- ============================================================================
-- SECTION 8: UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

-- Ensure updated_at is updated automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hotel_partners_updated ON hotel_partners;
CREATE TRIGGER trigger_hotel_partners_updated
    BEFORE UPDATE ON hotel_partners
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new objects (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_partners TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE hotel_partners_id_seq TO app_user;

COMMENT ON TABLE hotel_partners IS 'Hotel partners who can book shared tour tickets for their guests';
COMMENT ON VIEW shared_tour_schedule IS 'Compatibility view for shared tour schedule';
COMMENT ON VIEW shared_tour_tickets IS 'Compatibility view for shared tour tickets';
COMMENT ON VIEW shared_tours_availability_view IS 'Shared tours with availability calculations';
COMMENT ON VIEW shared_tour_manifest IS 'Tour manifest with guest and lunch details';
COMMENT ON VIEW shared_tour_lunch_summary IS 'Aggregated lunch orders by tour';
