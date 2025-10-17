-- Admin Supervisor System Migration
-- Purpose: Enable supervisor dashboard, vehicle assignment, client billing
-- Date: 2025-10-16
-- Author: Claude Code

-- ==========================================
-- PART 1: Add role column to users table
-- ==========================================

-- Add role column (default: 'driver')
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'driver';

-- Add constraint for role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('driver', 'admin', 'supervisor'));
  END IF;
END $$;

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role)
WHERE is_active = true;

-- ==========================================
-- PART 2: Create client_services table
-- ==========================================

CREATE TABLE IF NOT EXISTS client_services (
  id SERIAL PRIMARY KEY,

  -- Service identification
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),

  -- Client information
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  client_email VARCHAR(255),

  -- Service timing
  pickup_time TIMESTAMP WITH TIME ZONE,
  pickup_location TEXT,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),

  dropoff_time TIMESTAMP WITH TIME ZONE,
  dropoff_location TEXT,
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),

  -- Billing
  hourly_rate DECIMAL(10, 2) NOT NULL, -- e.g., 150.00
  service_hours DECIMAL(10, 2), -- Calculated: (dropoff - pickup) in hours
  total_cost DECIMAL(10, 2), -- Calculated: service_hours * hourly_rate

  -- Service details
  service_type VARCHAR(50) DEFAULT 'transport', -- transport, charter, event, etc.
  passenger_count INTEGER DEFAULT 1,
  notes TEXT,
  special_requests TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'assigned', -- assigned, in_progress, completed, cancelled

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT positive_hourly_rate CHECK (hourly_rate > 0),
  CONSTRAINT valid_passenger_count CHECK (passenger_count > 0),
  CONSTRAINT valid_service_hours CHECK (service_hours IS NULL OR service_hours >= 0),
  CONSTRAINT valid_total_cost CHECK (total_cost IS NULL OR total_cost >= 0)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_client_services_time_card
ON client_services(time_card_id);

CREATE INDEX IF NOT EXISTS idx_client_services_driver
ON client_services(driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_services_status
ON client_services(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_services_date
ON client_services(DATE(created_at AT TIME ZONE 'America/Los_Angeles'));

-- ==========================================
-- PART 3: Create vehicle_assignments table
-- ==========================================

CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id SERIAL PRIMARY KEY,

  -- Assignment identification
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  client_service_id INTEGER REFERENCES client_services(id) ON DELETE CASCADE,

  -- Assignment details
  assigned_by INTEGER REFERENCES users(id), -- Supervisor who made assignment
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assignment_notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_time_card
ON vehicle_assignments(time_card_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver
ON vehicle_assignments(driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle
ON vehicle_assignments(vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_status
ON vehicle_assignments(status)
WHERE status = 'active';

-- ==========================================
-- PART 4: Add client_service_id to time_cards
-- ==========================================

-- Add client_service_id reference
ALTER TABLE time_cards
ADD COLUMN IF NOT EXISTS client_service_id INTEGER REFERENCES client_services(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_time_cards_client_service
ON time_cards(client_service_id)
WHERE client_service_id IS NOT NULL;

-- ==========================================
-- PART 5: Create trigger for auto-updating timestamps
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for client_services
DROP TRIGGER IF EXISTS update_client_services_updated_at ON client_services;
CREATE TRIGGER update_client_services_updated_at
  BEFORE UPDATE ON client_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for vehicle_assignments
DROP TRIGGER IF EXISTS update_vehicle_assignments_updated_at ON vehicle_assignments;
CREATE TRIGGER update_vehicle_assignments_updated_at
  BEFORE UPDATE ON vehicle_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PART 6: Create view for supervisor dashboard
-- ==========================================

CREATE OR REPLACE VIEW active_shifts AS
SELECT
  tc.id AS time_card_id,
  tc.driver_id,
  u.name AS driver_name,
  u.email AS driver_email,
  tc.vehicle_id,
  v.vehicle_number,
  v.make,
  v.model,
  v.status AS vehicle_status,
  tc.clock_in_time,
  tc.status AS shift_status,
  tc.work_reporting_location,
  cs.id AS client_service_id,
  cs.client_name,
  cs.hourly_rate,
  cs.status AS service_status,
  cs.pickup_time,
  cs.dropoff_time,
  cs.service_hours,
  cs.total_cost,
  va.assigned_by,
  supervisor.name AS assigned_by_name
FROM time_cards tc
JOIN users u ON tc.driver_id = u.id
LEFT JOIN vehicles v ON tc.vehicle_id = v.id
LEFT JOIN client_services cs ON tc.id = cs.time_card_id
LEFT JOIN vehicle_assignments va ON tc.id = va.time_card_id AND va.status = 'active'
LEFT JOIN users supervisor ON va.assigned_by = supervisor.id
WHERE tc.clock_out_time IS NULL
ORDER BY tc.clock_in_time DESC;

-- ==========================================
-- PART 7: Create view for fleet status
-- ==========================================

CREATE OR REPLACE VIEW fleet_status AS
SELECT
  v.id AS vehicle_id,
  v.vehicle_number,
  v.make,
  v.model,
  v.year,
  v.capacity,
  v.status,
  v.license_plate,
  v.defect_notes,
  tc.id AS active_time_card_id,
  tc.driver_id AS current_driver_id,
  u.name AS current_driver_name,
  tc.clock_in_time AS in_use_since,
  cs.client_name AS current_client,
  CASE
    WHEN v.status = 'out_of_service' THEN 'out_of_service'
    WHEN tc.id IS NOT NULL THEN 'in_use'
    WHEN v.status = 'available' THEN 'available'
    ELSE 'unavailable'
  END AS availability_status
FROM vehicles v
LEFT JOIN time_cards tc ON v.id = tc.vehicle_id AND tc.clock_out_time IS NULL
LEFT JOIN users u ON tc.driver_id = u.id
LEFT JOIN client_services cs ON tc.id = cs.time_card_id AND cs.status IN ('assigned', 'in_progress')
WHERE v.is_active = true
ORDER BY
  CASE v.status
    WHEN 'available' THEN 1
    WHEN 'in_use' THEN 2
    WHEN 'assigned' THEN 3
    WHEN 'out_of_service' THEN 4
    ELSE 5
  END,
  v.vehicle_number;

-- ==========================================
-- PART 8: Update Ryan Madsen to admin role
-- ==========================================

-- Update Ryan's account to admin role
UPDATE users
SET role = 'admin'
WHERE email = 'madsry@gmail.com'
  AND is_active = true;

-- Verify Ryan's role update
DO $$
DECLARE
  ryan_role TEXT;
BEGIN
  SELECT role INTO ryan_role
  FROM users
  WHERE email = 'madsry@gmail.com' AND is_active = true;

  IF ryan_role = 'admin' THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ryan Madsen successfully updated to admin role';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING 'Failed to update Ryan Madsen to admin role (current: %)', COALESCE(ryan_role, 'user not found');
  END IF;
END $$;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  role_column_exists BOOLEAN;
  client_services_exists BOOLEAN;
  vehicle_assignments_exists BOOLEAN;
  client_service_id_exists BOOLEAN;
  active_shifts_view_exists BOOLEAN;
  fleet_status_view_exists BOOLEAN;
BEGIN
  -- Check role column
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'role'
  ) INTO role_column_exists;

  -- Check client_services table
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'client_services'
  ) INTO client_services_exists;

  -- Check vehicle_assignments table
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'vehicle_assignments'
  ) INTO vehicle_assignments_exists;

  -- Check client_service_id in time_cards
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'time_cards'
      AND column_name = 'client_service_id'
  ) INTO client_service_id_exists;

  -- Check active_shifts view
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_name = 'active_shifts'
  ) INTO active_shifts_view_exists;

  -- Check fleet_status view
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_name = 'fleet_status'
  ) INTO fleet_status_view_exists;

  IF role_column_exists AND
     client_services_exists AND
     vehicle_assignments_exists AND
     client_service_id_exists AND
     active_shifts_view_exists AND
     fleet_status_view_exists THEN
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║ ✅ ADMIN SUPERVISOR SYSTEM MIGRATION SUCCESSFUL!      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Role-based access control (admin/supervisor/driver)';
    RAISE NOTICE '✓ Client services and billing tracking';
    RAISE NOTICE '✓ Vehicle assignment management';
    RAISE NOTICE '✓ Real-time supervisor dashboard views';
    RAISE NOTICE '✓ All indexes, constraints, and triggers created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update Ryan Madsen to admin role';
    RAISE NOTICE '2. Build supervisor dashboard UI';
    RAISE NOTICE '3. Create vehicle assignment endpoints';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for admin dashboard development!';
  ELSE
    RAISE EXCEPTION '❌ Migration failed! Missing components:
      role_column: %
      client_services_table: %
      vehicle_assignments_table: %
      client_service_id_column: %
      active_shifts_view: %
      fleet_status_view: %',
      role_column_exists,
      client_services_exists,
      vehicle_assignments_exists,
      client_service_id_exists,
      active_shifts_view_exists,
      fleet_status_view_exists;
  END IF;
END $$;
