-- Migration: 047-driver-qualification-files.sql
-- Description: Adds DOT Driver Qualification (DQ) file fields and driver_documents table
-- Date: 2025-01-06
-- Ref: STRATEGIC_ROADMAP_2026.md - Part 3: DOT Compliance & Audit Readiness
-- Regulation: FMCSA 49 CFR 391.51 - Driver Qualification Files

-- ============================================================================
-- EXTEND USERS TABLE FOR DQ FILE TRACKING
-- ============================================================================

-- Medical Certificate (49 CFR 391.43)
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_cert_type VARCHAR(20); -- 'standard', 'exempt', 'temporary'
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_examiner_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_examiner_registry_number VARCHAR(50);

-- Driver's License
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_state VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_class VARCHAR(10); -- 'A', 'B', 'C', 'D'
ALTER TABLE users ADD COLUMN IF NOT EXISTS cdl_endorsements TEXT[]; -- ['P', 'S', 'N', etc.]
ALTER TABLE users ADD COLUMN IF NOT EXISTS cdl_restrictions TEXT[];

-- Employment & Hiring (49 CFR 391.21, 391.23)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn_last_four VARCHAR(4); -- Last 4 digits only for verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS hired_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_application_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_verified_date DATE;

-- Motor Vehicle Record (49 CFR 391.25)
ALTER TABLE users ADD COLUMN IF NOT EXISTS mvr_check_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mvr_violations INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mvr_status VARCHAR(20); -- 'clear', 'review', 'disqualified'

-- Road Test (49 CFR 391.31)
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_examiner VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_vehicle_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS road_test_passed BOOLEAN;

-- Background Check
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_check_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(20); -- 'clear', 'review', 'failed'
ALTER TABLE users ADD COLUMN IF NOT EXISTS drug_test_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drug_test_status VARCHAR(20); -- 'negative', 'positive', 'pending'

-- Annual Review (49 CFR 391.25)
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_review_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_review_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_annual_review_date DATE;

-- DQ File Status
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dq_file_last_audit DATE;

-- ============================================================================
-- DRIVER DOCUMENTS TABLE
-- ============================================================================
-- Stores all driver-related documents for DQ files and compliance

CREATE TABLE IF NOT EXISTS driver_documents (
    id SERIAL PRIMARY KEY,

    -- Driver reference
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Document classification
    document_type VARCHAR(50) NOT NULL,
    -- Types: 'medical_cert', 'license_front', 'license_back', 'mvr',
    --        'road_test', 'background_check', 'drug_test', 'application',
    --        'annual_review', 'training_cert', 'hazmat_cert', 'endorsement',
    --        'previous_employer', 'employment_verification', 'other'

    document_subtype VARCHAR(50), -- Additional classification if needed

    -- Document details
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500), -- Supabase Storage URL
    document_number VARCHAR(100), -- Certificate/document number if applicable
    file_size_bytes INTEGER,
    file_type VARCHAR(50), -- 'pdf', 'jpg', 'png', etc.

    -- Dates
    issue_date DATE,
    expiry_date DATE,
    effective_date DATE,

    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    -- Source tracking
    source VARCHAR(50), -- 'upload', 'scan', 'fax', 'email', 'api'
    original_filename VARCHAR(255),

    -- Notes
    notes TEXT,

    -- Audit trail
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete (documents should be retained for compliance)
    is_active BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,
    archived_by INTEGER REFERENCES users(id),
    archive_reason TEXT
);

-- ============================================================================
-- INDEXES FOR DRIVER DOCUMENTS
-- ============================================================================

-- Fast lookup by driver
CREATE INDEX IF NOT EXISTS idx_driver_docs_driver
ON driver_documents(driver_id);

-- Find documents by type
CREATE INDEX IF NOT EXISTS idx_driver_docs_type
ON driver_documents(document_type);

-- Find expiring documents
CREATE INDEX IF NOT EXISTS idx_driver_docs_expiry
ON driver_documents(expiry_date)
WHERE expiry_date IS NOT NULL AND is_active = true;

-- Find unverified documents
CREATE INDEX IF NOT EXISTS idx_driver_docs_unverified
ON driver_documents(verified, created_at)
WHERE verified = false AND is_active = true;

-- Find documents by driver and type (common query)
CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_type
ON driver_documents(driver_id, document_type);

-- ============================================================================
-- DRIVER COMPLIANCE STATUS VIEW
-- ============================================================================
-- Quick view of each driver's compliance status

CREATE OR REPLACE VIEW driver_compliance_status AS
SELECT
    u.id as driver_id,
    u.name as driver_name,
    u.email,
    u.role,

    -- License status
    u.license_number,
    u.license_expiry,
    CASE
        WHEN u.license_expiry IS NULL THEN 'missing'
        WHEN u.license_expiry < CURRENT_DATE THEN 'expired'
        WHEN u.license_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END as license_status,

    -- Medical cert status
    u.medical_cert_expiry,
    CASE
        WHEN u.medical_cert_expiry IS NULL THEN 'missing'
        WHEN u.medical_cert_expiry < CURRENT_DATE THEN 'expired'
        WHEN u.medical_cert_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END as medical_status,

    -- MVR status
    u.mvr_check_date,
    CASE
        WHEN u.mvr_check_date IS NULL THEN 'never_checked'
        WHEN u.mvr_check_date < CURRENT_DATE - INTERVAL '1 year' THEN 'overdue'
        WHEN u.mvr_check_date < CURRENT_DATE - INTERVAL '10 months' THEN 'due_soon'
        ELSE 'current'
    END as mvr_status,

    -- Annual review status
    u.annual_review_date,
    u.next_annual_review_date,
    CASE
        WHEN u.annual_review_date IS NULL THEN 'never_reviewed'
        WHEN COALESCE(u.next_annual_review_date, u.annual_review_date + INTERVAL '1 year') < CURRENT_DATE THEN 'overdue'
        WHEN COALESCE(u.next_annual_review_date, u.annual_review_date + INTERVAL '1 year') < CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'current'
    END as annual_review_status,

    -- Drug test status
    u.drug_test_date,
    u.drug_test_status,

    -- Background check
    u.background_check_date,
    u.background_check_status,

    -- Road test
    u.road_test_date,
    u.road_test_passed,

    -- Overall DQ status
    u.dq_file_complete,
    u.dq_file_last_audit,

    -- Calculate overall compliance
    CASE
        WHEN u.license_expiry < CURRENT_DATE THEN 'non_compliant'
        WHEN u.medical_cert_expiry < CURRENT_DATE THEN 'non_compliant'
        WHEN u.dq_file_complete = false THEN 'incomplete'
        WHEN u.license_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        WHEN u.medical_cert_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        WHEN u.mvr_check_date < CURRENT_DATE - INTERVAL '1 year' THEN 'warning'
        ELSE 'compliant'
    END as overall_status

FROM users u
WHERE u.role IN ('driver', 'admin') -- Include admins who may drive
  AND u.is_active = true;

-- ============================================================================
-- EXPIRING DOCUMENTS ALERT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW expiring_documents_alert AS
SELECT
    'license' as document_type,
    u.id as driver_id,
    u.name as driver_name,
    u.email,
    u.license_expiry as expiry_date,
    u.license_expiry - CURRENT_DATE as days_until_expiry
FROM users u
WHERE u.role IN ('driver', 'admin')
  AND u.is_active = true
  AND u.license_expiry IS NOT NULL
  AND u.license_expiry < CURRENT_DATE + INTERVAL '60 days'

UNION ALL

SELECT
    'medical_cert' as document_type,
    u.id as driver_id,
    u.name as driver_name,
    u.email,
    u.medical_cert_expiry as expiry_date,
    u.medical_cert_expiry - CURRENT_DATE as days_until_expiry
FROM users u
WHERE u.role IN ('driver', 'admin')
  AND u.is_active = true
  AND u.medical_cert_expiry IS NOT NULL
  AND u.medical_cert_expiry < CURRENT_DATE + INTERVAL '60 days'

UNION ALL

SELECT
    dd.document_type,
    dd.driver_id,
    u.name as driver_name,
    u.email,
    dd.expiry_date,
    dd.expiry_date - CURRENT_DATE as days_until_expiry
FROM driver_documents dd
JOIN users u ON dd.driver_id = u.id
WHERE dd.is_active = true
  AND dd.expiry_date IS NOT NULL
  AND dd.expiry_date < CURRENT_DATE + INTERVAL '60 days'

ORDER BY days_until_expiry ASC;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_driver_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_driver_documents_updated_at ON driver_documents;
CREATE TRIGGER trigger_driver_documents_updated_at
    BEFORE UPDATE ON driver_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_documents_timestamp();

-- ============================================================================
-- FUNCTION TO CHECK DQ FILE COMPLETENESS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_dq_file_complete(p_driver_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_user RECORD;
    v_has_license_doc BOOLEAN;
    v_has_medical_doc BOOLEAN;
    v_has_mvr_doc BOOLEAN;
BEGIN
    -- Get user record
    SELECT * INTO v_user FROM users WHERE id = p_driver_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check required fields
    IF v_user.license_number IS NULL OR v_user.license_expiry IS NULL THEN
        RETURN false;
    END IF;

    IF v_user.medical_cert_expiry IS NULL THEN
        RETURN false;
    END IF;

    IF v_user.hired_date IS NULL THEN
        RETURN false;
    END IF;

    -- Check for required documents
    SELECT EXISTS (
        SELECT 1 FROM driver_documents
        WHERE driver_id = p_driver_id
          AND document_type IN ('license_front', 'license_back')
          AND is_active = true
    ) INTO v_has_license_doc;

    SELECT EXISTS (
        SELECT 1 FROM driver_documents
        WHERE driver_id = p_driver_id
          AND document_type = 'medical_cert'
          AND is_active = true
    ) INTO v_has_medical_doc;

    -- Return complete status
    RETURN v_has_license_doc AND v_has_medical_doc;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION TO UPDATE DQ FILE STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dq_file_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the driver's dq_file_complete status
    UPDATE users
    SET dq_file_complete = check_dq_file_complete(NEW.driver_id),
        updated_at = NOW()
    WHERE id = NEW.driver_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update DQ status when documents change
DROP TRIGGER IF EXISTS trigger_update_dq_status ON driver_documents;
CREATE TRIGGER trigger_update_dq_status
    AFTER INSERT OR UPDATE OR DELETE ON driver_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_dq_file_status();

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1,
       '047-driver-qualification-files',
       'Added DQ file fields to users table and driver_documents table for DOT compliance'
FROM _migrations;
