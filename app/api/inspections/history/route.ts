import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import {
  requireAuth,
  logApiRequest,
  getPaginationParams,
  buildPaginationMeta
} from '@/app/api/utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/inspections/history
 * Get inspection history for the authenticated driver
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  logApiRequest('GET', '/api/inspections/history', session.userId);

  // Get pagination parameters
  const pagination = getPaginationParams(request);

  // Get date range from query params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const type = searchParams.get('type'); // pre_trip, post_trip, dvir, or all

  // Build dynamic query with Prisma.sql
  const conditions: Prisma.Sql[] = [Prisma.sql`i.driver_id = ${parseInt(session.userId)}`];

  if (type && type !== 'all') {
    conditions.push(Prisma.sql`i.type = ${type}`);
  }

  if (startDate) {
    conditions.push(Prisma.sql`DATE(i.created_at) >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(Prisma.sql`DATE(i.created_at) <= ${endDate}`);
  }

  const whereClause = Prisma.join(conditions, ' AND ');

  // Get total count for pagination
  const countRows = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) as total
    FROM inspections i
    WHERE ${whereClause}
  `;

  const total = Number(countRows[0].total);

  // Get inspections with vehicle details
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      i.id,
      i.type,
      i.status,
      i.start_mileage,
      i.end_mileage,
      i.issues_found,
      i.issues_description,
      i.created_at,
      v.vehicle_number,
      v.make,
      v.model,
      v.year
    FROM inspections i
    JOIN vehicles v ON i.vehicle_id = v.id
    WHERE ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ${pagination.limit} OFFSET ${pagination.offset}
  `;

  // Format the response with pagination metadata
  const paginationMeta = buildPaginationMeta(pagination, total);

  return NextResponse.json({
    success: true,
    data: {
      inspections: rows,
      pagination: paginationMeta,
    },
    message: 'Inspection history retrieved'
  });
});
