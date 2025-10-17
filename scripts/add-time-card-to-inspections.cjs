#!/usr/bin/env node

/**
 * Migration: Add time_card_id to inspections table
 *
 * This allows linking inspections to specific shifts (time cards)
 * rather than just dates, enabling multiple drivers to use the
 * same vehicle in one day with separate inspections.
 */

const { Pool } = require('pg');

// Configure SSL based on database host
const dbUrl = process.env.DATABASE_URL;
const needsSSL = dbUrl && (dbUrl.includes('rds.amazonaws.com') || dbUrl.includes('supabase'));

const pool = new Pool({
  connectionString: dbUrl,
  ...(needsSSL && { ssl: { rejectUnauthorized: false } })
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration: Add time_card_id to inspections');

    await client.query('BEGIN');

    // Add time_card_id column (nullable for existing records)
    console.log('  Adding time_card_id column...');
    await client.query(`
      ALTER TABLE inspections
      ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id) ON DELETE CASCADE;
    `);

    // Add index for faster queries
    console.log('  Creating index on time_card_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id
      ON inspections(time_card_id);
    `);

    // Add composite index for common query pattern
    console.log('  Creating composite index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inspections_time_card_type
      ON inspections(time_card_id, type)
      WHERE time_card_id IS NOT NULL;
    `);

    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  ✓ Added time_card_id column to inspections');
    console.log('  ✓ Created index on time_card_id');
    console.log('  ✓ Created composite index on (time_card_id, type)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Update inspection APIs to save time_card_id');
    console.log('  2. Update queries to check by time_card_id instead of date');
    console.log('  3. Update clock-out to require post-trip per shift');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
