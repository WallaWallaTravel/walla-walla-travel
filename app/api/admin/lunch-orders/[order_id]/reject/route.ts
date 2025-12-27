import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, NotFoundError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) => {
  await verifyAdmin(request)

  const { order_id: orderId } = await params
  const order_id = parseInt(orderId)
  const body = await request.json()
  const { reason } = body

  // Update order status to rejected
  const result = await query(`
    UPDATE lunch_orders
    SET
      status = 'rejected',
      notes = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, [order_id, reason || 'Rejected by admin'])

  if (result.rowCount === 0) {
    throw new NotFoundError('Order not found')
  }

  return NextResponse.json({
    success: true,
    message: 'Order rejected',
  })
})
