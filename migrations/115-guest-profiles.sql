-- Migration 115: Guest Profiles & Magic Links
-- Track 1 of Guest Registration Architecture
-- Creates persistent guest identity and magic link authentication

-- ============================================================================
-- guest_profiles: Persistent guest identity across trips
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_profiles (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL,
  name            TEXT,
  phone           TEXT,
  dietary_preferences TEXT,
  crm_contact_id  INTEGER REFERENCES crm_contacts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One profile per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_profiles_email
  ON guest_profiles (LOWER(email));

-- Lookup by CRM contact
CREATE INDEX IF NOT EXISTS idx_guest_profiles_crm_contact
  ON guest_profiles (crm_contact_id) WHERE crm_contact_id IS NOT NULL;

-- ============================================================================
-- guest_magic_links: Token-based authentication for guests
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_magic_links (
  id               SERIAL PRIMARY KEY,
  guest_profile_id INTEGER NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  token            TEXT NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Token lookup (unique, used for verification)
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_magic_links_token
  ON guest_magic_links (token);

-- Find active links for a guest (cleanup, rate limiting)
CREATE INDEX IF NOT EXISTS idx_guest_magic_links_guest_active
  ON guest_magic_links (guest_profile_id, expires_at)
  WHERE used_at IS NULL;

-- ============================================================================
-- RLS (deny-all default — backend uses service_role)
-- ============================================================================

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_magic_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Track migration
-- ============================================================================

INSERT INTO _migrations (name, applied_at)
VALUES ('115-guest-profiles', NOW())
ON CONFLICT (name) DO NOTHING;
