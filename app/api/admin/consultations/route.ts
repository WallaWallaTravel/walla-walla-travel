import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const PatchBodySchema = z.object({
  tripId: z.number().int().positive(),
  assignedStaffId: z.number().int().positive().optional(),
  status: z.string().min(1).max(255).optional(),
  notes: z.string().max(5000).optional(),
});

/**
 * GET /api/admin/consultations
 * Get all consultation requests (trips with status 'handed_off')
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all'; // 'pending', 'in_progress', 'completed', 'all'

  let statusFilter = Prisma.sql``;
  if (status === 'pending') {
    statusFilter = Prisma.sql`AND t.status = 'handed_off' AND t.assigned_staff_id IS NULL`;
  } else if (status === 'in_progress') {
    statusFilter = Prisma.sql`AND t.status = 'handed_off' AND t.assigned_staff_id IS NOT NULL`;
  } else if (status === 'completed') {
    statusFilter = Prisma.sql`AND (t.status = 'booked' OR t.converted_to_booking_id IS NOT NULL)`;
  }

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
    Prisma.sql`SELECT
      t.id,
      t.share_code,
      t.title,
      t.trip_type,
      t.owner_name,
      t.owner_email,
      t.owner_phone,
      t.start_date,
      t.end_date,
      t.dates_flexible,
      t.expected_guests,
      t.status,
      t.handoff_requested_at,
      t.handoff_notes,
      t.assigned_staff_id,
      t.converted_to_booking_id,
      t.created_at,
      t.preferences,
      u.name as assigned_staff_name,
      (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND stop_type = 'winery') as winery_count,
      (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as total_stops
    FROM trips t
    LEFT JOIN users u ON t.assigned_staff_id = u.id
    WHERE t.handoff_requested_at IS NOT NULL
    ${statusFilter}
    ORDER BY
      CASE WHEN t.status = 'handed_off' AND t.assigned_staff_id IS NULL THEN 0 ELSE 1 END,
      t.handoff_requested_at DESC
    LIMIT 100`
  );

  // Get counts for tabs
  const countsRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'handed_off' AND assigned_staff_id IS NULL) as pending,
      COUNT(*) FILTER (WHERE status = 'handed_off' AND assigned_staff_id IS NOT NULL) as in_progress,
      COUNT(*) FILTER (WHERE status = 'booked' OR converted_to_booking_id IS NOT NULL) as completed,
      COUNT(*) as total
    FROM trips
    WHERE handoff_requested_at IS NOT NULL`;

  const counts = countsRows[0] || { pending: 0, in_progress: 0, completed: 0, total: 0 };

  return NextResponse.json({
    success: true,
    consultations: rows,
    counts: {
      pending: parseInt(String(counts.pending)) || 0,
      in_progress: parseInt(String(counts.in_progress)) || 0,
      completed: parseInt(String(counts.completed)) || 0,
      total: parseInt(String(counts.total)) || 0,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/consultations
 * Update consultation (assign staff, change status)
 */
export const PATCH =
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = PatchBodySchema.parse(await request.json());
  const { tripId, assignedStaffId, status, notes } = body;

  if (!tripId) {
    return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (assignedStaffId !== undefined) {
    updates.push(`assigned_staff_id = $${paramIndex}`);
    values.push(assignedStaffId);
    paramIndex++;
  }

  if (status) {
    updates.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`handoff_notes = $${paramIndex}`);
    values.push(notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  values.push(tripId);
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE trips
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    ...values
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    trip: rows[0],
    timestamp: new Date().toISOString(),
  });
});
