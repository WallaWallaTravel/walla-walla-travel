-- Migration 112: Move extensions to dedicated schema (Supabase best practice)
--
-- The Supabase database linter flags btree_gist and vector in the public
-- schema as WARN. Moving them to the `extensions` schema is the recommended
-- pattern — it keeps public clean and the extensions schema is already on
-- the search_path ("$user", public, extensions).
--
-- btree_gist: used by the vehicle_availability_blocks exclusion constraint.
--   The GiST operator classes remain accessible via search_path.
-- vector: installed but not actively used by application code.

ALTER EXTENSION btree_gist SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
