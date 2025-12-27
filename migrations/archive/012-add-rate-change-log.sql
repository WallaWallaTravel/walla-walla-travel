-- Add rate_change_log table for auditing rate configuration changes

CREATE TABLE IF NOT EXISTS rate_change_log (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) NOT NULL,
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rate_change_log_config_key ON rate_change_log(config_key);
CREATE INDEX IF NOT EXISTS idx_rate_change_log_changed_at ON rate_change_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_rate_change_log_changed_by ON rate_change_log(changed_by);

-- Comments
COMMENT ON TABLE rate_change_log IS 'Audit log for all rate configuration changes';
COMMENT ON COLUMN rate_change_log.config_key IS 'The configuration key that was changed (e.g., wine_tours, transfers)';
COMMENT ON COLUMN rate_change_log.old_value IS 'The previous configuration value (JSONB)';
COMMENT ON COLUMN rate_change_log.new_value IS 'The new configuration value (JSONB)';
COMMENT ON COLUMN rate_change_log.changed_by IS 'User who made the change';
COMMENT ON COLUMN rate_change_log.change_reason IS 'Reason provided for the rate change';
COMMENT ON COLUMN rate_change_log.changed_at IS 'Timestamp when the change was made';





