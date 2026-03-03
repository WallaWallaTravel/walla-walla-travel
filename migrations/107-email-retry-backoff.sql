-- Migration 107: Add exponential backoff columns to email_logs
-- Adds retry_count, next_retry_at, and updated_at for scheduled retry with backoff.
-- Backoff schedule: attempt 1 = immediate, attempt 2 = +5 min, attempt 3 = +30 min.

-- retry_count: tracks how many times we've retried this email
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- next_retry_at: when this email is next eligible for retry (NULL = not retryable)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- updated_at: tracks when the row was last modified
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Index for the retry cron query: find retryable emails efficiently
CREATE INDEX IF NOT EXISTS idx_email_logs_retry
  ON email_logs (next_retry_at)
  WHERE status IN ('failed', 'error') AND retry_count < 3;
