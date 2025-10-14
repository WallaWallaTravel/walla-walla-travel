-- Create time_cards table
CREATE TABLE IF NOT EXISTS time_cards (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  work_reporting_location TEXT NOT NULL DEFAULT 'Walla Walla Travel Office',
  work_reporting_lat DECIMAL(10,8),
  work_reporting_lng DECIMAL(11,8),
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  driving_hours DECIMAL(4,2) DEFAULT 0,
  on_duty_hours DECIMAL(4,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress',
  notes TEXT,
  driver_signature TEXT,
  signature_timestamp TIMESTAMP,
  exceeds_driving_limit BOOLEAN DEFAULT false,
  exceeds_on_duty_limit BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_time_cards_driver_date ON time_cards(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_cards_status ON time_cards(status);

-- Create daily_trips table
CREATE TABLE IF NOT EXISTS daily_trips (
  id SERIAL PRIMARY KEY,
  time_card_id INTEGER NOT NULL REFERENCES time_cards(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  base_location_name TEXT DEFAULT 'Walla Walla Travel Office',
  base_location_lat DECIMAL(10,8) NOT NULL,
  base_location_lng DECIMAL(11,8) NOT NULL,
  furthest_point_name TEXT,
  furthest_point_lat DECIMAL(10,8),
  furthest_point_lng DECIMAL(11,8),
  max_air_miles DECIMAL(10,2),
  exceeded_150_miles BOOLEAN DEFAULT false,
  route_points JSONB,
  start_odometer INTEGER,
  end_odometer INTEGER,
  total_miles INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_trips_driver_date ON daily_trips(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_trips_exceeded ON daily_trips(exceeded_150_miles);

-- Create monthly_exemption_status table
CREATE TABLE IF NOT EXISTS monthly_exemption_status (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start_date DATE NOT NULL,
  days_exceeded_150_miles INTEGER DEFAULT 0,
  requires_eld BOOLEAN DEFAULT false,
  alert_sent_at_7_days BOOLEAN DEFAULT false,
  alert_sent_at_8_days BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, month_start_date)
);

CREATE INDEX IF NOT EXISTS idx_monthly_exemption_driver ON monthly_exemption_status(driver_id, month_start_date DESC);

-- Create weekly_hos table
CREATE TABLE IF NOT EXISTS weekly_hos (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_driving_hours DECIMAL(5,2) DEFAULT 0,
  total_on_duty_hours DECIMAL(5,2) DEFAULT 0,
  limit_type VARCHAR(10) DEFAULT '60',
  limit_hours INTEGER DEFAULT 60,
  violation_flag BOOLEAN DEFAULT false,
  violation_description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_hos_driver ON weekly_hos(driver_id, week_start_date DESC);

-- Create company_info table
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  company_name TEXT DEFAULT 'Walla Walla Travel',
  usdot_number VARCHAR(20) DEFAULT '3603851',
  operating_authority_number TEXT,
  base_name TEXT DEFAULT 'Walla Walla Travel Office',
  base_address TEXT,
  base_city TEXT DEFAULT 'Walla Walla',
  base_state VARCHAR(2) DEFAULT 'WA',
  base_zip VARCHAR(10),
  base_lat DECIMAL(10,8),
  base_lng DECIMAL(11,8),
  weekly_limit_type VARCHAR(10) DEFAULT '60',
  operates_7_days BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add time_card_id to inspections table if it doesn't exist
ALTER TABLE inspections 
  ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id);
