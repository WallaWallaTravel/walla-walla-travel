-- ============================================================================
-- SHARED TOURS SYSTEM
-- ============================================================================
-- Ticketed/per-person booking system for group wine tours
-- Available Sun-Wed only, $95/person or $115/person with lunch
-- ============================================================================

-- ============================================================================
-- 1. SHARED TOUR SCHEDULE (Admin creates available dates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_tour_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tour Details
    tour_date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT '10:00:00',
    duration_hours INTEGER NOT NULL DEFAULT 6,

    -- Capacity
    max_guests INTEGER NOT NULL DEFAULT 14,
    min_guests INTEGER NOT NULL DEFAULT 2,  -- Minimum to run the tour

    -- Pricing (per person)
    base_price_per_person DECIMAL(10,2) NOT NULL DEFAULT 95.00,
    lunch_price_per_person DECIMAL(10,2) NOT NULL DEFAULT 115.00,
    lunch_included_default BOOLEAN DEFAULT true,

    -- Tour Info
    title VARCHAR(200) DEFAULT 'Walla Walla Wine Tour Experience',
    description TEXT,
    meeting_location TEXT DEFAULT 'Downtown Walla Walla - exact location provided upon booking',
    wineries_preview TEXT[], -- Array of winery names to visit

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'full', 'confirmed', 'cancelled', 'completed'
    is_published BOOLEAN DEFAULT true,

    -- Cancellation/Cutoff
    booking_cutoff_hours INTEGER DEFAULT 48, -- Hours before tour to stop accepting bookings
    cancellation_cutoff_hours INTEGER DEFAULT 48, -- Hours before tour for free cancellation

    -- Assignment
    driver_id UUID,
    vehicle_id UUID,

    -- Metadata
    notes TEXT, -- Admin notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT shared_tour_valid_day CHECK (
        EXTRACT(DOW FROM tour_date) IN (0, 1, 2, 3) -- Sun=0, Mon=1, Tue=2, Wed=3
    ),
    CONSTRAINT shared_tour_capacity CHECK (max_guests >= min_guests AND max_guests <= 14),
    UNIQUE(tour_date) -- Only one shared tour per day
);

CREATE INDEX IF NOT EXISTS idx_shared_tour_schedule_date ON shared_tour_schedule(tour_date);
CREATE INDEX IF NOT EXISTS idx_shared_tour_schedule_status ON shared_tour_schedule(status);

-- ============================================================================
-- 2. SHARED TOUR TICKETS (Individual ticket purchases)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_tour_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID NOT NULL REFERENCES shared_tour_schedule(id) ON DELETE RESTRICT,

    -- Ticket Details
    ticket_number VARCHAR(20) NOT NULL UNIQUE, -- e.g., "ST-20251225-001"
    ticket_count INTEGER NOT NULL DEFAULT 1, -- Number of tickets in this purchase

    -- Customer Info
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),

    -- Guest Names (for multi-ticket purchases)
    guest_names TEXT[], -- Array of guest names

    -- Pricing
    includes_lunch BOOLEAN DEFAULT true,
    price_per_person DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'refunded', 'partial_refund'
    payment_method VARCHAR(20), -- 'card', 'check', 'cash'
    stripe_payment_intent_id VARCHAR(255),
    paid_at TIMESTAMPTZ,

    -- Ticket Status
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'no_show', 'attended'
    check_in_at TIMESTAMPTZ,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2),

    -- Special Requests
    dietary_restrictions TEXT,
    special_requests TEXT,

    -- Referral/Marketing
    referral_source VARCHAR(100),
    promo_code VARCHAR(50),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_tour_tickets_tour ON shared_tour_tickets(tour_id);
CREATE INDEX IF NOT EXISTS idx_shared_tour_tickets_email ON shared_tour_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_shared_tour_tickets_status ON shared_tour_tickets(status);
CREATE INDEX IF NOT EXISTS idx_shared_tour_tickets_payment ON shared_tour_tickets(payment_status);

-- ============================================================================
-- 3. TICKET NUMBER GENERATION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    tour_date DATE;
    sequence_num INTEGER;
    new_ticket_number VARCHAR(20);
BEGIN
    -- Get tour date
    SELECT st.tour_date INTO tour_date
    FROM shared_tour_schedule st
    WHERE st.id = NEW.tour_id;

    -- Get next sequence number for this tour
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_num
    FROM shared_tour_tickets
    WHERE tour_id = NEW.tour_id;

    -- Generate ticket number: ST-YYYYMMDD-NNN
    new_ticket_number := 'ST-' || TO_CHAR(tour_date, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 3, '0');

    NEW.ticket_number := new_ticket_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON shared_tour_tickets;
CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON shared_tour_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- ============================================================================
-- 4. TOUR STATUS MANAGEMENT
-- ============================================================================

-- Update tour status based on ticket sales
CREATE OR REPLACE FUNCTION update_shared_tour_status()
RETURNS TRIGGER AS $$
DECLARE
    v_tour_id UUID;
    v_total_tickets INTEGER;
    v_max_guests INTEGER;
    v_min_guests INTEGER;
BEGIN
    -- Get the tour_id
    v_tour_id := COALESCE(NEW.tour_id, OLD.tour_id);

    -- Get current ticket count and capacity
    SELECT
        COALESCE(SUM(ticket_count) FILTER (WHERE status = 'confirmed' AND payment_status = 'paid'), 0),
        st.max_guests,
        st.min_guests
    INTO v_total_tickets, v_max_guests, v_min_guests
    FROM shared_tour_schedule st
    LEFT JOIN shared_tour_tickets stt ON stt.tour_id = st.id
    WHERE st.id = v_tour_id
    GROUP BY st.max_guests, st.min_guests;

    -- Update tour status
    UPDATE shared_tour_schedule
    SET status = CASE
        WHEN v_total_tickets >= v_max_guests THEN 'full'
        WHEN v_total_tickets >= v_min_guests THEN 'confirmed'
        ELSE 'open'
    END,
    updated_at = NOW()
    WHERE id = v_tour_id
    AND status NOT IN ('cancelled', 'completed');

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shared_tour_status ON shared_tour_tickets;
CREATE TRIGGER trigger_update_shared_tour_status
    AFTER INSERT OR UPDATE OR DELETE ON shared_tour_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_tour_status();

-- ============================================================================
-- 5. VIEWS FOR REPORTING
-- ============================================================================

-- Upcoming shared tours with availability
CREATE OR REPLACE VIEW shared_tours_availability AS
SELECT
    st.id,
    st.tour_date,
    st.start_time,
    st.duration_hours,
    st.title,
    st.description,
    st.meeting_location,
    st.wineries_preview,
    st.max_guests,
    st.min_guests,
    st.base_price_per_person,
    st.lunch_price_per_person,
    st.lunch_included_default,
    st.status,
    st.is_published,

    -- Ticket counts
    COALESCE(SUM(stt.ticket_count) FILTER (WHERE stt.status = 'confirmed' AND stt.payment_status = 'paid'), 0)::INTEGER as tickets_sold,
    (st.max_guests - COALESCE(SUM(stt.ticket_count) FILTER (WHERE stt.status = 'confirmed' AND stt.payment_status = 'paid'), 0))::INTEGER as spots_available,

    -- Revenue
    COALESCE(SUM(stt.total_amount) FILTER (WHERE stt.payment_status = 'paid'), 0) as revenue,

    -- Minimum met?
    (COALESCE(SUM(stt.ticket_count) FILTER (WHERE stt.status = 'confirmed' AND stt.payment_status = 'paid'), 0) >= st.min_guests) as minimum_met,

    -- Booking cutoff
    (st.tour_date + st.start_time - (st.booking_cutoff_hours || ' hours')::INTERVAL) as booking_cutoff_at,
    ((st.tour_date + st.start_time - (st.booking_cutoff_hours || ' hours')::INTERVAL) > NOW()) as accepting_bookings

FROM shared_tour_schedule st
LEFT JOIN shared_tour_tickets stt ON stt.tour_id = st.id
WHERE st.tour_date >= CURRENT_DATE
AND st.status NOT IN ('cancelled', 'completed')
GROUP BY st.id
ORDER BY st.tour_date, st.start_time;

-- Guest manifest for a tour
CREATE OR REPLACE VIEW shared_tour_manifest AS
SELECT
    st.id as tour_id,
    st.tour_date,
    st.start_time,
    st.title,
    stt.ticket_number,
    stt.customer_name,
    stt.customer_email,
    stt.customer_phone,
    stt.ticket_count,
    stt.guest_names,
    stt.includes_lunch,
    stt.dietary_restrictions,
    stt.special_requests,
    stt.status as ticket_status,
    stt.payment_status,
    stt.check_in_at
FROM shared_tour_schedule st
JOIN shared_tour_tickets stt ON stt.tour_id = st.id
WHERE stt.status = 'confirmed'
AND stt.payment_status = 'paid'
ORDER BY st.tour_date, stt.customer_name;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Check availability for a tour
CREATE OR REPLACE FUNCTION check_shared_tour_availability(
    p_tour_id UUID,
    p_requested_tickets INTEGER
) RETURNS TABLE(
    available BOOLEAN,
    spots_remaining INTEGER,
    reason TEXT
) AS $$
DECLARE
    v_tour RECORD;
    v_tickets_sold INTEGER;
    v_spots_remaining INTEGER;
BEGIN
    -- Get tour info
    SELECT * INTO v_tour FROM shared_tour_schedule WHERE id = p_tour_id;

    IF v_tour IS NULL THEN
        RETURN QUERY SELECT false, 0, 'Tour not found'::TEXT;
        RETURN;
    END IF;

    IF v_tour.status = 'cancelled' THEN
        RETURN QUERY SELECT false, 0, 'Tour has been cancelled'::TEXT;
        RETURN;
    END IF;

    IF v_tour.status = 'full' THEN
        RETURN QUERY SELECT false, 0, 'Tour is sold out'::TEXT;
        RETURN;
    END IF;

    IF NOT v_tour.is_published THEN
        RETURN QUERY SELECT false, 0, 'Tour is not available for booking'::TEXT;
        RETURN;
    END IF;

    -- Check booking cutoff
    IF (v_tour.tour_date + v_tour.start_time - (v_tour.booking_cutoff_hours || ' hours')::INTERVAL) <= NOW() THEN
        RETURN QUERY SELECT false, 0, 'Booking deadline has passed'::TEXT;
        RETURN;
    END IF;

    -- Get tickets sold
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_tickets_sold
    FROM shared_tour_tickets
    WHERE tour_id = p_tour_id
    AND status = 'confirmed'
    AND payment_status = 'paid';

    v_spots_remaining := v_tour.max_guests - v_tickets_sold;

    IF p_requested_tickets > v_spots_remaining THEN
        RETURN QUERY SELECT false, v_spots_remaining,
            format('Only %s spots remaining', v_spots_remaining)::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_spots_remaining, 'Available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Calculate ticket price
CREATE OR REPLACE FUNCTION calculate_ticket_price(
    p_tour_id UUID,
    p_ticket_count INTEGER,
    p_includes_lunch BOOLEAN DEFAULT true
) RETURNS TABLE(
    price_per_person DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_tour RECORD;
    v_price DECIMAL(10,2);
    v_subtotal DECIMAL(10,2);
    v_tax DECIMAL(10,2);
    v_tax_rate DECIMAL(5,3) := 0.089;
BEGIN
    SELECT * INTO v_tour FROM shared_tour_schedule WHERE id = p_tour_id;

    IF v_tour IS NULL THEN
        RAISE EXCEPTION 'Tour not found';
    END IF;

    -- Get price based on lunch option
    v_price := CASE WHEN p_includes_lunch THEN v_tour.lunch_price_per_person ELSE v_tour.base_price_per_person END;

    v_subtotal := v_price * p_ticket_count;
    v_tax := ROUND(v_subtotal * v_tax_rate, 2);

    RETURN QUERY SELECT v_price, v_subtotal, v_tax, (v_subtotal + v_tax);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. SEED SAMPLE SHARED TOURS (Next 4 weeks of Sun-Wed)
-- ============================================================================

-- Generate shared tours for the next 4 weeks
DO $$
DECLARE
    v_date DATE := CURRENT_DATE;
    v_end_date DATE := CURRENT_DATE + INTERVAL '28 days';
    v_dow INTEGER;
BEGIN
    WHILE v_date <= v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_date);

        -- Only create for Sun(0), Mon(1), Tue(2), Wed(3)
        IF v_dow IN (0, 1, 2, 3) THEN
            INSERT INTO shared_tour_schedule (
                tour_date,
                start_time,
                duration_hours,
                max_guests,
                min_guests,
                base_price_per_person,
                lunch_price_per_person,
                lunch_included_default,
                title,
                description,
                meeting_location,
                wineries_preview,
                status,
                is_published
            ) VALUES (
                v_date,
                '10:00:00',
                6,
                14,
                2,
                95.00,
                115.00,
                true,
                'Walla Walla Wine Tour Experience',
                'Join fellow wine enthusiasts for a curated tasting journey through Walla Walla''s finest wineries. Includes transportation, tastings at 4-5 wineries, and lunch at a local restaurant.',
                'Downtown Walla Walla - exact pickup location provided upon booking confirmation',
                ARRAY['L''Ecole No 41', 'Pepper Bridge', 'Leonetti Cellar', 'Gramercy Cellars'],
                'open',
                true
            ) ON CONFLICT (tour_date) DO NOTHING;
        END IF;

        v_date := v_date + INTERVAL '1 day';
    END LOOP;
END $$;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE shared_tour_schedule IS 'Available shared tour dates that customers can book tickets for';
COMMENT ON TABLE shared_tour_tickets IS 'Individual ticket purchases for shared tours';
COMMENT ON VIEW shared_tours_availability IS 'Upcoming shared tours with real-time availability';
COMMENT ON VIEW shared_tour_manifest IS 'Guest list for confirmed shared tours';
COMMENT ON FUNCTION check_shared_tour_availability IS 'Check if tickets are available for a shared tour';
COMMENT ON FUNCTION calculate_ticket_price IS 'Calculate total price for ticket purchase';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Shared Tours System Migration Complete!';
    RAISE NOTICE '  - shared_tour_schedule table created';
    RAISE NOTICE '  - shared_tour_tickets table created';
    RAISE NOTICE '  - Ticket number auto-generation trigger';
    RAISE NOTICE '  - Tour status auto-update trigger';
    RAISE NOTICE '  - shared_tours_availability view';
    RAISE NOTICE '  - shared_tour_manifest view';
    RAISE NOTICE '  - check_shared_tour_availability() function';
    RAISE NOTICE '  - calculate_ticket_price() function';
    RAISE NOTICE '  - Sample tours seeded for next 4 weeks';
END $$;
