-- Migration: 062-update-fleet-vehicles.sql
-- Description: Update fleet to match actual NW Touring vehicles
-- Date: 2026-02-01

-- ============================================================================
-- REMOVE OLD TEST VEHICLES
-- ============================================================================

-- Deactivate (soft delete) non-Sprinter vehicles
UPDATE vehicles
SET is_active = false, status = 'retired'
WHERE make NOT IN ('Mercedes') OR model NOT IN ('Sprinter');

-- Actually delete if no references exist
DELETE FROM vehicles
WHERE (make NOT IN ('Mercedes') OR model NOT IN ('Sprinter'))
AND NOT EXISTS (SELECT 1 FROM bookings WHERE vehicle_id = vehicles.id);

-- ============================================================================
-- UPDATE EXISTING SPRINTERS
-- ============================================================================

-- Update first Sprinter: Tour WW (14 pax)
UPDATE vehicles
SET
    name = 'Tour WW - 14 Passenger',
    license_plate = 'TOUR WW',
    vehicle_number = 'Tour WW',
    capacity = 14,
    year = 2024,
    status = 'active',
    is_active = true
WHERE license_plate = 'WA-001' OR (make = 'Mercedes' AND model = 'Sprinter' AND id = (SELECT MIN(id) FROM vehicles WHERE make = 'Mercedes' AND model = 'Sprinter'));

-- Update second Sprinter: Tour NW (14 pax)
UPDATE vehicles
SET
    name = 'Tour NW - 14 Passenger',
    license_plate = 'TOUR NW',
    vehicle_number = 'Tour NW',
    capacity = 14,
    year = 2023,
    status = 'active',
    is_active = true
WHERE license_plate = 'WA-002' OR (make = 'Mercedes' AND model = 'Sprinter' AND id = (SELECT MIN(id) + 1 FROM vehicles WHERE make = 'Mercedes' AND model = 'Sprinter'));

-- ============================================================================
-- ADD THIRD SPRINTER
-- ============================================================================

INSERT INTO vehicles (name, make, model, year, license_plate, vehicle_number, vehicle_type, capacity, status, is_active)
VALUES (
    'Host WW - 11 Passenger',
    'Mercedes',
    'Sprinter',
    2024,
    'HOST WW',
    'Host WW',
    'sprinter',
    11,
    'active',
    true
)
ON CONFLICT (license_plate) DO UPDATE SET
    name = EXCLUDED.name,
    capacity = EXCLUDED.capacity,
    vehicle_number = EXCLUDED.vehicle_number,
    status = 'active',
    is_active = true;

-- ============================================================================
-- VERIFY FINAL STATE
-- ============================================================================

-- Should only have 3 active Mercedes Sprinters
-- SELECT * FROM vehicles WHERE is_active = true ORDER BY capacity DESC, name;

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1, '062-update-fleet-vehicles', 'Updated fleet to 3 Mercedes Sprinters: Tour WW (14), Tour NW (14), Host WW (11)'
FROM _migrations;
