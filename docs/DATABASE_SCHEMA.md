# 📊 DATABASE SCHEMA - Walla Walla Travel App
**Created:** October 13, 2025  
**Database:** PostgreSQL (Heroku Postgres)

---

## 🎯 SCHEMA OVERVIEW

The database schema supports driver management, vehicle inspections, workflow tracking, and client operations for the Walla Walla Travel transportation service.

---

## 📋 TABLES

### 1. **users** (Authentication & User Management)
```sql
CREATE TABLE users (
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2. **vehicles** (Vehicle Management)
```sql
CREATE TABLE vehicles (
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

CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
```

### 3. **inspections** (Pre-trip & Post-trip Inspections)
```sql
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
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

CREATE INDEX idx_inspections_driver ON inspections(driver_id);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_type ON inspections(type);
```

### 4. **workflows** (Daily Driver Workflow Tracking)
```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id),
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
    CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed')),
    CONSTRAINT valid_hours CHECK (total_hours_worked >= 0 AND total_hours_worked <= 24)
);

CREATE INDEX idx_workflows_driver ON workflows(driver_id);
CREATE INDEX idx_workflows_date ON workflows(workflow_date);
CREATE INDEX idx_workflows_status ON workflows(status);
```

### 5. **client_notes** (Client Visit Notes)
```sql
CREATE TABLE client_notes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id),
    driver_id INTEGER NOT NULL REFERENCES users(id),
    
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
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_client_notes_workflow ON client_notes(workflow_id);
CREATE INDEX idx_client_notes_driver ON client_notes(driver_id);
CREATE INDEX idx_client_notes_status ON client_notes(status);
```

### 6. **sessions** (User Sessions - Optional for scaling)
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## 🔄 RELATIONSHIPS

```
users (1) ─────< (∞) inspections
users (1) ─────< (∞) workflows
users (1) ─────< (∞) client_notes
users (1) ─────< (∞) sessions

vehicles (1) ──< (∞) inspections

workflows (1) ─< (∞) client_notes
workflows (1) ── (0,1) inspections (pre_trip)
workflows (1) ── (0,1) inspections (post_trip)
```

---

## 📝 SAMPLE DATA

```sql
-- Insert test users
INSERT INTO users (email, password_hash, name, role) VALUES
('driver@test.com', '$2b$10$...', 'Test Driver', 'driver'),
('admin@wallawalla.travel', '$2b$10$...', 'Admin User', 'admin');

-- Insert test vehicles
INSERT INTO vehicles (vehicle_number, make, model, year, license_plate) VALUES
('V001', 'Ford', 'Transit', 2022, 'WA-123456'),
('V002', 'Mercedes', 'Sprinter', 2023, 'WA-789012');

-- Insert test workflow
INSERT INTO workflows (driver_id, workflow_date, status) VALUES
(1, CURRENT_DATE, 'in_progress');
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **Password Hashing**: Use bcrypt with salt rounds >= 10
2. **SQL Injection**: Use parameterized queries only
3. **Data Validation**: Enforce constraints at DB level
4. **Sensitive Data**: Consider encryption for signatures
5. **Audit Trail**: Add trigger for updated_at timestamps

---

## 🚀 MIGRATION STRATEGY

### Phase 1: Core Tables (Today)
1. Create users table
2. Create vehicles table
3. Migrate hardcoded login to DB

### Phase 2: Inspections (This Week)
1. Create inspections table
2. Migrate mock save functions
3. Test inspection workflow

### Phase 3: Workflows (Next Week)
1. Create workflows table
2. Create client_notes table
3. Implement full workflow tracking

### Phase 4: Sessions (Future)
1. Create sessions table (for scaling)
2. Implement session management
3. Add Redis cache layer (optional)

---

## 📊 INDEXES STRATEGY

**Performance Indexes Created:**
- Email lookups (authentication)
- Date-based queries (reporting)
- Foreign key relationships
- Status filtering

**Future Indexes to Consider:**
- Full-text search on notes
- Composite indexes for complex queries
- Partial indexes for active records

---

## 🔄 BACKUP & RECOVERY

**Heroku Postgres Features:**
- Automatic daily backups
- Point-in-time recovery
- Follower databases for read replicas
- Dataclips for reporting

---

**Last Updated:** October 13, 2025  
**Database:** Heroku Postgres  
**Connection:** Via DATABASE_URL environment variable