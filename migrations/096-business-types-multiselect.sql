-- Migration 096: Business Types Multi-Select
-- Converts business_type (single VARCHAR) to business_types (TEXT[] array)
-- Adds 'catering' and 'service' as new allowed types
-- Keeps old business_type column synced via trigger for backward compatibility

-- 1. Add business_types array column
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_types TEXT[] NOT NULL DEFAULT ARRAY['other']::TEXT[];

-- 2. Migrate existing data from single business_type to array
UPDATE businesses
  SET business_types = ARRAY[business_type]
  WHERE business_types = ARRAY['other']::TEXT[]
    AND business_type IS NOT NULL
    AND business_type != 'other';

-- Also handle rows that are already 'other'
UPDATE businesses
  SET business_types = ARRAY[business_type]
  WHERE business_type IS NOT NULL;

-- 3. GIN index for efficient array queries (&&, @>, ANY)
CREATE INDEX IF NOT EXISTS idx_businesses_types_gin
  ON businesses USING GIN(business_types);

-- 4. Sync trigger: keeps old business_type = first element of business_types
CREATE OR REPLACE FUNCTION sync_business_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.business_types IS NOT NULL AND array_length(NEW.business_types, 1) > 0 THEN
    NEW.business_type = NEW.business_types[1];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_business_type ON businesses;

CREATE TRIGGER trg_sync_business_type
  BEFORE INSERT OR UPDATE OF business_types ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_type();

-- 5. Update CHECK constraint to include new types
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_business_type_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_business_type_check
  CHECK (business_type IN ('winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'catering', 'service', 'other'));

-- 6. Recreate business_status_counts view using UNNEST for accurate multi-type counts
-- (Only if view exists — safe to skip if not)
DROP VIEW IF EXISTS business_status_counts;
CREATE VIEW business_status_counts AS
  SELECT
    unnest(business_types) AS business_type,
    status,
    COUNT(*) AS count
  FROM businesses
  GROUP BY unnest(business_types), status;
