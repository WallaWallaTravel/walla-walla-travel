-- Migration: Enhance Proposals System
-- Date: November 1, 2025
-- Purpose: Add support for multiple services, flexible pricing, and gratuity options

-- Add new columns to proposals table
ALTER TABLE proposals 
  ADD COLUMN IF NOT EXISTS service_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS include_gratuity_request BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggested_gratuity_percentage DECIMAL(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS gratuity_optional BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS client_gratuity_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_gratuity_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS acceptance_step VARCHAR(50) DEFAULT 'pending'; -- 'pending', 'signed', 'gratuity_added', 'completed'

-- Add comments for documentation
COMMENT ON COLUMN proposals.service_items IS 'Array of service items with flexible pricing (wine tours, transfers, wait time, etc.)';
COMMENT ON COLUMN proposals.include_gratuity_request IS 'Whether to prompt client for gratuity during acceptance';
COMMENT ON COLUMN proposals.suggested_gratuity_percentage IS 'Admin-suggested gratuity percentage (e.g., 18.00)';
COMMENT ON COLUMN proposals.gratuity_optional IS 'Whether client can decline gratuity';
COMMENT ON COLUMN proposals.client_gratuity_amount IS 'Actual gratuity amount client chose to add';
COMMENT ON COLUMN proposals.client_gratuity_percentage IS 'Percentage client chose (if applicable)';
COMMENT ON COLUMN proposals.acceptance_step IS 'Current step in acceptance flow';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proposals_acceptance_step ON proposals(acceptance_step);
CREATE INDEX IF NOT EXISTS idx_proposals_include_gratuity ON proposals(include_gratuity_request);

-- Add activity log entries for gratuity
INSERT INTO proposal_activity_log (proposal_id, activity_type, description, created_at)
SELECT 
  id,
  'gratuity_added',
  'Client added gratuity: $' || client_gratuity_amount::text,
  NOW()
FROM proposals
WHERE client_gratuity_amount > 0 AND status = 'accepted'
ON CONFLICT DO NOTHING;

-- Example service_items structure:
-- [
--   {
--     "id": "uuid-1",
--     "service_type": "wine_tour",
--     "name": "Walla Walla Wine Tour",
--     "description": "6-hour premium wine tour",
--     "date": "2025-06-15",
--     "start_time": "10:00",
--     "duration_hours": 6,
--     "party_size": 6,
--     "pickup_location": "Downtown Hotel",
--     "pricing_type": "calculated",
--     "calculated_price": 1089.00,
--     "selected_wineries": [
--       {"id": 1, "name": "L'Ecole No 41", "city": "Walla Walla"},
--       {"id": 2, "name": "Leonetti Cellar", "city": "Walla Walla"}
--     ]
--   },
--   {
--     "id": "uuid-2",
--     "service_type": "airport_transfer",
--     "name": "Airport Pickup",
--     "description": "SeaTac to Walla Walla",
--     "date": "2025-06-15",
--     "start_time": "08:00",
--     "pickup_location": "SeaTac Airport",
--     "dropoff_location": "Downtown Hotel",
--     "pricing_type": "flat",
--     "flat_rate": 350.00,
--     "calculated_price": 350.00
--   },
--   {
--     "id": "uuid-3",
--     "service_type": "wait_time",
--     "name": "Wait Time",
--     "description": "Driver waiting time",
--     "date": "2025-06-16",
--     "duration_hours": 2,
--     "pricing_type": "hourly",
--     "hourly_rate": 75.00,
--     "calculated_price": 150.00
--   }
-- ]

-- Migration complete!

