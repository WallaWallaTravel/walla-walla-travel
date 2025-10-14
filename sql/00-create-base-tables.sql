-- Create base tables that other tables depend on

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'driver',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_number VARCHAR(50) NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  vin VARCHAR(17),
  license_plate VARCHAR(20),
  capacity INTEGER,
  vehicle_type VARCHAR(50) DEFAULT 'passenger_van',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_number ON vehicles(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- Inspections table (with passenger vehicle fields)
CREATE TABLE IF NOT EXISTS inspections (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  inspection_data JSONB,
  start_mileage INTEGER,
  end_mileage INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  issues_found BOOLEAN DEFAULT false,
  issues_description TEXT,
  vehicle_capacity INTEGER,
  passenger_area_check BOOLEAN DEFAULT true,
  emergency_equipment_check BOOLEAN DEFAULT true,
  fire_extinguisher_check BOOLEAN DEFAULT true,
  first_aid_kit_check BOOLEAN DEFAULT true,
  emergency_reflectors_check BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_driver_id ON inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(type);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, workflow_date)
);

CREATE INDEX IF NOT EXISTS idx_workflows_driver_date ON workflows(driver_id, workflow_date DESC);

-- Client notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  visit_time TIMESTAMP,
  pickup_location TEXT,
  dropoff_location TEXT,
  passenger_count INTEGER DEFAULT 1,
  notes TEXT,
  special_requests TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_driver_id ON client_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_workflow_id ON client_notes(workflow_id);
