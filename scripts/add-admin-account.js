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

async function addAdminAccount() {
  console.log('🔐 Adding admin account...\n');

  try {
    // First check if admin already exists
    const checkResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      ['info@wallawalla.travel']
    );

    if (checkResult.rows.length > 0) {
      const user = checkResult.rows[0];
      console.log(`📋 User already exists:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      
      if (user.role !== 'admin') {
        console.log('\n🔄 Updating role to admin...');
        await pool.query(
          'UPDATE users SET role = $1 WHERE email = $2',
          ['admin', 'info@wallawalla.travel']
        );
        console.log('✅ Role updated to admin');
      } else {
        console.log('\n✅ Already an admin!');
      }
    } else {
      console.log('➕ Creating new admin account...');
      
      // Create new admin account
      const adminPassword = 'admin2024'; // Change this to something secure
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, is_active) 
         VALUES ($1, $2, $3, $4, true)`,
        ['info@wallawalla.travel', passwordHash, 'Admin User', 'admin']
      );
      
      console.log('✅ Admin account created!');
    }

    console.log('\n📝 Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: info@wallawalla.travel');
    console.log('Password: admin2024');
    console.log('Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  SECURITY: Change this password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addAdminAccount();



