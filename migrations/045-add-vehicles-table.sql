-- Migration: 045-add-vehicles-table.sql
-- Description: Creates the vehicles table needed for inspections and fleet management
-- Date: 2025-01-06

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    license_plate VARCHAR(20) UNIQUE,
    vin VARCHAR(17),
    vehicle_number VARCHAR(20),
    vehicle_type VARCHAR(30) DEFAULT 'sedan',
    capacity INTEGER DEFAULT 4,
    color VARCHAR(30),

    -- Fleet management
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'retired')),
    brand_id INTEGER,
    brand_ids INTEGER[] DEFAULT '{}',
    available_to_all_brands BOOLEAN DEFAULT true,

    -- Tracking
    current_mileage INTEGER DEFAULT 0,
    last_service_mileage INTEGER,
    next_service_mileage INTEGER,
    last_inspection_date DATE,

    -- Insurance & Registration
    insurance_expiry DATE,
    registration_expiry DATE,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_id ON vehicles(brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- ============================================================================
-- INSERT DEFAULT VEHICLES (for testing)
-- ============================================================================

INSERT INTO vehicles (name, make, model, year, license_plate, vehicle_type, capacity, status)
VALUES
    ('Sprinter 1', 'Mercedes', 'Sprinter', 2024, 'WA-001', 'sprinter', 14, 'active'),
    ('Sprinter 2', 'Mercedes', 'Sprinter', 2023, 'WA-002', 'sprinter', 14, 'active'),
    ('Sedan 1', 'Lincoln', 'Navigator', 2024, 'WA-003', 'sedan', 6, 'active'),
    ('SUV 1', 'Cadillac', 'Escalade', 2023, 'WA-004', 'suv', 7, 'active')
ON CONFLICT (license_plate) DO NOTHING;

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1, '045-add-vehicles-table', 'Added vehicles table for fleet management and inspections'
FROM _migrations;
