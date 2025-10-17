# Admin Supervisor System - Deployment Guide

## Overview

The Admin Supervisor System enables Ryan Madsen (owner) to manage driver shifts, assign vehicles with client billing, and track real-time operations through a comprehensive dashboard.

## System Components

### 1. Database Layer
- **Role-Based Access Control**: Added `role` column to `users` table (admin/supervisor/driver)
- **Client Services Table**: Tracks client pickups, dropoffs, billing calculations
- **Vehicle Assignments Table**: Links drivers, vehicles, and client services
- **Dashboard Views**: Optimized views for real-time shift and fleet monitoring

### 2. API Endpoints

#### Admin Endpoints
- `GET /api/admin/dashboard` - Real-time dashboard data (shifts, fleet, statistics)
- `POST /api/admin/assign-vehicle` - Assign vehicle to driver with client and rate

#### Driver Client Service Endpoints
- `POST /api/driver/client-pickup` - Log client pickup time and location
- `GET /api/driver/client-pickup` - Get current active service
- `POST /api/driver/client-dropoff` - Log dropoff, calculate hours and cost
- `GET /api/driver/client-dropoff` - Get service ready for dropoff with billing preview

### 3. User Interface
- **Admin Dashboard** (`/admin/dashboard`) - Full supervisor control panel
- **Vehicle Assignment Modal** - Integrated vehicle assignment with client and rate entry
- **Real-time Updates** - Auto-refresh every 30 seconds (configurable)
- **Statistics Cards** - Active shifts, fleet utilization, revenue, services

## Deployment Steps

### Step 1: Run Database Migration

The migration script is located at `scripts/run-admin-migration.cjs`.

**Important**: You need the production DATABASE_URL to run this migration.

#### Option A: Run on Heroku Directly

```bash
# Get Heroku Postgres credentials
heroku pg:credentials:url DATABASE --app walla-walla-travel

# Connect to Heroku Postgres and run migration
heroku pg:psql --app walla-walla-travel < migrations/003_admin_supervisor_system.sql
```

#### Option B: Run Locally with DATABASE_URL

```bash
# Set DATABASE_URL environment variable (get from Heroku dashboard)
export DATABASE_URL="postgres://username:password@host:5432/database"

# Run migration script
node scripts/run-admin-migration.cjs
```

#### What the Migration Does:
1. ✅ Adds `role` column to `users` table (default: 'driver')
2. ✅ Creates `client_services` table for billing tracking
3. ✅ Creates `vehicle_assignments` table for assignment history
4. ✅ Adds `client_service_id` to `time_cards` table
5. ✅ Creates `active_shifts` view for supervisor dashboard
6. ✅ Creates `fleet_status` view for real-time fleet monitoring
7. ✅ Updates Ryan Madsen's account to 'admin' role
8. ✅ Creates triggers for timestamp management

### Step 2: Verify Migration

After running the migration, verify it succeeded:

```bash
# Check if role column exists
heroku pg:psql --app walla-walla-travel -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role';"

# Check if client_services table exists
heroku pg:psql --app walla-walla-travel -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_services';"

# Verify Ryan has admin role
heroku pg:psql --app walla-walla-travel -c "SELECT name, email, role FROM users WHERE email = 'madsry@gmail.com';"
```

Expected output:
```
 name        | email            | role
-------------+------------------+-------
 Ryan Madsen | madsry@gmail.com | admin
```

### Step 3: Deploy Code to Production

The code is ready to deploy. Run the standard deployment process:

```bash
# Build project
npm run build

# Commit changes
git add .
git commit -m "feat: add admin supervisor system with client billing"

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

### Step 4: Verify Deployment

After deployment completes:

1. **Test Admin Login**:
   - Go to https://walla-walla-final.vercel.app/login
   - Login as Ryan: `madsry@gmail.com` (use existing password)
   - Should successfully authenticate

2. **Access Admin Dashboard**:
   - Navigate to https://walla-walla-final.vercel.app/admin/dashboard
   - Should see:
     - Active Shifts panel (currently empty if no drivers clocked in)
     - Fleet Status panel (showing all vehicles)
     - Statistics cards (shifts, revenue, fleet utilization)
     - Auto-refresh indicator

3. **Test Permissions**:
   - Try accessing `/admin/dashboard` with a driver account
   - Should receive "Access denied - Admin or supervisor role required" error

## Feature Usage

### For Supervisors (Ryan):

#### 1. Monitor Active Shifts
- Dashboard auto-refreshes every 30 seconds
- View all drivers currently clocked in
- See which vehicles are assigned
- Track client services in progress

#### 2. Assign Vehicle to Driver
When a driver clocks in without a vehicle:

1. Click "Assign Vehicle" button on their shift card
2. Enter client information:
   - Client Name (required)
   - Hourly Rate (e.g., $150.00)
   - Optional: Phone, email, notes
3. Select from available vehicles
4. Click "Assign Vehicle"

System automatically:
- Updates driver's time card with vehicle
- Creates client service record
- Sets vehicle status to 'assigned'
- Creates assignment tracking record

#### 3. Track Fleet Status
- See which vehicles are:
  - **Available** (green) - Ready for assignment
  - **In Use** (blue) - Currently assigned to driver
  - **Out of Service** (red) - Reported defects
- View current driver and client for each vehicle
- Monitor defect notes

#### 4. Monitor Revenue
- Real-time today's revenue calculation
- Total service hours completed
- Active vs completed services
- Per-shift billing details

### For Drivers:

#### 1. Clock In (Same as Before)
- Select vehicle OR "No Vehicle - Non-Driving Task"
- If no vehicle selected, supervisor can assign later

#### 2. Client Pickup (NEW)
After supervisor assigns client and vehicle:

```javascript
// Frontend integration (coming in next phase)
import api from '@/lib/api-client';

await api.clientService.logPickup({
  clientServiceId: 123,
  pickupLocation: "123 Main St, Walla Walla, WA",
  pickupLat: 46.0646,
  pickupLng: -118.3430
});
```

System automatically:
- Records pickup time (server timestamp)
- Updates service status to 'in_progress'
- Stores pickup location and coordinates

#### 3. Client Dropoff (NEW)
When service is complete:

```javascript
await api.clientService.logDropoff({
  clientServiceId: 123,
  dropoffLocation: "456 Oak Ave, Walla Walla, WA",
  dropoffLat: 46.0700,
  dropoffLng: -118.3500
});
```

System automatically:
- Records dropoff time
- **Calculates service hours**: `(dropoff_time - pickup_time) in hours`
- **Calculates total cost**: `service_hours × hourly_rate`
- Updates service status to 'completed'
- Updates vehicle assignment status to 'completed'

Example calculation:
```
Pickup:  10:00 AM
Dropoff:  6:00 PM
Service Hours: 8.0 hrs
Hourly Rate: $150.00/hr
Total Cost: $1,200.00
```

## Database Schema

### client_services Table
```sql
id                  SERIAL PRIMARY KEY
time_card_id        INTEGER (FK to time_cards)
driver_id           INTEGER (FK to users)
vehicle_id          INTEGER (FK to vehicles)
client_name         VARCHAR(255)
client_phone        VARCHAR(20)
client_email        VARCHAR(255)
pickup_time         TIMESTAMP WITH TIME ZONE
pickup_location     TEXT
pickup_lat          DECIMAL(10,8)
pickup_lng          DECIMAL(11,8)
dropoff_time        TIMESTAMP WITH TIME ZONE
dropoff_location    TEXT
dropoff_lat         DECIMAL(10,8)
dropoff_lng         DECIMAL(11,8)
hourly_rate         DECIMAL(10,2)  -- e.g., 150.00
service_hours       DECIMAL(10,2)  -- Auto-calculated
total_cost          DECIMAL(10,2)  -- Auto-calculated
service_type        VARCHAR(50)
passenger_count     INTEGER
notes               TEXT
status              VARCHAR(20)  -- assigned, in_progress, completed
created_at          TIMESTAMP WITH TIME ZONE
updated_at          TIMESTAMP WITH TIME ZONE
```

### vehicle_assignments Table
```sql
id                  SERIAL PRIMARY KEY
time_card_id        INTEGER (FK to time_cards)
driver_id           INTEGER (FK to users)
vehicle_id          INTEGER (FK to vehicles)
client_service_id   INTEGER (FK to client_services)
assigned_by         INTEGER (FK to users) -- Supervisor who assigned
assigned_at         TIMESTAMP WITH TIME ZONE
assignment_notes    TEXT
status              VARCHAR(20)  -- active, completed
created_at          TIMESTAMP WITH TIME ZONE
updated_at          TIMESTAMP WITH TIME ZONE
```

## API Authentication

All admin endpoints require:
1. Valid session token (cookie-based auth)
2. User role = 'admin' OR 'supervisor'

Middleware: `lib/admin-auth.ts`
- `requireAdmin()` - Allows admin or supervisor
- `requireAdminOnly()` - Allows admin only
- `isAdminOrSupervisor()` - Check without requiring auth
- `getCurrentUserRole()` - Get user's role for UI logic

## Next Phase: Driver Workflow Enhancement

The driver workflow UI enhancements are planned for the next deployment phase:

1. **Client Pickup Step** (after pre-trip inspection)
   - Automatic popup when client assigned
   - Pickup location input
   - GPS coordinate capture
   - "Start Service" button

2. **Client Dropoff Step** (before post-trip inspection)
   - Automatic popup when pickup completed
   - Dropoff location input
   - **Real-time billing preview**: Shows elapsed hours and estimated cost
   - "Complete Service" confirmation
   - Display final billing: "8.0 hrs × $150/hr = $1,200"

3. **Service Status Indicators**
   - Show current service status in driver workflow
   - Display elapsed service time
   - Show current billing estimate

## Troubleshooting

### Migration Issues

**Error: "role column already exists"**
- This is fine - migration uses `ADD COLUMN IF NOT EXISTS`
- Migration will skip existing columns

**Error: "client_services table already exists"**
- This is fine - migration uses `CREATE TABLE IF NOT EXISTS`
- Migration is idempotent and safe to re-run

**Error: "database connection failed"**
- Verify DATABASE_URL is correct
- Check Heroku Postgres is running: `heroku pg:info --app walla-walla-travel`
- Ensure SSL is configured: `ssl: { rejectUnauthorized: false }`

### Admin Access Issues

**"Access denied - Admin or supervisor role required"**
- Check Ryan's role: `SELECT role FROM users WHERE email = 'madsry@gmail.com'`
- Should be 'admin' - if not, run: `UPDATE users SET role = 'admin' WHERE email = 'madsry@gmail.com'`

**"Unauthorized - Please log in"**
- Clear cookies and re-login
- Check session token exists: Open DevTools → Application → Cookies
- Verify `session_token` cookie is present

### Dashboard Issues

**"No active shifts" but drivers are clocked in**
- Check `active_shifts` view exists: `SELECT * FROM information_schema.views WHERE table_name = 'active_shifts'`
- Verify drivers have clock_out_time = NULL: `SELECT * FROM time_cards WHERE clock_out_time IS NULL`

**Fleet status not showing vehicles**
- Check `fleet_status` view exists
- Verify vehicles.is_active = true: `SELECT COUNT(*) FROM vehicles WHERE is_active = true`

**Statistics showing $0.00 revenue**
- Normal if no services completed today
- Services only count when status = 'completed' AND dropoff_time logged

## Security Considerations

1. **Role-Based Access**:
   - Only admin/supervisor can access `/admin/*` routes
   - Drivers cannot assign vehicles or view dashboard
   - Middleware enforces role checks server-side

2. **Data Validation**:
   - Hourly rate must be > 0
   - Vehicle must be available before assignment
   - Pickup must be logged before dropoff
   - Service must belong to current driver

3. **Audit Trail**:
   - All assignments track `assigned_by` (supervisor ID)
   - Timestamps on all records (`created_at`, `updated_at`)
   - Assignment notes for documentation

4. **Financial Integrity**:
   - Service hours calculated server-side (not client-side)
   - Total cost calculated server-side using PostgreSQL
   - Billing formula: `EXTRACT(EPOCH FROM (dropoff - pickup)) / 3600 * hourly_rate`
   - No manual override of calculated values

## Support

For issues or questions:
1. Check Vercel deployment logs: https://vercel.com/walla-walla-travel-app/walla-walla-final
2. Check Heroku Postgres logs: `heroku logs --tail --app walla-walla-travel`
3. Review API logs in browser DevTools → Network tab
4. Contact: madsry@gmail.com

---

**Admin System Version**: 1.0.0
**Last Updated**: 2025-10-16
**Status**: Ready for Production Deployment
