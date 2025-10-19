import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * GET /api/wineries
 *
 * Get all wineries for itinerary building
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active_only = searchParams.get('active') === 'true';

    let sql = `
      SELECT
        id, name, slug, address, city, state, zip_code,
        phone, email, website, tasting_fee, reservation_required,
        specialties, description, hours, active, position
      FROM wineries
    `;

    if (active_only) {
      sql += ' WHERE active = true';
    }

    sql += ' ORDER BY position ASC, name ASC';

    const result = await query(sql, []);

    const wineries = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      phone: row.phone,
      email: row.email,
      website: row.website,
      tasting_fee: parseFloat(row.tasting_fee || '0'),
      reservation_required: row.reservation_required,
      specialties: row.specialties || [],
      description: row.description,
      hours: row.hours,
      active: row.active,
      position: row.position
    }));

    return successResponse(wineries, 'Wineries retrieved successfully');

  } catch (error: any) {
    console.error('❌ Get wineries error:', error);
    return errorResponse('Failed to retrieve wineries', 500);
  }
}
