import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-errors';
import { queryMany } from '@/lib/db-helpers';

interface LunchOrder {
  id: number;
  booking_id: number;
  restaurant_id: number;
  total: string;
  status: string;
  email_body: string;
  created_at: string;
  customer_name: string;
  tour_date: string;
  party_size: number;
  restaurant_name: string;
  restaurant_email: string;
}

export const GET = withErrorHandling(async () => {
  const orders = await queryMany<LunchOrder>(`
    SELECT 
      lo.id,
      lo.booking_id,
      lo.restaurant_id,
      lo.total,
      lo.status,
      lo.email_body,
      lo.created_at,
      b.customer_name,
      b.tour_date,
      b.party_size,
      r.name as restaurant_name,
      r.email as restaurant_email
    FROM lunch_orders lo
    JOIN bookings b ON lo.booking_id = b.id
    JOIN restaurants r ON lo.restaurant_id = r.id
    ORDER BY 
      CASE lo.status 
        WHEN 'pending_approval' THEN 1
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
