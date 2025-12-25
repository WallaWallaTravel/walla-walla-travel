-- ============================================================================
-- COMMISSION TRACKING SYSTEM
-- ============================================================================
-- Purpose: Track referral commissions from partner businesses
-- Revenue streams: Lodging, restaurants, activities, wine club signups
-- ============================================================================

-- ============================================================================
-- PARTNERS TABLE
-- ============================================================================
-- Businesses we have commission agreements with

CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    business_type VARCHAR(50) NOT NULL,  -- 'winery', 'restaurant', 'lodging', 'activity', 'retail'

    -- Contact
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100) DEFAULT 'Walla Walla',
    state VARCHAR(50) DEFAULT 'WA',
    zip VARCHAR(20),

    -- Commission Terms
    commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage',  -- 'percentage', 'flat_fee', 'tiered'
    commission_rate DECIMAL(5,2),  -- e.g., 10.00 for 10%
    flat_fee_amount DECIMAL(10,2),  -- For flat fee commissions
    minimum_booking_value DECIMAL(10,2),  -- Minimum to qualify for commission

    -- Tiered Commission (JSON for flexibility)
    tiered_rates JSONB,  -- [{"min": 0, "max": 1000, "rate": 8}, {"min": 1000, "max": null, "rate": 12}]

    -- Payment Terms
    payment_terms_days INTEGER DEFAULT 30,  -- Net 30, Net 60, etc.
    payment_method VARCHAR(50) DEFAULT 'check',  -- 'check', 'ach', 'paypal'
    payment_email VARCHAR(255),  -- For electronic payments
    tax_id VARCHAR(50),  -- For 1099 reporting

    -- Agreement
    agreement_start_date DATE,
    agreement_end_date DATE,
    agreement_document_url VARCHAR(500),

    -- Link to directory
    winery_id INTEGER REFERENCES wineries(id),
    business_id INTEGER REFERENCES businesses(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(business_type);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active) WHERE is_active = true;

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================
-- Individual referrals we've made to partners

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,

    -- Link to partner
    partner_id INTEGER NOT NULL REFERENCES partners(id),

    -- Referral source
    source_type VARCHAR(50) NOT NULL,  -- 'booking', 'website', 'chatgpt_app', 'phone', 'email'
    source_booking_id UUID REFERENCES bookings(id),  -- If from a tour booking
    source_proposal_id UUID,  -- If from a proposal

    -- Customer info
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    party_size INTEGER,

    -- Referral details
    referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_date DATE,  -- When the service was/will be used
    service_description TEXT,

    -- Tracking
    referral_code VARCHAR(50),  -- Unique code for tracking
    tracking_url VARCHAR(500),

    -- Status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Value & Commission
    estimated_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    commission_rate DECIMAL(5,2),  -- Rate at time of referral
    commission_amount DECIMAL(10,2),  -- Calculated commission

    -- Notes
    notes TEXT,
    partner_notes TEXT,  -- Feedback from partner

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_date ON referrals(referral_date);
CREATE INDEX IF NOT EXISTS idx_referrals_booking ON referrals(source_booking_id);

-- ============================================================================
-- COMMISSION PAYOUTS TABLE
-- ============================================================================
-- Payments we've received from partners

CREATE TABLE IF NOT EXISTS commission_payouts (
    id SERIAL PRIMARY KEY,

    -- Link to partner
    partner_id INTEGER NOT NULL REFERENCES partners(id),

    -- Payout period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    gross_referral_value DECIMAL(10,2) NOT NULL,  -- Total value of referrals
    commission_earned DECIMAL(10,2) NOT NULL,  -- Commission before adjustments
    adjustments DECIMAL(10,2) DEFAULT 0,  -- Adjustments (+/-)
    adjustment_notes TEXT,
    net_commission DECIMAL(10,2) NOT NULL,  -- Final amount due

    -- Payment
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'invoiced', 'paid', 'disputed'
    invoice_number VARCHAR(50),
    invoice_date DATE,
    invoice_sent_at TIMESTAMPTZ,

    payment_received_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),  -- Check number, transaction ID, etc.

    -- Linked referrals
    referral_ids INTEGER[],  -- Array of referral IDs included in this payout
    referral_count INTEGER,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_partner ON commission_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON commission_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON commission_payouts(period_start, period_end);

-- ============================================================================
-- COMMISSION SUMMARY VIEW
-- ============================================================================
-- Quick overview of commission status by partner

CREATE OR REPLACE VIEW commission_summary AS
SELECT
    p.id AS partner_id,
    p.name AS partner_name,
    p.business_type,
    p.commission_rate,

    -- Referral counts
    COUNT(r.id) FILTER (WHERE r.status = 'pending') AS pending_referrals,
    COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed_referrals,
    COUNT(r.id) FILTER (WHERE r.status = 'completed') AS completed_referrals,
    COUNT(r.id) AS total_referrals,

    -- Commission amounts
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status = 'completed'), 0) AS total_earned,
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status IN ('pending', 'confirmed')), 0) AS pending_commission,

    -- Payout status
    COALESCE(SUM(cp.net_commission) FILTER (WHERE cp.status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(cp.net_commission) FILTER (WHERE cp.status = 'pending'), 0) AS awaiting_payment,

    -- Dates
    MAX(r.referral_date) AS last_referral_date,
    MAX(cp.payment_received_at) AS last_payment_date

FROM partners p
LEFT JOIN referrals r ON r.partner_id = p.id
LEFT JOIN commission_payouts cp ON cp.partner_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.business_type, p.commission_rate;

-- ============================================================================
-- MONTHLY COMMISSION REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW monthly_commission_report AS
SELECT
    DATE_TRUNC('month', r.referral_date) AS month,
    p.business_type,
    p.name AS partner_name,
    COUNT(r.id) AS referral_count,
    SUM(r.actual_value) AS total_referral_value,
    SUM(r.commission_amount) AS total_commission,
    COUNT(r.id) FILTER (WHERE r.status = 'completed') AS completed_count,
    COUNT(r.id) FILTER (WHERE r.status = 'cancelled') AS cancelled_count
FROM referrals r
JOIN partners p ON p.id = r.partner_id
GROUP BY DATE_TRUNC('month', r.referral_date), p.business_type, p.name
ORDER BY month DESC, total_commission DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate commission for a referral
CREATE OR REPLACE FUNCTION calculate_commission(
    p_partner_id INTEGER,
    p_referral_value DECIMAL(10,2)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_partner partners%ROWTYPE;
    v_commission DECIMAL(10,2);
    v_tier JSONB;
BEGIN
    SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;

    IF v_partner.commission_type = 'percentage' THEN
        v_commission := p_referral_value * (v_partner.commission_rate / 100);
    ELSIF v_partner.commission_type = 'flat_fee' THEN
        v_commission := v_partner.flat_fee_amount;
    ELSIF v_partner.commission_type = 'tiered' AND v_partner.tiered_rates IS NOT NULL THEN
        -- Find applicable tier
        FOR v_tier IN SELECT * FROM jsonb_array_elements(v_partner.tiered_rates)
        LOOP
            IF p_referral_value >= (v_tier->>'min')::DECIMAL
               AND (v_tier->>'max' IS NULL OR p_referral_value < (v_tier->>'max')::DECIMAL) THEN
                v_commission := p_referral_value * ((v_tier->>'rate')::DECIMAL / 100);
                EXIT;
            END IF;
        END LOOP;
    ELSE
        v_commission := 0;
    END IF;

    RETURN COALESCE(v_commission, 0);
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate commission on referral insert/update
CREATE OR REPLACE FUNCTION update_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actual_value IS NOT NULL THEN
        NEW.commission_amount := calculate_commission(NEW.partner_id, NEW.actual_value);
    ELSIF NEW.estimated_value IS NOT NULL THEN
        NEW.commission_amount := calculate_commission(NEW.partner_id, NEW.estimated_value);
    END IF;

    -- Get commission rate from partner for record keeping
    SELECT commission_rate INTO NEW.commission_rate
    FROM partners WHERE id = NEW.partner_id;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_commission
    BEFORE INSERT OR UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_commission();

-- ============================================================================
-- SAMPLE DATA: Initial Partners
-- ============================================================================

INSERT INTO partners (name, business_type, commission_type, commission_rate, contact_name, city)
VALUES
    ('Marcus Whitman Hotel', 'lodging', 'percentage', 10.00, 'Front Desk Manager', 'Walla Walla'),
    ('The Finch', 'lodging', 'percentage', 8.00, 'Reservations', 'Walla Walla'),
    ('Walla Walla Steak Co.', 'restaurant', 'percentage', 5.00, 'Manager', 'Walla Walla'),
    ('Saffron Mediterranean', 'restaurant', 'percentage', 5.00, 'Owner', 'Walla Walla'),
    ('Hot Air Balloon Rides', 'activity', 'flat_fee', 25.00, 'Operations', 'Walla Walla')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INDEXES FOR REPORTING
-- ============================================================================

-- Note: Functional index on DATE_TRUNC removed - use regular date index instead
-- CREATE INDEX IF NOT EXISTS idx_referrals_monthly ON referrals(DATE_TRUNC('month', referral_date));
CREATE INDEX IF NOT EXISTS idx_referrals_source ON referrals(source_type);

-- ============================================================================
-- ROW LEVEL SECURITY (for future multi-tenant)
-- ============================================================================

-- For now, these tables are admin-only, so no RLS needed
-- Can be added later if partner portal is built

COMMENT ON TABLE partners IS 'Businesses we have commission agreements with for referrals';
COMMENT ON TABLE referrals IS 'Individual referrals made to partners, tracking status and commission';
COMMENT ON TABLE commission_payouts IS 'Payment records for commissions received from partners';
COMMENT ON VIEW commission_summary IS 'Quick overview of commission status by partner';
COMMENT ON VIEW monthly_commission_report IS 'Monthly breakdown of referrals and commissions by partner';
