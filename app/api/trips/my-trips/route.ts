import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';

// ============================================================================
// GET /api/trips/my-trips - Get trips for the authenticated user
// ============================================================================

export const GET = withAuth(async (_request, session) => {
  const email = session.email;

  const result = await query(
    `SELECT
      t.*,
      COUNT(DISTINCT ts.id) as stops_count,
      COUNT(DISTINCT tg.id) as guests_count
    FROM trips t
    LEFT JOIN trip_stops ts ON t.id = ts.trip_id
    LEFT JOIN trip_guests tg ON t.id = tg.trip_id
    WHERE t.owner_email = $1
    GROUP BY t.id
    ORDER BY t.last_activity_at DESC`,
    [email]
  );

  const trips = result.rows.map(row => ({
    id: row.id,
    share_code: row.share_code,
    title: row.title,
    trip_type: row.trip_type,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    expected_guests: row.expected_guests,
    confirmed_guests: row.confirmed_guests,
    stops_count: parseInt(row.stops_count) || 0,
    guests_count: parseInt(row.guests_count) || 0,
    created_at: row.created_at,
    last_activity_at: row.last_activity_at,
  }));

  return NextResponse.json({
    success: true,
    data: trips,
  });
});
