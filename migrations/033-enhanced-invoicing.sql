-- ============================================================================
-- ENHANCED INVOICING SYSTEM
-- ============================================================================
-- Adds processing fee tracking and tip handling enhancements
-- For 2026 booking system revamp
-- ============================================================================

-- Add processing fee columns to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_fee_covered_by_customer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tip_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed', 'none'
ADD COLUMN IF NOT EXISTS tip_percentage DECIMAL(5,2); -- e.g., 15.00, 18.00, 20.00

-- Create payments table if not exists
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    invoice_id UUID REFERENCES invoices(id),
    customer_id UUID REFERENCES customers(id),

    -- Amounts
    base_amount DECIMAL(10,2) NOT NULL, -- Amount before fees/tips
    tip_amount DECIMAL(10,2) DEFAULT 0,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL, -- Final amount charged

    -- Payment Details
    payment_method VARCHAR(50) NOT NULL, -- 'card', 'check', 'ach', 'cash'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),

    -- Timestamps
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notes
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(transaction_date);

-- Create payment_settings table if not exists
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id),

    -- Processing Fee Settings
    card_processing_percentage DECIMAL(5,2) DEFAULT 2.90, -- Stripe standard
    card_processing_flat_fee DECIMAL(10,2) DEFAULT 0.30, -- Stripe $0.30
    pass_fees_to_customer BOOLEAN DEFAULT true,
    allow_customer_to_toggle_fees BOOLEAN DEFAULT false,

    -- Tip Settings
    enable_tipping BOOLEAN DEFAULT true,
    default_tip_percentage DECIMAL(5,2) DEFAULT 20.00,
    suggested_tip_percentages DECIMAL(5,2)[] DEFAULT ARRAY[15.00, 18.00, 20.00, 25.00],
    allow_custom_tip BOOLEAN DEFAULT true,
    show_suggested_tips BOOLEAN DEFAULT true,
    tip_label VARCHAR(100) DEFAULT 'Gratuity for your driver',

    -- Display Settings
    show_fee_breakdown BOOLEAN DEFAULT true,
    show_savings_for_check BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(operator_id)
);

-- Insert default settings for NULL operator (global defaults)
INSERT INTO payment_settings (
    operator_id,
    card_processing_percentage,
    card_processing_flat_fee,
    pass_fees_to_customer,
    enable_tipping,
    default_tip_percentage,
    suggested_tip_percentages
) VALUES (
    NULL,
    2.90,
    0.30,
    true,
    true,
    20.00,
    ARRAY[15.00, 18.00, 20.00, 25.00]
) ON CONFLICT DO NOTHING;

-- Create a function to calculate processing fee
CREATE OR REPLACE FUNCTION calculate_processing_fee(
    p_amount DECIMAL(10,2),
    p_operator_id INTEGER DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_settings payment_settings%ROWTYPE;
    v_fee DECIMAL(10,2);
BEGIN
    -- Get operator settings or global defaults
    SELECT * INTO v_settings
    FROM payment_settings
    WHERE operator_id = p_operator_id OR operator_id IS NULL
    ORDER BY operator_id NULLS LAST
    LIMIT 1;

    -- Calculate fee
    v_fee := (p_amount * v_settings.card_processing_percentage / 100) + v_settings.card_processing_flat_fee;

    RETURN COALESCE(ROUND(v_fee, 2), 0);
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate suggested tips
CREATE OR REPLACE FUNCTION get_suggested_tips(
    p_amount DECIMAL(10,2),
    p_operator_id INTEGER DEFAULT NULL
) RETURNS TABLE(
    percentage DECIMAL(5,2),
    amount DECIMAL(10,2)
) AS $$
DECLARE
    v_settings payment_settings%ROWTYPE;
BEGIN
    -- Get operator settings or global defaults
    SELECT * INTO v_settings
    FROM payment_settings
    WHERE payment_settings.operator_id = p_operator_id OR payment_settings.operator_id IS NULL
    ORDER BY payment_settings.operator_id NULLS LAST
    LIMIT 1;

    -- Return suggested tips
    RETURN QUERY
    SELECT
        tip_pct,
        ROUND(p_amount * tip_pct / 100, 2) as tip_amount
    FROM unnest(v_settings.suggested_tip_percentages) as tip_pct
    ORDER BY tip_pct;
END;
$$ LANGUAGE plpgsql;

-- Create view for invoice summaries with fee breakdown
CREATE OR REPLACE VIEW invoice_fee_breakdown AS
SELECT
    i.id,
    i.invoice_number,
    i.subtotal,
    i.gratuity,
    i.processing_fee,
    i.processing_fee_covered_by_customer,
    i.tax_amount,
    i.total_amount,
    i.status,
    -- Calculated fields
    CASE WHEN i.processing_fee_covered_by_customer
         THEN i.processing_fee
         ELSE 0
    END as customer_paid_fee,
    CASE WHEN i.processing_fee_covered_by_customer
         THEN 0
         ELSE i.processing_fee
    END as business_absorbed_fee,
    i.subtotal + COALESCE(i.gratuity, 0) as amount_before_fees,
    i.created_at,
    i.updated_at
FROM invoices i;

-- Add comments
COMMENT ON COLUMN invoices.processing_fee IS 'Credit card processing fee calculated at payment time';
COMMENT ON COLUMN invoices.processing_fee_covered_by_customer IS 'Whether customer opted to cover the processing fee';
COMMENT ON COLUMN invoices.tip_type IS 'How tip was specified: percentage, fixed, or none';
COMMENT ON COLUMN invoices.tip_percentage IS 'Tip percentage if tip_type is percentage';

COMMENT ON TABLE payment_settings IS 'Configurable payment and tipping settings per operator';
COMMENT ON FUNCTION calculate_processing_fee IS 'Calculate processing fee based on operator settings';
COMMENT ON FUNCTION get_suggested_tips IS 'Get suggested tip amounts based on operator settings';
