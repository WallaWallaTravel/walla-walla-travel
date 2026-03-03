-- Migration 104: Email Preferences (CAN-SPAM Compliance)
--
-- Centralized table for managing email unsubscribe preferences.
-- Used by all marketing/commercial email senders to check opt-out status
-- before sending. Transactional emails (booking confirmations, password
-- resets, payment receipts) are legally exempt and skip this check.

CREATE TABLE IF NOT EXISTS email_preferences (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  unsubscribe_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_preferences_token ON email_preferences(unsubscribe_token);
CREATE INDEX idx_email_preferences_email ON email_preferences(email);
