# 🔧 DATABASE SETUP - FIXED!

**Problem:** The Heroku CLI script failed because it was trying to interpret the entire SQL file as a database name.

**Solution:** I've created **3 different ways** to set up your database. Pick the one that works best for you!

---

## ✅ METHOD 1: Node.js Script (EASIEST - RECOMMENDED!)

This uses your `DATABASE_URL` directly from `.env.local` - no Heroku CLI needed!

### Step 1: Make sure your .env.local has DATABASE_URL

Check that `/Users/temp/walla-walla-final/.env.local` contains:

```bash
DATABASE_URL=postgres://username:password@host:5432/database
```

If not, get it from Heroku:

```bash
heroku config:get DATABASE_URL -a walla-walla-travel
```

Then add it to your `.env.local` file.

### Step 2: Run the setup script

```bash
cd /Users/temp/walla-walla-final
npm run db:setup
```

This will:
- ✅ Create all tables (time_cards, daily_trips, etc.)
- ✅ Add your 3 drivers (Owner, Eric, Janine)
- ✅ Add your 3 vehicles (Sprinter 1, 2, 3)
- ✅ Add company info (USDOT #3603851)
- ✅ Create functions (distance calculation, exemption tracking)
- ✅ Create views (driver status, exemption dashboard)

### Step 3: Verify it worked

```bash
npm run db:verify
```

This checks that everything was created successfully.

---

## ✅ METHOD 2: Heroku Dashboard (NO CODE!)

If the Node script doesn't work, use the Heroku web interface:

### Step 1: Go to Heroku Dashboard

1. Visit: https://dashboard.heroku.com/apps/walla-walla-travel
2. Click **Resources** tab
3. Click **Heroku Postgres**
4. Click **Dataclips** in the top menu

### Step 2: Run each SQL file (in order!)

For each file below:
1. Click "Create Dataclip" or "New Query"
2. Copy the SQL from the file
3. Paste it into the query editor
4. Click "Run Query"

**Files to run (IN THIS ORDER):**

1. `/sql/01-create-tables.sql` - Creates all tables
2. `/sql/02-add-drivers.sql` - Adds your 3 drivers
3. `/sql/03-add-vehicles.sql` - Adds your 3 vehicles
4. `/sql/04-add-company-info.sql` - Adds company info
5. `/sql/05-create-functions.sql` - Creates helper functions
6. `/sql/06-create-views.sql` - Creates reporting views

Each should succeed with "Query completed successfully" or similar message.

---

## ✅ METHOD 3: Direct psql Connection

If you have PostgreSQL client installed locally:

### Step 1: Get database URL

```bash
heroku config:get DATABASE_URL -a walla-walla-travel
```

### Step 2: Connect with psql

```bash
psql "YOUR_DATABASE_URL_HERE"
```

### Step 3: Run each SQL file

```bash
\i sql/01-create-tables.sql
\i sql/02-add-drivers.sql
\i sql/03-add-vehicles.sql
\i sql/04-add-company-info.sql
\i sql/05-create-functions.sql
\i sql/06-create-views.sql
```

---

## 🎯 WHAT GETS CREATED

### Tables (5 new + 1 updated):
1. **time_cards** - Daily time tracking (clock in/out, hours, signatures)
2. **daily_trips** - Distance tracking for 150-mile exemption
3. **monthly_exemption_status** - Track 8-day rule per month
4. **weekly_hos** - Weekly hours of service (60/70 hour limits)
5. **company_info** - Your company details (USDOT #3603851)
6. **inspections** *(updated)* - Added passenger vehicle fields

### Data Inserted:
**Drivers (3):**
- Owner (owner@wallawallatravel.com)
- Eric Critchlow (eric@wallawallatravel.com)
- Janine Bergevin (janine@wallawallatravel.com)

**Vehicles (3):**
- Sprinter 1 - 11 passengers
- Sprinter 2 - 14 passengers
- Sprinter 3 - 14 passengers

**Company:**
- Walla Walla Travel
- USDOT #3603851
- Base: Walla Walla, WA

### Functions (2):
1. **calculate_air_miles()** - Calculates distance between two GPS points
2. **update_monthly_exemption_status()** - Auto-tracks 8-day rule

### Views (2):
1. **current_driver_status** - Shows all drivers' current status
2. **monthly_exemption_dashboard** - Shows monthly exemption tracking

---

## 🔍 VERIFY IT WORKED

### Quick Check:

```bash
npm run db:verify
```

### Manual Check:

Connect to your database and run:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('time_cards', 'daily_trips', 'monthly_exemption_status', 'weekly_hos')
ORDER BY table_name;

-- Check drivers
SELECT name, email FROM users WHERE role = 'driver';

-- Check vehicles
SELECT vehicle_number, capacity FROM vehicles;

-- Check company info
SELECT company_name, usdot_number FROM company_info;
```

You should see:
- ✅ 4 new tables
- ✅ 3 drivers
- ✅ 3 vehicles
- ✅ 1 company record

---

## ❌ TROUBLESHOOTING

### Error: "DATABASE_URL not found"

**Solution:** Add DATABASE_URL to your `.env.local`:

```bash
# Get it from Heroku
heroku config:get DATABASE_URL -a walla-walla-travel

# Add to .env.local
echo "DATABASE_URL=postgres://..." >> .env.local
```

### Error: "Cannot find module"

**Solution:** Make sure scripts are using ES modules:

```bash
# package.json should have:
"type": "module"
```

### Error: "Permission denied"

**Solution:** Make scripts executable:

```bash
chmod +x scripts/setup-database.js
chmod +x scripts/verify-database.js
```

### Still Not Working?

Use **Method 2** (Heroku Dashboard) - it's foolproof!

---

## 🎉 ONCE DATABASE IS SET UP

You're ready for **Phase C: Time Clock System**!

Tell me:
**"Database setup worked!"**

And I'll provide the complete time clock system with:
- Clock in/out pages
- GPS tracking
- HOS compliance (10/15/8 hour rules)
- Distance tracking (150-mile exemption)
- Digital signatures
- PDF time cards

---

## 📖 Files Reference

All SQL files are in: `/Users/temp/walla-walla-final/sql/`

- `01-create-tables.sql` - Creates all tables
- `02-add-drivers.sql` - Adds drivers
- `03-add-vehicles.sql` - Adds vehicles
- `04-add-company-info.sql` - Adds company
- `05-create-functions.sql` - Creates functions
- `06-create-views.sql` - Creates views
- `MANUAL_SETUP.md` - Detailed instructions

Scripts are in: `/Users/temp/walla-walla-final/scripts/`

- `setup-database.js` - Automated setup
- `verify-database.js` - Verification

---

**Try Method 1 first (npm run db:setup) - it's the easiest!** 🚀

Let me know which method you use and if it works!
