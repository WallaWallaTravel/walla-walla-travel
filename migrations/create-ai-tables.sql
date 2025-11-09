-- AI Directory Database Schema
-- Creates tables for AI settings, queries, cache, and fine-tuning

-- AI Settings (Model Configuration)
CREATE TABLE IF NOT EXISTS ai_settings (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google'
  model VARCHAR(100) NOT NULL,    -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  display_name VARCHAR(100),
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 600,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT false,
  is_fallback BOOLEAN DEFAULT false,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_test_percentage INTEGER, -- 0-100, NULL means not in A/B test
  ab_test_group VARCHAR(1), -- 'A' or 'B'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Only one active model at 100%, or multiple for A/B testing
CREATE INDEX idx_ai_settings_active ON ai_settings(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_settings_fallback ON ai_settings(is_fallback) WHERE is_fallback = true;

-- Insert default GPT-4o configuration
INSERT INTO ai_settings (provider, model, display_name, temperature, max_tokens, system_prompt, is_active)
VALUES (
  'openai',
  'gpt-4o',
  'GPT-4o (Primary)',
  0.7,
  600,
  'You are an AI assistant for Walla Walla Travel, a premier wine country tour company in Walla Walla, Washington. 

Your role is to help visitors discover wineries, tours, and experiences that match their preferences. You have access to information about local wineries, tour options, pricing, and logistics.

Be friendly, knowledgeable, and helpful. Provide specific recommendations with details. If you don''t know something, be honest and suggest contacting the office.

When discussing wineries or tours, highlight unique features, specialties, and why they''re a good fit for the visitor''s needs.',
  true
) ON CONFLICT DO NOTHING;

-- AI Queries (Logging all interactions)
CREATE TABLE IF NOT EXISTS ai_queries (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER, -- NULL for anonymous
  
  -- Query details
  query_text TEXT NOT NULL,
  query_intent VARCHAR(100), -- 'winery_search', 'logistics', 'pricing', etc.
  query_hash VARCHAR(64), -- for cache lookup
  
  -- Model & response
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  system_prompt_hash VARCHAR(64),
  response_text TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER,
  api_cost DECIMAL(10, 6),
  
  -- A/B test tracking
  ab_test_group VARCHAR(1), -- 'A', 'B', or NULL
  
  -- User feedback
  user_rating INTEGER, -- 1-5 or NULL
  user_feedback_text TEXT,
  user_clicked_result BOOLEAN DEFAULT false,
  clicked_item_id INTEGER,
  clicked_item_type VARCHAR(50), -- 'winery', 'tour', etc.
  
  -- Conversion tracking
  resulted_in_booking BOOLEAN DEFAULT false,
  booking_id INTEGER REFERENCES bookings(id),
  booking_value DECIMAL(10, 2),
  
  -- Admin review
  admin_rating VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
  admin_notes TEXT,
  approved_for_training BOOLEAN DEFAULT false,
  edited_response TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

CREATE INDEX idx_ai_queries_session ON ai_queries(session_id);
CREATE INDEX idx_ai_queries_user ON ai_queries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ai_queries_date ON ai_queries(created_at DESC);
CREATE INDEX idx_ai_queries_model ON ai_queries(provider, model);
CREATE INDEX idx_ai_queries_intent ON ai_queries(query_intent);
CREATE INDEX idx_ai_queries_rating ON ai_queries(user_rating);
CREATE INDEX idx_ai_queries_training ON ai_queries(approved_for_training) WHERE approved_for_training = true;
CREATE INDEX idx_ai_queries_booking ON ai_queries(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_ai_queries_hash ON ai_queries(query_hash);

-- AI Query Cache (Speed optimization)
CREATE TABLE IF NOT EXISTS ai_query_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  system_prompt_hash VARCHAR(64),
  response_text TEXT NOT NULL,
  response_data JSONB, -- structured data (wineries, tours, etc.)
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  last_hit_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_cache_hash ON ai_query_cache(query_hash);
CREATE INDEX idx_ai_cache_expires ON ai_query_cache(expires_at);
CREATE INDEX idx_ai_cache_model ON ai_query_cache(model);

-- AI Fine-Tuning Jobs
CREATE TABLE IF NOT EXISTS ai_fine_tuning_jobs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  base_model VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) UNIQUE, -- provider's job ID
  fine_tuned_model VARCHAR(255), -- result model ID
  model_name VARCHAR(100), -- friendly name
  description TEXT,
  training_file_id VARCHAR(255),
  training_examples_count INTEGER,
  status VARCHAR(50), -- 'pending', 'running', 'succeeded', 'failed', 'cancelled'
  error_message TEXT,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_fine_tuning_status ON ai_fine_tuning_jobs(status);
CREATE INDEX idx_fine_tuning_date ON ai_fine_tuning_jobs(created_at DESC);

-- Voice Transcriptions (Logging)
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER,
  audio_duration_seconds DECIMAL(10, 3),
  transcript TEXT NOT NULL,
  confidence DECIMAL(5, 4),
  api_cost DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_session ON voice_transcriptions(session_id);
CREATE INDEX idx_voice_date ON voice_transcriptions(created_at DESC);

