-- Migration 100: Server-side session tracking
-- Adds user_sessions table to enable session revocation, idle timeouts, and session fixation prevention.
-- JWTs now embed a session_id (sid) claim; API-layer validation checks this table.

CREATE TABLE IF NOT EXISTS user_sessions (
  id              SERIAL PRIMARY KEY,
  session_id      UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  ip_address      VARCHAR(45),
  user_agent      TEXT,

  CONSTRAINT uq_user_sessions_session_id UNIQUE (session_id)
);

-- Fast lookup by session_id (primary validation path)
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions (session_id);

-- Find all sessions for a user (revocation, cleanup)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- Partial index for active sessions only (most queries filter on revoked_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (user_id, session_id)
  WHERE revoked_at IS NULL;
