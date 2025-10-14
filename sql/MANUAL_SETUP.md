-- MANUAL DATABASE SETUP GUIDE
-- Use this if the automated script doesn't work

## METHOD 1: Heroku Dashboard (Easiest!)

1. Go to: https://dashboard.heroku.com/apps/walla-walla-travel
2. Click "Resources" tab
3. Click "Heroku Postgres"
4. Click "Dataclips" in the top menu
5. Click "Create Dataclip"
6. Paste the SQL from each file below (one at a time)
7. Click "Run Query"

## METHOD 2: Using psql directly

If you have PostgreSQL client installed:

```bash
# Get database URL
heroku config:get DATABASE_URL -a walla-walla-travel

# Connect with psql
psql "YOUR_DATABASE_URL_HERE"

# Then paste SQL from each file
```

## SQL FILES TO RUN (IN ORDER):

### File 1: Create Tables
Location: sql/01-create-tables.sql

### File 2: Add Drivers  
Location: sql/02-add-drivers.sql

### File 3: Add Vehicles
Location: sql/03-add-vehicles.sql

### File 4: Add Company Info
Location: sql/04-add-company-info.sql

### File 5: Create Functions
Location: sql/05-create-functions.sql

### File 6: Create Views
Location: sql/06-create-views.sql

## METHOD 3: Node.js Script (Recommended!)

Run this command:

```bash
npm run db:setup
```

This uses your DATABASE_URL from .env.local to apply all SQL automatically.

## Verification

After setup, run:

```bash
npm run db:verify
```

This checks that all tables were created successfully.
