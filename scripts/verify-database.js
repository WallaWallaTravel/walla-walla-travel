// Verify database setup
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Determine SSL config based on DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const isHeroku = databaseUrl && databaseUrl.includes('amazonaws.com');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isHeroku ? {
    rejectUnauthorized: false
  } : false
});

async function verify() {
  console.log('🔍 Verifying database setup...\n');
  
  try {
    // Check connection
    const now = await pool.query('SELECT NOW()');
    console.log('✅ Database connection: OK');
    console.log(`   Time: ${now.rows[0].now}`);
    console.log(`   SSL: ${isHeroku ? 'enabled' : 'disabled'}\n`);
    
    // Check tables
    console.log('📊 Checking tables...');
    const requiredTables = ['users', 'vehicles', 'time_cards', 'daily_trips', 'monthly_exemption_status', 'weekly_hos', 'company_info', 'inspections'];
    
    for (const tableName of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING!`);
      }
    }
    
    // Check functions
    console.log('\n🔧 Checking functions...');
    const functions = ['calculate_air_miles', 'update_monthly_exemption_status'];
    
    for (const funcName of functions) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = $1
        )
      `, [funcName]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${funcName}`);
      } else {
        console.log(`   ❌ ${funcName} - MISSING!`);
      }
    }
    
    // Check views
    console.log('\n👁️  Checking views...');
    const views = ['current_driver_status', 'monthly_exemption_dashboard'];
    
    for (const viewName of views) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [viewName]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${viewName}`);
      } else {
        console.log(`   ❌ ${viewName} - MISSING!`);
      }
    }
    
    // Check data
    console.log('\n📋 Checking data...');
    
    const driverCount = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'driver'`);
    console.log(`   Drivers: ${driverCount.rows[0].count}`);
    
    const vehicleCount = await pool.query(`SELECT COUNT(*) FROM vehicles`);
    console.log(`   Vehicles: ${vehicleCount.rows[0].count}`);
    
    const companyCount = await pool.query(`SELECT COUNT(*) FROM company_info`);
    console.log(`   Company info: ${companyCount.rows[0].count}`);
    
    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
