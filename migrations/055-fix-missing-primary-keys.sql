-- ============================================================================
-- Migration 055: Fix Missing Primary Keys
-- Description: Adds primary key constraints to tables that were created without them.
--              This ensures foreign key references work correctly.
-- Created: 2026-01-28
-- ============================================================================

-- Note: These ALTER TABLE statements will fail gracefully if the constraint already exists.
-- We use DO blocks to handle the "already exists" case.

DO $$
BEGIN
  -- Add primary key to users if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'users' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.users ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to users table';
  END IF;
END $$;

DO $$
BEGIN
  -- Add primary key to customers if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'customers' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.customers ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to customers table';
  END IF;
END $$;

DO $$
BEGIN
  -- Add primary key to bookings if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'bookings' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.bookings ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to bookings table';
  END IF;
END $$;

DO $$
BEGIN
  -- Add primary key to proposals if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'proposals' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.proposals ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to proposals table';
  END IF;
END $$;

DO $$
BEGIN
  -- Add primary key to vehicles if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.vehicles ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to vehicles table';
  END IF;
END $$;

-- Verify all primary keys are now in place
DO $$
DECLARE
  missing_pks TEXT;
BEGIN
  SELECT string_agg(t.table_name, ', ')
  INTO missing_pks
  FROM information_schema.tables t
  LEFT JOIN information_schema.table_constraints pk
    ON t.table_name = pk.table_name
    AND t.table_schema = pk.table_schema
    AND pk.constraint_type = 'PRIMARY KEY'
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN ('users', 'customers', 'bookings', 'proposals', 'vehicles')
    AND pk.constraint_name IS NULL;

  IF missing_pks IS NOT NULL THEN
    RAISE WARNING 'Tables still missing primary keys: %', missing_pks;
  ELSE
    RAISE NOTICE 'All core tables have primary keys';
  END IF;
END $$;
