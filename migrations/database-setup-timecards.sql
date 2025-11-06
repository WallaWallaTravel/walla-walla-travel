-- WALLA WALLA TRAVEL - DATABASE SCHEMA UPDATES
-- USDOT #3603851
-- For: Time Card System + Distance Tracking

-- ============================================
-- STEP 1: ADD DRIVERS TO USERS TABLE
-- ============================================

-- Insert your three drivers (run once)
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
('owner@wallawallatravel.com', '$2a$10$placeholder', 'Owner', 'driver', true),
('eric@wallawallatravel.com', '$2a$10$placeholder', 'Eric Critchlow', 'driver', true),
('janine@wallawallatravel.com', '$2a$10$placeholder', 'Janine Bergevin', 'driver', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- STEP 2: ADD VEHICLES TO VEHICLES TABLE
-- ============================================

-- Add your 3 Mercedes Sprinters (run once)
INSERT INTO vehicles (vehicle_number, make, model, year, vin, license_plate, capacity, vehicle_type, is_active) VALUES
('Sprinter 1', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_HERE_1', 'PLATE_1', 11, 'passenger_van', true),
('Sprinter 2', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_HERE_2', 'PLATE_2', 14, 'passenger_van', true),
('Sprinter 3', 'Mercedes-Benz', 'Sprinter', 2025, 'VIN_HERE_3', 'PLATE_3', 14, 'passenger_van', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 3: CREATE TIME CARDS TABLE
-- ============================================

-- Daily time cards (for 150 air-mile exemption days)
CREATE TABLE IF NOT EXISTS time_cards (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  work_reporting_location TEXT NOT NULL DEFAULT 'Walla Walla Travel Office',
  work_reporting_lat DECIMAL(10,8), -- GPS of office
  work_reporting_lng DECIMAL(11,8),
  
  -- Clock times
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  
  -- Calculated hours
  driving_hours DECIMAL(4,2) DEFAULT 0, -- Max 10 for passengers
  on_duty_hours DECIMAL(4,2) DEFAULT 0, -- Max 15 for passengers
  
  -- Status
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed'
  notes TEXT,
  
  -- Signature
  driver_signature TEXT, -- base64 PNG
  signature_timestamp TIMESTAMP,
  
  -- Compliance tracking
  exceeds_driving_limit BOOLEAN DEFAULT false, -- > 10 hours
  exceeds_on_duty_limit BOOLEAN DEFAULT false, -- > 15 hours
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, date)
);

-- Index for lookups
CREATE INDEX idx_time_cards_driver_date ON time_cards(driver_id, date DESC);
CREATE INDEX idx_time_cards_status ON time_cards(status);

-- ============================================
-- STEP 4: CREATE TRIP TRACKING TABLE
-- ============================================

-- Track trips and distances for exemption monitoring
CREATE TABLE IF NOT EXISTS daily_trips (
  id SERIAL PRIMARY KEY,
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Base location (Walla Walla office)
  base_location_name TEXT DEFAULT 'Walla Walla Travel Office',
  base_location_lat DECIMAL(10,8) NOT NULL,
  base_location_lng DECIMAL(11,8) NOT NULL,
  
  -- Furthest point reached
  furthest_point_name TEXT,
  furthest_point_lat DECIMAL(10,8),
  furthest_point_lng DECIMAL(11,8),
  
  -- Distance calculation
  max_air_miles DECIMAL(10,2), -- Maximum distance from base
  exceeded_150_miles BOOLEAN DEFAULT false,
  
  -- Route tracking
  route_points JSONB, -- Array of {lat, lng, timestamp, name}
  
  -- Trip details
  start_odometer INTEGER,
  end_odometer INTEGER,
  total_miles INTEGER,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_trips_driver_date ON daily_trips(driver_id, date DESC);
CREATE INDEX idx_daily_trips_exceeded ON daily_trips(exceeded_150_miles);

-- ============================================
-- STEP 5: CREATE MONTHLY EXEMPTION TRACKER
-- ============================================

-- Track monthly exemption status (8-day rule)
CREATE TABLE IF NOT EXISTS monthly_exemption_status (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start_date DATE NOT NULL, -- First day of month
  
  -- Count tracking
  days_exceeded_150_miles INTEGER DEFAULT 0,
  requires_eld BOOLEAN DEFAULT false, -- True if > 8 days
  
  -- Alert tracking
  alert_sent_at_7_days BOOLEAN DEFAULT false,
  alert_sent_at_8_days BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, month_start_date)
);

-- Index
CREATE INDEX idx_monthly_exemption_driver ON monthly_exemption_status(driver_id, month_start_date DESC);

-- ============================================
-- STEP 6: CREATE WEEKLY HOS TRACKER
-- ============================================

-- Track weekly hours (60/70 hour limits)
CREATE TABLE IF NOT EXISTS weekly_hos (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Sunday or Monday
  
  -- Hours accumulation
  total_driving_hours DECIMAL(5,2) DEFAULT 0,
  total_on_duty_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Limit type
  limit_type VARCHAR(10) DEFAULT '60', -- '60' or '70'
  limit_hours INTEGER DEFAULT 60,
  
  -- Violation tracking
  violation_flag BOOLEAN DEFAULT false,
  violation_description TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, week_start_date)
);

-- Index
CREATE INDEX idx_weekly_hos_driver ON weekly_hos(driver_id, week_start_date DESC);

-- ============================================
-- STEP 7: CREATE COMPANY INFO TABLE
-- ============================================

-- Store company/fleet information
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  
  -- Registration
  company_name TEXT DEFAULT 'Walla Walla Travel',
  usdot_number VARCHAR(20) DEFAULT '3603851',
  operating_authority_number TEXT,
  
  -- Location
  base_name TEXT DEFAULT 'Walla Walla Travel Office',
  base_address TEXT,
  base_city TEXT DEFAULT 'Walla Walla',
  base_state VARCHAR(2) DEFAULT 'WA',
  base_zip VARCHAR(10),
  base_lat DECIMAL(10,8), -- GPS coordinates for distance calculations
  base_lng DECIMAL(11,8),
  
  -- Settings
  weekly_limit_type VARCHAR(10) DEFAULT '60', -- '60' or '70'
  operates_7_days BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default company info (run once)
INSERT INTO company_info (company_name, usdot_number, base_name, base_city, base_state) 
VALUES ('Walla Walla Travel', '3603851', 'Walla Walla Travel Office', 'Walla Walla', 'WA')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 8: UPDATE EXISTING INSPECTIONS TABLE
-- ============================================

-- Add passenger vehicle specific fields to existing inspections table
ALTER TABLE inspections 
  ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id),
  ADD COLUMN IF NOT EXISTS vehicle_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS passenger_area_check BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emergency_equipment_check BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fire_extinguisher_check BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS first_aid_kit_check BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emergency_reflectors_check BOOLEAN DEFAULT true;

-- ============================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to calculate air-mile distance
-- (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_air_miles(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  r CONSTANT DECIMAL := 3440.065; -- Earth radius in nautical miles
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

-- Function to update monthly exemption status
CREATE OR REPLACE FUNCTION update_monthly_exemption_status()
RETURNS TRIGGER AS $$
DECLARE
  month_start DATE;
  exceedance_count INTEGER;
BEGIN
  -- Get first day of month
  month_start := DATE_TRUNC('month', NEW.date);
  
  -- Count days exceeded in this month
  SELECT COUNT(*) INTO exceedance_count
  FROM daily_trips
  WHERE driver_id = NEW.driver_id
    AND date >= month_start
    AND date < month_start + INTERVAL '1 month'
    AND exceeded_150_miles = true;
  
  -- Upsert monthly status
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

-- Trigger to auto-update monthly exemption status
DROP TRIGGER IF EXISTS trigger_update_monthly_exemption ON daily_trips;
CREATE TRIGGER trigger_update_monthly_exemption
  AFTER INSERT OR UPDATE ON daily_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_exemption_status();

-- ============================================
-- STEP 10: CREATE VIEWS FOR REPORTING
-- ============================================

-- View: Current day status for all drivers
CREATE OR REPLACE VIEW current_driver_status AS
SELECT 
  u.id as driver_id,
  u.name as driver_name,
  u.email,
  tc.id as time_card_id,
  tc.date,
  tc.clock_in_time,
  tc.clock_out_time,
  tc.driving_hours,
  tc.on_duty_hours,
  tc.status,
  v.vehicle_number,
  v.capacity as vehicle_capacity,
  dt.max_air_miles,
  dt.exceeded_150_miles,
  CASE 
    WHEN tc.driving_hours >= 10 THEN '🚨 Driving limit reached'
    WHEN tc.driving_hours >= 9 THEN '⚠️ Approaching 10hr limit'
    WHEN tc.on_duty_hours >= 15 THEN '🚨 On-duty limit reached'
    WHEN tc.on_duty_hours >= 14 THEN '⚠️ Approaching 15hr limit'
    ELSE '✅ Within limits'
  END as hos_status
FROM users u
LEFT JOIN time_cards tc ON u.id = tc.driver_id AND tc.date = CURRENT_DATE
LEFT JOIN vehicles v ON tc.vehicle_id = v.id
LEFT JOIN daily_trips dt ON tc.id = dt.time_card_id
WHERE u.role = 'driver' AND u.is_active = true;

-- View: Monthly exemption dashboard
CREATE OR REPLACE VIEW monthly_exemption_dashboard AS
SELECT 
  u.id as driver_id,
  u.name as driver_name,
  mes.month_start_date,
  mes.days_exceeded_150_miles,
  mes.requires_eld,
  CASE
    WHEN mes.days_exceeded_150_miles >= 8 THEN '🚨 ELD Required'
    WHEN mes.days_exceeded_150_miles >= 7 THEN '⚠️ 1 day remaining'
    WHEN mes.days_exceeded_150_miles >= 6 THEN '⚠️ 2 days remaining'
    ELSE '✅ Within exemption'
  END as exemption_status,
  8 - COALESCE(mes.days_exceeded_150_miles, 0) as days_remaining
FROM users u
LEFT JOIN monthly_exemption_status mes 
  ON u.id = mes.driver_id 
  AND mes.month_start_date = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'driver' AND u.is_active = true;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify setup:

-- 1. Check drivers
SELECT id, name, email, role FROM users WHERE role = 'driver';

-- 2. Check vehicles
SELECT id, vehicle_number, make, model, year, capacity FROM vehicles WHERE is_active = true;

-- 3. Check company info
SELECT * FROM company_info;

-- 4. Check table structure
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('time_cards', 'daily_trips', 'monthly_exemption_status', 'weekly_hos')
ORDER BY table_name;

-- ============================================
-- DONE!
-- ============================================

-- Your database is now ready for the time card system!
-- Next: Build the UI components
