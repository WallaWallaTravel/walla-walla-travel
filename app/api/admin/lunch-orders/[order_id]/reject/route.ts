import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const { order_id: orderId } = await params;
    const order_id = parseInt(orderId);
    const body = await request.json();
    const { reason } = body;

    // Update order status to rejected
    const result = await pool.query(`
      UPDATE lunch_orders
      SET 
        status = 'rejected',
        notes = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [order_id, reason || 'Rejected by admin']);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order rejected',
    });

  } catch (error) {
    console.error('Error rejecting lunch order:', error);
    return NextResponse.json(
      { error: 'Failed to reject lunch order' },
      { status: 500 }
    );
  }
}

