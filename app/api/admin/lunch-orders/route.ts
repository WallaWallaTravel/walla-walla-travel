import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

interface LunchOrder {
  id: number;
  booking_id: number;
  booking_number: string;
  restaurant_id: number;
  order_items: unknown;
  subtotal: string;
  tax: string;
  total: string;
  estimated_arrival_time: string;
  dietary_restrictions: string | null;
  special_instructions: string | null;
  status: string;
  email_body: string;
  created_at: string;
  approved_at: string | null;
  email_sent_at: string | null;
  commission_amount: string | null;
  customer_name: string;
  tour_date: string;
  party_size: number;
  restaurant_name: string;
  restaurant_email: string;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get('status') || 'all';

  let statusCondition = '';
  if (statusFilter === 'pending') {
    statusCondition = "AND (lo.status = 'pending' OR lo.status = 'pending_approval')";
  } else if (statusFilter === 'approved') {
    statusCondition = "AND lo.status IN ('sent', 'approved', 'sent_to_restaurant', 'confirmed')";
  }

  const orders = await queryMany<LunchOrder>(`
    SELECT 
      lo.id,
      lo.booking_id,
      b.booking_number,
      lo.restaurant_id,
      lo.order_items,
      lo.subtotal,
      lo.tax,
      lo.total,
      lo.estimated_arrival_time::text,
      lo.dietary_restrictions,
      lo.special_instructions,
      lo.status,
      lo.email_body,
      lo.created_at,
      lo.approved_at,
      lo.email_sent_at,
      lo.commission_amount,
      b.customer_name,
      b.tour_date,
      b.party_size,
      r.name as restaurant_name,
      r.email as restaurant_email
    FROM lunch_orders lo
    JOIN bookings b ON lo.booking_id = b.id
    JOIN restaurants r ON lo.restaurant_id = r.id
    WHERE 1=1 ${statusCondition}
    ORDER BY 
      CASE lo.status 
        WHEN 'pending_approval' THEN 1
        WHEN 'pending' THEN 1
        WHEN 'sent' THEN 2
        ELSE 3
      END,
      lo.created_at DESC
  `);

  return NextResponse.json({
    success: true,
    orders,
  });
});
