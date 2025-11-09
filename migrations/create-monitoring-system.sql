-- Continuous Monitoring & Self-Improvement System
-- Tracks system health, performance, errors, and generates optimization recommendations

-- ============================================================================
-- SYSTEM HEALTH MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_health_checks (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL, -- 'api', 'database', 'external_service', 'performance'
  check_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_date ON system_health_checks(checked_at DESC);

COMMENT ON TABLE system_health_checks IS 'Continuous health monitoring for all system components';

-- ============================================================================
-- ERROR TRACKING & ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  user_agent TEXT,
  ip_address VARCHAR(45),
  visitor_id INTEGER REFERENCES visitors(id),
  session_id VARCHAR(100),
  severity VARCHAR(20) NOT NULL DEFAULT 'error', -- 'warning', 'error', 'critical'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  metadata JSONB,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_date ON error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_path ON error_logs(request_path);

COMMENT ON TABLE error_logs IS 'Comprehensive error tracking with resolution workflow';

-- ============================================================================
-- PERFORMANCE METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL, -- 'api_response', 'page_load', 'database_query', 'external_api'
  metric_name VARCHAR(100) NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'ms', 'seconds', 'bytes', 'count'
  endpoint VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  metadata JSONB,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_date ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_endpoint ON performance_metrics(endpoint);

COMMENT ON TABLE performance_metrics IS 'Real-time performance tracking for optimization';

-- ============================================================================
-- OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'performance', 'security', 'ux', 'code_quality', 'business'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  impact_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  effort_score INTEGER NOT NULL DEFAULT 0, -- 0-100 (higher = more effort)
  data_source VARCHAR(100), -- What generated this recommendation
  supporting_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- 'new', 'reviewing', 'approved', 'implemented', 'dismissed'
  implemented_at TIMESTAMP,
  implementation_notes TEXT,
  created_by VARCHAR(50) DEFAULT 'system', -- 'system' or user_id
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimization_category ON optimization_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_optimization_priority ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_optimization_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optimization_impact ON optimization_recommendations(impact_score DESC);

COMMENT ON TABLE optimization_recommendations IS 'AI-generated recommendations for system improvements';

-- ============================================================================
-- USER BEHAVIOR ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id SERIAL PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL, -- 'navigation', 'search', 'conversion', 'error', 'abandonment'
  pattern_name VARCHAR(100) NOT NULL,
  description TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0.00-100.00
  user_segment VARCHAR(50), -- 'new_visitor', 'returning', 'converted', etc.
  pattern_data JSONB NOT NULL,
  actionable_insights TEXT[],
  first_observed TIMESTAMP NOT NULL DEFAULT NOW(),
  last_observed TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_type ON user_behavior_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_behavior_frequency ON user_behavior_patterns(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_confidence ON user_behavior_patterns(confidence_score DESC);

COMMENT ON TABLE user_behavior_patterns IS 'Learned user behavior patterns for UX optimization';

-- ============================================================================
-- CODE QUALITY METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS code_quality_scans (
  id SERIAL PRIMARY KEY,
  scan_type VARCHAR(50) NOT NULL, -- 'test_coverage', 'linter', 'security', 'performance'
  component_path VARCHAR(500),
  metric_name VARCHAR(100) NOT NULL,
  score DECIMAL(5, 2), -- 0-100
  issues_found INTEGER DEFAULT 0,
  issues_critical INTEGER DEFAULT 0,
  issues_high INTEGER DEFAULT 0,
  issues_medium INTEGER DEFAULT 0,
  issues_low INTEGER DEFAULT 0,
  recommendations TEXT[],
  scan_details JSONB,
  scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_scans_type ON code_quality_scans(scan_type);
CREATE INDEX IF NOT EXISTS idx_code_scans_path ON code_quality_scans(component_path);
CREATE INDEX IF NOT EXISTS idx_code_scans_date ON code_quality_scans(scanned_at DESC);

COMMENT ON TABLE code_quality_scans IS 'Automated code quality evaluation results';

-- ============================================================================
-- SYSTEM INSIGHTS (AI-Generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_insights (
  id SERIAL PRIMARY KEY,
  insight_type VARCHAR(50) NOT NULL, -- 'trend', 'anomaly', 'prediction', 'correlation'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'important', 'critical'
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0.00-100.00
  data_sources TEXT[], -- Which tables/metrics were analyzed
  visualization_data JSONB, -- For dashboard charts
  actions_suggested TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_type ON system_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON system_insights(severity);
CREATE INDEX IF NOT EXISTS idx_insights_status ON system_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_date ON system_insights(generated_at DESC);

COMMENT ON TABLE system_insights IS 'AI-generated insights about system performance and user behavior';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS TABLE (
  check_type VARCHAR,
  healthy_count BIGINT,
  degraded_count BIGINT,
  down_count BIGINT,
  avg_response_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.check_type,
    COUNT(*) FILTER (WHERE h.status = 'healthy') as healthy_count,
    COUNT(*) FILTER (WHERE h.status = 'degraded') as degraded_count,
    COUNT(*) FILTER (WHERE h.status = 'down') as down_count,
    AVG(h.response_time_ms) as avg_response_ms
  FROM system_health_checks h
  WHERE h.checked_at > NOW() - INTERVAL '1 hour'
  GROUP BY h.check_type;
END;
$$ LANGUAGE plpgsql;

-- Function to get top optimization recommendations
CREATE OR REPLACE FUNCTION get_top_recommendations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  category VARCHAR,
  title VARCHAR,
  priority VARCHAR,
  impact_score INTEGER,
  effort_score INTEGER,
  roi_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.category,
    r.title,
    r.priority,
    r.impact_score,
    r.effort_score,
    CASE 
      WHEN r.effort_score = 0 THEN r.impact_score::NUMERIC
      ELSE r.impact_score::NUMERIC / r.effort_score::NUMERIC * 100
    END as roi_score
  FROM optimization_recommendations r
  WHERE r.status IN ('new', 'approved')
  ORDER BY roi_score DESC, r.impact_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_health_summary IS 'Get current system health across all check types';
COMMENT ON FUNCTION get_top_recommendations IS 'Get highest ROI optimization recommendations';

