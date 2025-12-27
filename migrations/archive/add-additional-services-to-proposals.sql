-- Migration: Add additional_services column to proposals table
-- Description: Stores selected additional services with quantities
-- Date: 2025-11-02

ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN proposals.additional_services IS 'Array of {service_id, quantity} for additional services';

