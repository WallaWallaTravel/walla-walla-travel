import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
});

async function applyUpdates() {
  console.log('🚀 Applying production database updates...\n');

  try {
    // ============================================
    // PART 1: UPDATE USERS
    // ============================================
    console.log('═══ UPDATING USERS ═══\n');

    // 1. Update Eric's email
    const ericUpdate = await pool.query(`
      UPDATE users
      SET email = 'evcritchlow@gmail.com',
          name = 'Eric Critchlow',
          updated_at = CURRENT_TIMESTAMP
      WHERE email = 'eric@wallawallatravel.com'
      RETURNING id, email, name
    `);

    if (ericUpdate.rowCount > 0) {
      console.log(`✅ Updated Eric Critchlow: ${ericUpdate.rows[0].email}`);
    }

    // 2. Update Janine's email
    const janineUpdate = await pool.query(`
      UPDATE users
      SET email = 'janinebergevin@hotmail.com',
          name = 'Janine Bergevin',
          updated_at = CURRENT_TIMESTAMP
      WHERE email = 'janine@wallawallatravel.com'
      RETURNING id, email, name
    `);

    if (janineUpdate.rowCount > 0) {
      console.log(`✅ Updated Janine Bergevin: ${janineUpdate.rows[0].email}`);
    }

    // 3. Insert Ryan Madsen (new driver)
    const defaultPassword = 'travel2024';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const ryanInsert = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name
    `, ['madsry@gmail.com', passwordHash, 'Ryan Madsen', 'driver']);

    console.log(`✅ Added Ryan Madsen: ${ryanInsert.rows[0].email}`);

    // ============================================
    // PART 2: UPDATE VEHICLES
    // ============================================
    console.log('\n═══ UPDATING VEHICLES ═══\n');

    // 1. Update Sprinter 1
    const sprinter1 = await pool.query(`
      UPDATE vehicles
      SET vin = 'WIZAKEHYOSP793096',
          license_plate = 'HOST WW',
          year = 2025,
          capacity = 11,
          status = 'available',
          updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_number = 'Sprinter 1'
      RETURNING id, vehicle_number, vin, license_plate, capacity
    `);
    console.log(`✅ Updated Sprinter 1: VIN ${sprinter1.rows[0].vin}, Plate ${sprinter1.rows[0].license_plate}`);

    // 2. Update Sprinter 2
    const sprinter2 = await pool.query(`
      UPDATE vehicles
      SET vin = 'W1Z4NGHY7ST202333',
          license_plate = 'TBD',
          year = 2025,
          capacity = 14,
          status = 'available',
          updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_number = 'Sprinter 2'
      RETURNING id, vehicle_number, vin, license_plate, capacity
    `);
    console.log(`✅ Updated Sprinter 2: VIN ${sprinter2.rows[0].vin}, Plate ${sprinter2.rows[0].license_plate}`);

    // 3. Update Sprinter 3
    const sprinter3 = await pool.query(`
      UPDATE vehicles
      SET vin = 'W1Z4NGHY5ST206462',
          license_plate = 'TBD',
          year = 2025,
          capacity = 14,
          status = 'available',
          updated_at = CURRENT_TIMESTAMP
      WHERE vehicle_number = 'Sprinter 3'
      RETURNING id, vehicle_number, vin, license_plate, capacity
    `);
    console.log(`✅ Updated Sprinter 3: VIN ${sprinter3.rows[0].vin}, Plate ${sprinter3.rows[0].license_plate}`);

    // ============================================
    // PART 3: UPDATE ALL DRIVER PASSWORDS
    // ============================================
    console.log('\n═══ SETTING DRIVER PASSWORDS ═══\n');

    const drivers = [
      { email: 'owner@wallawallatravel.com', name: 'Owner' },
      { email: 'evcritchlow@gmail.com', name: 'Eric Critchlow' },
      { email: 'janinebergevin@hotmail.com', name: 'Janine Bergevin' },
      { email: 'madsry@gmail.com', name: 'Ryan Madsen' },
    ];

    for (const driver of drivers) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, name',
        [passwordHash, driver.email]
      );

      if (result.rowCount > 0) {
        console.log(`✅ Set password for ${driver.name}`);
      }
    }

    // ============================================
    // VERIFICATION
    // ============================================
    console.log('\n\n🔍 ═══ VERIFICATION ═══\n');

    // Verify users
    console.log('👥 PRODUCTION USERS:\n');
    const users = await pool.query(`
      SELECT id, email, name, role, is_active
      FROM users
      WHERE email IN ('owner@wallawallatravel.com', 'janinebergevin@hotmail.com', 'evcritchlow@gmail.com', 'madsry@gmail.com')
      ORDER BY name
    `);
    console.table(users.rows);

    // Verify vehicles
    console.log('\n🚐 PRODUCTION VEHICLES:\n');
    const vehicles = await pool.query(`
      SELECT id, vehicle_number, year, make, model, capacity, vin, license_plate, status
      FROM vehicles
      WHERE vehicle_number IN ('Sprinter 1', 'Sprinter 2', 'Sprinter 3')
      ORDER BY vehicle_number
    `);
    console.table(vehicles.rows);

    // ============================================
    // SUCCESS SUMMARY
    // ============================================
    console.log('\n\n✅ ═══ PRODUCTION UPDATE COMPLETE ═══\n');
    console.log('📋 Summary:');
    console.log(`   • Updated ${users.rowCount} driver accounts`);
    console.log(`   • Updated ${vehicles.rowCount} vehicles`);
    console.log(`   • All passwords set to: travel2024\n`);

    console.log('📧 Driver Login Credentials:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   • owner@wallawallatravel.com');
    console.log('   • evcritchlow@gmail.com (Eric Critchlow)');
    console.log('   • janinebergevin@hotmail.com (Janine Bergevin)');
    console.log('   • madsry@gmail.com (Ryan Madsen)');
    console.log('   Password for all: travel2024');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⚠️  Next Steps:');
    console.log('   1. Test login with each driver account');
    console.log('   2. Distribute credentials securely to drivers');
    console.log('   3. Remind drivers to change password on first login');
    console.log('   4. Update Sprinter 2 & 3 license plates when available\n');

  } catch (error) {
    console.error('\n❌ ERROR during update:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyUpdates().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
