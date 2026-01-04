#!/usr/bin/env node
/**
 * Run Admin Supervisor System Migration
 * Applies migration 003_admin_supervisor_system.sql to production database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load .env.local file if it exists
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
    console.log('📄 Loaded environment from .env.local\n');
  }
} catch (error) {
  // Silent fail - .env.local is optional
}

async function runMigration() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!\n');
    console.error('Please set DATABASE_URL using one of these methods:\n');
    console.error('1. Export it in your shell:');
    console.error('   export DATABASE_URL="postgres://user:pass@host:5432/dbname"\n');
    console.error('2. Create .env.local file with:');
    console.error('   DATABASE_URL=postgres://user:pass@host:5432/dbname\n');
    console.error('3. Get from Heroku:');
    console.error('   heroku config:get DATABASE_URL --app walla-walla-travel\n');
    process.exit(1);
  }

  // Mask DATABASE_URL for security (show only host)
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log(`🔗 Database: ${dbUrl.host}${dbUrl.pathname}`);
  console.log(`👤 User: ${dbUrl.username}\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('amazonaws.com') ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/003_admin_supervisor_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running Admin Supervisor System migration...\n');
    console.log('This will:');
    console.log('  - Add role column to users table');
    console.log('  - Create client_services table');
    console.log('  - Create vehicle_assignments table');
    console.log('  - Add client_service_id to time_cards');
    console.log('  - Create supervisor dashboard views\n');

    // Execute migration
    const result = await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');

    // Update Ryan's account to admin
    console.log('\n📝 Updating Ryan Madsen to admin role...');
    const updateResult = await client.query(`
      UPDATE users
      SET role = 'admin'
      WHERE email = 'madsry@gmail.com'
      RETURNING id, name, email, role
    `);

    if (updateResult.rows.length > 0) {
      const user = updateResult.rows[0];
      console.log('✅ Ryan Madsen updated to admin role:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    } else {
      console.log('⚠️  User madsry@gmail.com not found - will need to be updated manually');
    }

    // Verify migration
    console.log('\n📊 Verifying migration...');

    const verification = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') AS role_column,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_services') AS client_services_table,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vehicle_assignments') AS vehicle_assignments_table,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'time_cards' AND column_name = 'client_service_id') AS client_service_id_column,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'active_shifts') AS active_shifts_view,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'fleet_status') AS fleet_status_view
    `);

    const v = verification.rows[0];
    console.log('\nVerification Results:');
    console.log(`  ✓ Role column: ${v.role_column > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ✓ client_services table: ${v.client_services_table > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ✓ vehicle_assignments table: ${v.vehicle_assignments_table > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ✓ client_service_id column: ${v.client_service_id_column > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ✓ active_shifts view: ${v.active_shifts_view > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`  ✓ fleet_status view: ${v.fleet_status_view > 0 ? 'EXISTS' : 'MISSING'}`);

    const allGood = v.role_column > 0 &&
                    v.client_services_table > 0 &&
                    v.vehicle_assignments_table > 0 &&
                    v.client_service_id_column > 0 &&
                    v.active_shifts_view > 0 &&
                    v.fleet_status_view > 0;

    if (allGood) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║ ✅ ADMIN SYSTEM READY FOR DEVELOPMENT!                ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('\nNext steps:');
      console.log('  1. Build admin middleware');
      console.log('  2. Create admin dashboard UI');
      console.log('  3. Build vehicle assignment endpoints');
      console.log('  4. Enhance driver workflow');
    } else {
      console.log('\n⚠️  Some components missing - check verification results above');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
