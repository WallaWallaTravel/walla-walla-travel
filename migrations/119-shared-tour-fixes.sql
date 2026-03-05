-- Migration 119: Shared Tour Integration Fixes
-- 1. Fix tax rate from 8.9% to 9.1% in SQL functions/views
-- 2. Add shared_tour_ticket_id cross-reference column to trip_proposal_guests

-- ============================================================
-- 1. Recreate shared_tour_tickets view with correct 9.1% tax
-- ============================================================

CREATE OR REPLACE VIEW shared_tour_tickets AS
SELECT
    id,
    shared_tour_id AS tour_id,
    ticket_number,
    guest_count AS ticket_count,
    primary_guest_name AS customer_name,
    primary_guest_email AS customer_email,
    primary_guest_phone AS customer_phone,
    additional_guests AS guest_names_json,
    lunch_included AS includes_lunch,
    price_per_person,
    total_price AS subtotal,
    ROUND(total_price * 0.091, 2) AS tax_amount,
    ROUND(total_price * 1.091, 2) AS total_amount,
    payment_status,
    NULL AS payment_method,
    payment_intent_id AS stripe_payment_intent_id,
    CASE WHEN payment_status = 'paid' THEN updated_at ELSE NULL END AS paid_at,
    status,
    checked_in_at AS check_in_at,
    cancelled_at,
    cancellation_reason,
    NULL AS refund_amount,
    dietary_restrictions,
    special_requests,
    NULL AS referral_source,
    NULL AS promo_code,
    created_at,
    updated_at
FROM shared_tours_tickets;

-- ============================================================
-- 2. Recreate calculate_ticket_price with correct 9.1% tax
-- ============================================================

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
    v_tax_rate DECIMAL(5, 4) := 0.091;  -- 9.1% tax
    v_price_per DECIMAL(10, 2);
    v_subtotal DECIMAL(10, 2);
    v_tax DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
BEGIN
    SELECT st.price_per_person INTO v_base_price
    FROM shared_tours st
    WHERE st.id = p_tour_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tour not found';
    END IF;

    v_price_per := v_base_price;
    IF p_includes_lunch THEN
        v_price_per := v_price_per + v_lunch_surcharge;
    END IF;

    v_subtotal := v_price_per * p_ticket_count;
    v_tax := ROUND(v_subtotal * v_tax_rate, 2);
    v_total := v_subtotal + v_tax;

    RETURN QUERY SELECT v_price_per, v_subtotal, v_tax, v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Update default tax rate on trip_proposals table
-- ============================================================

ALTER TABLE trip_proposals
  ALTER COLUMN tax_rate SET DEFAULT 0.091;

-- ============================================================
-- 4. Add shared_tour_ticket_id cross-reference column
-- ============================================================

ALTER TABLE trip_proposal_guests
  ADD COLUMN IF NOT EXISTS shared_tour_ticket_id INTEGER REFERENCES shared_tours_tickets(id);

CREATE INDEX IF NOT EXISTS idx_tpg_shared_tour_ticket
  ON trip_proposal_guests(shared_tour_ticket_id);
