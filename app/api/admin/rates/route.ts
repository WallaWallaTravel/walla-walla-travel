import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/admin/rates
 * Fetch all rate configurations
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {

  const result = await query(
    `SELECT
      id,
      config_key,
      config_value,
      description,
      last_updated_by,
      updated_at,
      created_at
    FROM rate_config
    ORDER BY
      CASE config_key
        WHEN 'wine_tours' THEN 1
        WHEN 'transfers' THEN 2
        WHEN 'wait_time' THEN 3
        WHEN 'deposits_and_fees' THEN 4
        WHEN 'gratuity' THEN 5
        ELSE 99
      END`
  );

  return NextResponse.json({
    success: true,
    rates: result.rows
  });
});

/**
 * PATCH /api/admin/rates
 * Update a specific rate configuration
 */
export const PATCH = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {

  const body = await request.json();
  const { config_key, config_value, changed_by, change_reason } = body;

  if (!config_key || !config_value) {
    throw new BadRequestError('config_key and config_value are required');
  }

  // Get the old value for audit log
  const oldValueResult = await query(
    'SELECT config_value FROM rate_config WHERE config_key = $1',
    [config_key]
  );

  if (oldValueResult.rows.length === 0) {
    throw new NotFoundError('Rate configuration not found');
  }

  const oldValue = oldValueResult.rows[0].config_value;

  // Update the rate configuration
  const updateResult = await query(
    `UPDATE rate_config
     SET config_value = $1,
         last_updated_by = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE config_key = $3
     RETURNING *`,
    [JSON.stringify(config_value), changed_by || 'admin', config_key]
  );

  // Log the change
  await query(
    `INSERT INTO rate_change_log (config_key, old_value, new_value, changed_by, change_reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      config_key,
      JSON.stringify(oldValue),
      JSON.stringify(config_value),
      changed_by || 'admin',
      change_reason || 'Manual update'
    ]
  );

  return NextResponse.json({
    success: true,
    rate: updateResult.rows[0],
    message: 'Rate configuration updated successfully'
  });
})));
