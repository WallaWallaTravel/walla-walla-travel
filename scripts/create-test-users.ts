/**
 * Create Test Users Script
 * 
 * Creates admin and driver test users for development.
 * 
 * Usage: npx tsx scripts/create-test-users.ts
 */

import { hashPassword } from '../lib/auth/passwords';
import { query } from '../lib/db';

async function createTestUsers() {
  console.log('🔐 Creating test users...\n');
  
  try {
    // Hash passwords
    console.log('Hashing passwords...');
    const adminPassword = await hashPassword('Admin123!');
    const driverPassword = await hashPassword('Driver123!');
    
    // Create admin user
    console.log('\n1️⃣  Creating admin user...');
    const adminResult = await query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
       RETURNING id, email, name, role`,
      ['admin@wallawalla.travel', 'Admin User', adminPassword, 'admin', true]
    );
    
    console.log('✅ Admin created:', adminResult.rows[0]);
    console.log('   📧 Email: admin@wallawalla.travel');
    console.log('   🔑 Password: Admin123!');
    
    // Create driver user
    console.log('\n2️⃣  Creating driver user...');
    const driverResult = await query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
       RETURNING id, email, name, role`,
      ['driver@wallawalla.travel', 'John Driver', driverPassword, 'driver', true]
    );
    
    console.log('✅ Driver created:', driverResult.rows[0]);
    console.log('   📧 Email: driver@wallawalla.travel');
    console.log('   🔑 Password: Driver123!');
    
    console.log('\n✨ Test users created successfully!');
    console.log('\n🔗 Login at: http://localhost:3000/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();

