-- Migration 110: Enable RLS on auth_events table
-- auth_events is written by server-side API routes using the service role,
-- which bypasses RLS. No client-facing policies needed — RLS with zero
-- policies effectively blocks all access from anon/authenticated roles.

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
