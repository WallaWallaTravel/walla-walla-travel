-- Migration Script for Walla Walla Travel App
-- Run this in Heroku Postgres: heroku pg:psql < scripts/migrate.sql

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'driver',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('driver', 'admin', 'dispatcher'))
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 2. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    license_plate VARCHAR(50) UNIQUE,
    vin VARCHAR(50) UNIQUE,
    mileage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_year CHECK (year >= 1900 AND year <= 2100),
    CONSTRAINT valid_mileage CHECK (mileage >= 0)
);

-- Indexes for vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active);

-- 3. INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL DEFAULT CURRENT_TIME,
    end_time TIME,
    
    -- Inspection Items (stored as JSONB for flexibility)
    inspection_data JSONB NOT NULL DEFAULT '{}',
    
    -- Mileage
    start_mileage INTEGER,
    end_mileage INTEGER,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    issues_found BOOLEAN DEFAULT false,
    issues_description TEXT,
    
    -- Signature
    driver_signature TEXT,
    signed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_type CHECK (type IN ('pre_trip', 'post_trip')),
    CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_mileage CHECK (
        (start_mileage IS NULL OR start_mileage >= 0) AND
        (end_mileage IS NULL OR end_mileage >= 0) AND
        (end_mileage IS NULL OR start_mileage IS NULL OR end_mileage >= start_mileage)
    )
);

-- Indexes for inspections
CREATE INDEX IF NOT EXISTS idx_inspections_driver ON inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(type);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- 4. WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Workflow Steps
    pre_trip_inspection_id INTEGER REFERENCES inspections(id),
    post_trip_inspection_id INTEGER REFERENCES inspections(id),
    
    -- Client Activities (stored as JSONB array)
    client_activities JSONB DEFAULT '[]',
    
    -- HOS (Hours of Service) Tracking
    start_time TIME,
    end_time TIME,
    break_time_minutes INTEGER DEFAULT 0,
    total_hours_worked DECIMAL(4,2),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_driver_date UNIQUE(driver_id, workflow_date),
    CONSTRAINT valid_workflow_status CHECK (status IN ('not_started', 'in_progress', 'completed')),
    CONSTRAINT valid_hours CHECK (total_hours_worked >= 0 AND total_hours_worked <= 24),
    CONSTRAINT valid_break_time CHECK (break_time_minutes >= 0)
);

-- Indexes for workflows
CREATE INDEX IF NOT EXISTS idx_workflows_driver ON workflows(driver_id);
CREATE INDEX IF NOT EXISTS idx_workflows_date ON workflows(workflow_date);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

-- 5. CLIENT_NOTES TABLE
CREATE TABLE IF NOT EXISTS client_notes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Client Information
    client_name VARCHAR(255) NOT NULL,
    visit_time TIME NOT NULL,
    
    -- Visit Details
    pickup_location TEXT,
    dropoff_location TEXT,
    passenger_count INTEGER DEFAULT 1,
    
    -- Notes
    notes TEXT,
    special_requests TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_passenger_count CHECK (passenger_count > 0),
    CONSTRAINT valid_client_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Indexes for client_notes
CREATE INDEX IF NOT EXISTS idx_client_notes_workflow ON client_notes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_driver ON client_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_status ON client_notes(status);
CREATE INDEX IF NOT EXISTS idx_client_notes_time ON client_notes(visit_time);

-- 6. SESSIONS TABLE (for future scaling)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_client_notes_updated_at BEFORE UPDATE ON client_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
-- Test user (password will be hashed in application)
INSERT INTO users (email, password_hash, name, role) 
VALUES ('driver@test.com', 'temp_hash_will_be_replaced', 'Test Driver', 'driver')
ON CONFLICT (email) DO NOTHING;

-- Test vehicles
INSERT INTO vehicles (vehicle_number, make, model, year, license_plate, mileage) VALUES
('V001', 'Ford', 'Transit', 2022, 'WA-123456', 45000),
('V002', 'Mercedes', 'Sprinter', 2023, 'WA-789012', 12000)
ON CONFLICT (vehicle_number) DO NOTHING;

-- Cleanup: Remove expired sessions (run periodically)
-- DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;

-- Show table creation results
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'vehicles', 'inspections', 'workflows', 'client_notes', 'sessions')
ORDER BY table_name, ordinal_position;

-- Show all tables created
\dt