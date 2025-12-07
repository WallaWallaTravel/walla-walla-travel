#!/usr/bin/env node
/**
 * Run Multi-Tenant & Wine Directory Migrations
 * Applies migrations 001-multi-tenant-foundation.sql and 002-wine-directory-schema.sql
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

const MIGRATIONS = [
  {
    name: 'Multi-Tenant Foundation',
    file: '001-multi-tenant-foundation-safe.sql',
    tables: ['tenants', 'tour_providers', 'lodging_partners', 'activity_partners', 'referral_clicks']
  },
  {
    name: 'Wine Directory Enhancement',
    file: '002-wine-directory-schema-safe.sql',
    tables: ['winery_content', 'wines', 'winery_people', 'winery_faqs', 'business_content', 'events']
  }
];

async function runMigrations() {
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
    console.log('✅ Connected!\n');

    // Run each migration
    for (const migration of MIGRATIONS) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Running: ${migration.name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const migrationPath = path.join(__dirname, '../migrations', migration.file);
      
      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migration.file}`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${migration.name} - SUCCESS\n`);

        // Verify tables were created
        const tableList = migration.tables.map(t => `'${t}'`).join(', ');
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN (${tableList})
          ORDER BY table_name
        `);

        console.log('📊 Tables verified:');
        result.rows.forEach(row => {
          console.log(`   ✓ ${row.table_name}`);
        });
        console.log('');

      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${migration.name} - Tables already exist (skipping)\n`);
        } else {
          console.error(`❌ Error in ${migration.name}:`, error.message);
          throw error;
        }
      }
    }

    // Verify tenant seed data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 Verifying Seed Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const tenants = await client.query('SELECT slug, display_name, is_platform_owner FROM tenants');
    console.log('🏢 Tenants:');
    tenants.rows.forEach(row => {
      const badge = row.is_platform_owner ? ' 👑' : '';
      console.log(`   - ${row.display_name} (${row.slug})${badge}`);
    });

    const brands = await client.query('SELECT brand_code, brand_name, brand_type, tenant_id FROM brands');
    console.log('\n🎨 Brands:');
    brands.rows.forEach(row => {
      const type = row.brand_type || 'unset';
      const linked = row.tenant_id ? '✓' : '⚠️';
      console.log(`   ${linked} ${row.brand_name} (${row.brand_code}) [${type}]`);
    });

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All migrations completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Next Steps:');
    console.log('   1. Create tenant/brand service layer');
    console.log('   2. Add wine directory API endpoints');
    console.log('   3. Build winery management UI');
    console.log('   4. Set up vector embeddings for AI search\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

runMigrations();

