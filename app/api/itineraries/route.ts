import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

// GET /api/itineraries - List all itineraries
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const result = await query(
    `SELECT
      i.*,
      COUNT(DISTINCT d.id) as day_count,
      COUNT(a.id) as activity_count
    FROM itineraries i
    LEFT JOIN itinerary_days d ON i.id = d.itinerary_id
    LEFT JOIN itinerary_activities a ON d.id = a.itinerary_day_id
    GROUP BY i.id
    ORDER BY i.created_at DESC`
  );

  return NextResponse.json({ itineraries: result.rows });
});

// POST /api/itineraries - Create new itinerary
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const {
    booking_id,
    proposal_id,
    title,
    client_name,
    client_email,
    party_size,
    start_date,
    end_date,
    internal_notes,
    client_notes
  } = body;

  // Validate required fields
  if (!title || !start_date || !end_date) {
    throw new BadRequestError('Title, start_date, and end_date are required');
  }

  await query('BEGIN');

  // Create itinerary
  const itineraryResult = await query(
    `INSERT INTO itineraries
     (booking_id, proposal_id, title, client_name, client_email, party_size,
      start_date, end_date, status, internal_notes, client_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10)
     RETURNING *`,
    [
      booking_id,
      proposal_id,
      title,
      client_name,
      client_email,
      party_size,
      start_date,
      end_date,
      internal_notes,
      client_notes
    ]
  );

  const itinerary = itineraryResult.rows[0];

  // Create default days based on date range
  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);
  const dayCount = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < dayCount; i++) {
    const dayDate = new Date(startDateObj);
    dayDate.setDate(startDateObj.getDate() + i);

    await query(
      `INSERT INTO itinerary_days
       (itinerary_id, day_number, date, title, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        itinerary.id,
        i + 1,
        dayDate.toISOString().split('T')[0],
        `Day ${i + 1}`,
        i
      ]
    );
  }

  await query('COMMIT');

  return NextResponse.json({ itinerary });
});
