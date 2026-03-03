-- Migration 111: Add SELECT-only RLS policies for Realtime subscribed tables
--
-- Migration 108 enabled RLS with NO policies on all tables, which correctly
-- blocks PostgREST CRUD access via the anon key. However, Supabase Realtime
-- postgres_changes also respects RLS — the anon role sees zero change events
-- when there are no SELECT policies. This broke the live /my-trip realtime
-- updates (hooks/useProposalRealtime.ts).
--
-- These policies restore Realtime functionality with defense-in-depth:
--
-- 1. SELECT only — no INSERT/UPDATE/DELETE exposure via PostgREST
-- 2. Scoped to anon role only (service_role bypasses RLS regardless)
-- 3. trip_proposals: restricted to non-draft proposals (drafts are WIP,
--    not yet shared with customers)
-- 4. Child tables: EXISTS subquery validates the parent proposal is non-draft
--    (FK indexes make this efficient; Realtime only evaluates changed rows)
--
-- TRADEOFF: With these policies, anyone with the public anon key can also
-- SELECT from these tables via PostgREST REST API (filtered to non-draft).
-- This is acceptable because:
--   a) All mutations go through Next.js API routes using the service_role key
--   b) Proposal data is semi-public (shared with customers via access_token links)
--   c) The app uses custom JWT auth, not Supabase Auth — there's no auth.uid()
--      available for per-user scoping
--   d) A future improvement would be migrating to Supabase Auth to enable
--      proper per-user RLS policies
--
-- Tables affected (all 5 from useProposalRealtime):
--   - trip_proposals
--   - trip_proposal_days
--   - trip_proposal_stops
--   - proposal_notes
--   - proposal_lunch_orders

-- trip_proposals: only non-draft proposals are visible
CREATE POLICY "anon_select_for_realtime" ON public.trip_proposals
  FOR SELECT TO anon
  USING (status NOT IN ('draft'));

-- trip_proposal_days: only rows whose parent proposal is non-draft
CREATE POLICY "anon_select_for_realtime" ON public.trip_proposal_days
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.trip_proposals
    WHERE trip_proposals.id = trip_proposal_days.trip_proposal_id
      AND trip_proposals.status NOT IN ('draft')
  ));

-- trip_proposal_stops: links through days → proposals (both FKs are indexed)
CREATE POLICY "anon_select_for_realtime" ON public.trip_proposal_stops
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.trip_proposal_days d
    JOIN public.trip_proposals tp ON tp.id = d.trip_proposal_id
    WHERE d.id = trip_proposal_stops.trip_proposal_day_id
      AND tp.status NOT IN ('draft')
  ));

-- proposal_notes: only rows whose parent proposal is non-draft
CREATE POLICY "anon_select_for_realtime" ON public.proposal_notes
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.trip_proposals
    WHERE trip_proposals.id = proposal_notes.trip_proposal_id
      AND trip_proposals.status NOT IN ('draft')
  ));

-- proposal_lunch_orders: only rows whose parent proposal is non-draft
CREATE POLICY "anon_select_for_realtime" ON public.proposal_lunch_orders
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.trip_proposals
    WHERE trip_proposals.id = proposal_lunch_orders.trip_proposal_id
      AND trip_proposals.status NOT IN ('draft')
  ));
