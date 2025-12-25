-- ============================================================================
-- PER-PERSON FIXED RATE PRICING SYSTEM
-- ============================================================================
-- Adds support for per-person pricing on invoices
-- Enables line-item based invoicing with different rate types
-- ============================================================================

-- 1. Create invoice_line_items table
-- This table stores individual line items for invoices, supporting:
-- - Fixed rates (base price)
-- - Per-person rates (price × guest count)
-- - Per-hour rates (price × hours)
-- - Per-day rates (price × days for multi-day tours)
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,

    -- Line item description
    description TEXT NOT NULL,
    category VARCHAR(50), -- 'base_tour', 'additional_guest', 'add_on', 'discount', 'processing_fee', 'tip'

    -- Rate type and calculation
    rate_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- 'fixed', 'per_person', 'per_hour', 'per_day'
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1, -- For per_person: guest count; per_hour: hours; per_day: days

    -- Calculated fields (stored for performance, validated by trigger)
    line_total DECIMAL(10,2) NOT NULL,

    -- For per-person rates, track included vs additional
    included_in_base INTEGER DEFAULT 0, -- How many guests are included in base price

    -- Taxability
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,3) DEFAULT 0.089, -- WA state tax
    tax_amount DECIMAL(10,2) DEFAULT 0,

    -- Display order and grouping
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true, -- Can hide internal calculations

    -- Metadata
    source_pricing_rule_id INTEGER, -- Reference to pricing_rules if applicable
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_category ON invoice_line_items(category);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_display_order ON invoice_line_items(display_order);

-- 2. Create pricing_templates table for reusable pricing configurations
CREATE TABLE IF NOT EXISTS pricing_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Template type
    service_type VARCHAR(50), -- 'wine_tour', 'airport_transfer', 'custom'
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Base pricing
    base_price DECIMAL(10,2) NOT NULL,
    base_guests_included INTEGER DEFAULT 4, -- How many guests included in base price

    -- Per-person pricing (for guests beyond base)
    per_person_rate DECIMAL(10,2) DEFAULT 0,
    max_guests INTEGER DEFAULT 14,

    -- Duration-based pricing
    base_hours DECIMAL(5,2) DEFAULT 6,
    per_hour_rate DECIMAL(10,2) DEFAULT 0,

    -- Day of week modifiers
    weekend_surcharge_type VARCHAR(20) DEFAULT 'percentage', -- 'fixed' or 'percentage'
    weekend_surcharge_value DECIMAL(10,2) DEFAULT 15, -- 15% or $15
    applies_friday BOOLEAN DEFAULT true,
    applies_saturday BOOLEAN DEFAULT true,
    applies_sunday BOOLEAN DEFAULT true,

    -- Holiday modifier
    holiday_surcharge_type VARCHAR(20) DEFAULT 'percentage',
    holiday_surcharge_value DECIMAL(10,2) DEFAULT 25,

    -- Large group discount
    large_group_threshold INTEGER DEFAULT 10,
    large_group_discount_type VARCHAR(20) DEFAULT 'percentage',
    large_group_discount_value DECIMAL(10,2) DEFAULT 10,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_templates_service ON pricing_templates(service_type);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_active ON pricing_templates(is_active);

-- 3. Add line_items_enabled flag to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS uses_line_items BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_template_id INTEGER REFERENCES pricing_templates(id);

-- 4. Create function to calculate line item total
CREATE OR REPLACE FUNCTION calculate_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate line total based on rate type
    NEW.line_total := CASE NEW.rate_type
        WHEN 'fixed' THEN NEW.unit_price
        WHEN 'per_person' THEN NEW.unit_price * GREATEST(0, NEW.quantity - COALESCE(NEW.included_in_base, 0))
        WHEN 'per_hour' THEN NEW.unit_price * NEW.quantity
        WHEN 'per_day' THEN NEW.unit_price * NEW.quantity
        ELSE NEW.unit_price * NEW.quantity
    END;

    -- Calculate tax if taxable
    IF NEW.is_taxable AND NEW.tax_rate > 0 THEN
        NEW.tax_amount := ROUND(NEW.line_total * NEW.tax_rate, 2);
    ELSE
        NEW.tax_amount := 0;
    END IF;

    -- Update timestamp
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_line_item_total ON invoice_line_items;
CREATE TRIGGER trigger_calculate_line_item_total
    BEFORE INSERT OR UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_line_item_total();

-- 5. Create function to update invoice totals from line items
CREATE OR REPLACE FUNCTION update_invoice_from_line_items()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id INTEGER;
    v_subtotal DECIMAL(10,2);
    v_tax_total DECIMAL(10,2);
    v_tip_total DECIMAL(10,2);
    v_processing_fee DECIMAL(10,2);
    v_grand_total DECIMAL(10,2);
BEGIN
    -- Get the invoice_id
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate subtotal (excluding tips and processing fees)
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id
    AND category NOT IN ('tip', 'processing_fee');

    -- Calculate tax total
    SELECT COALESCE(SUM(tax_amount), 0)
    INTO v_tax_total
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Get tip total (category = 'tip')
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_tip_total
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id
    AND category = 'tip';

    -- Get processing fee total (category = 'processing_fee')
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_processing_fee
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id
    AND category = 'processing_fee';

    -- Calculate grand total
    v_grand_total := v_subtotal + v_tax_total + v_tip_total + v_processing_fee;

    -- Update the invoice if it uses line items
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_total,
        tip_amount = v_tip_total,
        processing_fee = v_processing_fee,
        total_amount = v_grand_total,
        updated_at = NOW()
    WHERE id = v_invoice_id
    AND uses_line_items = true;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_from_line_items ON invoice_line_items;
CREATE TRIGGER trigger_update_invoice_from_line_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_from_line_items();

-- 6. Create function to generate line items from booking
CREATE OR REPLACE FUNCTION generate_invoice_line_items(
    p_invoice_id INTEGER,
    p_template_id INTEGER DEFAULT NULL,
    p_guest_count INTEGER DEFAULT 4,
    p_duration_hours DECIMAL DEFAULT 6,
    p_tour_date DATE DEFAULT CURRENT_DATE,
    p_include_tip BOOLEAN DEFAULT false,
    p_tip_percentage DECIMAL DEFAULT 20.00
) RETURNS VOID AS $$
DECLARE
    v_template pricing_templates%ROWTYPE;
    v_base_price DECIMAL(10,2);
    v_per_person_total DECIMAL(10,2);
    v_extra_hours_total DECIMAL(10,2);
    v_weekend_surcharge DECIMAL(10,2);
    v_holiday_surcharge DECIMAL(10,2);
    v_large_group_discount DECIMAL(10,2);
    v_subtotal DECIMAL(10,2);
    v_tip_amount DECIMAL(10,2);
    v_day_of_week INTEGER;
    v_is_weekend BOOLEAN;
    v_is_holiday BOOLEAN;
    v_additional_guests INTEGER;
    v_extra_hours DECIMAL(5,2);
    v_line_order INTEGER := 0;
BEGIN
    -- Get template or use defaults
    IF p_template_id IS NOT NULL THEN
        SELECT * INTO v_template FROM pricing_templates WHERE id = p_template_id AND is_active = true;
    END IF;

    IF v_template IS NULL THEN
        -- Use default template
        SELECT * INTO v_template FROM pricing_templates WHERE is_default = true AND is_active = true LIMIT 1;
    END IF;

    IF v_template IS NULL THEN
        RAISE EXCEPTION 'No valid pricing template found';
    END IF;

    -- Mark invoice as using line items and set template
    UPDATE invoices SET uses_line_items = true, pricing_template_id = v_template.id WHERE id = p_invoice_id;

    -- Clear any existing line items
    DELETE FROM invoice_line_items WHERE invoice_id = p_invoice_id;

    -- Determine day of week and modifiers
    v_day_of_week := EXTRACT(DOW FROM p_tour_date);
    v_is_weekend := (v_day_of_week = 0 AND v_template.applies_sunday) OR
                    (v_day_of_week = 5 AND v_template.applies_friday) OR
                    (v_day_of_week = 6 AND v_template.applies_saturday);
    v_is_holiday := false; -- TODO: Check holiday table

    -- Calculate additional guests
    v_additional_guests := GREATEST(0, p_guest_count - v_template.base_guests_included);

    -- Calculate extra hours
    v_extra_hours := GREATEST(0, p_duration_hours - v_template.base_hours);

    -- 1. Base tour price
    v_base_price := v_template.base_price;
    v_line_order := v_line_order + 1;
    INSERT INTO invoice_line_items (
        invoice_id, description, category, rate_type, unit_price, quantity, line_total,
        included_in_base, display_order, notes
    ) VALUES (
        p_invoice_id,
        format('%s-Hour Wine Tour (up to %s guests)', v_template.base_hours::INTEGER, v_template.base_guests_included),
        'base_tour',
        'fixed',
        v_base_price,
        1,
        v_base_price,
        0,
        v_line_order,
        'Base tour package'
    );

    -- 2. Per-person rate for additional guests
    IF v_additional_guests > 0 AND v_template.per_person_rate > 0 THEN
        v_per_person_total := v_additional_guests * v_template.per_person_rate;
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            included_in_base, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Additional Guests (%s × $%s/person)', v_additional_guests, v_template.per_person_rate),
            'additional_guest',
            'per_person',
            v_template.per_person_rate,
            p_guest_count,
            v_per_person_total,
            v_template.base_guests_included,
            v_line_order,
            format('For guests %s through %s', v_template.base_guests_included + 1, p_guest_count)
        );
    END IF;

    -- 3. Extra hours
    IF v_extra_hours > 0 AND v_template.per_hour_rate > 0 THEN
        v_extra_hours_total := v_extra_hours * v_template.per_hour_rate;
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Additional Hours (%s × $%s/hour)', v_extra_hours, v_template.per_hour_rate),
            'add_on',
            'per_hour',
            v_template.per_hour_rate,
            v_extra_hours::INTEGER,
            v_extra_hours_total,
            v_line_order,
            format('Extended tour beyond %s hours', v_template.base_hours::INTEGER)
        );
    END IF;

    -- 4. Weekend surcharge
    IF v_is_weekend THEN
        v_line_order := v_line_order + 1;
        IF v_template.weekend_surcharge_type = 'percentage' THEN
            v_weekend_surcharge := v_base_price * (v_template.weekend_surcharge_value / 100);
            INSERT INTO invoice_line_items (
                invoice_id, description, category, rate_type, unit_price, quantity, line_total,
                display_order, notes
            ) VALUES (
                p_invoice_id,
                format('Weekend Rate (+%s%%)', v_template.weekend_surcharge_value::INTEGER),
                'add_on',
                'fixed',
                v_weekend_surcharge,
                1,
                v_weekend_surcharge,
                v_line_order,
                'Premium pricing for weekend dates'
            );
        ELSE
            v_weekend_surcharge := v_template.weekend_surcharge_value;
            INSERT INTO invoice_line_items (
                invoice_id, description, category, rate_type, unit_price, quantity, line_total,
                display_order, notes
            ) VALUES (
                p_invoice_id,
                'Weekend Rate',
                'add_on',
                'fixed',
                v_weekend_surcharge,
                1,
                v_weekend_surcharge,
                v_line_order,
                'Flat fee for weekend dates'
            );
        END IF;
    END IF;

    -- 5. Large group discount
    IF p_guest_count >= v_template.large_group_threshold AND v_template.large_group_discount_value > 0 THEN
        -- Calculate subtotal so far
        SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
        FROM invoice_line_items WHERE invoice_id = p_invoice_id;

        v_line_order := v_line_order + 1;
        IF v_template.large_group_discount_type = 'percentage' THEN
            v_large_group_discount := v_subtotal * (v_template.large_group_discount_value / 100);
            INSERT INTO invoice_line_items (
                invoice_id, description, category, rate_type, unit_price, quantity, line_total,
                is_taxable, display_order, notes
            ) VALUES (
                p_invoice_id,
                format('Large Group Discount (%s+ guests, -%s%%)', v_template.large_group_threshold, v_template.large_group_discount_value::INTEGER),
                'discount',
                'fixed',
                -v_large_group_discount,
                1,
                -v_large_group_discount,
                false,
                v_line_order,
                'Volume discount for large parties'
            );
        ELSE
            v_large_group_discount := v_template.large_group_discount_value;
            INSERT INTO invoice_line_items (
                invoice_id, description, category, rate_type, unit_price, quantity, line_total,
                is_taxable, display_order, notes
            ) VALUES (
                p_invoice_id,
                format('Large Group Discount (%s+ guests)', v_template.large_group_threshold),
                'discount',
                'fixed',
                -v_large_group_discount,
                1,
                -v_large_group_discount,
                false,
                v_line_order,
                'Flat discount for large parties'
            );
        END IF;
    END IF;

    -- 6. Optional tip
    IF p_include_tip AND p_tip_percentage > 0 THEN
        -- Recalculate subtotal
        SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
        FROM invoice_line_items WHERE invoice_id = p_invoice_id AND category != 'processing_fee';

        v_tip_amount := v_subtotal * (p_tip_percentage / 100);
        v_line_order := v_line_order + 1;
        INSERT INTO invoice_line_items (
            invoice_id, description, category, rate_type, unit_price, quantity, line_total,
            is_taxable, display_order, notes
        ) VALUES (
            p_invoice_id,
            format('Gratuity (%s%%)', p_tip_percentage::INTEGER),
            'tip',
            'fixed',
            v_tip_amount,
            1,
            v_tip_amount,
            false,
            v_line_order,
            'Driver gratuity'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Insert default pricing templates
INSERT INTO pricing_templates (
    name, description, service_type, is_default, is_active,
    base_price, base_guests_included, per_person_rate, max_guests,
    base_hours, per_hour_rate,
    weekend_surcharge_type, weekend_surcharge_value,
    applies_friday, applies_saturday, applies_sunday,
    large_group_threshold, large_group_discount_type, large_group_discount_value
) VALUES
(
    'Standard Wine Tour - 6 Hours',
    'Full day wine tasting tour with up to 4 guests included',
    'wine_tour',
    true,
    true,
    900.00,  -- Base price
    4,       -- Base guests included
    50.00,   -- Per person rate for additional guests
    14,      -- Max guests
    6.00,    -- Base hours
    150.00,  -- Per hour rate for extra hours
    'percentage',
    15.00,   -- 15% weekend surcharge
    true, true, true,
    10,      -- Large group threshold
    'percentage',
    10.00    -- 10% large group discount
),
(
    'Half Day Wine Tour - 4 Hours',
    'Afternoon wine tasting tour with up to 4 guests included',
    'wine_tour',
    false,
    true,
    600.00,
    4,
    50.00,
    14,
    4.00,
    150.00,
    'percentage',
    15.00,
    true, true, true,
    10,
    'percentage',
    10.00
),
(
    'Extended Wine Tour - 8 Hours',
    'Full day wine experience with up to 4 guests included',
    'wine_tour',
    false,
    true,
    1200.00,
    4,
    50.00,
    14,
    8.00,
    150.00,
    'percentage',
    15.00,
    true, true, true,
    10,
    'percentage',
    10.00
),
(
    'Airport Transfer - SEA',
    'One-way transfer to/from Seattle-Tacoma International',
    'airport_transfer',
    false,
    true,
    350.00,
    4,
    25.00,
    8,
    0.00,
    0.00,
    'fixed',
    50.00,
    true, true, true,
    0,
    'fixed',
    0.00
),
(
    'Airport Transfer - PDX',
    'One-way transfer to/from Portland International',
    'airport_transfer',
    false,
    true,
    450.00,
    4,
    25.00,
    8,
    0.00,
    0.00,
    'fixed',
    50.00,
    true, true, true,
    0,
    'fixed',
    0.00
)
ON CONFLICT DO NOTHING;

-- 8. Create view for invoice line item summaries
CREATE OR REPLACE VIEW invoice_line_item_summary AS
SELECT
    i.id as invoice_id,
    i.invoice_number,
    i.uses_line_items,
    pt.name as pricing_template,

    -- Line item counts by category
    COUNT(*) FILTER (WHERE ili.category = 'base_tour') as base_tour_items,
    COUNT(*) FILTER (WHERE ili.category = 'additional_guest') as additional_guest_items,
    COUNT(*) FILTER (WHERE ili.category = 'add_on') as add_on_items,
    COUNT(*) FILTER (WHERE ili.category = 'discount') as discount_items,

    -- Totals by category
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'base_tour'), 0) as base_tour_total,
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'additional_guest'), 0) as additional_guest_total,
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'add_on'), 0) as add_on_total,
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'discount'), 0) as discount_total,
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'tip'), 0) as tip_total,
    COALESCE(SUM(ili.line_total) FILTER (WHERE ili.category = 'processing_fee'), 0) as processing_fee_total,

    -- Tax total
    COALESCE(SUM(ili.tax_amount), 0) as tax_total,

    -- Grand total
    COALESCE(SUM(ili.line_total), 0) + COALESCE(SUM(ili.tax_amount), 0) as calculated_total,

    i.total_amount as invoice_total,
    i.status,
    i.created_at
FROM invoices i
LEFT JOIN invoice_line_items ili ON ili.invoice_id = i.id
LEFT JOIN pricing_templates pt ON pt.id = i.pricing_template_id
WHERE i.uses_line_items = true
GROUP BY i.id, i.invoice_number, i.uses_line_items, pt.name, i.total_amount, i.status, i.created_at;

-- 9. Add comments
COMMENT ON TABLE invoice_line_items IS 'Individual line items for invoices, supporting per-person and other rate types';
COMMENT ON TABLE pricing_templates IS 'Reusable pricing configurations for different service types';
COMMENT ON COLUMN invoice_line_items.rate_type IS 'How the line item is calculated: fixed, per_person, per_hour, per_day';
COMMENT ON COLUMN invoice_line_items.included_in_base IS 'For per_person rates, how many are already included in base price';
COMMENT ON FUNCTION generate_invoice_line_items IS 'Generate invoice line items from a pricing template and booking parameters';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration complete! Created:';
    RAISE NOTICE '  - invoice_line_items table';
    RAISE NOTICE '  - pricing_templates table';
    RAISE NOTICE '  - 5 default pricing templates';
    RAISE NOTICE '  - calculate_line_item_total() trigger function';
    RAISE NOTICE '  - update_invoice_from_line_items() trigger function';
    RAISE NOTICE '  - generate_invoice_line_items() helper function';
    RAISE NOTICE '  - invoice_line_item_summary view';
END $$;
