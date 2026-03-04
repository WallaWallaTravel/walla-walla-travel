-- Migration 113: Drop unused pgvector extension
--
-- The Supabase plan evaluation (docs/supabase-plan-evaluation.md) confirmed
-- zero application code references pgvector. AI features use Anthropic and
-- Google Gemini APIs directly — no vector similarity search is performed.
--
-- Migration 112 previously moved the extension to the extensions schema.
-- This migration drops it entirely to reduce attack surface and avoid
-- confusion about what's actively used.

DROP EXTENSION IF EXISTS vector;
