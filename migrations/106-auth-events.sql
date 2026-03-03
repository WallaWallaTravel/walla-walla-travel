-- Migration 106: Auth events table for partner portal login/logout/password tracking
-- Closes the compromise detection gap for partner authentication

CREATE TABLE IF NOT EXISTS auth_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  partner_type VARCHAR(20) NOT NULL,
  partner_id INTEGER NOT NULL,
  email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_events_partner ON auth_events (partner_type, partner_id);
CREATE INDEX idx_auth_events_event_type ON auth_events (event_type);
CREATE INDEX idx_auth_events_created_at ON auth_events (created_at);
CREATE INDEX idx_auth_events_ip ON auth_events (ip_address);

COMMENT ON TABLE auth_events IS 'Partner portal authentication event log for security auditing';
COMMENT ON COLUMN auth_events.event_type IS 'login_success, login_failure, logout, password_reset_request, password_reset_complete';
COMMENT ON COLUMN auth_events.partner_type IS 'hotel or business';
COMMENT ON COLUMN auth_events.partner_id IS 'hotel_partners.id or users.id depending on partner_type';
