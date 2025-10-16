-- Migration to fix timezone handling for HOS compliance
-- CRITICAL: Required for FMCSA compliance - all time calculations must use absolute time

BEGIN;

-- 1. Convert time_cards timestamps to timezone-aware
ALTER TABLE time_cards 
  ALTER COLUMN clock_in_time TYPE timestamp with time zone 
    USING clock_in_time AT TIME ZONE 'UTC',
  ALTER COLUMN clock_out_time TYPE timestamp with time zone 
    USING clock_out_time AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamp with time zone 
    USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone 
    USING updated_at AT TIME ZONE 'UTC';

-- 2. Convert weekly_hos timestamps to timezone-aware
ALTER TABLE weekly_hos
  ALTER COLUMN created_at TYPE timestamp with time zone 
    USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone 
    USING updated_at AT TIME ZONE 'UTC';

-- 3. Convert drivers table timestamps if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' 
    AND column_name IN ('created_at', 'updated_at')
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE drivers 
      ALTER COLUMN created_at TYPE timestamp with time zone 
        USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN updated_at TYPE timestamp with time zone 
        USING updated_at AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 4. Convert inspections table timestamps if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' 
    AND column_name IN ('created_at', 'updated_at')
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE inspections 
      ALTER COLUMN created_at TYPE timestamp with time zone 
        USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN updated_at TYPE timestamp with time zone 
        USING updated_at AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 5. Create function to calculate HOS hours correctly (using absolute time)
CREATE OR REPLACE FUNCTION calculate_hos_hours(
  p_clock_in timestamp with time zone,
  p_clock_out timestamp with time zone
) RETURNS numeric AS $$
BEGIN
  -- Calculate hours using EXTRACT EPOCH for absolute time difference
  -- This ensures timezone changes don't affect HOS calculations
  RETURN ROUND(
    EXTRACT(EPOCH FROM (p_clock_out - p_clock_in)) / 3600.0, 
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Update existing time_cards to recalculate on_duty_hours using absolute time
UPDATE time_cards 
SET on_duty_hours = calculate_hos_hours(clock_in_time, clock_out_time)
WHERE clock_out_time IS NOT NULL;

-- 7. Add comment explaining timezone handling
COMMENT ON TABLE time_cards IS 'Time card records with timezone-aware timestamps for FMCSA HOS compliance. All timestamps stored as UTC, calculations use absolute time.';
COMMENT ON COLUMN time_cards.clock_in_time IS 'Clock in time (stored as UTC with timezone)';
COMMENT ON COLUMN time_cards.clock_out_time IS 'Clock out time (stored as UTC with timezone)';

-- 8. Create index for efficient HOS queries
CREATE INDEX IF NOT EXISTS idx_time_cards_driver_date_tz 
ON time_cards(driver_id, date, clock_in_time);

COMMIT;

-- Verification queries (run after migration)
-- SELECT COLUMN_NAME, DATA_TYPE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'time_cards' 
-- AND COLUMN_NAME IN ('clock_in_time', 'clock_out_time');