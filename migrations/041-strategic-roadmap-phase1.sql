-- Migration: 041-strategic-roadmap-phase1.sql
-- Purpose: Phase 1 of 2026 Strategic Roadmap - Foundation tables and fields
-- Author: Claude Code
-- Date: 2025-12-26
--
-- This migration adds:
-- 1. vehicle_availability_blocks - Prevents double-bookings with exclusion constraint
-- 2. DQ file fields on users - Driver qualification file tracking
-- 3. driver_documents - Document storage for DQ files
-- 4. trip_distances - 150-air-mile exemption tracking
-- 5. monthly_exemption_status - Monthly compliance monitoring
-- 6. Historical entry fields - For backdating inspections/time_cards
-- 7. Vehicle brand association - Multi-brand vehicle management

-- ============================================
-- ENABLE REQUIRED EXTENSION
-- ============================================

-- btree_gist extension is required for exclusion constraints
-- This allows combining equality (=) and range (&&) operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- 1. VEHICLE AVAILABILITY BLOCKS
-- Prevents double-bookings at the database level
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_availability_blocks (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Block type: booking, maintenance, hold (for pending bookings), buffer
  block_type VARCHAR(20) NOT NULL DEFAULT 'booking',

  -- Link to the booking that created this block
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,

  -- Which brand owns this block
  brand_id INTEGER REFERENCES brands(id),

  -- Who created the block
  created_by INTEGER REFERENCES users(id),

  -- Notes for maintenance or other blocks
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validate that end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Validate block_type values
  CONSTRAINT valid_block_type CHECK (block_type IN ('booking', 'maintenance', 'hold', 'buffer', 'blackout'))
);

-- Create exclusion constraint to prevent overlapping blocks on same vehicle
-- This is the KEY constraint that prevents double-bookings
CREATE INDEX IF NOT EXISTS idx_availability_vehicle_date ON vehicle_availability_blocks(vehicle_id, block_date);
CREATE INDEX IF NOT EXISTS idx_availability_booking ON vehicle_availability_blocks(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_availability_brand ON vehicle_availability_blocks(brand_id);

-- Note: The exclusion constraint requires the tsrange to work with gist
-- We'll add it separately after the table is created
DO $$
BEGIN
  -- Add exclusion constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_vehicle_blocks'
  ) THEN
    ALTER TABLE vehicle_availability_blocks
    ADD CONSTRAINT no_overlapping_vehicle_blocks
    EXCLUDE USING gist (
      vehicle_id WITH =,
      block_date WITH =,
      tsrange(
        (block_date + start_time)::timestamp,
        (block_date + end_time)::timestamp
      ) WITH &&
    );
  END IF;
END $$;

COMMENT ON TABLE vehicle_availability_blocks IS 'Tracks vehicle availability blocks to prevent double-bookings. Uses PostgreSQL exclusion constraint for bulletproof scheduling.';
COMMENT ON COLUMN vehicle_availability_blocks.block_type IS 'booking=customer booking, maintenance=vehicle service, hold=pending booking, buffer=time between bookings, blackout=not available';

-- ============================================
-- 2. DQ FILE FIELDS ON USERS TABLE
-- Driver Qualification file tracking per FMCSA 49 CFR 391.51
-- ============================================

-- Medical Certificate (required for all CMV drivers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_type VARCHAR(50); -- 'standard', 'exemption', 'spt_certificate'

-- Driver's License
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_state VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_class VARCHAR(10); -- 'A', 'B', 'C', 'Passenger'
ALTER TABLE users ADD COLUMN IF NOT EXISTS cdl_endorsements TEXT[]; -- ['P', 'S', etc.]

-- Employment dates
ALTER TABLE users ADD COLUMN IF NOT EXISTS hired_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active'; -- 'active', 'terminated', 'leave'

-- Verification/Review dates
ALTER TABLE users ADD COLUMN IF NOT EXISTS mvr_check_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mvr_check_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_check_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_check_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_review_date DATE;

-- DQ file status
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_last_reviewed DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_reviewed_by INTEGER REFERENCES users(id);

-- Create indexes for expiration tracking
CREATE INDEX IF NOT EXISTS idx_users_medical_cert_expiry ON users(medical_cert_expiry) WHERE medical_cert_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_license_expiry ON users(license_expiry) WHERE license_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_annual_review ON users(annual_review_date) WHERE role = 'driver';
CREATE INDEX IF NOT EXISTS idx_users_dq_complete ON users(dq_file_complete) WHERE role = 'driver';

COMMENT ON COLUMN users.medical_cert_expiry IS 'DOT medical certificate expiration date (max 2 years)';
COMMENT ON COLUMN users.mvr_check_date IS 'Motor Vehicle Record check date (required annually)';
COMMENT ON COLUMN users.annual_review_date IS 'Annual driver review date per 49 CFR 391.25';
COMMENT ON COLUMN users.dq_file_complete IS 'True if all required DQ file elements are present and current';

-- ============================================
-- 3. DRIVER DOCUMENTS TABLE
-- Storage for all DQ file documents
-- ============================================

CREATE TABLE IF NOT EXISTS driver_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Document classification
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255),

  -- Storage
  document_url VARCHAR(500),
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),

  -- Dates
  issue_date DATE,
  expiry_date DATE,

  -- Verification
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'superseded', 'deleted'

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validate document types
  CONSTRAINT valid_doc_type CHECK (document_type IN (
    'medical_certificate',
    'drivers_license',
    'mvr_report',
    'road_test_certificate',
    'background_check',
    'employment_application',
    'annual_review',
    'training_certificate',
    'drug_test_result',
    'alcohol_test_result',
    'pre_employment_verification',
    'other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_docs_expiry ON driver_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_docs_status ON driver_documents(status);

COMMENT ON TABLE driver_documents IS 'Stores all Driver Qualification (DQ) file documents per FMCSA 49 CFR 391.51';

-- ============================================
-- 4. TRIP DISTANCES TABLE
-- Tracks air miles for 150-mile exemption (49 CFR 395.1(e)(1))
-- ============================================

CREATE TABLE IF NOT EXISTS trip_distances (
  id SERIAL PRIMARY KEY,
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  driver_id INTEGER NOT NULL REFERENCES users(id),

  -- Trip date
  trip_date DATE NOT NULL,

  -- Start location (work reporting location)
  start_lat DECIMAL(10,8),
  start_lng DECIMAL(11,8),
  start_location_name VARCHAR(255),
  start_timestamp TIMESTAMP WITH TIME ZONE,

  -- Furthest point from start (for air-mile calculation)
  furthest_lat DECIMAL(10,8),
  furthest_lng DECIMAL(11,8),
  furthest_location_name VARCHAR(255),
  furthest_timestamp TIMESTAMP WITH TIME ZONE,

  -- End location
  end_lat DECIMAL(10,8),
  end_lng DECIMAL(11,8),
  end_location_name VARCHAR(255),
  end_timestamp TIMESTAMP WITH TIME ZONE,

  -- Calculated air miles (Haversine formula applied in application)
  max_air_miles DECIMAL(6,2),

  -- Compliance flags
  exceeds_150 BOOLEAN GENERATED ALWAYS AS (max_air_miles > 150) STORED,
  returned_within_12_hours BOOLEAN,

  -- If exceeds 150, was paper log created?
  paper_log_required BOOLEAN GENERATED ALWAYS AS (max_air_miles > 150) STORED,
  paper_log_completed BOOLEAN DEFAULT false,
  paper_log_url VARCHAR(500),

  -- GPS tracking method
  tracking_method VARCHAR(20) DEFAULT 'gps', -- 'gps', 'manual', 'estimated'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_distances_driver_date ON trip_distances(driver_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_trip_distances_time_card ON trip_distances(time_card_id);
CREATE INDEX IF NOT EXISTS idx_trip_distances_exceeds ON trip_distances(exceeds_150) WHERE exceeds_150 = true;
CREATE INDEX IF NOT EXISTS idx_trip_distances_booking ON trip_distances(booking_id) WHERE booking_id IS NOT NULL;

COMMENT ON TABLE trip_distances IS 'Tracks trip distances for 150-air-mile exemption per 49 CFR 395.1(e)(1)';
COMMENT ON COLUMN trip_distances.max_air_miles IS 'Maximum air-line distance from work reporting location during trip';
COMMENT ON COLUMN trip_distances.exceeds_150 IS 'True if trip exceeded 150 air-mile radius (requires paper log or ELD)';

-- ============================================
-- 5. MONTHLY EXEMPTION STATUS TABLE
-- Monitors the 8-day monthly limit for 150-mile exemption
-- ============================================

CREATE TABLE IF NOT EXISTS monthly_exemption_status (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Month being tracked (YYYY-MM format)
  year_month VARCHAR(7) NOT NULL,

  -- Days in this month that exceeded 150 miles
  days_exceeding_150 INTEGER DEFAULT 0,

  -- Compliance status (auto-calculated)
  is_exempt BOOLEAN GENERATED ALWAYS AS (days_exceeding_150 <= 8) STORED,
  requires_eld_or_logs BOOLEAN GENERATED ALWAYS AS (days_exceeding_150 > 8) STORED,

  -- If exemption lost, when did it happen?
  exemption_lost_date DATE,

  -- Days detail (array of dates that exceeded 150)
  exceeding_dates DATE[],

  -- Notes
  notes TEXT,

  -- Tracking
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One record per driver per month
  CONSTRAINT unique_driver_month UNIQUE(driver_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_exemption_driver ON monthly_exemption_status(driver_id);
CREATE INDEX IF NOT EXISTS idx_monthly_exemption_month ON monthly_exemption_status(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_exemption_requires_logs ON monthly_exemption_status(requires_eld_or_logs) WHERE requires_eld_or_logs = true;

COMMENT ON TABLE monthly_exemption_status IS 'Tracks monthly 150-mile exemption status. Drivers exceeding 150 miles on >8 days/month need ELDs or paper logs.';

-- ============================================
-- 6. HISTORICAL ENTRY FIELDS
-- Allow backdating of inspections and time_cards
-- ============================================

-- Add historical entry tracking to inspections
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS is_historical_entry BOOLEAN DEFAULT false;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS historical_source VARCHAR(100); -- 'paper_form', 'excel_import', 'data_migration'
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS entered_by INTEGER REFERENCES users(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS entry_notes TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS original_document_date DATE; -- Date on the paper form

-- Add historical entry tracking to time_cards
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS is_historical_entry BOOLEAN DEFAULT false;
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS historical_source VARCHAR(100);
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS entered_by INTEGER REFERENCES users(id);
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS entry_notes TEXT;
ALTER TABLE time_cards ADD COLUMN IF NOT EXISTS original_document_date DATE;

CREATE INDEX IF NOT EXISTS idx_inspections_historical ON inspections(is_historical_entry) WHERE is_historical_entry = true;
CREATE INDEX IF NOT EXISTS idx_time_cards_historical ON time_cards(is_historical_entry) WHERE is_historical_entry = true;

COMMENT ON COLUMN inspections.is_historical_entry IS 'True if this record was entered retroactively from paper records';
COMMENT ON COLUMN inspections.historical_source IS 'Source of historical data: paper_form, excel_import, data_migration';
COMMENT ON COLUMN time_cards.is_historical_entry IS 'True if this record was entered retroactively from paper records';

-- ============================================
-- 7. VEHICLE BRAND ASSOCIATION
-- Support multi-brand vehicle management
-- ============================================

-- Primary brand ownership
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS primary_brand_id INTEGER REFERENCES brands(id);

-- Whether available to all brands or just primary brand
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_to_all_brands BOOLEAN DEFAULT true;

-- Registration and insurance tracking
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_state VARCHAR(2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_carrier VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;

-- DOT/MC numbers (may already exist, using IF NOT EXISTS)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mc_number VARCHAR(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS usdot_number VARCHAR(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dot_registration_date DATE;

-- Max passengers (for party size matching)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS max_passengers INTEGER;

-- DOT compliance status
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_dot_compliant BOOLEAN DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dot_compliance_notes TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_dot_inspection DATE;

CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(primary_brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_expiry ON vehicles(registration_expiry) WHERE registration_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_insurance_expiry ON vehicles(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_dot_compliant ON vehicles(is_dot_compliant);

COMMENT ON COLUMN vehicles.primary_brand_id IS 'Primary brand that owns this vehicle';
COMMENT ON COLUMN vehicles.available_to_all_brands IS 'If true, vehicle can be booked by any brand. If false, only primary_brand_id can book.';
COMMENT ON COLUMN vehicles.max_passengers IS 'Maximum passenger capacity for booking party size matching';

-- ============================================
-- 8. COMPLIANCE VIOLATIONS TABLE
-- Track DOT violations and compliance issues
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_violations (
  id SERIAL PRIMARY KEY,

  -- What entity has the violation
  entity_type VARCHAR(20) NOT NULL, -- 'driver', 'vehicle', 'company'
  entity_id INTEGER NOT NULL,

  -- Violation details
  violation_type VARCHAR(50) NOT NULL,
  violation_code VARCHAR(20), -- DOT violation code if applicable
  severity VARCHAR(20) DEFAULT 'minor', -- 'critical', 'major', 'minor', 'warning'
  description TEXT,

  -- When detected and by whom
  detected_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  detected_by INTEGER REFERENCES users(id),
  detection_method VARCHAR(50), -- 'inspection', 'audit', 'self_report', 'dot_inspection'

  -- Resolution
  resolved_date TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT,

  -- If DOT/roadside inspection
  dot_inspection_number VARCHAR(50),
  out_of_service BOOLEAN DEFAULT false,

  -- Documentation
  document_urls TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_entity_type CHECK (entity_type IN ('driver', 'vehicle', 'company')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'major', 'minor', 'warning'))
);

CREATE INDEX IF NOT EXISTS idx_violations_entity ON compliance_violations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON compliance_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_unresolved ON compliance_violations(resolved_date) WHERE resolved_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_violations_detected ON compliance_violations(detected_date);

COMMENT ON TABLE compliance_violations IS 'Tracks DOT/FMCSA compliance violations for audit trail';

-- ============================================
-- 9. CREATE FUNCTIONS FOR COMPLIANCE
-- ============================================

-- Function to check if a driver's DQ file is complete
CREATE OR REPLACE FUNCTION check_driver_dq_complete(driver_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  driver_record RECORD;
  is_complete BOOLEAN := true;
BEGIN
  SELECT * INTO driver_record FROM users WHERE id = driver_id_param AND role = 'driver';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check required fields
  IF driver_record.medical_cert_expiry IS NULL OR driver_record.medical_cert_expiry < CURRENT_DATE THEN
    is_complete := false;
  END IF;

  IF driver_record.license_expiry IS NULL OR driver_record.license_expiry < CURRENT_DATE THEN
    is_complete := false;
  END IF;

  IF driver_record.hired_date IS NULL THEN
    is_complete := false;
  END IF;

  -- MVR should be within last year
  IF driver_record.mvr_check_date IS NULL OR driver_record.mvr_check_date < CURRENT_DATE - INTERVAL '1 year' THEN
    is_complete := false;
  END IF;

  -- Annual review should be within last year
  IF driver_record.annual_review_date IS NULL OR driver_record.annual_review_date < CURRENT_DATE - INTERVAL '1 year' THEN
    is_complete := false;
  END IF;

  RETURN is_complete;
END;
$$ LANGUAGE plpgsql;

-- Function to update monthly exemption status
CREATE OR REPLACE FUNCTION update_monthly_exemption_status(driver_id_param INTEGER, year_month_param VARCHAR(7))
RETURNS void AS $$
DECLARE
  days_count INTEGER;
  exceeding_dates_array DATE[];
BEGIN
  -- Count days exceeding 150 miles for this driver/month
  SELECT
    COUNT(DISTINCT trip_date),
    ARRAY_AGG(DISTINCT trip_date ORDER BY trip_date)
  INTO days_count, exceeding_dates_array
  FROM trip_distances
  WHERE driver_id = driver_id_param
    AND TO_CHAR(trip_date, 'YYYY-MM') = year_month_param
    AND exceeds_150 = true;

  -- Upsert the monthly status
  INSERT INTO monthly_exemption_status (
    driver_id,
    year_month,
    days_exceeding_150,
    exceeding_dates,
    exemption_lost_date,
    last_calculated
  )
  VALUES (
    driver_id_param,
    year_month_param,
    COALESCE(days_count, 0),
    exceeding_dates_array,
    CASE WHEN days_count > 8 THEN exceeding_dates_array[9] ELSE NULL END,
    NOW()
  )
  ON CONFLICT (driver_id, year_month)
  DO UPDATE SET
    days_exceeding_150 = COALESCE(days_count, 0),
    exceeding_dates = exceeding_dates_array,
    exemption_lost_date = CASE WHEN days_count > 8 THEN exceeding_dates_array[9] ELSE NULL END,
    last_calculated = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. RECORD MIGRATION
-- ============================================

INSERT INTO _migrations (migration_name, notes)
VALUES ('041-strategic-roadmap-phase1', 'Phase 1 of 2026 Strategic Roadmap: Availability blocks, DQ files, distance tracking, historical entry support')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- Tables created:
--   1. vehicle_availability_blocks (with exclusion constraint)
--   2. driver_documents
--   3. trip_distances
--   4. monthly_exemption_status
--   5. compliance_violations
--
-- Tables modified:
--   - users (DQ file fields)
--   - vehicles (brand association, registration, insurance, DOT)
--   - inspections (historical entry fields)
--   - time_cards (historical entry fields)
--
-- Functions created:
--   - check_driver_dq_complete()
--   - update_monthly_exemption_status()
