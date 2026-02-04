import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';

interface SharedTourPreset {
  id: number;
  name: string;
  start_time: string;
  duration_hours: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  title: string | null;
  description: string | null;
  max_guests: number;
  min_guests: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/shared-tours/presets/[id]
 * Get a single preset by ID
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;

  const result = await query<SharedTourPreset>(`
    SELECT
      id,
      name,
      start_time::text,
      duration_hours::float,
      base_price_per_person::float,
      lunch_price_per_person::float,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order,
      created_at,
      updated_at
    FROM shared_tour_presets
    WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * PUT /api/admin/shared-tours/presets/[id]
 * Update a preset
 */
export const PUT = withAdminAuth(async (request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;
  const body = await request.json();

  // Check preset exists
  const existing = await query<{ id: number }>(
    'SELECT id FROM shared_tour_presets WHERE id = $1',
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  // Check for duplicate name (excluding current preset)
  if (body.name) {
    const duplicateName = await query<{ id: number }>(
      'SELECT id FROM shared_tour_presets WHERE LOWER(name) = LOWER($1) AND id != $2',
      [body.name, id]
    );

    if (duplicateName.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A preset with this name already exists' },
        { status: 409 }
      );
    }
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  const fields = [
    'name',
    'start_time',
    'duration_hours',
    'base_price_per_person',
    'lunch_price_per_person',
    'title',
    'description',
    'max_guests',
    'min_guests',
    'is_default',
    'sort_order',
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(body[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  values.push(id);

  const result = await query<SharedTourPreset>(`
    UPDATE shared_tour_presets
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING
      id,
      name,
      start_time::text,
      duration_hours::float,
      base_price_per_person::float,
      lunch_price_per_person::float,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order,
      created_at,
      updated_at
  `, values);

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Preset updated successfully',
  });
});

/**
 * DELETE /api/admin/shared-tours/presets/[id]
 * Delete a preset
 */
export const DELETE = withAdminAuth(async (_request: NextRequest, _session: AuthSession, context) => {
  const { id } = await (context as RouteParams).params;

  // Check preset exists
  const existing = await query<{ id: number; is_default: boolean }>(
    'SELECT id, is_default FROM shared_tour_presets WHERE id = $1',
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Preset not found' },
      { status: 404 }
    );
  }

  // Prevent deleting the last preset
  const count = await query<{ count: number }>(
    'SELECT COUNT(*)::int as count FROM shared_tour_presets'
  );

  if (count.rows[0]?.count <= 1) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete the last preset' },
      { status: 400 }
    );
  }

  // Delete the preset
  await query('DELETE FROM shared_tour_presets WHERE id = $1', [id]);

  // If we deleted the default, make the first preset the new default
  if (existing.rows[0]?.is_default) {
    await query(`
      UPDATE shared_tour_presets
      SET is_default = true, updated_at = NOW()
      WHERE id = (SELECT id FROM shared_tour_presets ORDER BY sort_order ASC LIMIT 1)
    `);
  }

  return NextResponse.json({
    success: true,
    message: 'Preset deleted successfully',
  });
});
