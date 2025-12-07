-- Processing Jobs Table
-- Tracks AI processing tasks for business submissions

CREATE TABLE IF NOT EXISTS processing_jobs (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Job details
  job_type VARCHAR(50) NOT NULL, -- 'voice_transcription', 'text_extraction', 'photo_analysis', 'pdf_parsing'
  source_id INTEGER NOT NULL, -- ID of the source record (voice_entry, text_entry, or file)
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Results
  result_data JSONB, -- Extracted/processed data
  error_message TEXT, -- If failed
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_business ON processing_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON processing_jobs(created_at DESC);

COMMENT ON TABLE processing_jobs IS 'Queue for AI processing tasks (transcription, extraction, analysis)';

