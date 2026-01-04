/**
 * Create Test Users
 * 
 * Creates test admin and driver accounts for development
 * Usage: node scripts/create-test-users.js
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Creating test users...\n');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const driverPassword = await bcrypt.hash('driver123', 12);
    
    // Create admin user
    const adminResult = await client.query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           updated_at = NOW()
       RETURNING id, email, name, role`,
      ['admin@wallawalla.travel', 'Admin User', adminPassword, 'admin', true]
    );
    
    console.log('✅ Admin user created/updated:');
    console.log(`   Email: ${adminResult.rows[0].email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${adminResult.rows[0].role}\n`);
    
    // Create driver user
    const driverResult = await client.query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           updated_at = NOW()
       RETURNING id, email, name, role`,
      ['driver@wallawalla.travel', 'Test Driver', driverPassword, 'driver', true]
    );
    
    console.log('✅ Driver user created/updated:');
    console.log(`   Email: ${driverResult.rows[0].email}`);
    console.log(`   Password: driver123`);
    console.log(`   Role: ${driverResult.rows[0].role}\n`);
    
    console.log('🎉 Test users ready!\n');
    console.log('You can now login at http://localhost:3000/login\n');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUsers();

