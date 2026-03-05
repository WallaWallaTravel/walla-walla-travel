-- Migration: 117-saved-menus
-- Created: 2026-03-04
-- Description: Create saved_menus and saved_menu_items tables for reusable menu templates.
--              Add saved_menu_id FK to trip_proposal_stops for stop-level menu linkage.

BEGIN;

INSERT INTO _migrations (id, migration_name, notes)
VALUES (117, '117-saved-menus', 'Create saved_menus + saved_menu_items tables; add saved_menu_id to trip_proposal_stops')
ON CONFLICT (migration_name) DO NOTHING;

-- Saved menu templates (optionally tied to a supplier)
CREATE TABLE IF NOT EXISTS saved_menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    supplier_id INTEGER REFERENCES lunch_suppliers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_menus_active ON saved_menus(is_active) WHERE is_active = TRUE;

-- Items within a saved menu template
CREATE TABLE IF NOT EXISTS saved_menu_items (
    id SERIAL PRIMARY KEY,
    saved_menu_id INTEGER NOT NULL REFERENCES saved_menus(id) ON DELETE CASCADE,
    category VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(8,2) NOT NULL,
    dietary_tags VARCHAR(30)[],
    is_available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_saved_menu_items_menu ON saved_menu_items(saved_menu_id);

-- Link stops to saved menus
ALTER TABLE trip_proposal_stops
    ADD COLUMN IF NOT EXISTS saved_menu_id INTEGER REFERENCES saved_menus(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_menu
    ON trip_proposal_stops(saved_menu_id) WHERE saved_menu_id IS NOT NULL;

-- Auto-update timestamp trigger for saved_menus
CREATE OR REPLACE FUNCTION update_saved_menus_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_saved_menus_updated ON saved_menus;
CREATE TRIGGER trg_saved_menus_updated
    BEFORE UPDATE ON saved_menus
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_menus_timestamp();

COMMIT;
