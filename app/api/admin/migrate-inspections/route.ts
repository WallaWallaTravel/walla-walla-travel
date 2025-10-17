import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/migrate-inspections
 * Adds time_card_id column to inspections table for per-shift tracking
 *
 * SECURITY: This should be password-protected in production
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting migration: Add time_card_id to inspections');

    // Add time_card_id column (nullable for existing records)
    console.log('  Adding time_card_id column...');
    await query(`
      ALTER TABLE inspections
      ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id) ON DELETE CASCADE;
    `);

    // Add index for faster queries
    console.log('  Creating index on time_card_id...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id
      ON inspections(time_card_id);
    `);

    // Add composite index for common query pattern
    console.log('  Creating composite index...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_inspections_time_card_type
      ON inspections(time_card_id, type)
      WHERE time_card_id IS NOT NULL;
    `);

    console.log('✅ Migration completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      message: 'Migration completed successfully',
      changes: [
        'Added time_card_id column to inspections',
        'Created index on time_card_id',
        'Created composite index on (time_card_id, type)'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.detail || error.hint
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
