import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';

/**
 * GET /api/admin/consultations
 * Get all consultation requests (trips with status 'handed_off')
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all'; // 'pending', 'in_progress', 'completed', 'all'

  let statusFilter = '';
  if (status === 'pending') {
    statusFilter = "AND t.status = 'handed_off' AND t.assigned_staff_id IS NULL";
  } else if (status === 'in_progress') {
    statusFilter = "AND t.status = 'handed_off' AND t.assigned_staff_id IS NOT NULL";
  } else if (status === 'completed') {
    statusFilter = "AND (t.status = 'booked' OR t.converted_to_booking_id IS NOT NULL)";
  }

  const result = await query(
    `SELECT
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
    LIMIT 100`,
    []
  );

  // Get counts for tabs
  const countsResult = await query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'handed_off' AND assigned_staff_id IS NULL) as pending,
      COUNT(*) FILTER (WHERE status = 'handed_off' AND assigned_staff_id IS NOT NULL) as in_progress,
      COUNT(*) FILTER (WHERE status = 'booked' OR converted_to_booking_id IS NOT NULL) as completed,
      COUNT(*) as total
    FROM trips
    WHERE handoff_requested_at IS NOT NULL`,
    []
  );

  const counts = countsResult.rows[0] || { pending: 0, in_progress: 0, completed: 0, total: 0 };

  return NextResponse.json({
    success: true,
    consultations: result.rows,
    counts: {
      pending: parseInt(counts.pending) || 0,
      in_progress: parseInt(counts.in_progress) || 0,
      completed: parseInt(counts.completed) || 0,
      total: parseInt(counts.total) || 0,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/consultations
 * Update consultation (assign staff, change status)
 */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json();
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
  const result = await query(
    `UPDATE trips
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    trip: result.rows[0],
    timestamp: new Date().toISOString(),
  });
});
