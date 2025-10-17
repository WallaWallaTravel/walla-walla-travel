import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
const isHeroku = databaseUrl && databaseUrl.includes('amazonaws.com');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isHeroku ? {
    rejectUnauthorized: false
  } : false,
});

async function setDriverPasswords() {
  console.log('🔐 Setting driver passwords...\n');

  try {
    // Generate password hashes
    const defaultPassword = 'travel2024'; // Default password for all drivers
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Update each driver's password with PRODUCTION EMAIL ADDRESSES
    const drivers = [
      { email: 'owner@wallawallatravel.com', name: 'Owner' },
      { email: 'evcritchlow@gmail.com', name: 'Eric Critchlow' },
      { email: 'janinebergevin@hotmail.com', name: 'Janine Bergevin' },
      { email: 'madsry@gmail.com', name: 'Ryan Madsen' },
    ];

    for (const driver of drivers) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, name',
        [passwordHash, driver.email]
      );

      if (result.rowCount > 0) {
        console.log(`✅ Updated password for ${driver.name} (${driver.email})`);
      } else {
        console.log(`⚠️  Driver not found: ${driver.email}`);
      }
    }

    console.log('\n📝 Production Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: owner@wallawallatravel.com');
    console.log('Email: evcritchlow@gmail.com (Eric Critchlow)');
    console.log('Email: janinebergevin@hotmail.com (Janine Bergevin)');
    console.log('Email: madsry@gmail.com (Ryan Madsen)');
    console.log('Password (for all): travel2024');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Also add a test driver for development
    const testDriverHash = await bcrypt.hash('test123456', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active) 
       VALUES ($1, $2, $3, $4, true) 
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $2`,
      ['driver@test.com', testDriverHash, 'Test Driver', 'driver']
    );
    console.log('\n✅ Test driver also available:');
    console.log('Email: driver@test.com');
    console.log('Password: test123456');

  } catch (error) {
    console.error('❌ Error setting passwords:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setDriverPasswords();