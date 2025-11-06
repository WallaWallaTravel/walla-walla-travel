import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(
  request: NextRequest,
  { params }: { params: { order_id: string } }
) {
  try {
    const order_id = parseInt(params.order_id);

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        lo.*,
        b.customer_name,
        b.customer_email,
        b.tour_date,
        r.name as restaurant_name,
        r.email as restaurant_email,
        r.contact_name as restaurant_contact
      FROM lunch_orders lo
      JOIN bookings b ON lo.booking_id = b.id
      JOIN restaurants r ON lo.restaurant_id = r.id
      WHERE lo.id = $1
    `, [order_id]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // Update order status
    await pool.query(`
      UPDATE lunch_orders
      SET 
        status = 'sent',
        email_sent_at = NOW(),
        approved_by = 1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [order_id]);

    // TODO: In production, send actual email here using SendGrid/Resend
    // For now, we'll just log it
    console.log('📧 EMAIL WOULD BE SENT TO:', order.restaurant_email);
    console.log('Subject: Lunch Order for', order.customer_name, 'on', order.tour_date);
    console.log('Body:', order.email_body);

    return NextResponse.json({
      success: true,
      message: 'Order approved and sent to restaurant',
      // In production, include email send confirmation
    });

  } catch (error) {
    console.error('Error approving lunch order:', error);
    return NextResponse.json(
      { error: 'Failed to approve lunch order' },
      { status: 500 }
    );
  }
}

