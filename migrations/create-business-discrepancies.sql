-- Business Discrepancies Table
-- Stores detected issues for admin review

CREATE TABLE IF NOT EXISTS business_discrepancies (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  discrepancy_id VARCHAR(200) UNIQUE NOT NULL,
  
  -- Issue details
  type VARCHAR(50) NOT NULL, -- 'conflict', 'missing', 'vague', 'inconsistent', 'needs_verification'
  severity VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  
  -- Sources
  sources JSONB, -- Array of {type, id, content}
  
  -- Resolution
  suggested_resolution TEXT,
  draft_message TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_business ON business_discrepancies(business_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON business_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_discrepancies_severity ON business_discrepancies(severity);

COMMENT ON TABLE business_discrepancies IS 'Detected issues in business submissions requiring admin review';

