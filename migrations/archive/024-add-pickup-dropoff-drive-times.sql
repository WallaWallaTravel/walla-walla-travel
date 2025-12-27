-- Add pickup and dropoff drive time fields to itineraries table
-- This allows tracking of travel time from pickup location to first stop
-- and from last stop to dropoff location

ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS pickup_drive_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dropoff_drive_time_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN itineraries.pickup_drive_time_minutes IS 'Travel time in minutes from pickup location to first stop';
COMMENT ON COLUMN itineraries.dropoff_drive_time_minutes IS 'Travel time in minutes from last stop to dropoff location';

-- Update existing itineraries to have 0 for these fields if they're NULL
UPDATE itineraries
SET 
  pickup_drive_time_minutes = COALESCE(pickup_drive_time_minutes, 0),
  dropoff_drive_time_minutes = COALESCE(dropoff_drive_time_minutes, 0)
WHERE pickup_drive_time_minutes IS NULL OR dropoff_drive_time_minutes IS NULL;




