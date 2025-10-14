// Database setup script - applies all SQL files
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
config({ path: join(__dirname, '..', '.env.local') });

// Determine SSL config based on DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env.local');
  console.error('\n💡 Please add your Heroku database URL to .env.local:');
  console.error('   DATABASE_URL="postgres://..."');
  process.exit(1);
}

const isHeroku = databaseUrl && databaseUrl.includes('amazonaws.com');

console.log('🔧 Database Configuration:');
console.log(`   URL: ${databaseUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
console.log(`   SSL: ${isHeroku ? 'enabled' : 'disabled'}\n`);

// Create database connection with proper SSL config
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isHeroku ? {
    rejectUnauthorized: false
  } : false
});

const sqlFiles = [
  '00-create-base-tables.sql',
  '01-create-tables.sql',
  '02-add-drivers.sql',
  '03-add-vehicles.sql',
  '04-add-company-info.sql',
  '05-create-functions.sql',
  '06-create-views.sql'
];

async function runSetup() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${testResult.rows[0].now}\n`);
    
    // Run each SQL file
    for (const file of sqlFiles) {
      console.log(`📝 Running ${file}...`);
      const sqlPath = join(__dirname, '..', 'sql', file);
      const sql = readFileSync(sqlPath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error.message);
        throw error;
      }
    }
    
    // Verify setup
    console.log('🔍 Verifying setup...\n');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('time_cards', 'daily_trips', 'monthly_exemption_status', 'weekly_hos', 'company_info')
      ORDER BY table_name
    `);
    
    console.log('📊 Tables created:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    const drivers = await pool.query(`SELECT name FROM users WHERE role = 'driver'`);
    console.log(`\n👥 Drivers added: ${drivers.rows.length}`);
    drivers.rows.forEach(row => console.log(`  - ${row.name}`));
    
    const vehicles = await pool.query(`SELECT vehicle_number, capacity FROM vehicles`);
    console.log(`\n🚐 Vehicles added: ${vehicles.rows.length}`);
    vehicles.rows.forEach(row => console.log(`  - ${row.vehicle_number} (${row.capacity} passengers)`));
    
    const company = await pool.query(`SELECT company_name, usdot_number FROM company_info LIMIT 1`);
    if (company.rows.length > 0) {
      console.log(`\n🏢 Company: ${company.rows[0].company_name} (USDOT #${company.rows[0].usdot_number})`);
    }
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n🎉 Ready to build the time clock system!\n');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check that DATABASE_URL is correct in .env.local');
    console.error('   2. Verify database credentials are correct');
    console.error('   3. Ensure database server is running');
    console.error('   4. Try: heroku config:get DATABASE_URL -a walla-walla-travel\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSetup();
