-- Fix: Add auto-increment sequence to users.id
-- The column had no default, causing INSERT without explicit ID to fail
-- (e.g., partner invitation flow)

DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM public.users;

  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_id_seq') THEN
    EXECUTE format('CREATE SEQUENCE users_id_seq START WITH %s', max_id);
  END IF;
END $$;

ALTER TABLE public.users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
ALTER SEQUENCE users_id_seq OWNED BY public.users.id;
