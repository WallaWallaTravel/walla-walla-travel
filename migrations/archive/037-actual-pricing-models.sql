-- ============================================================================
-- ACTUAL PRICING MODELS - WALLA WALLA TRAVEL
-- ============================================================================
-- Updates pricing system to match the three actual pricing models:
-- 1. Hourly Tours (tiered by guest count + day of week)
-- 2. Fixed Rate Private Tours (negotiated flat rate)
-- 3. Shared Group Tours (per-person ticketed)
-- ============================================================================

-- Drop the previous generic templates
DELETE FROM pricing_templates WHERE service_type IN ('wine_tour', 'airport_transfer');

-- ============================================================================
-- 1. HOURLY WINE TOUR RATES (by guest tier and day type)
-- ============================================================================

-- Create hourly_rate_tiers table for the actual tiered pricing
CREATE TABLE IF NOT EXISTS hourly_rate_tiers (
    id SERIAL PRIMARY KEY,
    service_type VARCHAR(50) NOT NULL DEFAULT 'wine_tour',
    tier_name VARCHAR(50) NOT NULL,
    guest_min INTEGER NOT NULL,
    guest_max INTEGER NOT NULL,
    day_type VARCHAR(20) NOT NULL, -- 'sun_wed' or 'thu_sat'
    hourly_rate DECIMAL(10,2) NOT NULL,
    minimum_hours INTEGER NOT NULL DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(service_type, guest_min, guest_max, day_type)
);

-- Insert actual wine tour hourly rates
INSERT INTO hourly_rate_tiers (service_type, tier_name, guest_min, guest_max, day_type, hourly_rate, minimum_hours)
VALUES
    -- Sunday-Wednesday rates (4 hour minimum)
    ('wine_tour', '1-2 guests', 1, 2, 'sun_wed', 85.00, 4),
    ('wine_tour', '3-4 guests', 3, 4, 'sun_wed', 95.00, 4),
    ('wine_tour', '5-6 guests', 5, 6, 'sun_wed', 105.00, 4),
    ('wine_tour', '7-8 guests', 7, 8, 'sun_wed', 115.00, 4),
    ('wine_tour', '9-11 guests', 9, 11, 'sun_wed', 130.00, 4),
    ('wine_tour', '12-14 guests', 12, 14, 'sun_wed', 140.00, 4),

    -- Thursday-Saturday rates (5 hour minimum)
    ('wine_tour', '1-2 guests', 1, 2, 'thu_sat', 95.00, 5),
    ('wine_tour', '3-4 guests', 3, 4, 'thu_sat', 105.00, 5),
    ('wine_tour', '5-6 guests', 5, 6, 'thu_sat', 115.00, 5),
    ('wine_tour', '7-8 guests', 7, 8, 'thu_sat', 125.00, 5),
    ('wine_tour', '9-11 guests', 9, 11, 'thu_sat', 140.00, 5),
    ('wine_tour', '12-14 guests', 12, 14, 'thu_sat', 150.00, 5)
ON CONFLICT (service_type, guest_min, guest_max, day_type) DO UPDATE SET
    hourly_rate = EXCLUDED.hourly_rate,
    minimum_hours = EXCLUDED.minimum_hours,
    updated_at = NOW();

-- Wait time rates
INSERT INTO hourly_rate_tiers (service_type, tier_name, guest_min, guest_max, day_type, hourly_rate, minimum_hours)
VALUES
    -- Weekday wait time
    ('wait_time', '1-4 guests', 1, 4, 'sun_wed', 75.00, 1),
    ('wait_time', '5-8 guests', 5, 8, 'sun_wed', 95.00, 1),
    ('wait_time', '9-14 guests', 9, 14, 'sun_wed', 110.00, 1),

    -- Weekend wait time
    ('wait_time', '1-4 guests', 1, 4, 'thu_sat', 85.00, 1),
    ('wait_time', '5-8 guests', 5, 8, 'thu_sat', 105.00, 1),
    ('wait_time', '9-14 guests', 9, 14, 'thu_sat', 120.00, 1)
ON CONFLICT (service_type, guest_min, guest_max, day_type) DO UPDATE SET
    hourly_rate = EXCLUDED.hourly_rate,
    minimum_hours = EXCLUDED.minimum_hours,
    updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_hourly_rate_tiers_lookup
    ON hourly_rate_tiers(service_type, day_type, guest_min, guest_max);

-- ============================================================================
-- 2. SHARED GROUP TOUR RATES (per-person ticketed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_tour_rates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    per_person_rate DECIMAL(10,2) NOT NULL,
    includes_lunch BOOLEAN DEFAULT false,
    available_days VARCHAR(20)[] DEFAULT ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday'],
    max_guests INTEGER DEFAULT 14,
    min_guests INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO shared_tour_rates (name, description, per_person_rate, includes_lunch, available_days, max_guests)
VALUES
    ('Shared Wine Tour', 'Join other wine enthusiasts for a group tasting experience', 95.00, false,
     ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday'], 14),
    ('Shared Wine Tour with Lunch', 'Group wine tour with included lunch at a local restaurant', 115.00, true,
     ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday'], 14)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. FIXED RATE TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfer_rates (
    id SERIAL PRIMARY KEY,
    route_code VARCHAR(50) NOT NULL UNIQUE,
    route_name VARCHAR(100) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    fixed_rate DECIMAL(10,2),
    per_person_rate DECIMAL(10,2) DEFAULT 0,
    base_guests_included INTEGER DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO transfer_rates (route_code, route_name, origin, destination, fixed_rate, notes)
VALUES
    ('SEA_TO_WALLA', 'SeaTac to Walla Walla', 'Seattle-Tacoma International Airport', 'Walla Walla', 850.00, 'Approximately 4.5 hour drive'),
    ('WALLA_TO_SEA', 'Walla Walla to SeaTac', 'Walla Walla', 'Seattle-Tacoma International Airport', 850.00, 'Approximately 4.5 hour drive'),
    ('PSC_TO_WALLA', 'Pasco to Walla Walla', 'Tri-Cities Airport (PSC)', 'Walla Walla', NULL, 'Rate TBD'),
    ('WALLA_TO_PSC', 'Walla Walla to Pasco', 'Walla Walla', 'Tri-Cities Airport (PSC)', NULL, 'Rate TBD'),
    ('PDT_TO_WALLA', 'Pendleton to Walla Walla', 'Eastern Oregon Regional Airport', 'Walla Walla', NULL, 'Rate TBD'),
    ('WALLA_TO_PDT', 'Walla Walla to Pendleton', 'Walla Walla', 'Eastern Oregon Regional Airport', NULL, 'Rate TBD')
ON CONFLICT (route_code) DO UPDATE SET
    fixed_rate = EXCLUDED.fixed_rate,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Local transfer base rate
INSERT INTO transfer_rates (route_code, route_name, origin, destination, fixed_rate, notes)
VALUES
    ('LOCAL', 'Local Transfer', 'Walla Walla Area', 'Walla Walla Area', 100.00, 'Base rate includes 10 miles, $3/mile thereafter')
ON CONFLICT (route_code) DO UPDATE SET
    fixed_rate = EXCLUDED.fixed_rate,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ============================================================================
-- 4. UPDATE INVOICE LINE ITEM CATEGORIES
-- ============================================================================

-- Add new category values to support actual pricing models
ALTER TABLE invoice_line_items
DROP CONSTRAINT IF EXISTS invoice_line_items_category_check;

-- Allow flexible categories
COMMENT ON COLUMN invoice_line_items.category IS
'Categories: hourly_tour, shared_tour_ticket, fixed_private, transfer, wait_time, add_on, discount, processing_fee, tip, tax';

-- ============================================================================
-- 5. CREATE FUNCTIONS FOR ACTUAL PRICING LOGIC
-- ============================================================================

-- Function to get hourly rate based on guest count and date
CREATE OR REPLACE FUNCTION get_hourly_tour_rate(
    p_guest_count INTEGER,
    p_tour_date DATE,
    p_service_type VARCHAR DEFAULT 'wine_tour'
) RETURNS TABLE(
    hourly_rate DECIMAL(10,2),
    tier_name VARCHAR(50),
    day_type VARCHAR(20),
    minimum_hours INTEGER
) AS $$
DECLARE
    v_day_of_week INTEGER;
    v_day_type VARCHAR(20);
BEGIN
    -- Get day of week (0=Sunday, 6=Saturday)
    v_day_of_week := EXTRACT(DOW FROM p_tour_date);

    -- Determine day type: Thu(4), Fri(5), Sat(6) = thu_sat, otherwise sun_wed
    IF v_day_of_week >= 4 AND v_day_of_week <= 6 THEN
        v_day_type := 'thu_sat';
    ELSE
        v_day_type := 'sun_wed';
    END IF;

    RETURN QUERY
    SELECT
        hrt.hourly_rate,
        hrt.tier_name,
        hrt.day_type,
        hrt.minimum_hours
    FROM hourly_rate_tiers hrt
    WHERE hrt.service_type = p_service_type
    AND hrt.day_type = v_day_type
    AND p_guest_count >= hrt.guest_min
    AND p_guest_count <= hrt.guest_max
    AND hrt.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice line items for hourly tour
CREATE OR REPLACE FUNCTION generate_hourly_tour_invoice(
    p_invoice_id INTEGER,
    p_guest_count INTEGER,
    p_hours DECIMAL,
    p_tour_date DATE,
    p_include_tip BOOLEAN DEFAULT false,
    p_tip_percentage DECIMAL DEFAULT 20.00
) RETURNS VOID AS $$
DECLARE
    v_rate_info RECORD;
    v_billable_hours DECIMAL;
    v_subtotal DECIMAL(10,2);
    v_tax_rate DECIMAL(5,3) := 0.089;
    v_line_order INTEGER := 0;
BEGIN
    -- Get rate for this guest count and date
    SELECT * INTO v_rate_info FROM get_hourly_tour_rate(p_guest_count, p_tour_date, 'wine_tour');

    IF v_rate_info IS NULL THEN
        RAISE EXCEPTION 'No rate found for % guests on %', p_guest_count, p_tour_date;
    END IF;

    -- Enforce minimum hours
    v_billable_hours := GREATEST(p_hours, v_rate_info.minimum_hours);

    -- Mark invoice as using line items
    UPDATE invoices SET uses_line_items = true WHERE id = p_invoice_id;

    -- Clear existing line items
    DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;

    -- Calculate subtotal
    v_subtotal := v_rate_info.hourly_rate * v_billable_hours;

    -- 1. Main tour line item
    v_line_order := 1;
    INSERT INTO invoice_line_items (
        invoice_id, description, category, rate_type, unit_price, quantity, line_total,
        is_taxable, tax_rate, display_order, notes
    ) VALUES (
        p_invoice_id,
        format('Wine Tour - %s hours (%s, %s)',
            v_billable_hours,
            v_rate_info.tier_name,
            CASE v_rate_info.day_type
                WHEN 'thu_sat' THEN 'Thu-Sat rate'
                ELSE 'Sun-Wed rate'
            END
        ),
        'hourly_tour',
        'per_hour',
        v_rate_info.hourly_rate,
        v_billable_hours::INTEGER,
        v_subtotal,
        true,
        v_tax_rate,
        v_line_order,
        format('$%s/hour × %s hours', v_rate_info.hourly_rate, v_billable_hours)
    );

    -- 2. Optional tip
    IF p_include_tip AND p_tip_percentage > 0 THEN
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            is_taxable, tax_rate, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Gratuity (%s%%)', p_tip_percentage::INTEGER),
            'tip',
            'fixed',
            v_subtotal * (p_tip_percentage / 100),
            1,
            v_subtotal * (p_tip_percentage / 100),
            false,
            0,
            v_line_order,
            'Driver gratuity'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice line items for shared group tour
CREATE OR REPLACE FUNCTION generate_shared_tour_invoice(
    p_invoice_id INTEGER,
    p_ticket_count INTEGER,
    p_includes_lunch BOOLEAN DEFAULT true,
    p_include_tip BOOLEAN DEFAULT false,
    p_tip_percentage DECIMAL DEFAULT 20.00
) RETURNS VOID AS $$
DECLARE
    v_rate RECORD;
    v_subtotal DECIMAL(10,2);
    v_tax_rate DECIMAL(5,3) := 0.089;
    v_line_order INTEGER := 0;
BEGIN
    -- Get the appropriate shared tour rate
    SELECT * INTO v_rate
    FROM shared_tour_rates
    WHERE includes_lunch = p_includes_lunch
    AND is_active = true
    LIMIT 1;

    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'No shared tour rate found for lunch=%', p_includes_lunch;
    END IF;

    -- Mark invoice as using line items
    UPDATE invoices SET uses_line_items = true WHERE id = p_invoice_id;

    -- Clear existing line items
    DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;

    -- Calculate subtotal
    v_subtotal := v_rate.per_person_rate * p_ticket_count;

    -- 1. Ticket line item
    v_line_order := 1;
    INSERT INTO invoice_line_items (
        invoice_id, description, category, rate_type, unit_price, quantity, line_total,
        is_taxable, tax_rate, display_order, notes
    ) VALUES (
        p_invoice_id,
        format('%s × %s', p_ticket_count, v_rate.name),
        'shared_tour_ticket',
        'per_person',
        v_rate.per_person_rate,
        p_ticket_count,
        v_subtotal,
        true,
        v_tax_rate,
        v_line_order,
        format('$%s per person%s', v_rate.per_person_rate,
            CASE WHEN p_includes_lunch THEN ' (includes lunch)' ELSE '' END)
    );

    -- 2. Optional tip
    IF p_include_tip AND p_tip_percentage > 0 THEN
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            is_taxable, tax_rate, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Gratuity (%s%%)', p_tip_percentage::INTEGER),
            'tip',
            'fixed',
            v_subtotal * (p_tip_percentage / 100),
            1,
            v_subtotal * (p_tip_percentage / 100),
            false,
            0,
            v_line_order,
            'Driver gratuity'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice for fixed rate private tour
CREATE OR REPLACE FUNCTION generate_fixed_tour_invoice(
    p_invoice_id INTEGER,
    p_description TEXT,
    p_fixed_amount DECIMAL(10,2),
    p_include_tip BOOLEAN DEFAULT false,
    p_tip_percentage DECIMAL DEFAULT 20.00
) RETURNS VOID AS $$
DECLARE
    v_tax_rate DECIMAL(5,3) := 0.089;
    v_line_order INTEGER := 0;
BEGIN
    -- Mark invoice as using line items
    UPDATE invoices SET uses_line_items = true WHERE id = p_invoice_id;

    -- Clear existing line items
    DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;

    -- 1. Fixed rate tour line item
    v_line_order := 1;
    INSERT INTO invoice_line_items (
        invoice_id, description, category, rate_type, unit_price, quantity, line_total,
        is_taxable, tax_rate, display_order, notes
    ) VALUES (
        p_invoice_id,
        p_description,
        'fixed_private',
        'fixed',
        p_fixed_amount,
        1,
        p_fixed_amount,
        true,
        v_tax_rate,
        v_line_order,
        'Private tour - negotiated rate'
    );

    -- 2. Optional tip
    IF p_include_tip AND p_tip_percentage > 0 THEN
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            is_taxable, tax_rate, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Gratuity (%s%%)', p_tip_percentage::INTEGER),
            'tip',
            'fixed',
            p_fixed_amount * (p_tip_percentage / 100),
            1,
            p_fixed_amount * (p_tip_percentage / 100),
            false,
            0,
            v_line_order,
            'Driver gratuity'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice for transfer
CREATE OR REPLACE FUNCTION generate_transfer_invoice(
    p_invoice_id INTEGER,
    p_route_code VARCHAR(50),
    p_include_tip BOOLEAN DEFAULT false,
    p_tip_percentage DECIMAL DEFAULT 20.00
) RETURNS VOID AS $$
DECLARE
    v_transfer RECORD;
    v_tax_rate DECIMAL(5,3) := 0.089;
    v_line_order INTEGER := 0;
BEGIN
    -- Get transfer rate
    SELECT * INTO v_transfer
    FROM transfer_rates
    WHERE route_code = p_route_code
    AND is_active = true;

    IF v_transfer IS NULL OR v_transfer.fixed_rate IS NULL THEN
        RAISE EXCEPTION 'No rate found for transfer route: %', p_route_code;
    END IF;

    -- Mark invoice as using line items
    UPDATE invoices SET uses_line_items = true WHERE id = p_invoice_id;

    -- Clear existing line items
    DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;

    -- 1. Transfer line item
    v_line_order := 1;
    INSERT INTO invoice_line_items (
        invoice_id, description, category, rate_type, unit_price, quantity, line_total,
        is_taxable, tax_rate, display_order, notes
    ) VALUES (
        p_invoice_id,
        v_transfer.route_name,
        'transfer',
        'fixed',
        v_transfer.fixed_rate,
        1,
        v_transfer.fixed_rate,
        true,
        v_tax_rate,
        v_line_order,
        format('%s to %s', v_transfer.origin, v_transfer.destination)
    );

    -- 2. Optional tip
    IF p_include_tip AND p_tip_percentage > 0 THEN
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            is_taxable, tax_rate, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Gratuity (%s%%)', p_tip_percentage::INTEGER),
            'tip',
            'fixed',
            v_transfer.fixed_rate * (p_tip_percentage / 100),
            1,
            v_transfer.fixed_rate * (p_tip_percentage / 100),
            false,
            0,
            v_line_order,
            'Driver gratuity'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE VIEWS FOR ADMIN RATE MANAGEMENT
-- ============================================================================

CREATE OR REPLACE VIEW hourly_rates_summary AS
SELECT
    service_type,
    tier_name,
    guest_min,
    guest_max,
    MAX(CASE WHEN day_type = 'sun_wed' THEN hourly_rate END) as sun_wed_rate,
    MAX(CASE WHEN day_type = 'thu_sat' THEN hourly_rate END) as thu_sat_rate,
    MAX(minimum_hours) as minimum_hours
FROM hourly_rate_tiers
WHERE is_active = true
GROUP BY service_type, tier_name, guest_min, guest_max
ORDER BY service_type, guest_min;

-- ============================================================================
-- 7. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE hourly_rate_tiers IS 'Tiered hourly rates by guest count and day of week (actual Walla Walla Travel rates)';
COMMENT ON TABLE shared_tour_rates IS 'Per-person ticketed rates for shared group tours';
COMMENT ON TABLE transfer_rates IS 'Fixed rates for airport and local transfers';

COMMENT ON FUNCTION get_hourly_tour_rate IS 'Returns the appropriate hourly rate tier for given guest count and date';
COMMENT ON FUNCTION generate_hourly_tour_invoice IS 'Creates invoice line items for an hourly-rate wine tour';
COMMENT ON FUNCTION generate_shared_tour_invoice IS 'Creates invoice line items for shared/ticketed group tour';
COMMENT ON FUNCTION generate_fixed_tour_invoice IS 'Creates invoice line items for negotiated fixed-rate private tour';
COMMENT ON FUNCTION generate_transfer_invoice IS 'Creates invoice line items for airport/local transfer';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration complete! Created:';
    RAISE NOTICE '  - hourly_rate_tiers table with actual wine tour rates';
    RAISE NOTICE '  - shared_tour_rates table ($95/person, $115 with lunch)';
    RAISE NOTICE '  - transfer_rates table (SeaTac $850, etc.)';
    RAISE NOTICE '  - get_hourly_tour_rate() lookup function';
    RAISE NOTICE '  - generate_hourly_tour_invoice() for hourly tours';
    RAISE NOTICE '  - generate_shared_tour_invoice() for ticketed tours';
    RAISE NOTICE '  - generate_fixed_tour_invoice() for negotiated private tours';
    RAISE NOTICE '  - generate_transfer_invoice() for transfers';
    RAISE NOTICE '  - hourly_rates_summary view for admin';
END $$;
