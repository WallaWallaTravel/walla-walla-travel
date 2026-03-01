import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/migrate-inspections
 * Adds time_card_id column to inspections table for per-shift tracking
 *
 * SECURITY: Protected by admin auth
 */
export const POST = withAdminAuth(async (_request: NextRequest) => {
  logger.info('Starting migration: Add time_card_id to inspections');

  // Add time_card_id column (nullable for existing records)
  logger.info('Adding time_card_id column');
  await query(`
    ALTER TABLE inspections
    ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id) ON DELETE CASCADE;
  `);

  // Add index for faster queries
  logger.info('Creating index on time_card_id');
  await query(`
    CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id
    ON inspections(time_card_id);
  `);

  // Add composite index for common query pattern
  logger.info('Creating composite index');
  await query(`
    CREATE INDEX IF NOT EXISTS idx_inspections_time_card_type
    ON inspections(time_card_id, type)
    WHERE time_card_id IS NOT NULL;
  `);

  logger.info('Migration completed successfully');

  return NextResponse.json({
    success: true,
    message: 'Migration completed successfully',
    changes: [
      'Added time_card_id column to inspections',
      'Created index on time_card_id',
      'Created composite index on (time_card_id, type)'
    ]
  });
});
