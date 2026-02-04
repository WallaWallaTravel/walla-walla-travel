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

/**
 * GET /api/admin/shared-tours/presets
 * Get all shared tour presets
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session: AuthSession) => {
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
    ORDER BY sort_order ASC, name ASC
  `);

  return NextResponse.json({
    success: true,
    data: result.rows,
    count: result.rows.length,
  });
});

/**
 * POST /api/admin/shared-tours/presets
 * Create a new preset
 */
export const POST = withAdminAuth(async (request: NextRequest, _session: AuthSession) => {
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    return NextResponse.json(
      { success: false, error: 'name is required' },
      { status: 400 }
    );
  }

  // Check for duplicate name
  const existing = await query<{ id: number }>(
    'SELECT id FROM shared_tour_presets WHERE LOWER(name) = LOWER($1)',
    [body.name]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { success: false, error: 'A preset with this name already exists' },
      { status: 409 }
    );
  }

  // Get next sort order
  const sortResult = await query<{ max_sort: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 as max_sort FROM shared_tour_presets'
  );
  const nextSortOrder = sortResult.rows[0]?.max_sort || 1;

  const result = await query<SharedTourPreset>(`
    INSERT INTO shared_tour_presets (
      name,
      start_time,
      duration_hours,
      base_price_per_person,
      lunch_price_per_person,
      title,
      description,
      max_guests,
      min_guests,
      is_default,
      sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
  `, [
    body.name,
    body.start_time || '11:00',
    body.duration_hours || 6,
    body.base_price_per_person || 95,
    body.lunch_price_per_person || 115,
    body.title || null,
    body.description || null,
    body.max_guests || 14,
    body.min_guests || 2,
    body.is_default || false,
    nextSortOrder,
  ]);

  return NextResponse.json({
    success: true,
    data: result.rows[0],
    message: 'Preset created successfully',
  });
});
