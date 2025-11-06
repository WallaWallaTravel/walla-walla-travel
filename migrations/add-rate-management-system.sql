-- Migration: Add Rate Management System
-- Description: Creates tables for managing pricing rates globally
-- Date: 2025-11-02

-- Create rate_config table to store all pricing configurations
CREATE TABLE IF NOT EXISTS rate_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  last_updated_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_config_key ON rate_config(config_key);

-- Insert default wine tour rates
INSERT INTO rate_config (config_key, config_value, description) VALUES
('wine_tours', '{
  "minimum_hours": 5,
  "base_rate": 125,
  "per_person_charge": 15,
  "per_person_threshold": 4,
  "weekend_multiplier": 1.2,
  "holiday_multiplier": 1.5
}'::jsonb, 'Wine tour pricing configuration'),

('transfers', '{
  "seatac_to_walla": 650,
  "walla_to_seatac": 650,
  "pasco_to_walla": 175,
  "walla_to_pasco": 175,
  "local_base": 75,
  "local_per_mile": 2.5
}'::jsonb, 'Transfer pricing configuration'),

('wait_time', '{
  "hourly_rate": 75,
  "minimum_hours": 1
}'::jsonb, 'Wait time pricing configuration'),

('deposits_and_fees', '{
  "deposit_percentage": 25,
  "tax_rate": 0.089,
  "cancellation_days": 14,
  "cancellation_fee_percentage": 50
}'::jsonb, 'Deposit, tax, and fee configuration'),

('gratuity', '{
  "default_percentage": 18,
  "quick_select_options": [15, 18, 20, 25]
}'::jsonb, 'Gratuity configuration');

-- Create rate_change_log table to track pricing changes
CREATE TABLE IF NOT EXISTS rate_change_log (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by VARCHAR(255),
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit trail
CREATE INDEX IF NOT EXISTS idx_rate_change_log_key ON rate_change_log(config_key);
CREATE INDEX IF NOT EXISTS idx_rate_change_log_date ON rate_change_log(changed_at DESC);

COMMENT ON TABLE rate_config IS 'Stores all pricing rate configurations for the system';
COMMENT ON TABLE rate_change_log IS 'Audit log for all rate changes';

