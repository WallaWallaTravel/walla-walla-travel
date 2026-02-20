-- ============================================================================
-- Migration 076: Operational Tables
-- Description: Create tables for driver workflow tracking, vehicle monitoring,
--              and DVIR (Driver Vehicle Inspection Reports)
-- Created: 2026-02-19
-- ============================================================================

-- ============================================================================
-- 0. FIX MISSING PRIMARY KEYS (required for foreign key references)
-- ============================================================================

-- time_cards and inspections are missing PRIMARY KEY constraints
-- (they have id columns with sequences but no PK constraint)
ALTER TABLE time_cards ADD PRIMARY KEY (id);
ALTER TABLE inspections ADD PRIMARY KEY (id);

-- ============================================================================
-- 1. BREAK RECORDS (Driver break tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_records (
  id SERIAL PRIMARY KEY,
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Break timing
  break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Break classification
  break_type VARCHAR(20) NOT NULL DEFAULT 'rest'
    CHECK (break_type IN ('rest', 'meal', 'personal')),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for break_records
CREATE INDEX IF NOT EXISTS idx_break_records_time_card ON break_records(time_card_id);
CREATE INDEX IF NOT EXISTS idx_break_records_driver ON break_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_break_records_start ON break_records(break_start);
CREATE INDEX IF NOT EXISTS idx_break_records_active ON break_records(time_card_id) WHERE break_end IS NULL;

COMMENT ON TABLE break_records IS 'Tracks driver break periods during shifts for HOS compliance';

-- ============================================================================
-- 2. DRIVER STATUS LOGS (Status change audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_status_logs (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_card_id INTEGER REFERENCES time_cards(id) ON DELETE SET NULL,

  -- Status information
  status VARCHAR(50) NOT NULL
    CHECK (status IN ('on_duty', 'driving', 'on_break', 'off_duty')),
  change_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for driver_status_logs
CREATE INDEX IF NOT EXISTS idx_driver_status_logs_driver ON driver_status_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_logs_time_card ON driver_status_logs(time_card_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_logs_change_time ON driver_status_logs(change_time DESC);

COMMENT ON TABLE driver_status_logs IS 'Audit trail for driver status changes for HOS compliance';

-- ============================================================================
-- 3. MILEAGE LOGS (Odometer reading history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mileage_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

  -- Mileage data
  recorded_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mileage DECIMAL(10,1) NOT NULL,
  previous_mileage DECIMAL(10,1),
  mileage_change DECIMAL(10,1),

  -- Recorded by
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for mileage_logs
CREATE INDEX IF NOT EXISTS idx_mileage_logs_vehicle ON mileage_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_date ON mileage_logs(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_recorded_by ON mileage_logs(recorded_by);

COMMENT ON TABLE mileage_logs IS 'Historical odometer readings for fleet vehicles';

-- ============================================================================
-- 4. VEHICLE ALERTS (Service and maintenance alerts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_alerts (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

  -- Alert details
  alert_type VARCHAR(50) NOT NULL
    CHECK (alert_type IN ('service_due', 'inspection_due', 'maintenance', 'safety', 'recall')),
  severity VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Created by
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate active alerts of same type per vehicle
  UNIQUE(vehicle_id, alert_type)
);

-- Indexes for vehicle_alerts
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_vehicle ON vehicle_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_type ON vehicle_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_active ON vehicle_alerts(vehicle_id, alert_type) WHERE resolved_at IS NULL;

COMMENT ON TABLE vehicle_alerts IS 'Service, maintenance, and safety alerts for fleet vehicles';

-- ============================================================================
-- 5. DVIR REPORTS (Driver Vehicle Inspection Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dvir_reports (
  id VARCHAR(100) PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

  -- Report details
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pre_trip_inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL,
  post_trip_inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL,

  -- Defects
  defects_found BOOLEAN DEFAULT FALSE,
  defects_description JSONB,

  -- Signature
  driver_signature TEXT NOT NULL,

  -- Mechanic review
  mechanic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mechanic_signature TEXT,
  mechanic_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'resolved', 'requires_attention')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dvir_reports
CREATE INDEX IF NOT EXISTS idx_dvir_reports_driver ON dvir_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_dvir_reports_vehicle ON dvir_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_dvir_reports_date ON dvir_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_dvir_reports_defects ON dvir_reports(defects_found) WHERE defects_found = TRUE;

COMMENT ON TABLE dvir_reports IS 'FMCSA-compliant Driver Vehicle Inspection Reports';

-- ============================================================================
-- 6. TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_operational_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_break_records_updated ON break_records;
CREATE TRIGGER trg_break_records_updated
  BEFORE UPDATE ON break_records
  FOR EACH ROW EXECUTE FUNCTION update_operational_updated_at();

DROP TRIGGER IF EXISTS trg_vehicle_alerts_updated ON vehicle_alerts;
CREATE TRIGGER trg_vehicle_alerts_updated
  BEFORE UPDATE ON vehicle_alerts
  FOR EACH ROW EXECUTE FUNCTION update_operational_updated_at();

DROP TRIGGER IF EXISTS trg_dvir_reports_updated ON dvir_reports;
CREATE TRIGGER trg_dvir_reports_updated
  BEFORE UPDATE ON dvir_reports
  FOR EACH ROW EXECUTE FUNCTION update_operational_updated_at();
