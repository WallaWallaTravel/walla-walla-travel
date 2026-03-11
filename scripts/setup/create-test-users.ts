/**
 * Create Test Users Script
 * 
 * Creates admin and driver test users for development.
 * 
 * Usage: npx tsx scripts/create-test-users.ts
 */

import { hashPassword } from '../../lib/auth/passwords';
import { prisma } from '../../lib/prisma';

async function createTestUsers() {
  console.log('🔐 Creating test users...\n');
  
  try {
    // Hash passwords
    console.log('Hashing passwords...');
    const adminPassword = await hashPassword('Admin123!');
    const driverPassword = await hashPassword('Driver123!');
    
    // Create admin user
    console.log('\n1️⃣  Creating admin user...');
    const adminRows = await prisma.$queryRaw<Array<{ id: number; email: string; name: string; role: string }>>`
      INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES (${'admin@wallawalla.travel'}, ${'Admin User'}, ${adminPassword}, ${'admin'}, ${true}, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
       RETURNING id, email, name, role
    `;

    console.log('✅ Admin created:', adminRows[0]);
    console.log('   📧 Email: admin@wallawalla.travel');
    console.log('   🔑 Password: Admin123!');
    
    // Create driver user
    console.log('\n2️⃣  Creating driver user...');
    const driverRows = await prisma.$queryRaw<Array<{ id: number; email: string; name: string; role: string }>>`
      INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES (${'driver@wallawalla.travel'}, ${'John Driver'}, ${driverPassword}, ${'driver'}, ${true}, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
       RETURNING id, email, name, role
    `;

    console.log('✅ Driver created:', driverRows[0]);
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

