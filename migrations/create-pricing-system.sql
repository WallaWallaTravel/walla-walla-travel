/**
 * Dynamic Pricing System
 * Centralized pricing with history, modifiers, and seasonal variations
 */

-- Pricing Tiers (Base Rates)
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id SERIAL PRIMARY KEY,
  
  -- Service Definition
  service_type VARCHAR(50) NOT NULL, -- 'wine_tour', 'airport_transfer', 'local_transfer', 'wait_time', 'custom'
  tier_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Applicability Rules
  party_size_min INT NOT NULL DEFAULT 1,
  party_size_max INT NOT NULL DEFAULT 14,
  day_type VARCHAR(20), -- 'weekday', 'weekend', 'holiday', 'any'
  season VARCHAR(20) DEFAULT 'standard', -- 'standard', 'peak', 'off'
  
  -- Pricing Structure
  pricing_model VARCHAR(20) NOT NULL, -- 'hourly', 'flat', 'per_mile', 'per_person'
  base_rate DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  per_person_rate DECIMAL(10,2),
  per_mile_rate DECIMAL(10,2),
  minimum_charge DECIMAL(10,2),
  
  -- Date Range
  effective_start_date DATE,
  effective_end_date DATE,
  
  -- Status
  active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- Higher priority = used first when multiple match
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT, -- Admin user ID
  notes TEXT
);

-- Indexes for fast lookups
CREATE INDEX idx_pricing_tiers_service ON pricing_tiers(service_type, active);
CREATE INDEX idx_pricing_tiers_dates ON pricing_tiers(effective_start_date, effective_end_date);
CREATE INDEX idx_pricing_tiers_party_size ON pricing_tiers(party_size_min, party_size_max);

-- Pricing Modifiers (Discounts, Surcharges, etc.)
CREATE TABLE IF NOT EXISTS pricing_modifiers (
  id SERIAL PRIMARY KEY,
  
  -- Modifier Definition
  name VARCHAR(100) NOT NULL,
  description TEXT,
  modifier_type VARCHAR(50) NOT NULL, -- 'discount', 'surcharge', 'seasonal', 'early_bird', 'volume'
  
  -- Value
  value_type VARCHAR(20) NOT NULL, -- 'percentage', 'flat_amount'
  value DECIMAL(10,2) NOT NULL,
  
  -- Applicability
  applies_to_service_types TEXT[], -- ['wine_tour', 'transfer'] or NULL for all
  applies_to_tier_ids INT[], -- Specific tiers, or NULL for all
  
  -- Conditions
  min_party_size INT,
  max_party_size INT,
  min_advance_days INT, -- Early bird: book 30+ days ahead
  min_booking_amount DECIMAL(10,2), -- Minimum order value
  
  -- Date Range
  effective_start_date DATE,
  effective_end_date DATE,
  
  -- Days of Week (for recurring modifiers)
  applies_monday BOOLEAN DEFAULT true,
  applies_tuesday BOOLEAN DEFAULT true,
  applies_wednesday BOOLEAN DEFAULT true,
  applies_thursday BOOLEAN DEFAULT true,
  applies_friday BOOLEAN DEFAULT true,
  applies_saturday BOOLEAN DEFAULT true,
  applies_sunday BOOLEAN DEFAULT true,
  
  -- Status
  active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- Order of application
  is_stackable BOOLEAN DEFAULT true, -- Can combine with other modifiers
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT,
  notes TEXT
);

CREATE INDEX idx_pricing_modifiers_active ON pricing_modifiers(active);
CREATE INDEX idx_pricing_modifiers_dates ON pricing_modifiers(effective_start_date, effective_end_date);

-- Pricing History (Audit Trail)
CREATE TABLE IF NOT EXISTS pricing_history (
  id SERIAL PRIMARY KEY,
  
  -- What Changed
  table_name VARCHAR(50) NOT NULL, -- 'pricing_tiers' or 'pricing_modifiers'
  record_id INT NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted'
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,
  
  -- Who & When
  changed_by INT,
  changed_by_name VARCHAR(255),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);

CREATE INDEX idx_pricing_history_record ON pricing_history(table_name, record_id);
CREATE INDEX idx_pricing_history_date ON pricing_history(changed_at);

-- Pricing Calculations Cache (for performance)
CREATE TABLE IF NOT EXISTS pricing_cache (
  id SERIAL PRIMARY KEY,
  
  -- Request Parameters (hashed for lookup)
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  party_size INT NOT NULL,
  service_date DATE NOT NULL,
  duration_hours DECIMAL(5,2),
  miles DECIMAL(8,2),
  
  -- Calculated Result
  base_rate DECIMAL(10,2) NOT NULL,
  applied_modifiers JSONB,
  final_price DECIMAL(10,2) NOT NULL,
  breakdown JSONB,
  
  -- Cache Management
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INT DEFAULT 0
);

CREATE INDEX idx_pricing_cache_key ON pricing_cache(cache_key);
CREATE INDEX idx_pricing_cache_expires ON pricing_cache(expires_at);

-- Function to log pricing changes
CREATE OR REPLACE FUNCTION log_pricing_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO pricing_history (table_name, record_id, action, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'created', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO pricing_history (table_name, record_id, action, old_values, new_values, change_summary)
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      'updated',
      row_to_json(OLD),
      row_to_json(NEW),
      'Updated pricing record'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO pricing_history (table_name, record_id, action, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'deleted', row_to_json(OLD));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit trail
CREATE TRIGGER pricing_tiers_audit
  AFTER INSERT OR UPDATE OR DELETE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION log_pricing_change();

CREATE TRIGGER pricing_modifiers_audit
  AFTER INSERT OR UPDATE OR DELETE ON pricing_modifiers
  FOR EACH ROW EXECUTE FUNCTION log_pricing_change();

-- Insert default pricing tiers (migrating from rate-config.ts)
INSERT INTO pricing_tiers (
  service_type, tier_name, description,
  party_size_min, party_size_max, day_type,
  pricing_model, hourly_rate, minimum_charge,
  active, priority
) VALUES
-- Wine Tour Hourly Rates (Weekday)
('wine_tour', '1 Guest Weekday', 'Private tour for 1 guest', 1, 1, 'weekday', 'hourly', 125.00, 125.00, true, 100),
('wine_tour', '2 Guests Weekday', 'Private tour for 2 guests', 2, 2, 'weekday', 'hourly', 135.00, 135.00, true, 100),
('wine_tour', '3 Guests Weekday', 'Private tour for 3 guests', 3, 3, 'weekday', 'hourly', 145.00, 145.00, true, 100),
('wine_tour', '4 Guests Weekday', 'Private tour for 4 guests', 4, 4, 'weekday', 'hourly', 155.00, 155.00, true, 100),
('wine_tour', '5 Guests Weekday', 'Private tour for 5 guests', 5, 5, 'weekday', 'hourly', 165.00, 165.00, true, 100),
('wine_tour', '6 Guests Weekday', 'Private tour for 6 guests', 6, 6, 'weekday', 'hourly', 175.00, 175.00, true, 100),
('wine_tour', '7 Guests Weekday', 'Private tour for 7 guests', 7, 7, 'weekday', 'hourly', 185.00, 185.00, true, 100),
('wine_tour', '8-14 Guests Weekday', 'Private tour for 8-14 guests', 8, 14, 'weekday', 'hourly', 195.00, 195.00, true, 100),

-- Wine Tour Hourly Rates (Weekend)
('wine_tour', '1 Guest Weekend', 'Private tour for 1 guest', 1, 1, 'weekend', 'hourly', 135.00, 135.00, true, 100),
('wine_tour', '2 Guests Weekend', 'Private tour for 2 guests', 2, 2, 'weekend', 'hourly', 145.00, 145.00, true, 100),
('wine_tour', '3 Guests Weekend', 'Private tour for 3 guests', 3, 3, 'weekend', 'hourly', 155.00, 155.00, true, 100),
('wine_tour', '4 Guests Weekend', 'Private tour for 4 guests', 4, 4, 'weekend', 'hourly', 165.00, 165.00, true, 100),
('wine_tour', '5 Guests Weekend', 'Private tour for 5 guests', 5, 5, 'weekend', 'hourly', 175.00, 175.00, true, 100),
('wine_tour', '6 Guests Weekend', 'Private tour for 6 guests', 6, 6, 'weekend', 'hourly', 185.00, 185.00, true, 100),
('wine_tour', '7 Guests Weekend', 'Private tour for 7 guests', 7, 7, 'weekend', 'hourly', 195.00, 195.00, true, 100),
('wine_tour', '8-14 Guests Weekend', 'Private tour for 8-14 guests', 8, 14, 'weekend', 'hourly', 205.00, 205.00, true, 100),

-- Airport Transfers
('airport_transfer', 'SeaTac to Walla Walla', 'Airport transfer from SeaTac', 1, 14, 'any', 'flat', 550.00, 550.00, true, 100),
('airport_transfer', 'Walla Walla to SeaTac', 'Airport transfer to SeaTac', 1, 14, 'any', 'flat', 550.00, 550.00, true, 100),
('airport_transfer', 'Pasco to Walla Walla', 'Airport transfer from Pasco', 1, 14, 'any', 'flat', 175.00, 175.00, true, 100),
('airport_transfer', 'Walla Walla to Pasco', 'Airport transfer to Pasco', 1, 14, 'any', 'flat', 175.00, 175.00, true, 100),

-- Wait Time
('wait_time', 'Wait Time Hourly', 'Hourly wait time charge', 1, 14, 'any', 'hourly', 65.00, 65.00, true, 100);

-- Insert default modifiers
INSERT INTO pricing_modifiers (
  name, description, modifier_type, value_type, value,
  applies_to_service_types, min_advance_days, active, priority, is_stackable
) VALUES
('Early Bird Discount', 'Book 30+ days in advance', 'early_bird', 'percentage', 5.00, ARRAY['wine_tour'], 30, true, 10, true),
('Peak Season Surcharge', 'Summer peak season', 'seasonal', 'percentage', 15.00, NULL, NULL, false, 20, true),
('Off Season Discount', 'Winter off-season', 'seasonal', 'percentage', 10.00, NULL, NULL, false, 20, true),
('Large Group Discount', '10+ guests volume discount', 'volume', 'percentage', 10.00, ARRAY['wine_tour'], NULL, true, 15, true),
('Holiday Surcharge', 'Major holidays', 'surcharge', 'percentage', 25.00, NULL, NULL, false, 30, false);

-- Add constraints
ALTER TABLE pricing_tiers ADD CONSTRAINT check_party_size 
  CHECK (party_size_min <= party_size_max);

ALTER TABLE pricing_tiers ADD CONSTRAINT check_dates 
  CHECK (effective_start_date IS NULL OR effective_end_date IS NULL OR effective_start_date <= effective_end_date);

COMMENT ON TABLE pricing_tiers IS 'Centralized pricing configuration with tier-based rates';
COMMENT ON TABLE pricing_modifiers IS 'Pricing modifiers (discounts, surcharges, seasonal adjustments)';
COMMENT ON TABLE pricing_history IS 'Audit trail for all pricing changes';
COMMENT ON TABLE pricing_cache IS 'Performance cache for frequently calculated prices';

