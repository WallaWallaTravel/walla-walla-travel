-- Migration 103: Add password reset columns to hotel_partners
-- Enables hotel partners to reset their passwords via email token flow

ALTER TABLE hotel_partners
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Index for fast token lookup during password reset
CREATE INDEX IF NOT EXISTS idx_hotel_partners_reset_token
  ON hotel_partners (reset_token)
  WHERE reset_token IS NOT NULL;
