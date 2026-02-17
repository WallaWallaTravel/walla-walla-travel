-- Fix: Change reset_token_expires_at from TIMESTAMP to TIMESTAMPTZ
-- TIMESTAMP WITHOUT TIME ZONE can cause expiry comparison issues when
-- the application server and database are in different timezones.
ALTER TABLE users
  ALTER COLUMN reset_token_expires_at TYPE TIMESTAMPTZ
  USING reset_token_expires_at AT TIME ZONE 'UTC';
