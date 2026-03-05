-- Migration 118: Partner Booking Requests
-- Token-based request/response system for venue partner communication.
-- Enables admin to send structured reservation requests to partners (wineries,
-- restaurants, hotels) and receive responses via token-authenticated web forms.
--
-- Builds on migration 092 (vendor_interactions + vendor fields on stops).

-- ============================================================================
-- 1. partner_request_tokens — one row per outbound request email
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_request_tokens (
  id              SERIAL PRIMARY KEY,
  token           VARCHAR(64) NOT NULL,
  stop_id         INTEGER NOT NULL REFERENCES trip_proposal_stops(id) ON DELETE CASCADE,
  proposal_id     INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Recipient
  partner_email   VARCHAR(255) NOT NULL,
  partner_name    VARCHAR(255),

  -- Request details (snapshot at time of send)
  request_type    VARCHAR(30) NOT NULL DEFAULT 'availability'
    CHECK (request_type IN ('availability', 'reservation', 'quote', 'custom')),
  request_subject VARCHAR(500),
  request_body    TEXT NOT NULL,

  -- State
  status          VARCHAR(30) NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'responded', 'expired', 'revoked')),
  responded_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,

  -- Metadata
  sent_by         INTEGER REFERENCES users(id),
  resend_message_id VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Token lookup (primary access path — public response pages)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prt_token
  ON partner_request_tokens (token);

-- Find all requests for a stop (admin thread view)
CREATE INDEX IF NOT EXISTS idx_prt_stop
  ON partner_request_tokens (stop_id);

-- Find active requests (expiry cron)
CREATE INDEX IF NOT EXISTS idx_prt_active
  ON partner_request_tokens (status, expires_at)
  WHERE status IN ('sent', 'opened');


-- ============================================================================
-- 2. partner_responses — one per form submission (a token can have multiple)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_responses (
  id                SERIAL PRIMARY KEY,
  request_token_id  INTEGER NOT NULL REFERENCES partner_request_tokens(id) ON DELETE CASCADE,
  stop_id           INTEGER NOT NULL REFERENCES trip_proposal_stops(id) ON DELETE CASCADE,

  -- Response
  action            VARCHAR(30) NOT NULL
    CHECK (action IN ('confirm', 'modify', 'decline', 'message')),
  message           TEXT,

  -- Structured fields (populated based on action)
  confirmed_date    DATE,
  confirmed_time    TIME,
  confirmed_party_size INTEGER,
  confirmation_code VARCHAR(100),
  alternate_date    DATE,
  alternate_time    TIME,
  quoted_amount     DECIMAL(10,2),

  -- Source
  response_source   VARCHAR(30) NOT NULL DEFAULT 'web_form'
    CHECK (response_source IN ('web_form', 'inbound_email', 'manual_entry')),
  responder_name    VARCHAR(255),
  responder_email   VARCHAR(255),
  responder_ip      INET,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_request
  ON partner_responses (request_token_id);

CREATE INDEX IF NOT EXISTS idx_pr_stop
  ON partner_responses (stop_id);


-- ============================================================================
-- 3. Extend vendor_interactions with new types + FK links
-- ============================================================================

-- Widen interaction_type CHECK to include new types
ALTER TABLE vendor_interactions
  DROP CONSTRAINT IF EXISTS vendor_interactions_interaction_type_check;

ALTER TABLE vendor_interactions
  ADD CONSTRAINT vendor_interactions_interaction_type_check
  CHECK (interaction_type IN (
    'note', 'email_sent', 'email_received', 'phone_call', 'quote_received',
    'partner_response', 'request_sent', 'status_change'
  ));

-- Optional FK links to specific request/response records
ALTER TABLE vendor_interactions
  ADD COLUMN IF NOT EXISTS request_token_id INTEGER REFERENCES partner_request_tokens(id),
  ADD COLUMN IF NOT EXISTS response_id INTEGER REFERENCES partner_responses(id);


-- ============================================================================
-- 4. inbound_email_log — for Resend inbound webhook routing
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbound_email_log (
  id                SERIAL PRIMARY KEY,
  from_address      VARCHAR(255) NOT NULL,
  to_address        VARCHAR(255) NOT NULL,
  subject           VARCHAR(500),
  body_text         TEXT,
  body_html         TEXT,

  -- Routing
  routed_to_stop_id INTEGER REFERENCES trip_proposal_stops(id),
  routing_method    VARCHAR(30)
    CHECK (routing_method IN ('auto_address', 'manual_link', 'unmatched')),
  routed_at         TIMESTAMPTZ,
  routed_by         INTEGER REFERENCES users(id),

  -- Raw Resend webhook data
  resend_message_id VARCHAR(100),
  raw_headers       JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iel_to_address
  ON inbound_email_log (to_address);

CREATE INDEX IF NOT EXISTS idx_iel_unmatched
  ON inbound_email_log (routing_method)
  WHERE routing_method = 'unmatched';


-- ============================================================================
-- 5. RLS (deny-all default — backend uses service_role)
-- ============================================================================

ALTER TABLE partner_request_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- Track migration
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
VALUES (118, '118-partner-booking-requests', 'Partner request tokens, responses, inbound email log; extend vendor_interactions')
ON CONFLICT (migration_name) DO NOTHING;
