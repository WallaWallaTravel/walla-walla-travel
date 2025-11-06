import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/itineraries - List all itineraries
export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(
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
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching itineraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    );
  }
}

// POST /api/itineraries - Create new itinerary
export async function POST(request: NextRequest) {
  try {
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

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create itinerary
      const itineraryResult = await client.query(
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

        await client.query(
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

      await client.query('COMMIT');

      return NextResponse.json({ itinerary });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to create itinerary' },
      { status: 500 }
    );
  }
}
