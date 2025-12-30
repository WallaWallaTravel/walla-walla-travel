-- Migration: 001-supabase-schema.sql
-- Purpose: Core schema for Auditor's Dream on Supabase
-- Date: 2025-12-29

-- ============================================
-- DROP EXISTING TABLES (clean slate)
-- ============================================
DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS compliance_audit_log CASCADE;
DROP TABLE IF EXISTS compliance_status CASCADE;
DROP TABLE IF EXISTS compliance_requirements CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS operators CASCADE;

-- ============================================
-- 1. OPERATORS TABLE
-- ============================================

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usdot_number VARCHAR(20) UNIQUE NOT NULL,
  mc_number VARCHAR(20),
  legal_name VARCHAR(255) NOT NULL,
  dba_name VARCHAR(255),
  carrier_type VARCHAR(50) DEFAULT 'charter_tour',
  operation_scope VARCHAR(50) DEFAULT 'interstate',
  operation_classification VARCHAR(50) DEFAULT 'for_hire',
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(20),
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiration DATE,
  insurance_coverage_amount DECIMAL(15, 2),
  utc_permit_number VARCHAR(50),
  utc_permit_expiry DATE,
  overall_compliance_score DECIMAL(5, 2) DEFAULT 100.00,
  driver_compliance_score DECIMAL(5, 2) DEFAULT 100.00,
  vehicle_compliance_score DECIMAL(5, 2) DEFAULT 100.00,
  last_compliance_check TIMESTAMP WITH TIME ZONE,
  walla_walla_service_entity_id INTEGER,
  walla_walla_tenant_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. PROFILES TABLE
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  operator_id UUID REFERENCES operators(id),
  wwt_role VARCHAR(50),
  ad_role VARCHAR(50) DEFAULT 'operator_admin',
  walla_walla_user_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. COMPLIANCE REQUIREMENTS TABLE
-- ============================================

CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code VARCHAR(50) UNIQUE NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  description TEXT,
  regulation_reference VARCHAR(100),
  regulation_authority VARCHAR(50),
  applies_to VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval VARCHAR(20),
  warning_days_before INTEGER DEFAULT 30,
  critical_days_before INTEGER DEFAULT 7,
  severity_if_missing VARCHAR(20) DEFAULT 'critical',
  out_of_service_if_missing BOOLEAN DEFAULT false,
  validation_field VARCHAR(100),
  validation_type VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. COMPLIANCE STATUS TABLE
-- ============================================

CREATE TABLE compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id),
  entity_type VARCHAR(20) NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_uuid UUID,
  requirement_id UUID NOT NULL REFERENCES compliance_requirements(id),
  status VARCHAR(20) NOT NULL,
  effective_date DATE,
  expiration_date DATE,
  last_completed_date DATE,
  document_id UUID,
  document_url VARCHAR(500),
  notes TEXT,
  warning_sent BOOLEAN DEFAULT false,
  warning_sent_at TIMESTAMP WITH TIME ZONE,
  critical_warning_sent BOOLEAN DEFAULT false,
  critical_warning_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_entity_requirement UNIQUE(entity_type, entity_id, requirement_id)
);

-- ============================================
-- 5. COMPLIANCE AUDIT LOG TABLE
-- ============================================

CREATE TABLE compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id),
  action_type VARCHAR(50) NOT NULL,
  action_endpoint VARCHAR(255),
  driver_id INTEGER,
  vehicle_id INTEGER,
  booking_id INTEGER,
  was_blocked BOOLEAN NOT NULL,
  block_reason TEXT,
  violations JSONB,
  was_overridden BOOLEAN DEFAULT false,
  overridden_by INTEGER,
  override_reason TEXT,
  tour_date DATE,
  request_ip VARCHAR(45),
  user_agent TEXT,
  triggered_by INTEGER,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. SYNC LOG TABLE
-- ============================================

CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system VARCHAR(50) NOT NULL,
  target_system VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT,
  action VARCHAR(20) NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  sync_hash VARCHAR(64)
);

-- ============================================
-- 7. INDEXES
-- ============================================

CREATE INDEX idx_operators_usdot ON operators(usdot_number);
CREATE INDEX idx_profiles_operator ON profiles(operator_id);
CREATE INDEX idx_compliance_status_entity ON compliance_status(entity_type, entity_id);
CREATE INDEX idx_compliance_status_operator ON compliance_status(operator_id);
CREATE INDEX idx_audit_log_operator ON compliance_audit_log(operator_id);
CREATE INDEX idx_audit_log_date ON compliance_audit_log(triggered_at);

-- ============================================
-- 8. SEED DATA
-- ============================================

-- NW Touring LLC operator
INSERT INTO operators (
  usdot_number, mc_number, legal_name, dba_name,
  carrier_type, operation_scope, operation_classification,
  primary_email, address_line1, city, state, zip
) VALUES (
  '3603851', '1225087', 'Northwest Touring LLC', 'NW Touring & Concierge',
  'charter_tour', 'both', 'for_hire',
  'info@wallawalla.travel', '9 E Main St', 'Walla Walla', 'WA', '99362'
);

-- FMCSA requirements
INSERT INTO compliance_requirements (requirement_code, requirement_name, description, regulation_reference, regulation_authority, applies_to, category, is_recurring, recurrence_interval, warning_days_before, severity_if_missing, out_of_service_if_missing, sort_order) VALUES
  ('DRV_MED_CERT', 'Medical Certificate', 'DOT medical certificate must be current', '49 CFR 391.41', 'FMCSA', 'driver', 'medical', true, 'biennial', 60, 'critical', true, 1),
  ('DRV_LICENSE', 'Driver License', 'Valid driver license for vehicle class', '49 CFR 391.11', 'FMCSA', 'driver', 'dq_file', true, 'varies', 60, 'critical', true, 2),
  ('DRV_MVR', 'Motor Vehicle Record', 'Annual MVR check required', '49 CFR 391.25', 'FMCSA', 'driver', 'dq_file', true, 'annual', 30, 'major', false, 3),
  ('VEH_REGISTRATION', 'Vehicle Registration', 'Current vehicle registration', 'State Law', 'State', 'vehicle', 'registration', true, 'annual', 30, 'critical', true, 10),
  ('VEH_INSURANCE', 'Vehicle Insurance', 'Minimum $5M liability', '49 CFR 387.33', 'FMCSA', 'vehicle', 'insurance', true, 'annual', 30, 'critical', true, 11),
  ('VEH_DOT_INSPECTION', 'Annual DOT Inspection', 'Annual inspection required', '49 CFR 396.17', 'FMCSA', 'vehicle', 'vehicle_inspection', true, 'annual', 30, 'critical', true, 12),
  ('OPR_USDOT', 'USDOT Number', 'Active USDOT registration', '49 CFR 390.19', 'FMCSA', 'operator', 'registration', true, 'biennial', 60, 'critical', true, 20),
  ('OPR_INSURANCE', 'Operator Insurance', 'Minimum insurance filed with FMCSA', '49 CFR 387', 'FMCSA', 'operator', 'insurance', true, 'annual', 30, 'critical', true, 22);

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operator" ON operators FOR SELECT USING (
  id IN (SELECT operator_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users view operator compliance" ON compliance_status FOR SELECT USING (
  operator_id IN (SELECT operator_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users view operator audit log" ON compliance_audit_log FOR SELECT USING (
  operator_id IN (SELECT operator_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Anyone view requirements" ON compliance_requirements FOR SELECT USING (true);

-- ============================================
-- 10. TRIGGER FOR NEW USERS
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 11. ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE compliance_status;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_audit_log;
