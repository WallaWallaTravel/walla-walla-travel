-- ============================================================================
-- Migration 056: Contact Inquiries Table
-- Description: Store contact form submissions for CRM integration
-- Created: 2026-01-30
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONTACT INQUIRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id SERIAL PRIMARY KEY,

  -- Link to CRM contact (always created when inquiry submitted)
  crm_contact_id INT REFERENCES crm_contacts(id) ON DELETE SET NULL,

  -- Contact information (captured at time of submission)
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Inquiry details
  dates VARCHAR(255),
  group_size VARCHAR(50),
  message TEXT NOT NULL,

  -- Inquiry classification
  inquiry_type VARCHAR(50) DEFAULT 'general'
    CHECK (inquiry_type IN ('general', 'full_planning', 'wine_tour', 'corporate', 'other')),

  -- Tracking
  source VARCHAR(100) DEFAULT 'website',
  source_detail VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  responded_at TIMESTAMPTZ,
  responded_by INT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_crm_contact ON contact_inquiries(crm_contact_id);

-- ============================================================================
-- 2. UPDATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contact_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_inquiries_updated ON contact_inquiries;
CREATE TRIGGER trg_contact_inquiries_updated
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_contact_inquiries_updated_at();

-- ============================================================================
-- 3. COMMENT ON TABLE
-- ============================================================================

COMMENT ON TABLE contact_inquiries IS 'Stores all contact form submissions, linked to CRM contacts for lead tracking';

COMMIT;
