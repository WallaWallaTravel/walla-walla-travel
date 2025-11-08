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
    const sql = `
      SELECT
        id, name, slug, address, city, state, zip_code,
        phone, email, website, tasting_fee, reservation_required,
        specialties, description, hours_of_operation,
        short_description, average_visit_duration
      FROM wineries
      ORDER BY name ASC
    `;

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
      description: row.description || row.short_description,
      hours: row.hours_of_operation,
      average_visit_duration: row.average_visit_duration || 60
    }));

    return successResponse(wineries, 'Wineries retrieved successfully', 300); // Cache for 5 minutes (static data)

  } catch (error: any) {
    console.error('❌ Get wineries error:', error);
    return errorResponse('Failed to retrieve wineries', 500);
  }
}
