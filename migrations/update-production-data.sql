-- ============================================
-- PRODUCTION DATA UPDATE
-- Date: 2025-10-16
-- Purpose: Update users and vehicles with real production data
-- ============================================

-- ============================================
-- PART 1: UPDATE USERS
-- ============================================

-- 1. Update or Insert Janine Bergevin
-- Check if user exists and update, otherwise insert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = 'janinebergevin@hotmail.com') THEN
    UPDATE users
    SET
      name = 'Janine Bergevin',
      phone = '(206) 949-2662',
      role = 'driver',
      updated_at = CURRENT_TIMESTAMP
    WHERE email = 'janinebergevin@hotmail.com';
    RAISE NOTICE 'Updated existing user: Janine Bergevin';
  ELSE
    INSERT INTO users (email, name, phone, role, password_hash, is_active, created_at, updated_at)
    VALUES (
      'janinebergevin@hotmail.com',
      'Janine Bergevin',
      '(206) 949-2662',
      'driver',
      '$2a$10$defaultpasswordhash123456789012345678901234567890123456',  -- Placeholder - set real password
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Inserted new user: Janine Bergevin';
  END IF;
END $$;

-- 2. Update Eric Critchlow
UPDATE users
SET
  email = 'evcritchlow@gmail.com',
  name = 'Eric Critchlow',
  phone = '(206) 713-7576',
  role = 'driver',  -- Change to 'admin' if Eric is the owner
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'eric@wallawallatravel.com' OR email = 'evcritchlow@gmail.com';

-- If Eric should be admin instead of driver, run this:
-- UPDATE users SET role = 'admin' WHERE email = 'evcritchlow@gmail.com';

-- 3. Insert Ryan Madsen (new driver)
INSERT INTO users (email, name, phone, role, password_hash, is_active, created_at, updated_at)
VALUES (
  'madsry@gmail.com',
  'Ryan Madsen',
  '(509) 540-3600',
  'driver',
  '$2a$10$defaultpasswordhash123456789012345678901234567890123456',  -- Placeholder - set real password
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- PART 2: UPDATE VEHICLES
-- ============================================

-- 1. Update Sprinter 1
UPDATE vehicles
SET
  vehicle_number = 'Sprinter 1',
  year = 2025,
  make = 'Mercedes-Benz',
  model = 'Sprinter',
  capacity = 11,
  vin = 'WIZAKEHYOSP793096',
  license_plate = 'HOST WW',
  status = 'available',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE vehicle_number = 'Sprinter 1' OR id = 1;

-- 2. Update Sprinter 2
UPDATE vehicles
SET
  vehicle_number = 'Sprinter 2',
  year = 2025,
  make = 'Mercedes-Benz',
  model = 'Sprinter',
  capacity = 14,
  vin = 'W1Z4NGHY7ST202333',
  license_plate = 'TBD',
  status = 'available',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE vehicle_number = 'Sprinter 2' OR id = 2;

-- 3. Update Sprinter 3
UPDATE vehicles
SET
  vehicle_number = 'Sprinter 3',
  year = 2025,
  make = 'Mercedes-Benz',
  model = 'Sprinter',
  capacity = 14,
  vin = 'W1Z4NGHY5ST206462',
  license_plate = 'TBD',
  status = 'available',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE vehicle_number = 'Sprinter 3' OR id = 3;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check updated users
SELECT id, email, name, phone, role, is_active
FROM users
WHERE email IN ('janinebergevin@hotmail.com', 'evcritchlow@gmail.com', 'madsry@gmail.com')
ORDER BY name;

-- Check updated vehicles
SELECT id, vehicle_number, year, make, model, capacity, vin, license_plate, status, is_active
FROM vehicles
WHERE vehicle_number IN ('Sprinter 1', 'Sprinter 2', 'Sprinter 3')
ORDER BY vehicle_number;

-- ============================================
-- NOTES FOR PASSWORD SETUP
-- ============================================

/*
IMPORTANT: After running this migration, you need to set proper passwords for the users.

Option 1: Use the password reset script (recommended for production)
  node scripts/set-driver-passwords.js

Option 2: Generate password hashes manually using bcrypt:
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('temporary_password', 10);

  Then update:
  UPDATE users SET password_hash = '[generated_hash]' WHERE email = 'janinebergevin@hotmail.com';
  UPDATE users SET password_hash = '[generated_hash]' WHERE email = 'madsry@gmail.com';

Option 3: Have users reset their passwords via the app's password reset flow
*/

-- ============================================
-- END OF MIGRATION
-- ============================================
