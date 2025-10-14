-- Function to calculate air-mile distance using Haversine formula
CREATE OR REPLACE FUNCTION calculate_air_miles(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  r CONSTANT DECIMAL := 3440.065;
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  
  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlng/2) * SIN(dlng/2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically update monthly exemption status
CREATE OR REPLACE FUNCTION update_monthly_exemption_status()
RETURNS TRIGGER AS $$
DECLARE
  month_start DATE;
  exceedance_count INTEGER;
BEGIN
  month_start := DATE_TRUNC('month', NEW.date);
  
  SELECT COUNT(*) INTO exceedance_count
  FROM daily_trips
  WHERE driver_id = NEW.driver_id
    AND date >= month_start
    AND date < month_start + INTERVAL '1 month'
    AND exceeded_150_miles = true;
  
  INSERT INTO monthly_exemption_status (
    driver_id,
    month_start_date,
    days_exceeded_150_miles,
    requires_eld
  ) VALUES (
    NEW.driver_id,
    month_start,
    exceedance_count,
    exceedance_count > 8
  )
  ON CONFLICT (driver_id, month_start_date)
  DO UPDATE SET
    days_exceeded_150_miles = exceedance_count,
    requires_eld = exceedance_count > 8,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_monthly_exemption ON daily_trips;
CREATE TRIGGER trigger_update_monthly_exemption
  AFTER INSERT OR UPDATE ON daily_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_exemption_status();
