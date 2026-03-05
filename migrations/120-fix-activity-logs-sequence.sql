-- Migration 120: Fix user_activity_logs id sequence
--
-- The user_activity_logs table has a broken id column — either the sequence
-- doesn't exist, is out of sync, or the column lacks a proper DEFAULT.
-- This migration ensures the sequence exists and the column uses it.

-- Step 1: Create the sequence if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'user_activity_logs_id_seq'
  ) THEN
    CREATE SEQUENCE user_activity_logs_id_seq;
  END IF;
END
$$;

-- Step 2: Reset the sequence to max(id) + 1 (or 1 if table is empty)
SELECT setval(
  'user_activity_logs_id_seq',
  COALESCE((SELECT MAX(id) FROM user_activity_logs), 0) + 1,
  false
);

-- Step 3: Ensure the id column uses the sequence as its default
ALTER TABLE user_activity_logs
  ALTER COLUMN id SET DEFAULT nextval('user_activity_logs_id_seq');

-- Step 4: Ensure the sequence is owned by the column (for proper cleanup)
ALTER SEQUENCE user_activity_logs_id_seq
  OWNED BY user_activity_logs.id;

-- Step 5: Ensure id is NOT NULL and PRIMARY KEY (idempotent)
ALTER TABLE user_activity_logs
  ALTER COLUMN id SET NOT NULL;

-- Add primary key only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_activity_logs'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE user_activity_logs ADD PRIMARY KEY (id);
  END IF;
END
$$;

-- Track migration
INSERT INTO _migrations (id, migration_name, applied_at)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM _migrations),
  '120-fix-activity-logs-sequence',
  NOW()
)
ON CONFLICT DO NOTHING;
