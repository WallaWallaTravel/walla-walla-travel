# Production Database Update Guide

**Date**: 2025-10-16
**Purpose**: Update production database with real driver information and vehicle VIN/license plate data

## 📋 Overview

This update includes:
- **3 driver accounts** with production email addresses and phone numbers
- **3 Mercedes-Benz Sprinter vehicles** with VIN numbers and license plates

---

## 🚀 Quick Start

### Option 1: Using the SQL Migration File (Recommended)

```bash
# Connect to your production database
psql $DATABASE_URL

# Run the migration
\i migrations/update-production-data.sql
```

### Option 2: Using the Password Script + Manual SQL

```bash
# Step 1: Run the SQL updates manually via psql or database GUI
# (Use the SQL commands from update-production-data.sql)

# Step 2: Set passwords for all drivers
node scripts/set-driver-passwords.js
```

---

## 📝 What Will Be Updated

### Users Table

| Name | Email | Phone | Role | Status |
|------|-------|-------|------|--------|
| Janine Bergevin | janinebergevin@hotmail.com | (206) 949-2662 | driver | New/Updated |
| Eric Critchlow | evcritchlow@gmail.com | (206) 713-7576 | driver | Updated email |
| Ryan Madsen | madsry@gmail.com | (509) 540-3600 | driver | New account |

**Default Password**: `travel2024` (for all drivers)

### Vehicles Table

| Vehicle | Year | Make | Model | VIN | License Plate | Capacity |
|---------|------|------|-------|-----|---------------|----------|
| Sprinter 1 | 2025 | Mercedes-Benz | Sprinter | WIZAKEHYOSP793096 | HOST WW | 11 |
| Sprinter 2 | 2025 | Mercedes-Benz | Sprinter | W1Z4NGHY7ST202333 | TBD | 14 |
| Sprinter 3 | 2025 | Mercedes-Benz | Sprinter | W1Z4NGHY5ST206462 | TBD | 14 |

---

## 🔐 Security & Passwords

### After Running the Migration

1. **Set Passwords Immediately**:
   ```bash
   node scripts/set-driver-passwords.js
   ```

2. **Notify Drivers**:
   - Send each driver their login email
   - Provide the default password: `travel2024`
   - **Strongly recommend they change it** after first login

3. **Production Security**:
   - Consider implementing password change on first login
   - Enable 2FA if available
   - Monitor login attempts

---

## 📊 Pre-Deployment Checklist

Before running the migration:

- [ ] **Backup the database**
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

- [ ] **Test on staging first** (if available)

- [ ] **Verify current data**
  ```sql
  SELECT id, email, name, phone, role FROM users WHERE role = 'driver';
  SELECT id, vehicle_number, vin, license_plate FROM vehicles;
  ```

- [ ] **Schedule downtime window** (if needed)

- [ ] **Notify users** of any temporary service interruption

---

## 🧪 Verification Steps

After running the migration, verify the updates:

### 1. Check Users

```sql
-- Verify all drivers are present
SELECT id, email, name, phone, role, is_active
FROM users
WHERE email IN (
  'janinebergevin@hotmail.com',
  'evcritchlow@gmail.com',
  'madsry@gmail.com'
)
ORDER BY name;

-- Should return 3 rows
```

### 2. Check Vehicles

```sql
-- Verify all vehicles are updated
SELECT id, vehicle_number, year, make, model, capacity, vin, license_plate, status
FROM vehicles
WHERE vehicle_number IN ('Sprinter 1', 'Sprinter 2', 'Sprinter 3')
ORDER BY vehicle_number;

-- Should return 3 rows with updated VIN and license plate
```

### 3. Test Logins

Try logging in with each driver account:
- janinebergevin@hotmail.com / travel2024
- evcritchlow@gmail.com / travel2024
- madsry@gmail.com / travel2024

---

## 🛠️ Manual SQL Commands

If you prefer to run updates individually:

### Update Users

```sql
-- Janine Bergevin
UPDATE users SET
  email = 'janinebergevin@hotmail.com',
  name = 'Janine Bergevin',
  phone = '(206) 949-2662',
  role = 'driver'
WHERE email LIKE '%janine%' OR id = [user_id];

-- Eric Critchlow
UPDATE users SET
  email = 'evcritchlow@gmail.com',
  name = 'Eric Critchlow',
  phone = '(206) 713-7576',
  role = 'driver'
WHERE email = 'eric@wallawallatravel.com' OR email = 'evcritchlow@gmail.com';

-- Ryan Madsen (new)
INSERT INTO users (email, name, phone, role, is_active, created_at, updated_at)
VALUES (
  'madsry@gmail.com',
  'Ryan Madsen',
  '(509) 540-3600',
  'driver',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  updated_at = CURRENT_TIMESTAMP;
```

### Update Vehicles

```sql
-- Sprinter 1
UPDATE vehicles SET
  vin = 'WIZAKEHYOSP793096',
  license_plate = 'HOST WW',
  year = 2025,
  capacity = 11
WHERE vehicle_number = 'Sprinter 1';

-- Sprinter 2
UPDATE vehicles SET
  vin = 'W1Z4NGHY7ST202333',
  license_plate = 'TBD',
  year = 2025,
  capacity = 14
WHERE vehicle_number = 'Sprinter 2';

-- Sprinter 3
UPDATE vehicles SET
  vin = 'W1Z4NGHY5ST206462',
  license_plate = 'TBD',
  year = 2025,
  capacity = 14
WHERE vehicle_number = 'Sprinter 3';
```

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Restore from backup
psql $DATABASE_URL < backup-[date].sql

-- Or rollback specific changes:
-- Users
UPDATE users SET email = 'eric@wallawallatravel.com' WHERE email = 'evcritchlow@gmail.com';
DELETE FROM users WHERE email IN ('janinebergevin@hotmail.com', 'madsry@gmail.com');

-- Vehicles
UPDATE vehicles SET vin = NULL, license_plate = NULL WHERE vehicle_number IN ('Sprinter 1', 'Sprinter 2', 'Sprinter 3');
```

---

## 📞 Support & Contact

If you encounter issues:

1. **Check Logs**: Review application and database logs
2. **Verify Connections**: Ensure DATABASE_URL is correct
3. **Test Locally**: Try the migration on a local database first
4. **Contact Developer**: [Your contact information]

---

## ✅ Post-Migration Tasks

After successful migration:

1. **Document the changes** in your change log
2. **Update any documentation** that referenced old email addresses
3. **Test the full workflow**:
   - [ ] Login with each driver account
   - [ ] Clock in/out functionality
   - [ ] Vehicle assignment
   - [ ] Inspection forms
4. **Monitor for 24 hours** for any issues
5. **Collect feedback** from drivers

---

## 🎯 Next Steps

After this migration:

1. **Update License Plates**: Change "TBD" to actual plates when available
   ```sql
   UPDATE vehicles SET license_plate = '[actual_plate]' WHERE vehicle_number = 'Sprinter 2';
   UPDATE vehicles SET license_plate = '[actual_plate]' WHERE vehicle_number = 'Sprinter 3';
   ```

2. **Consider Password Policy**: Implement password expiration/complexity requirements

3. **User Training**: Ensure all drivers know how to use the system

---

## 📚 Related Documentation

- `/scripts/set-driver-passwords.js` - Password management script
- `/migrations/update-production-data.sql` - Full SQL migration
- `/docs/DATABASE.md` - Database schema documentation
- `/docs/USER_MANAGEMENT.md` - User management guide

---

**Last Updated**: 2025-10-16
**Version**: 1.0.0
