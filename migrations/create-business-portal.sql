-- Business Portal System
-- Allows businesses to contribute their own content via voice, text, and file uploads

-- ============================================================================
-- BUSINESSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  business_type VARCHAR(50) NOT NULL, -- 'winery', 'restaurant', 'hotel', 'activity', 'other'
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(250) NOT NULL UNIQUE, -- URL-friendly name
  
  -- Contact information
  contact_name VARCHAR(200),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  
  -- Portal access
  unique_code VARCHAR(50) NOT NULL UNIQUE, -- For accessing their contribution page
  portal_password VARCHAR(255), -- Optional password protection
  
  -- Status
  status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'in_progress', 'submitted', 'approved', 'active', 'inactive'
  completion_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Metadata
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMP,
  first_access_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  
  -- Business details (can be filled by business or admin)
  address TEXT,
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip VARCHAR(10),
  website VARCHAR(500),
  
  -- Settings
  allow_ai_directory BOOLEAN DEFAULT true,
  public_profile BOOLEAN DEFAULT false, -- Will they have a public profile page?
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_businesses_type ON businesses(business_type);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_code ON businesses(unique_code);
CREATE INDEX idx_businesses_slug ON businesses(slug);

COMMENT ON TABLE businesses IS 'Registry of businesses contributing to the directory';

-- ============================================================================
-- INTERVIEW QUESTION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS interview_questions (
  id SERIAL PRIMARY KEY,
  business_type VARCHAR(50) NOT NULL, -- 'winery', 'restaurant', 'hotel', 'activity', 'all'
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  help_text TEXT, -- Guidance for answering
  expected_duration_seconds INTEGER DEFAULT 60, -- How long should they talk?
  required BOOLEAN DEFAULT true,
  category VARCHAR(50), -- 'introduction', 'specialties', 'experience', 'logistics', etc.
  ai_extraction_prompt TEXT, -- What should AI extract from this answer?
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_questions_type ON interview_questions(business_type);
CREATE INDEX idx_questions_number ON interview_questions(question_number);

-- Insert default winery questions
INSERT INTO interview_questions (business_type, question_number, question_text, help_text, expected_duration_seconds, category, ai_extraction_prompt) VALUES
('winery', 1, 'Tell us about your winery. What makes you unique?', 'Share your story, history, and what sets you apart from other wineries.', 180, 'introduction', 'Extract: founding year, unique features, specialty focus, key differentiators'),
('winery', 2, 'What are your signature wines or specialties?', 'Tell us about the wines you''re known for and most proud of.', 120, 'specialties', 'Extract: wine varieties, flagship wines, awards, price points'),
('winery', 3, 'Describe the tasting experience at your winery.', 'What can guests expect when they visit? Walk us through a typical tasting.', 120, 'experience', 'Extract: tasting style, duration, number of wines, experience format'),
('winery', 4, 'What''s the atmosphere like at your winery? Indoor or outdoor seating?', 'Help visitors visualize the setting and ambiance.', 90, 'ambiance', 'Extract: indoor/outdoor, seating capacity, views, ambiance keywords'),
('winery', 5, 'What type of visitors love your winery most?', 'Couples? Groups? Wine enthusiasts? Families? Help us match the right guests to your experience.', 90, 'audience', 'Extract: ideal guest types, group sizes, experience levels'),
('winery', 6, 'Can you accommodate groups? What''s your maximum capacity?', 'Tell us about group bookings and any size limitations.', 60, 'logistics', 'Extract: max capacity, group policies, private event capabilities'),
('winery', 7, 'Do you require reservations? What are your booking policies?', 'How should Walla Walla Travel guests book with you?', 90, 'logistics', 'Extract: reservation requirements, advance notice needed, cancellation policy'),
('winery', 8, 'What are your tasting fees? Any packages or special experiences available?', 'Help guests understand pricing and options.', 90, 'pricing', 'Extract: tasting fees, packages, special experiences, pricing tiers'),
('winery', 9, 'What are your hours of operation? Any seasonal changes?', 'Current hours and any seasonal variations we should know about.', 60, 'logistics', 'Extract: hours by day, seasonal schedules, closures'),
('winery', 10, 'Do you offer food? Can guests bring their own food?', 'Tell us about food options and policies.', 60, 'food', 'Extract: food offerings, outside food policy, partnerships with caterers'),
('winery', 11, 'Is there anything else visitors should know?', 'Special features, pet policies, accessibility, parking, or anything we haven''t covered.', 120, 'additional', 'Extract: pet-friendly, accessibility, parking, special features, restrictions'),
('winery', 12, 'What''s the best way for Walla Walla Travel to contact you?', 'Phone, email, or preferred contact method for tour bookings.', 30, 'contact', 'Extract: preferred contact method, booking contact person');

COMMENT ON TABLE interview_questions IS 'Template questions for business interviews';

-- ============================================================================
-- VOICE RESPONSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_voice_entries (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES interview_questions(id),
  question_number INTEGER,
  question_text TEXT,
  
  -- Audio storage
  audio_url VARCHAR(500), -- S3/storage URL
  audio_duration_seconds INTEGER,
  audio_size_bytes BIGINT,
  
  -- Transcription
  transcription TEXT,
  transcription_confidence DECIMAL(5, 2), -- 0-100
  transcribed_at TIMESTAMP,
  
  -- AI extraction
  extracted_data JSONB, -- Structured data extracted by AI
  extraction_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  extracted_at TIMESTAMP,
  
  -- Review
  approved BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,
  
  -- Metadata
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_business ON business_voice_entries(business_id);
CREATE INDEX idx_voice_question ON business_voice_entries(question_id);
CREATE INDEX idx_voice_status ON business_voice_entries(extraction_status);

COMMENT ON TABLE business_voice_entries IS 'Voice recordings from business interview process';

-- ============================================================================
-- TEXT RESPONSES (Alternative to voice)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_text_entries (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES interview_questions(id),
  question_number INTEGER,
  question_text TEXT,
  
  -- Text response
  response_text TEXT NOT NULL,
  
  -- AI extraction
  extracted_data JSONB,
  extraction_status VARCHAR(50) DEFAULT 'pending',
  extracted_at TIMESTAMP,
  
  -- Review
  approved BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,
  
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_text_business ON business_text_entries(business_id);
CREATE INDEX idx_text_question ON business_text_entries(question_id);

COMMENT ON TABLE business_text_entries IS 'Text responses from business interview process';

-- ============================================================================
-- FILE UPLOADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_files (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- File details
  file_type VARCHAR(50) NOT NULL, -- 'document', 'photo', 'video', 'menu', 'wine_list', 'brochure'
  original_filename VARCHAR(500) NOT NULL,
  storage_url VARCHAR(500) NOT NULL, -- S3/storage URL
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  
  -- Processing status
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMP,
  
  -- Extracted content
  extracted_text TEXT, -- For PDFs and documents
  ai_description TEXT, -- For photos and videos (GPT-4 Vision)
  ai_tags TEXT[], -- Array of tags
  
  -- Image-specific (if photo)
  thumbnail_url VARCHAR(500),
  width INTEGER,
  height INTEGER,
  
  -- Video-specific
  video_duration_seconds INTEGER,
  video_thumbnail_url VARCHAR(500),
  video_transcription TEXT, -- If video has audio
  
  -- Organization
  category VARCHAR(100), -- 'venue_photos', 'wine_photos', 'menu', 'wine_list', etc.
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  
  -- Review
  approved BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,
  
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_business ON business_files(business_id);
CREATE INDEX idx_files_type ON business_files(file_type);
CREATE INDEX idx_files_status ON business_files(processing_status);
CREATE INDEX idx_files_category ON business_files(category);

COMMENT ON TABLE business_files IS 'Documents, photos, and videos uploaded by businesses';

-- ============================================================================
-- STRUCTURED BUSINESS ATTRIBUTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_attributes (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Attribute details
  attribute_type VARCHAR(100) NOT NULL, -- 'specialty', 'ambiance', 'capacity', 'price_range', 'feature', 'policy'
  attribute_key VARCHAR(200) NOT NULL,
  attribute_value TEXT NOT NULL,
  
  -- Source tracking
  source VARCHAR(50) NOT NULL, -- 'voice', 'text', 'file', 'admin', 'ai_extracted'
  source_id INTEGER, -- ID of voice_entry, text_entry, or file
  confidence_score DECIMAL(5, 2), -- 0-100 (for AI-extracted data)
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attributes_business ON business_attributes(business_id);
CREATE INDEX idx_attributes_type ON business_attributes(attribute_type);
CREATE INDEX idx_attributes_key ON business_attributes(attribute_key);

COMMENT ON TABLE business_attributes IS 'Structured key-value data extracted from business submissions';

-- ============================================================================
-- TOUR OPERATOR INSIGHTS (Your Strategic Layer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tour_operator_insights (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Insight details
  insight_type VARCHAR(50) NOT NULL, -- 'recommendation', 'pairing', 'tip', 'warning', 'booking_note'
  content TEXT NOT NULL,
  
  -- Targeting
  applies_to TEXT[], -- ['couples', 'groups', 'families', 'corporate', 'wine_enthusiasts', etc.]
  season TEXT[], -- ['spring', 'summer', 'fall', 'winter', 'all']
  
  -- Priority
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  show_in_ai BOOLEAN DEFAULT true, -- Include in AI responses?
  show_in_profile BOOLEAN DEFAULT false, -- Show on business profile page?
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insights_business ON tour_operator_insights(business_id);
CREATE INDEX idx_insights_type ON tour_operator_insights(insight_type);
CREATE INDEX idx_insights_priority ON tour_operator_insights(priority DESC);

COMMENT ON TABLE tour_operator_insights IS 'Strategic insights added by tour operators for AI context';

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_activity_log (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(100) NOT NULL, -- 'portal_accessed', 'question_answered', 'file_uploaded', 'submitted', 'approved', etc.
  activity_description TEXT,
  metadata JSONB,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_business ON business_activity_log(business_id);
CREATE INDEX idx_activity_type ON business_activity_log(activity_type);
CREATE INDEX idx_activity_date ON business_activity_log(created_at DESC);

COMMENT ON TABLE business_activity_log IS 'Track all business portal activity for insights and support';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique business code
CREATE OR REPLACE FUNCTION generate_business_code(business_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  code VARCHAR;
  exists BOOLEAN;
BEGIN
  -- Create code from business name + random suffix
  code := UPPER(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]', '', 'g'));
  code := LEFT(code, 10) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Check if exists, regenerate if needed
  SELECT EXISTS(SELECT 1 FROM businesses WHERE unique_code = code) INTO exists;
  WHILE exists LOOP
    code := LEFT(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]', '', 'g'), 10) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM businesses WHERE unique_code = code) INTO exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_business_completion(biz_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  total_questions INTEGER;
  answered_questions INTEGER;
  uploaded_files INTEGER;
  completion INTEGER;
BEGIN
  -- Count expected questions for this business type
  SELECT COUNT(*) INTO total_questions
  FROM interview_questions q
  JOIN businesses b ON (q.business_type = b.business_type OR q.business_type = 'all')
  WHERE b.id = biz_id AND q.required = true;
  
  -- Count answered questions (voice or text)
  SELECT COUNT(DISTINCT question_id) INTO answered_questions
  FROM (
    SELECT question_id FROM business_voice_entries WHERE business_id = biz_id
    UNION
    SELECT question_id FROM business_text_entries WHERE business_id = biz_id
  ) answers;
  
  -- Count uploaded files
  SELECT COUNT(*) INTO uploaded_files
  FROM business_files
  WHERE business_id = biz_id;
  
  -- Calculate percentage
  -- 80% weight on questions, 20% weight on having at least one file
  IF total_questions > 0 THEN
    completion := (answered_questions * 80 / total_questions);
    IF uploaded_files > 0 THEN
      completion := completion + 20;
    END IF;
  ELSE
    completion := 0;
  END IF;
  
  RETURN LEAST(completion, 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completion percentage
CREATE OR REPLACE FUNCTION update_business_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses
  SET 
    completion_percentage = calculate_business_completion(NEW.business_id),
    updated_at = NOW()
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_entry_completion
AFTER INSERT OR UPDATE ON business_voice_entries
FOR EACH ROW
EXECUTE FUNCTION update_business_completion();

CREATE TRIGGER text_entry_completion
AFTER INSERT OR UPDATE ON business_text_entries
FOR EACH ROW
EXECUTE FUNCTION update_business_completion();

CREATE TRIGGER file_upload_completion
AFTER INSERT ON business_files
FOR EACH ROW
EXECUTE FUNCTION update_business_completion();

COMMENT ON FUNCTION generate_business_code IS 'Generate unique access code for business portal';
COMMENT ON FUNCTION calculate_business_completion IS 'Calculate completion percentage for a business profile';

