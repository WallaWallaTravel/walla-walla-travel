import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, NotFoundError } from '@/lib/api/middleware/error-handler'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { withCSRF } from '@/lib/api/middleware/csrf'
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) => {
  const session = await verifyAdmin(request)

  const { order_id: orderId } = await params
  const order_id = parseInt(orderId)

  // Get order details
  const orderResult = await query(`
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
  `, [order_id])

  if (orderResult.rows.length === 0) {
    throw new NotFoundError('Order not found')
  }

  const order = orderResult.rows[0]
  const orderItems = typeof order.order_items === 'string'
    ? JSON.parse(order.order_items)
    : order.order_items

  // Calculate commission (10%)
  const commission = parseFloat(order.total) * 0.10

  // Update order status
  await query(`
    UPDATE lunch_orders
    SET
      status = 'sent_to_restaurant',
      email_sent_at = NOW(),
      approved_by = $2,
      approved_at = NOW(),
      commission_amount = $3,
      updated_at = NOW()
    WHERE id = $1
  `, [order_id, session.user.id, commission])

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
  })

  const emailSent = await sendEmail({
    to: order.restaurant_email,
    ...template,
  })

  logger.info('Lunch order email status', { orderId: order_id, emailSent, restaurantEmail: order.restaurant_email })

  return NextResponse.json({
    success: true,
    message: emailSent
      ? 'Order approved and email sent to restaurant'
      : 'Order approved but email failed - please contact restaurant manually',
    email_sent: emailSent,
    commission: commission,
  })
})))
