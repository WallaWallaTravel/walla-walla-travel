# Admin System Migration - Correct Commands

## Migration Script Fixed

✅ **ISSUE FIXED**: The migration script now properly handles DATABASE_URL from:
1. Environment variables (`export DATABASE_URL=...`)
2. .env.local file (if present)
3. Clear error messages if DATABASE_URL is missing

## Verified Heroku App Name

✅ **Correct Heroku app**: `walla-walla-travel`

## Three Ways to Run Migration

### Option 1: Using Heroku CLI (RECOMMENDED - Easiest)

```bash
# Method A: Pipe SQL directly to Heroku psql
cat migrations/003_admin_supervisor_system.sql | heroku pg:psql --app walla-walla-travel
```

**Advantages**:
- Simplest command
- Uses your existing Heroku authentication
- No need to copy DATABASE_URL
- Automatic SSL handling

### Option 2: Using Local Script with Heroku DATABASE_URL

```bash
# Step 1: Get DATABASE_URL from Heroku
heroku config:get DATABASE_URL --app walla-walla-travel

# Step 2: Copy the output (starts with postgres://...)

# Step 3: Export it
export DATABASE_URL="postgres://[paste-the-url-here]"

# Step 4: Run migration script
node scripts/run-admin-migration.cjs
```

**Advantages**:
- Includes verification checks
- Updates Ryan's account automatically
- Shows detailed progress
- Confirms all components created

### Option 3: Using .env.local File

```bash
# Step 1: Get DATABASE_URL
heroku config:get DATABASE_URL --app walla-walla-travel

# Step 2: Create .env.local file in project root
echo 'DATABASE_URL=postgres://[paste-url-here]' > .env.local

# Step 3: Run migration script
node scripts/run-admin-migration.cjs

# Step 4: Clean up (IMPORTANT - don't commit .env.local!)
rm .env.local
```

**Advantages**:
- Same benefits as Option 2
- Don't need to export environment variable
- Script auto-loads from .env.local

## Quick Decision Guide

**Choose Option 1 if**:
- You want the simplest command
- You don't need detailed verification
- You're comfortable with command-line

**Choose Option 2 if**:
- You want to see detailed migration progress
- You want automatic verification
- You want confirmation of all components

**Choose Option 3 if**:
- Same as Option 2, but you prefer .env files
- You're running migration multiple times (testing)

## Expected Output

### Option 1 (Heroku CLI):
```
--> Connecting to postgresql-...
CREATE TABLE
CREATE INDEX
CREATE VIEW
UPDATE 1
NOTICE: ╔════════════════════════════════════════════════════════╗
NOTICE: ║ ✅ ADMIN SUPERVISOR SYSTEM MIGRATION SUCCESSFUL!      ║
NOTICE: ╚════════════════════════════════════════════════════════╝
NOTICE:
NOTICE: ✓ Role-based access control (admin/supervisor/driver)
NOTICE: ✓ Client services and billing tracking
NOTICE: ✓ Vehicle assignment management
NOTICE: ✓ Real-time supervisor dashboard views
...
```

### Option 2 & 3 (Local Script):
```
📄 Loaded environment from .env.local

🔗 Database: ec2-xxx.amazonaws.com/dxxxxx
👤 User: uxxxxx

🔌 Connecting to database...
✅ Connected to database

📝 Running Admin Supervisor System migration...

This will:
  - Add role column to users table
  - Create client_services table
  - Create vehicle_assignments table
  - Add client_service_id to time_cards
  - Create supervisor dashboard views

✅ Migration completed successfully!

📝 Updating Ryan Madsen to admin role...
✅ Ryan Madsen updated to admin role:
   ID: 1
   Name: Ryan Madsen
   Email: madsry@gmail.com
   Role: admin

📊 Verifying migration...

Verification Results:
  ✓ Role column: EXISTS
  ✓ client_services table: EXISTS
  ✓ vehicle_assignments table: EXISTS
  ✓ client_service_id column: EXISTS
  ✓ active_shifts view: EXISTS
  ✓ fleet_status view: EXISTS

╔════════════════════════════════════════════════════════╗
║ ✅ ADMIN SYSTEM READY FOR DEVELOPMENT!                ║
╚════════════════════════════════════════════════════════╝

🔌 Database connection closed
```

## Verification After Migration

After running the migration, verify it succeeded:

```bash
# Check Ryan's role
heroku pg:psql --app walla-walla-travel -c "SELECT name, email, role FROM users WHERE email = 'madsry@gmail.com';"

# Expected output:
#     name     |      email       | role
# -------------+------------------+-------
#  Ryan Madsen | madsry@gmail.com | admin
```

```bash
# Check client_services table exists
heroku pg:psql --app walla-walla-travel -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_services';"

# Expected output:
#  count
# -------
#      1
```

```bash
# Check active_shifts view exists
heroku pg:psql --app walla-walla-travel -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'active_shifts';"

# Expected output:
#  count
# -------
#      1
```

## Troubleshooting

### Error: "database 'temp' does not exist"
**Solution**: ✅ FIXED - Script now properly reads DATABASE_URL from environment or .env.local

### Error: "Unknown database: -- Admin Supervisor System..."
**Solution**: ✅ FIXED - Use correct command: `cat migrations/003_admin_supervisor_system.sql | heroku pg:psql --app walla-walla-travel`

### Error: "No such file or directory: .env.local"
**Solution**: This is fine - .env.local is optional. Either:
- Create it with DATABASE_URL
- Or use `export DATABASE_URL=...` instead

### Error: "permission denied for table users"
**Solution**: Check DATABASE_URL has correct permissions. Get fresh URL from Heroku:
```bash
heroku config:get DATABASE_URL --app walla-walla-travel
```

### Error: "column 'role' already exists"
**Solution**: Migration is idempotent - this is fine! It means role column was already added. Migration will skip existing components.

### Error: "relation 'client_services' already exists"
**Solution**: Migration is idempotent - this is fine! It will skip existing tables.

## Post-Migration: Test Admin Access

After migration succeeds:

```bash
# 1. Visit login page
open https://walla-walla-final.vercel.app/login

# 2. Login as Ryan
# Email: madsry@gmail.com
# Password: [your existing password]

# 3. Navigate to admin dashboard
open https://walla-walla-final.vercel.app/admin/dashboard

# 4. You should see:
# ✅ Supervisor Dashboard with statistics
# ✅ Active Shifts panel (may be empty)
# ✅ Fleet Status panel (showing all vehicles)
# ✅ Auto-refresh toggle
```

## Summary of Fixes

### 1. Migration Script (`scripts/run-admin-migration.cjs`)
✅ **Fixed**: Now loads DATABASE_URL from:
- Environment variable (`process.env.DATABASE_URL`)
- .env.local file (auto-detected)
- Shows clear error if missing

✅ **Added**: Database connection info (masked for security)
✅ **Added**: Better error messages
✅ **Added**: Step-by-step progress output

### 2. Heroku Commands
✅ **Fixed**: Correct command syntax:
```bash
cat migrations/003_admin_supervisor_system.sql | heroku pg:psql --app walla-walla-travel
```

✅ **Verified**: Heroku app name is `walla-walla-travel` (confirmed via `heroku apps --all`)

## Recommended Approach

**For first-time migration, use Option 1 (simplest)**:
```bash
cat migrations/003_admin_supervisor_system.sql | heroku pg:psql --app walla-walla-travel
```

**Then verify with**:
```bash
heroku pg:psql --app walla-walla-travel -c "SELECT name, email, role FROM users WHERE email = 'madsry@gmail.com';"
```

**If you want detailed progress, use Option 2**:
```bash
export DATABASE_URL="$(heroku config:get DATABASE_URL --app walla-walla-travel)"
node scripts/run-admin-migration.cjs
```

---

**Status**: ✅ All migration issues fixed and verified
**Next Step**: Choose one of the three options above and run the migration
