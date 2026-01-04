import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withErrorHandling, NotFoundError, ConflictError, BadRequestError } from '@/lib/api-errors';
import { queryOne, insertOne, query } from '@/lib/db-helpers';

interface BookingWithDriver {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  actual_hours: string;
  estimated_hours: string;
  hourly_rate: string;
  driver_name?: string;
  driver_email?: string;
  driver_id?: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: string;
  sent_at: string;
  due_date: string;
}

/**
 * POST /api/admin/approve-invoice/[booking_id]
 * Approves and sends final invoice to customer
 * 
 * Workflow:
 * 1. Calculate final amount (actual_hours * hourly_rate)
 * 2. Create invoice record
 * 3. Generate PDF (future: use invoice template)
 * 4. Send email to customer with payment link
 * 5. Mark booking as final_invoice_sent
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) => {
  const { booking_id } = await params;
  const bookingId = parseInt(booking_id);

  if (isNaN(bookingId)) {
    throw new BadRequestError('Invalid booking ID');
  }

  // 1. Get booking details
  const booking = await queryOne<BookingWithDriver>(`
    SELECT 
      b.*,
      u.name as driver_name,
      u.email as driver_email
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    WHERE b.id = $1
  `, [bookingId]);

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // 2. Calculate final amount
  const hours = parseFloat(booking.actual_hours || booking.estimated_hours || '6.0');
  const hourlyRate = parseFloat(booking.hourly_rate || '150.00');
  const subtotal = hours * hourlyRate;
  const taxAmount = 0; // Add tax calculation if needed
  const totalAmount = subtotal + taxAmount;

  // 3. Check if final invoice already exists
  const existingInvoice = await queryOne(`
    SELECT id FROM invoices
    WHERE booking_id = $1 AND invoice_type = 'final'
  `, [bookingId]);

  if (existingInvoice) {
    throw new ConflictError('Final invoice already exists for this booking');
  }

  // 4. Create invoice record
  const invoice = await insertOne<Invoice>(`
    INSERT INTO invoices (
      booking_id,
      invoice_type,
      subtotal,
      tax_amount,
      total_amount,
      status,
      sent_at,
      due_date
    ) VALUES ($1, 'final', $2, $3, $4, 'sent', NOW(), CURRENT_DATE + INTERVAL '7 days')
    RETURNING *
  `, [bookingId, subtotal, taxAmount, totalAmount]);

  // 5. Update booking status
  await query(`
    UPDATE bookings
    SET 
      final_invoice_sent = true,
      final_invoice_sent_at = NOW(),
      final_invoice_approved_by = 1,
      final_invoice_approved_at = NOW(),
      status = 'awaiting_final_payment',
      updated_at = NOW()
    WHERE id = $1
  `, [bookingId]);

  // 6. Send email to customer
  const { sendEmail, EmailTemplates } = await import('@/lib/email');
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/final/${bookingId}`;
  
  const emailTemplate = EmailTemplates.finalInvoice({
    customer_name: booking.customer_name,
    booking_number: booking.booking_number,
    invoice_number: invoice.invoice_number,
    tour_date: booking.tour_date,
    actual_hours: hours,
    hourly_rate: hourlyRate,
    subtotal,
    driver_name: booking.driver_name || 'Your Driver',
    payment_url: paymentUrl,
  });

  const emailSent = await sendEmail({
    to: booking.customer_email,
    ...emailTemplate,
  });

  if (emailSent) {
    logger.info('Final invoice email sent', { to: booking.customer_email });
  } else {
    logger.warn('Email not configured', { to: booking.customer_email, paymentUrl });
  }

  // 7. Return success
  return NextResponse.json({
    success: true,
    message: 'Invoice approved and sent successfully',
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      sent_at: invoice.sent_at
    },
    booking: {
      id: booking.id,
      booking_number: booking.booking_number,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email
    }
  });
});
