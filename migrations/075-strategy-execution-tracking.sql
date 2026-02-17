-- ============================================================================
-- Migration 075: Strategy Execution & Performance Tracking
-- Description: Adds strategy_id to scheduled_posts to track which posts came
--              from strategy recommendations. Adds execution_summary to
--              marketing_strategies. Adds performance JSONB to blog_drafts.
-- Created: 2026-02-17
-- Depends on: 074-marketing-automation.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Link scheduled posts to the strategy that inspired them
-- ============================================================================

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS strategy_id INTEGER REFERENCES marketing_strategies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_strategy ON scheduled_posts(strategy_id)
  WHERE strategy_id IS NOT NULL;

COMMENT ON COLUMN scheduled_posts.strategy_id IS 'Links post to the weekly strategy that inspired it (NULL for ad-hoc posts)';

-- ============================================================================
-- 2. Track strategy execution outcomes
-- ============================================================================

ALTER TABLE marketing_strategies
  ADD COLUMN IF NOT EXISTS execution_summary JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN marketing_strategies.execution_summary IS 'Tracks how many recommended posts were published and their performance vs ad-hoc posts';

-- ============================================================================
-- 3. Blog performance tracking (from Search Console correlation)
-- ============================================================================

ALTER TABLE blog_drafts
  ADD COLUMN IF NOT EXISTS performance JSONB DEFAULT '{}'::jsonb;

ALTER TABLE blog_drafts
  ADD COLUMN IF NOT EXISTS performance_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN blog_drafts.performance IS 'Aggregated Search Console metrics matched by slug';
COMMENT ON COLUMN blog_drafts.performance_synced_at IS 'When performance data was last synced from Search Console';

COMMIT;
