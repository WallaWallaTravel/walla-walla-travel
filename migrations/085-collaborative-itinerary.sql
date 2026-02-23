-- Migration 085: Collaborative Itinerary + Lunch Ordering System
-- Extends trip proposals into a living document with real-time updates,
-- notes/communication, and integrated lunch ordering.

BEGIN;

-- ============================================================================
-- 1. Extend trip_proposals table
-- ============================================================================

-- access_token: Random 64-char string for client-facing URL (/my-trip/[token])
-- This IS the client's authentication — anyone with the link can view.
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS access_token VARCHAR(64) UNIQUE;

-- planning_phase: Controls what sections are available to the client
-- proposal = pre-commitment, active_planning = post-acceptance, finalized = read-only
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS planning_phase VARCHAR(30) DEFAULT 'proposal'
    CHECK (planning_phase IN ('proposal', 'active_planning', 'finalized'));

-- Index for fast token lookups (used on every /my-trip/[token] request)
CREATE INDEX IF NOT EXISTS idx_trip_proposals_access_token
  ON trip_proposals (access_token) WHERE access_token IS NOT NULL;

-- ============================================================================
-- 2. Backfill existing proposals with access tokens
-- ============================================================================

-- Generate tokens for any existing proposals that don't have one.
-- Uses md5 of random UUIDs concatenated to produce a 64-char hex string.
UPDATE trip_proposals
SET access_token = CONCAT(
  md5(gen_random_uuid()::text),
  md5(gen_random_uuid()::text)
)
WHERE access_token IS NULL;

-- Now make it NOT NULL for future inserts
ALTER TABLE trip_proposals
  ALTER COLUMN access_token SET NOT NULL;

-- ============================================================================
-- 3. proposal_notes table (conversation + contextual notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_notes (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('client', 'staff')),
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  -- context_type NULL = general message thread
  -- context_type + context_id = note attached to a specific item
  context_type VARCHAR(30) CHECK (context_type IN ('day', 'stop', 'guest', 'lunch')),
  context_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_notes_proposal
  ON proposal_notes (trip_proposal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_proposal_notes_context
  ON proposal_notes (trip_proposal_id, context_type, context_id)
  WHERE context_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_notes_unread
  ON proposal_notes (trip_proposal_id, is_read)
  WHERE is_read = FALSE;

-- ============================================================================
-- 4. lunch_suppliers table (supplier configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lunch_suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  restaurant_id INTEGER REFERENCES restaurants(id),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  order_method VARCHAR(30) DEFAULT 'email'
    CHECK (order_method IN ('email', 'phone', 'api', 'portal')),
  api_endpoint TEXT,
  api_credentials JSONB DEFAULT '{}',
  default_cutoff_hours INTEGER DEFAULT 48,
  large_group_cutoff_hours INTEGER DEFAULT 72,
  large_group_threshold INTEGER DEFAULT 8,
  closed_days INTEGER[] DEFAULT '{}',   -- 0=Sun..6=Sat
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. lunch_menus + lunch_menu_items tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS lunch_menus (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES lunch_suppliers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lunch_menus_supplier
  ON lunch_menus (supplier_id, is_active);

CREATE TABLE IF NOT EXISTS lunch_menu_items (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL REFERENCES lunch_menus(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,       -- "Sandwiches", "Salads", etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  dietary_tags VARCHAR(50)[] DEFAULT '{}',  -- {'vegetarian','gf'}
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lunch_menu_items_menu
  ON lunch_menu_items (menu_id, is_available, sort_order);

-- ============================================================================
-- 6. proposal_lunch_orders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_lunch_orders (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  trip_proposal_day_id INTEGER REFERENCES trip_proposal_days(id),
  supplier_id INTEGER NOT NULL REFERENCES lunch_suppliers(id),
  -- [{guest_name, items: [{item_id, name, qty}], notes}]
  guest_orders JSONB NOT NULL DEFAULT '[]',
  special_requests TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  cutoff_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','sent_to_supplier','confirmed','cancelled')),
  sent_to_supplier_at TIMESTAMPTZ,
  supplier_confirmed_at TIMESTAMPTZ,
  supplier_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_lunch_orders_proposal
  ON proposal_lunch_orders (trip_proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_lunch_orders_supplier
  ON proposal_lunch_orders (supplier_id, status);

-- ============================================================================
-- 7. Enable Supabase Realtime on relevant tables
-- ============================================================================

-- REPLICA IDENTITY FULL is required for Supabase Realtime to send
-- the full row data on UPDATE/DELETE events (not just the primary key).
ALTER TABLE trip_proposals REPLICA IDENTITY FULL;
ALTER TABLE trip_proposal_days REPLICA IDENTITY FULL;
ALTER TABLE trip_proposal_stops REPLICA IDENTITY FULL;
ALTER TABLE proposal_notes REPLICA IDENTITY FULL;
ALTER TABLE proposal_lunch_orders REPLICA IDENTITY FULL;

-- Add tables to the Supabase Realtime publication.
-- Using DO block to handle cases where tables are already in the publication.
DO $$
BEGIN
  -- Try to add each table; ignore if already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_proposals;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_proposal_days;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trip_proposal_stops;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposal_notes;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE proposal_lunch_orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

COMMIT;
