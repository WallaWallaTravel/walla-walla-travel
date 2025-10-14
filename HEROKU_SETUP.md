# 🚀 HEROKU POSTGRES SETUP GUIDE
**Created:** October 13, 2025  
**Project:** Walla Walla Travel App

---

## 📋 SETUP STEPS

### Step 1: Login to Heroku
```bash
heroku login
# Press Enter to open browser and authenticate
```

### Step 2: Create Heroku App (if not exists)
```bash
# Navigate to project directory
cd /Users/temp/walla-walla-final

# Create new Heroku app with a unique name
heroku create walla-walla-travel

# Or if app already exists, add remote
heroku git:remote -a walla-walla-travel
```

### Step 3: Add Heroku Postgres
```bash
# Add free Postgres addon (mini plan)
heroku addons:create heroku-postgresql:mini

# Or for production (paid - essential-0 plan)
heroku addons:create heroku-postgresql:essential-0
```

### Step 4: Get Database URL
```bash
# View DATABASE_URL
heroku config:get DATABASE_URL

# Copy the URL - it looks like:
# postgres://username:password@host:5432/database
```

### Step 5: Set Local Environment Variable
```bash
# Create .env.local file (if not exists)
echo "DATABASE_URL=your_database_url_here" > .env.local

# Make sure .env.local is in .gitignore
echo ".env.local" >> .gitignore
```

### Step 6: Connect to Database
```bash
# Connect via Heroku CLI
heroku pg:psql

# Or get connection info
heroku pg:info
```

### Step 7: Run Database Migrations
```bash
# Connect and create tables
heroku pg:psql < docs/migrations/001_initial_schema.sql

# Or run via Node.js migration script
npm run db:migrate
```

---

## 🔧 COMMON COMMANDS

### Database Management
```bash
# View database info
heroku pg:info

# Connect to database
heroku pg:psql

# View all addons
heroku addons

# View logs
heroku logs --tail

# Backup database
heroku pg:backups:capture

# List backups
heroku pg:backups

# Download backup
heroku pg:backups:download
```

### Environment Variables
```bash
# List all config vars
heroku config

# Set a config var
heroku config:set KEY=value

# Get specific config var
heroku config:get DATABASE_URL

# Remove a config var
heroku config:unset KEY
```

---

## 🏗️ DATABASE INITIALIZATION

### Create Initial Schema
```sql
-- Run this in heroku pg:psql

-- 1. Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'driver',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 2. Create vehicles table
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    license_plate VARCHAR(50) UNIQUE,
    mileage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create inspections table
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    type VARCHAR(20) NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspection_data JSONB NOT NULL DEFAULT '{}',
    start_mileage INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add test data
INSERT INTO users (email, password_hash, name, role) 
VALUES ('driver@test.com', 'temp_hash', 'Test Driver', 'driver');

INSERT INTO vehicles (vehicle_number, make, model, year, license_plate)
VALUES ('V001', 'Ford', 'Transit', 2022, 'WA-123456');
```

---

## 📦 REQUIRED NPM PACKAGES

```bash
# Install PostgreSQL client for Node.js
npm install pg
npm install @types/pg --save-dev

# Install connection pooling
npm install pg-pool
npm install @types/pg-pool --save-dev

# Install migration tool (optional)
npm install node-pg-migrate --save-dev

# Install bcrypt for password hashing
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

---

## 🔌 CONNECTION CONFIGURATION

### Basic Connection (lib/db.ts)
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Heroku
  }
});

export default pool;
```

### With Connection Pooling
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

export default pool;
```

---

## 🚨 TROUBLESHOOTING

### Common Issues

**1. SSL Connection Error**
```typescript
// Add SSL configuration
ssl: {
  rejectUnauthorized: false
}
```

**2. Connection Timeout**
```bash
# Check if database is available
heroku pg:info

# Restart database
heroku pg:restart
```

**3. Permission Denied**
```bash
# Check credentials
heroku config:get DATABASE_URL

# Reset credentials
heroku pg:credentials:rotate
```

**4. Database Full**
```bash
# Check database size
heroku pg:info

# Upgrade plan if needed
heroku addons:upgrade heroku-postgresql:basic
```

---

## 💰 HEROKU POSTGRES PRICING

| Plan | Price | Rows | Storage | Connections |
|------|-------|------|---------|-------------|
| Mini | $5/mo | 10K | 1GB | 20 |
| Basic | $9/mo | 10M | 10GB | 20 |
| Essential-0 | $15/mo | 10M | 10GB | 20 |
| Essential-1 | $50/mo | - | 25GB | 60 |
| Essential-2 | $95/mo | - | 50GB | 120 |

**Recommendation:** Start with Mini ($5) for development, upgrade to Essential-0 ($15) for production.

---

## 🔐 SECURITY BEST PRACTICES

1. **Never commit DATABASE_URL** - Use environment variables
2. **Rotate credentials regularly** - `heroku pg:credentials:rotate`
3. **Use connection pooling** - Prevents connection exhaustion
4. **Enable SSL** - Always use SSL in production
5. **Backup regularly** - `heroku pg:backups:schedule`

---

## 📝 NEXT STEPS

After Heroku login completes:

1. ✅ Create Heroku app (or use existing)
2. ✅ Add Postgres addon
3. ✅ Get DATABASE_URL
4. ✅ Install pg packages
5. ✅ Create lib/db.ts
6. ✅ Run initial migrations
7. ✅ Test connection
8. ✅ Replace mock functions

---

**Ready to continue?** Let me know when you've logged into Heroku!