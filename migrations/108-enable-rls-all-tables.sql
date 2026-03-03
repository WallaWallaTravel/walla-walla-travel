-- Migration 108: Enable RLS on all public tables + convert views to SECURITY INVOKER
--
-- WHY: The Supabase anon key is exposed in the client bundle (required for Realtime).
-- Without RLS, anyone can query the PostgREST REST API directly and read/write every
-- table. Enabling RLS with no policies blocks all PostgREST access via anon/authenticated
-- roles. The service_role key (used by the backend via lib/supabase/admin.ts and lib/db.ts)
-- bypasses RLS entirely — no backend code changes needed.
--
-- VIEWS: 16 SECURITY DEFINER views are converted to SECURITY INVOKER so they respect
-- the caller's permissions instead of the view owner's (who has full access).
--
-- REALTIME IMPACT:
--   Supabase Realtime postgres_changes DOES respect RLS. The client in
--   hooks/useProposalRealtime.ts uses the anon key (WWT uses custom JWT auth,
--   not Supabase Auth, so there's no authenticated Supabase session). With RLS
--   enabled and no policies, the anon role has zero access → Realtime events on
--   these tables will be silently filtered out:
--     - trip_proposals
--     - trip_proposal_days
--     - trip_proposal_stops
--     - proposal_notes
--     - proposal_lunch_orders
--
--   If Realtime breaks after this migration, add SELECT policies for the anon role
--   on those 5 tables (scoped by proposal ID filter). Example:
--     CREATE POLICY "realtime_select" ON trip_proposals
--       FOR SELECT TO anon USING (true);
--
--   Alternatively, broadcast/presence channels are unaffected (they don't hit the DB).

-- ============================================================
-- PART 1: Enable RLS on ALL public tables (no policies)
-- ============================================================

DO $$
DECLARE
  tbl RECORD;
  counter INTEGER := 0;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    counter := counter + 1;
  END LOOP;
  RAISE NOTICE 'RLS enabled on % public tables', counter;
END;
$$;

-- ============================================================
-- PART 2: Convert SECURITY DEFINER views to SECURITY INVOKER
-- ============================================================
-- Using ALTER VIEW SET (security_invoker = on) instead of CREATE OR REPLACE.
-- Same security outcome, zero risk of breaking view definitions.
-- Requires PostgreSQL 15+ (Supabase runs PG 15).

DO $$
DECLARE
  vname TEXT;
  view_names TEXT[] := ARRAY[
    'v_posts_ready_to_publish',
    'fleet_status',
    'shared_tour_tickets',
    'active_shifts',
    'shared_tour_manifest',
    'business_status_counts',
    'driver_compliance_status',
    'shared_tour_lunch_summary',
    'shared_tour_schedule',
    'crm_pipeline_summary',
    'crm_contact_summary',
    'shared_tours_availability_view',
    'v_pending_suggestions',
    'analytics_realtime',
    'kb_conversion_funnel',
    'analytics_daily_summary'
  ];
BEGIN
  FOREACH vname IN ARRAY view_names
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', vname);
      RAISE NOTICE 'Converted view % to SECURITY INVOKER', vname;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'View % does not exist, skipping', vname;
    END;
  END LOOP;
END;
$$;
