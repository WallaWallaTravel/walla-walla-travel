import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sendEmail, EmailTemplates } from '@/lib/email';

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

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        lo.*,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.tour_date,
        b.party_size,
        r.name as restaurant_name,
        r.email as restaurant_email,
        r.phone as restaurant_phone,
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
    const orderItems = typeof order.order_items === 'string' 
      ? JSON.parse(order.order_items) 
      : order.order_items;

    // Calculate commission (10%)
    const commission = parseFloat(order.total) * 0.10;

    // Update order status
    await pool.query(`
      UPDATE lunch_orders
      SET 
        status = 'sent_to_restaurant',
        email_sent_at = NOW(),
        approved_by = 1,
        approved_at = NOW(),
        commission_amount = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [order_id, commission]);

    // Send email to restaurant
    const template = EmailTemplates.lunchOrderToRestaurant({
      restaurant_name: order.restaurant_name,
      customer_name: order.customer_name,
      tour_date: order.tour_date,
      party_size: order.party_size,
      arrival_time: order.estimated_arrival_time,
      items: orderItems.map((item: { name: string; quantity: number; price: number }) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: parseFloat(order.subtotal),
      total: parseFloat(order.total),
      dietary_restrictions: order.dietary_restrictions || undefined,
      special_requests: order.special_instructions || undefined,
      contact_phone: order.customer_phone || '(509) 555-0199',
    });

    const emailSent = await sendEmail({
      to: order.restaurant_email,
      ...template,
    });

    console.log(`📧 Lunch order #${order_id} ${emailSent ? 'sent to' : 'failed to send to'} ${order.restaurant_email}`);

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Order approved and email sent to restaurant' 
        : 'Order approved but email failed - please contact restaurant manually',
      email_sent: emailSent,
      commission: commission,
    });

  } catch (error) {
    console.error('Error approving lunch order:', error);
    return NextResponse.json(
      { error: 'Failed to approve lunch order' },
      { status: 500 }
    );
  }
}

