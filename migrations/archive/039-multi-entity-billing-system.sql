-- ============================================================================
-- MULTI-ENTITY BILLING SYSTEM
-- ============================================================================
-- Supports multiple business entities (NW Touring & Concierge, Walla Walla Travel)
-- with proper payment routing, commission tracking, and policy management.
-- ============================================================================

-- ============================================================================
-- 1. SERVICE ENTITIES (Who delivers and bills for services)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'nw_touring', 'walla_walla_travel'
    legal_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    dba_names TEXT[],  -- ['Herding Cats Wine Tours', etc.]

    -- Business details
    entity_type VARCHAR(50),  -- 'llc', 'sole_prop', 'corporation'
    state_of_formation VARCHAR(2),  -- 'OR', 'WA'
    ein VARCHAR(20),

    -- Regulatory (for transportation providers)
    usdot_number VARCHAR(20),
    mc_number VARCHAR(20),
    insurance_policy_number VARCHAR(100),
    insurance_minimum DECIMAL(12,2),
    insurance_expiry DATE,

    -- Payment processing
    payment_processor VARCHAR(20) DEFAULT 'stripe',  -- 'stripe', 'square'
    stripe_account_id VARCHAR(100),  -- For Stripe Connect: 'acct_xxx'
    square_merchant_id VARCHAR(100),

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#8B1538',
    secondary_color VARCHAR(7) DEFAULT '#1a1a1a',

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip VARCHAR(10),

    -- Tax
    tax_rate DECIMAL(5,3) DEFAULT 0.089,  -- Default 8.9%

    -- Policies (references to policy documents)
    terms_version VARCHAR(20) DEFAULT '1.0',
    terms_updated_at DATE DEFAULT CURRENT_DATE,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_entities_code ON service_entities(code);

-- ============================================================================
-- 2. SERVICE TYPES (What services can be provided)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'wine_tour', 'airport_transfer', 'planning'
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),  -- 'transportation', 'planning', 'accommodation', 'activity'

    -- Default entity that provides this service
    default_entity_id UUID REFERENCES service_entities(id),

    -- Default pricing
    default_pricing_type VARCHAR(20) DEFAULT 'hourly',  -- 'hourly', 'flat', 'per_person'
    default_rate DECIMAL(10,2),
    minimum_hours DECIMAL(4,2),

    -- Default commission when booked through a referral source
    default_commission_type VARCHAR(20) DEFAULT 'percentage',  -- 'percentage', 'flat'
    default_commission_rate DECIMAL(5,2) DEFAULT 15.00,  -- 15%
    default_commission_flat DECIMAL(10,2),

    -- Policy requirements
    requires_transportation_liability BOOLEAN DEFAULT false,
    requires_waiver_signature BOOLEAN DEFAULT false,
    requires_alcohol_acknowledgment BOOLEAN DEFAULT false,

    -- Display
    icon VARCHAR(50),  -- emoji or icon name
    display_order INTEGER DEFAULT 100,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_types_code ON service_types(code);
CREATE INDEX IF NOT EXISTS idx_service_types_category ON service_types(category);

-- ============================================================================
-- 3. BOOKING SOURCES (Where bookings originate)
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'wwt_website', 'chatgpt', 'phone', 'direct'
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Which entity owns/operates this source
    owner_entity_id UUID REFERENCES service_entities(id),

    -- Default commission when this source books for another entity
    commission_type VARCHAR(20) DEFAULT 'percentage',  -- 'percentage', 'flat'
    commission_rate DECIMAL(5,2) DEFAULT 15.00,  -- 15% default
    commission_flat DECIMAL(10,2),

    -- Tracking
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_sources_code ON booking_sources(code);

-- ============================================================================
-- 4. COMMISSION RATE OVERRIDES
-- ============================================================================

-- Override commission rates for specific source + service + provider combinations
CREATE TABLE IF NOT EXISTS commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What combination this applies to
    booking_source_id UUID REFERENCES booking_sources(id),
    service_type_id UUID REFERENCES service_types(id),
    provider_entity_id UUID REFERENCES service_entities(id),

    -- Commission details
    commission_type VARCHAR(20) NOT NULL,  -- 'percentage', 'flat'
    commission_rate DECIMAL(5,2),  -- For percentage (e.g., 15.00 = 15%)
    commission_flat DECIMAL(10,2),  -- For flat amount

    -- Optional notes
    notes TEXT,

    -- Validity period
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,  -- NULL means no end date

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique combinations for a given time period
    UNIQUE(booking_source_id, service_type_id, provider_entity_id, effective_from)
);

-- ============================================================================
-- 5. BOOKING ENTITY TRACKING
-- ============================================================================

-- Add entity tracking to existing bookings table
DO $$
BEGIN
    -- Add provider entity reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'provider_entity_id') THEN
        ALTER TABLE bookings ADD COLUMN provider_entity_id UUID REFERENCES service_entities(id);
    END IF;

    -- Add booking source reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'booking_source_id') THEN
        ALTER TABLE bookings ADD COLUMN booking_source_id UUID REFERENCES booking_sources(id);
    END IF;

    -- Add referral/source tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'referral_code') THEN
        ALTER TABLE bookings ADD COLUMN referral_code VARCHAR(50);
    END IF;

    -- Add brand/DBA used for this booking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'brand_name') THEN
        ALTER TABLE bookings ADD COLUMN brand_name VARCHAR(200);
    END IF;

    -- Waiver tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'waiver_signed_at') THEN
        ALTER TABLE bookings ADD COLUMN waiver_signed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'waiver_version') THEN
        ALTER TABLE bookings ADD COLUMN waiver_version VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'waiver_ip_address') THEN
        ALTER TABLE bookings ADD COLUMN waiver_ip_address VARCHAR(45);
    END IF;
END $$;

-- ============================================================================
-- 6. BOOKING LINE ITEMS (Multi-entity invoice support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,

    -- What service
    service_type_id UUID REFERENCES service_types(id),
    description TEXT NOT NULL,

    -- Who provides it
    provider_entity_id UUID REFERENCES service_entities(id) NOT NULL,
    brand_name VARCHAR(200),  -- Which brand/DBA to show

    -- Service details
    service_date DATE,
    duration_hours DECIMAL(4,2),
    party_size INTEGER,

    -- Pricing
    pricing_type VARCHAR(20),  -- 'hourly', 'flat', 'per_person'
    unit_price DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,

    -- Tax
    tax_rate DECIMAL(5,3),
    tax_amount DECIMAL(10,2) DEFAULT 0,

    -- Total
    total DECIMAL(10,2) NOT NULL,

    -- Payment routing (for Stripe Connect)
    payment_destination VARCHAR(100),  -- Stripe account ID

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'completed', 'cancelled'

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_provider ON booking_line_items(provider_entity_id);

-- ============================================================================
-- 7. COMMISSION LEDGER (Track commissions owed between entities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What booking/line item
    booking_id INTEGER REFERENCES bookings(id),
    line_item_id UUID REFERENCES booking_line_items(id),

    -- Who owes whom
    payer_entity_id UUID REFERENCES service_entities(id) NOT NULL,  -- Who pays commission
    payee_entity_id UUID REFERENCES service_entities(id) NOT NULL,  -- Who receives commission

    -- Source that generated this commission
    booking_source_id UUID REFERENCES booking_sources(id),

    -- Amounts
    booking_amount DECIMAL(10,2) NOT NULL,  -- Total booking/line item value
    commission_type VARCHAR(20) NOT NULL,
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'paid', 'disputed', 'cancelled'

    -- Approval
    approved_at TIMESTAMPTZ,
    approved_by INTEGER REFERENCES users(id),

    -- Payment
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),  -- 'bank_transfer', 'check', 'stripe', 'internal'
    payment_reference VARCHAR(100),
    payment_notes TEXT,

    -- Dispute handling
    disputed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_booking ON commission_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_payer ON commission_ledger(payer_entity_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_payee ON commission_ledger(payee_entity_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_status ON commission_ledger(status);

-- ============================================================================
-- 8. VEHICLE DAMAGE/INCIDENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related records
    booking_id INTEGER REFERENCES bookings(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES users(id),

    -- Incident details
    incident_type VARCHAR(50) NOT NULL,  -- 'cleaning', 'damage', 'smoking', 'illegal_activity'
    incident_date DATE NOT NULL,
    description TEXT NOT NULL,

    -- Location
    location TEXT,

    -- Charges
    base_fee DECIMAL(10,2) NOT NULL,  -- Standard fee for this type
    additional_charges DECIMAL(10,2) DEFAULT 0,  -- Repair costs, etc.
    total_charge DECIMAL(10,2) NOT NULL,

    -- Documentation
    photos TEXT[],  -- Array of photo URLs

    -- Customer notification
    customer_notified_at TIMESTAMPTZ,
    customer_acknowledged_at TIMESTAMPTZ,

    -- Payment
    charge_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'charged', 'paid', 'disputed', 'waived'
    charged_at TIMESTAMPTZ,
    payment_id VARCHAR(100),  -- Stripe/Square payment ID

    -- Notes
    internal_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_incidents_booking ON vehicle_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_incidents_vehicle ON vehicle_incidents(vehicle_id);

-- ============================================================================
-- 9. SEED DATA
-- ============================================================================

-- Insert service entities
INSERT INTO service_entities (
    code, legal_name, display_name, dba_names,
    entity_type, state_of_formation,
    usdot_number, mc_number, insurance_minimum,
    email, phone, website,
    address_city, address_state
) VALUES
(
    'nw_touring',
    'NW Touring & Concierge LLC',
    'NW Touring & Concierge',
    ARRAY['Herding Cats Wine Tours'],
    'llc',
    'OR',
    '3603851',
    '1225087',
    1500000.00,
    'info@nwtouring.com',
    '509-200-8000',
    'https://nwtouring.com',
    'Milton-Freewater',
    'OR'
),
(
    'walla_walla_travel',
    'Walla Walla Travel LLC',
    'Walla Walla Travel',
    NULL,
    'llc',
    'OR',
    NULL,
    NULL,
    NULL,
    'info@wallawalla.travel',
    '509-200-8000',
    'https://wallawalla.travel',
    'Walla Walla',
    'WA'
)
ON CONFLICT (code) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    display_name = EXCLUDED.display_name,
    dba_names = EXCLUDED.dba_names,
    usdot_number = EXCLUDED.usdot_number,
    mc_number = EXCLUDED.mc_number,
    updated_at = NOW();

-- Insert service types
INSERT INTO service_types (
    code, name, description, category,
    default_entity_id,
    default_pricing_type, minimum_hours,
    default_commission_rate,
    requires_transportation_liability, requires_waiver_signature, requires_alcohol_acknowledgment,
    icon, display_order
) VALUES
(
    'wine_tour',
    'Wine Tour',
    'Guided wine tasting tour of Walla Walla Valley wineries',
    'transportation',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'hourly', 5,
    15.00,
    true, true, true,
    '🍷', 10
),
(
    'airport_transfer',
    'Airport Transfer',
    'Transportation to/from airport',
    'transportation',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'flat', NULL,
    15.00,
    true, false, false,
    '✈️', 20
),
(
    'charter',
    'Charter Service',
    'Custom charter transportation',
    'transportation',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'hourly', 2,
    15.00,
    true, true, false,
    '🚐', 30
),
(
    'shared_tour',
    'Shared Wine Tour',
    'Per-person ticketed group wine tour',
    'transportation',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'per_person', NULL,
    15.00,
    true, true, true,
    '🎟️', 15
),
(
    'trip_planning',
    'Trip Planning',
    'Custom trip planning and itinerary creation',
    'planning',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'flat', NULL,
    0,  -- No commission on WWT's own services
    false, false, false,
    '📋', 40
),
(
    'concierge',
    'Concierge Services',
    'Restaurant reservations, activity bookings, etc.',
    'planning',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'flat', NULL,
    0,
    false, false, false,
    '🎩', 50
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_entity_id = EXCLUDED.default_entity_id;

-- Insert booking sources
INSERT INTO booking_sources (
    code, name, description,
    owner_entity_id,
    commission_type, commission_rate
) VALUES
(
    'wwt_website',
    'Walla Walla Travel Website',
    'Direct bookings through wallawalla.travel',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'percentage', 15.00
),
(
    'wwt_chatgpt',
    'ChatGPT Store',
    'Bookings through ChatGPT AI assistant',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'percentage', 15.00
),
(
    'wwt_phone',
    'Phone Booking (WWT)',
    'Phone bookings handled by WWT',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'percentage', 10.00
),
(
    'wwt_proposal',
    'WWT Proposal System',
    'Bookings from accepted proposals',
    (SELECT id FROM service_entities WHERE code = 'walla_walla_travel'),
    'percentage', 15.00
),
(
    'nwt_direct',
    'NW Touring Direct',
    'Direct bookings to NW Touring',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'percentage', 0
),
(
    'nwt_phone',
    'Phone Booking (NWT)',
    'Phone bookings handled by NW Touring directly',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'percentage', 0
),
(
    'herding_cats',
    'Herding Cats Website',
    'Bookings through herdingcats.wine',
    (SELECT id FROM service_entities WHERE code = 'nw_touring'),
    'percentage', 0
),
(
    'referral',
    'Referral',
    'Word of mouth / customer referral',
    NULL,
    'percentage', 0
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    commission_rate = EXCLUDED.commission_rate;

-- ============================================================================
-- 10. VIEWS FOR REPORTING
-- ============================================================================

-- Commission summary by period
CREATE OR REPLACE VIEW commission_summary AS
SELECT
    date_trunc('month', cl.created_at) as period,
    payer.display_name as payer_entity,
    payee.display_name as payee_entity,
    bs.name as booking_source,
    cl.status,
    COUNT(*) as transaction_count,
    SUM(cl.booking_amount) as total_booking_amount,
    SUM(cl.commission_amount) as total_commission
FROM commission_ledger cl
JOIN service_entities payer ON cl.payer_entity_id = payer.id
JOIN service_entities payee ON cl.payee_entity_id = payee.id
LEFT JOIN booking_sources bs ON cl.booking_source_id = bs.id
GROUP BY
    date_trunc('month', cl.created_at),
    payer.display_name,
    payee.display_name,
    bs.name,
    cl.status
ORDER BY period DESC, total_commission DESC;

-- Entity revenue summary
CREATE OR REPLACE VIEW entity_revenue_summary AS
SELECT
    se.code as entity_code,
    se.display_name as entity_name,
    date_trunc('month', bli.created_at) as period,
    st.name as service_type,
    COUNT(DISTINCT bli.booking_id) as booking_count,
    SUM(bli.subtotal) as gross_revenue,
    SUM(bli.tax_amount) as tax_collected,
    SUM(bli.total) as total_revenue,
    COALESCE(SUM(cl.commission_amount), 0) as commissions_paid
FROM booking_line_items bli
JOIN service_entities se ON bli.provider_entity_id = se.id
LEFT JOIN service_types st ON bli.service_type_id = st.id
LEFT JOIN commission_ledger cl ON cl.line_item_id = bli.id AND cl.payer_entity_id = se.id
GROUP BY
    se.code,
    se.display_name,
    date_trunc('month', bli.created_at),
    st.name
ORDER BY period DESC, gross_revenue DESC;

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Calculate commission for a booking
CREATE OR REPLACE FUNCTION calculate_commission(
    p_booking_amount DECIMAL,
    p_booking_source_id UUID,
    p_service_type_id UUID,
    p_provider_entity_id UUID
) RETURNS TABLE (
    commission_type VARCHAR(20),
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_rate RECORD;
BEGIN
    -- First check for specific override
    SELECT cr.commission_type, cr.commission_rate, cr.commission_flat
    INTO v_rate
    FROM commission_rates cr
    WHERE cr.booking_source_id = p_booking_source_id
    AND (cr.service_type_id = p_service_type_id OR cr.service_type_id IS NULL)
    AND (cr.provider_entity_id = p_provider_entity_id OR cr.provider_entity_id IS NULL)
    AND cr.is_active = true
    AND cr.effective_from <= CURRENT_DATE
    AND (cr.effective_until IS NULL OR cr.effective_until >= CURRENT_DATE)
    ORDER BY
        CASE WHEN cr.service_type_id IS NOT NULL AND cr.provider_entity_id IS NOT NULL THEN 1
             WHEN cr.service_type_id IS NOT NULL THEN 2
             WHEN cr.provider_entity_id IS NOT NULL THEN 3
             ELSE 4 END
    LIMIT 1;

    -- If no override, use booking source default
    IF v_rate IS NULL THEN
        SELECT bs.commission_type, bs.commission_rate, bs.commission_flat
        INTO v_rate
        FROM booking_sources bs
        WHERE bs.id = p_booking_source_id;
    END IF;

    -- If still no rate, use service type default
    IF v_rate IS NULL THEN
        SELECT st.default_commission_type, st.default_commission_rate, NULL
        INTO v_rate
        FROM service_types st
        WHERE st.id = p_service_type_id;
    END IF;

    -- Calculate commission
    IF v_rate.commission_type = 'percentage' THEN
        RETURN QUERY SELECT
            'percentage'::VARCHAR(20),
            v_rate.commission_rate,
            ROUND(p_booking_amount * v_rate.commission_rate / 100, 2);
    ELSIF v_rate.commission_type = 'flat' THEN
        RETURN QUERY SELECT
            'flat'::VARCHAR(20),
            NULL::DECIMAL(5,2),
            v_rate.commission_flat;
    ELSE
        RETURN QUERY SELECT
            'none'::VARCHAR(20),
            0::DECIMAL(5,2),
            0::DECIMAL(10,2);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. INCIDENT FEE DEFAULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_fee_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES service_entities(id),
    incident_type VARCHAR(50) NOT NULL,
    description TEXT,
    base_fee DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,

    UNIQUE(entity_id, incident_type)
);

-- Insert default fee schedule for NW Touring
INSERT INTO incident_fee_schedule (entity_id, incident_type, description, base_fee) VALUES
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'cleaning', 'Professional cleaning required beyond normal use', 300.00),
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'smoking', 'Smoking or vaping in vehicle', 300.00),
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'vomit', 'Biohazard cleaning (vomit, bodily fluids)', 300.00),
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'illegal_activity', 'Damage from illegal activity + incident fee', 500.00),
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'minor_damage', 'Minor damage to vehicle interior', 250.00),
((SELECT id FROM service_entities WHERE code = 'nw_touring'), 'major_damage', 'Major damage requiring professional repair', 0.00)  -- Actual repair cost
ON CONFLICT (entity_id, incident_type) DO UPDATE SET
    base_fee = EXCLUDED.base_fee,
    description = EXCLUDED.description;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Multi-Entity Billing System Migration Complete!';
    RAISE NOTICE '  - service_entities table: Business entities (NW Touring, WWT)';
    RAISE NOTICE '  - service_types table: Service catalog with entity defaults';
    RAISE NOTICE '  - booking_sources table: Where bookings come from';
    RAISE NOTICE '  - commission_rates table: Override rates per source/service';
    RAISE NOTICE '  - booking_line_items table: Multi-entity line items';
    RAISE NOTICE '  - commission_ledger table: Track commissions owed';
    RAISE NOTICE '  - vehicle_incidents table: Damage/cleaning tracking';
    RAISE NOTICE '  - incident_fee_schedule table: Standard fees';
    RAISE NOTICE '  - Views for commission and revenue reporting';
    RAISE NOTICE '  - Seeded NW Touring & WWT entities';
    RAISE NOTICE '  - Seeded service types and booking sources';
END $$;
