import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError } from '@/lib/api-errors';
import { queryOne } from '@/lib/db-helpers';

interface BookingInvoiceData {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  actual_hours: string;
  estimated_hours: string;
  hourly_rate: string;
  base_price: string;
  total_price: string;
  ready_for_final_invoice: boolean;
  final_invoice_sent: boolean;
  driver_name?: string;
}

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  status: string;
  created_at: string;
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id: bookingIdStr } = await params;
  const booking_id = parseInt(bookingIdStr);

  // Get booking with invoice data
  const booking = await queryOne<BookingInvoiceData>(`
    SELECT 
      b.id,
      b.booking_number,
      b.customer_name,
      b.tour_date,
      b.actual_hours,
      b.estimated_hours,
      b.hourly_rate,
      b.base_price,
      b.total_price,
      b.ready_for_final_invoice,
      b.final_invoice_sent,
      u.name as driver_name
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    WHERE b.id = $1
  `, [booking_id]);

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Calculate invoice amount
  const hours = parseFloat(booking.actual_hours || booking.estimated_hours);
  const rate = parseFloat(booking.hourly_rate);
  const subtotal = hours * rate;

  // Check if there's an actual invoice record
  const invoiceRecord = await queryOne<InvoiceRecord>(`
    SELECT id, invoice_number, status, created_at
    FROM invoices
    WHERE booking_id = $1 AND invoice_type = 'final'
    ORDER BY created_at DESC
    LIMIT 1
  `, [booking_id]);

  const invoice = {
    id: invoiceRecord?.id || null,
    invoice_number: invoiceRecord?.invoice_number || `INV-${booking.booking_number}`,
    subtotal: subtotal,
    booking: {
      booking_number: booking.booking_number,
      customer_name: booking.customer_name,
      tour_date: booking.tour_date,
      actual_hours: hours,
      hourly_rate: rate,
      driver_name: booking.driver_name || 'TBD',
    }
  };

  return NextResponse.json({
    success: true,
    invoice,
  });
});
