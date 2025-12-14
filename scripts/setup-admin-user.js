#!/usr/bin/env node
/**
 * Setup Admin User
 *
 * Creates or updates the main admin account with full access
 * Usage: node scripts/setup-admin-user.js
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupAdminUser() {
  const client = await pool.connect();

  try {
    console.log('\n🔐 Admin User Setup\n');
    console.log('Email: info@wallawalla.travel');
    console.log('Role: admin (full access)\n');

    // Prompt for password
    const password = await question('Enter password for this account: ');

    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Hash password with strong salt rounds
    console.log('\n⏳ Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create or update user
    const result = await client.query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active,
           name = EXCLUDED.name,
           updated_at = NOW()
       RETURNING id, email, name, role`,
      ['info@wallawalla.travel', 'Walla Walla Travel Admin', passwordHash, 'admin', true]
    );

    console.log('\n✅ Admin user created/updated successfully!\n');
    console.log('   Email: info@wallawalla.travel');
    console.log('   Name: Walla Walla Travel Admin');
    console.log('   Role: admin (full access)');
    console.log('   User ID:', result.rows[0].id);
    console.log('\n🎉 You can now login at:');
    console.log('   - https://admin.wallawalla.travel');
    console.log('   - https://partner.wallawalla.travel');
    console.log('   - https://driver.wallawalla.travel\n');
  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    throw error;
  } finally {
    rl.close();
    client.release();
    await pool.end();
  }
}

setupAdminUser();
