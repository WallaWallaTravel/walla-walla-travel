#!/usr/bin/env node

/**
 * Pre-Flight Check System
 * Validates everything is working BEFORE asking user to test
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import pg from 'pg';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark() { return `${colors.green}✅${colors.reset}`; }
function cross() { return `${colors.red}❌${colors.reset}`; }
function warning() { return `${colors.yellow}⚠️${colors.reset}`; }

// Check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      resolve({ running: true, status: res.statusCode });
    });
    req.on('error', () => {
      resolve({ running: false });
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ running: false });
    });
  });
}

// Check database connection
async function checkDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT NOW()');
    await pool.end();
    return { connected: true, time: result.rows[0].now };
  } catch (error) {
    await pool.end();
    return { connected: false, error: error.message };
  }
}

// Check if tables exist
async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'tour_offers', 'restaurants', 'lunch_orders', 'bookings', 'users', 'vehicles')
      ORDER BY table_name
    `);
    await pool.end();
    return { success: true, tables: result.rows.map(r => r.table_name) };
  } catch (error) {
    await pool.end();
    return { success: false, error: error.message };
  }
}

// Check API endpoints
async function checkAPI(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          working: res.statusCode < 500, 
          status: res.statusCode,
          response: data.substring(0, 200)
        });
      });
    });
    req.on('error', (error) => {
      resolve({ working: false, error: error.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ working: false, error: 'Timeout' });
    });
  });
}

// Start server if not running
async function startServer() {
  log('\n🚀 Starting development server...', 'cyan');
  
  try {
    const { stdout } = await execAsync('cd /Users/temp/walla-walla-final && npm run dev > /tmp/nextjs-server.log 2>&1 &');
    
    // Wait for server to start
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const serverCheck = await checkServer();
      if (serverCheck.running) {
        log(`${checkmark()} Server started successfully!`, 'green');
        return true;
      }
      process.stdout.write('.');
    }
    
    log(`\n${cross()} Server failed to start within 20 seconds`, 'red');
    return false;
  } catch (error) {
    log(`${cross()} Failed to start server: ${error.message}`, 'red');
    return false;
  }
}

// Main pre-flight check
async function runPreFlightCheck() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🛫 PRE-FLIGHT CHECK SYSTEM', 'cyan');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    server: false,
    database: false,
    tables: false,
    apis: false
  };

  // 1. Check Server
  log('1️⃣  Checking development server...', 'blue');
  let serverCheck = await checkServer();
  
  if (!serverCheck.running) {
    log(`${cross()} Server not running - attempting to start...`, 'yellow');
    const started = await startServer();
    if (started) {
      serverCheck = await checkServer();
    }
  }
  
  if (serverCheck.running) {
    log(`${checkmark()} Server running on http://localhost:3000`, 'green');
    results.server = true;
  } else {
    log(`${cross()} Server not running`, 'red');
    log('   Fix: Run "npm run dev" in a separate terminal', 'yellow');
  }

  // 2. Check Database
  log('\n2️⃣  Checking database connection...', 'blue');
  const dbCheck = await checkDatabase();
  
  if (dbCheck.connected) {
    log(`${checkmark()} Database connected`, 'green');
    results.database = true;
  } else {
    log(`${cross()} Database connection failed: ${dbCheck.error}`, 'red');
    log('   Fix: Check DATABASE_URL in .env.local', 'yellow');
  }

  // 3. Check Tables
  if (results.database) {
    log('\n3️⃣  Checking database tables...', 'blue');
    const tablesCheck = await checkTables();
    
    if (tablesCheck.success) {
      const requiredTables = ['invoices', 'tour_offers', 'restaurants', 'lunch_orders'];
      const missingTables = requiredTables.filter(t => !tablesCheck.tables.includes(t));
      
      if (missingTables.length === 0) {
        log(`${checkmark()} All required tables exist`, 'green');
        tablesCheck.tables.forEach(table => {
          log(`   ✓ ${table}`, 'green');
        });
        results.tables = true;
      } else {
        log(`${warning()} Missing tables: ${missingTables.join(', ')}`, 'yellow');
        log('   Fix: Run database migration:', 'yellow');
        log('   node scripts/run-invoicing-migration.js', 'cyan');
      }
    } else {
      log(`${cross()} Failed to check tables: ${tablesCheck.error}`, 'red');
    }
  }

  // 4. Check API Endpoints
  if (results.server) {
    log('\n4️⃣  Checking API endpoints...', 'blue');
    
    const endpoints = [
      '/api/admin/pending-invoices',
      '/api/invoices/1'
    ];
    
    let allWorking = true;
    for (const endpoint of endpoints) {
      const apiCheck = await checkAPI(endpoint);
      if (apiCheck.working) {
        log(`${checkmark()} ${endpoint} - Status ${apiCheck.status}`, 'green');
      } else {
        log(`${cross()} ${endpoint} - ${apiCheck.error || 'Failed'}`, 'red');
        allWorking = false;
      }
    }
    
    results.apis = allWorking;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('📊 SUMMARY', 'cyan');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const checks = [
    { name: 'Development Server', status: results.server },
    { name: 'Database Connection', status: results.database },
    { name: 'Database Tables', status: results.tables },
    { name: 'API Endpoints', status: results.apis }
  ];

  checks.forEach(check => {
    const icon = check.status ? checkmark() : cross();
    log(`${icon} ${check.name}`, check.status ? 'green' : 'red');
  });

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (allPassed) {
    log('🎉 ALL CHECKS PASSED!', 'green');
    log('\n✅ System is ready for testing!', 'green');
    log('\nYou can now access:', 'cyan');
    log('  • Homepage: http://localhost:3000', 'blue');
    log('  • Admin Dashboard: http://localhost:3000/admin/invoices', 'blue');
    log('  • Payment Page: http://localhost:3000/payment/final/1', 'blue');
  } else {
    log('⚠️  SOME CHECKS FAILED', 'yellow');
    log('\nPlease fix the issues above before testing.', 'yellow');
    
    if (!results.server) {
      log('\n🔧 Quick Fix: Start the server', 'cyan');
      log('   npm run dev', 'blue');
    }
    
    if (!results.tables) {
      log('\n🔧 Quick Fix: Run migration', 'cyan');
      log('   node scripts/run-invoicing-migration.js', 'blue');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(allPassed ? 0 : 1);
}

// Run the check
runPreFlightCheck().catch(error => {
  log(`\n${cross()} Pre-flight check failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


