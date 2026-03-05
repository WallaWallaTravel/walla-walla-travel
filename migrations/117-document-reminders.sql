-- Migration 117: Document Renewal Reminder Tracking
-- Tracks which reminders have been sent for expiring driver documents
-- to avoid sending duplicate notifications.

CREATE TABLE IF NOT EXISTS document_reminders (
  id SERIAL PRIMARY KEY,
  driver_document_id INTEGER NOT NULL REFERENCES driver_documents(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('30_day', '14_day', '7_day')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_email VARCHAR(255) NOT NULL,

  -- Prevent duplicate reminders for the same document + urgency level
  UNIQUE (driver_document_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_doc_reminders_document
  ON document_reminders(driver_document_id);

-- RLS (deny-all default, backend uses service_role)
ALTER TABLE document_reminders ENABLE ROW LEVEL SECURITY;

-- Track migration
INSERT INTO _migrations (name) VALUES ('117-document-reminders.sql')
ON CONFLICT (name) DO NOTHING;
