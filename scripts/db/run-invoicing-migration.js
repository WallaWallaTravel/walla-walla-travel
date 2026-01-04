#!/usr/bin/env node

/**
 * Run Invoicing System Migration
 * Executes the add-invoicing-system.sql migration
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 Starting Invoicing System Migration...\n');

  // Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to database at:', testResult.rows[0].now);
    console.log('');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'migrations', 'add-invoicing-system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    console.log('');

    // Execute migration
    console.log('⚙️  Executing migration...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await pool.query(migrationSQL);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration executed successfully!');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'tour_offers', 'restaurants', 'lunch_orders')
      ORDER BY table_name
    `);

    console.log('✅ Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Verify bookings columns
    console.log('🔍 Verifying bookings table updates...');
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('actual_hours', 'estimated_hours', 'hourly_rate', 'ready_for_final_invoice')
      ORDER BY column_name
    `);

    console.log('✅ Bookings columns added:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });
    console.log('');

    // Verify view
    console.log('🔍 Verifying view...');
    const viewResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pending_final_invoices
    `);
    console.log('✅ View "pending_final_invoices" created');
    console.log(`   Currently ${viewResult.rows[0].count} pending invoices`);
    console.log('');

    // Check sample restaurants
    console.log('🔍 Checking sample data...');
    const restaurantsResult = await pool.query(`
      SELECT COUNT(*) as count FROM restaurants
    `);
    console.log('✅ Sample restaurants inserted:');
    console.log(`   ${restaurantsResult.rows[0].count} restaurants in database`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test admin dashboard: http://localhost:3000/admin/invoices');
    console.log('2. Test hour sync workflow');
    console.log('3. Add customer tip UI');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ MIGRATION FAILED!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some objects may already exist. This is usually safe.');
      console.log('   The migration uses IF NOT EXISTS clauses.');
    } else {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


