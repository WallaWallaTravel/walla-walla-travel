import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { queryMany } from '@/lib/db-helpers';

interface PendingInvoice {
  booking_id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  actual_hours: string;
  estimated_hours: string;
  hourly_rate: string;
  final_price: string;
}

/**
 * GET /api/admin/pending-invoices
 * Returns list of bookings ready for final invoice
 * (48+ hours after tour completion, hours synced)
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  // Use the view we created in migration
  const invoices = await queryMany<PendingInvoice>(`
    SELECT * FROM pending_final_invoices
    ORDER BY tour_date DESC
  `);

  return NextResponse.json({
    success: true,
    invoices,
    count: invoices.length
  });
});
