-- Migration: Additional Services Management
-- Date: November 2, 2025
-- Purpose: Allow admins to manage additional services through the dashboard

-- Create additional_services table
CREATE TABLE IF NOT EXISTS additional_services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  icon VARCHAR(50) DEFAULT '✨',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active services
CREATE INDEX IF NOT EXISTS idx_additional_services_active ON additional_services(is_active);
CREATE INDEX IF NOT EXISTS idx_additional_services_display_order ON additional_services(display_order);

-- Insert Photography Package as the default
INSERT INTO additional_services (name, description, price, is_active, display_order, icon)
VALUES 
  ('Photography Package', 'Professional photos throughout your tour', 150.00, TRUE, 1, '📸')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_additional_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER additional_services_updated_at_trigger
  BEFORE UPDATE ON additional_services
  FOR EACH ROW
  EXECUTE FUNCTION update_additional_services_updated_at();

-- Add additional_services field to proposals table (JSONB for selected services)
ALTER TABLE proposals 
  ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '[]'::jsonb;

COMMENT ON TABLE additional_services IS 'Admin-managed additional services that can be added to proposals';
COMMENT ON COLUMN proposals.additional_services IS 'Array of selected additional services with quantities: [{service_id, name, price, quantity}]';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Additional Services management system created successfully!';
END $$;

