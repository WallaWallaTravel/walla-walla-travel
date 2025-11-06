import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      driver_id,
      vehicle_id,
      notes,
      expires_in_hours = 48,
    } = body;

    if (!booking_id || !driver_id) {
      return NextResponse.json(
        { error: 'booking_id and driver_id are required' },
        { status: 400 }
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

    // Create tour offer
    const result = await pool.query(`
      INSERT INTO tour_offers (
        booking_id,
        driver_id,
        vehicle_id,
        offered_by,
        offered_at,
        expires_at,
        status,
        notes,
        created_at
      ) VALUES ($1, $2, $3, 1, NOW(), $4, 'pending', $5, NOW())
      RETURNING id
    `, [
      booking_id,
      driver_id,
      vehicle_id || null,
      expiresAt,
      notes || null,
    ]);

    // TODO: Send notification to driver (email/SMS/push)
    console.log(`📧 Tour offer #${result.rows[0].id} sent to driver #${driver_id}`);

    return NextResponse.json({
      success: true,
      offer_id: result.rows[0].id,
      message: 'Tour offer created and sent to driver',
    });

  } catch (error) {
    console.error('Error creating tour offer:', error);
    return NextResponse.json(
      { error: 'Failed to create tour offer' },
      { status: 500 }
    );
  }
}

