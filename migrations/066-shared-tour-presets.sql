-- ============================================================================
-- Migration: 066-shared-tour-presets.sql
-- Description: Add shared tour presets for quick tour date creation
-- Created: 2026-02-03
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE PRESETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_tour_presets (
    id SERIAL PRIMARY KEY,

    -- Basic info
    name VARCHAR(100) NOT NULL,

    -- Tour settings
    start_time TIME DEFAULT '11:00:00',
    duration_hours DECIMAL(3, 1) DEFAULT 6,
    base_price_per_person DECIMAL(10, 2) DEFAULT 95,
    lunch_price_per_person DECIMAL(10, 2) DEFAULT 115,

    -- Content
    title VARCHAR(255),
    description TEXT,

    -- Capacity
    max_guests INTEGER DEFAULT 14,
    min_guests INTEGER DEFAULT 2,

    -- Preset management
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shared_tour_presets_default ON shared_tour_presets(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_shared_tour_presets_sort ON shared_tour_presets(sort_order);

-- ============================================================================
-- SECTION 2: ENSURE ONLY ONE DEFAULT PRESET
-- ============================================================================

-- Function to ensure only one default preset exists
CREATE OR REPLACE FUNCTION ensure_single_default_preset()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset other defaults
        UPDATE shared_tour_presets
        SET is_default = false, updated_at = NOW()
        WHERE id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_preset ON shared_tour_presets;
CREATE TRIGGER trigger_single_default_preset
    AFTER INSERT OR UPDATE OF is_default ON shared_tour_presets
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_preset();

-- ============================================================================
-- SECTION 3: UPDATE TIMESTAMP TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_shared_tour_presets_updated ON shared_tour_presets;
CREATE TRIGGER trigger_shared_tour_presets_updated
    BEFORE UPDATE ON shared_tour_presets
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- SECTION 4: SEED DEFAULT PRESET
-- ============================================================================

INSERT INTO shared_tour_presets (
    name,
    start_time,
    duration_hours,
    base_price_per_person,
    lunch_price_per_person,
    title,
    description,
    max_guests,
    min_guests,
    is_default,
    sort_order
) VALUES (
    'Standard Shared Tour',
    '11:00',
    6,
    95,
    115,
    'Shared Wine Tour Experience',
    'This is a great way to experience the valley and meet new people in the process. We''ve arranged 3 wonderful wineries (and a lunch midday) for you!',
    14,
    2,
    true,
    1
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 5: COMMENTS
-- ============================================================================

COMMENT ON TABLE shared_tour_presets IS 'Preset templates for quickly creating shared tour dates with common configurations';
COMMENT ON COLUMN shared_tour_presets.name IS 'Display name for the preset (e.g., "Standard Shared Tour")';
COMMENT ON COLUMN shared_tour_presets.is_default IS 'If true, this preset is automatically loaded when creating new tours';
COMMENT ON COLUMN shared_tour_presets.sort_order IS 'Order in which presets appear in the dropdown';
