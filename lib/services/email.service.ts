/**
 * Email Service
 *
 * @module lib/services/email.service
 * @description Handles transactional email delivery for the booking system.
 * Sends booking confirmations, payment receipts, reminders, and notifications
 * using the Resend email provider.
 *
 * @requires Resend - Email delivery via Resend API
 * @requires EmailTemplates - Pre-defined email templates
 *
 * @features
 * - Booking confirmation emails with itinerary details
 * - Payment receipt emails
 * - Reminder emails (24hr, 48hr before tour)
 * - Partner notification emails
 * - Template-based email rendering
 *
 * @example
 * ```typescript
 * import { emailService } from '@/lib/services/email.service';
 *
 * // Send booking confirmation
 * await emailService.sendBookingConfirmation('WWT-2026-001');
 *
 * // Send payment receipt
 * await emailService.sendPaymentReceipt('WWT-2026-001', 150.00);
 * ```
 */

import { BaseService } from './base.service';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { sendEmail, EmailTemplates } from '@/lib/email';

// Type for booking query result
interface BookingEmailRow {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  pickup_location: string;
  total_price: string;
  deposit_amount: string;
}

interface WineryEmailRow {
  name: string;
  city: string;
}

export class EmailService extends BaseService {
  protected get serviceName(): string {
    return 'EmailService';
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(bookingNumber: string) {
    this.log('Sending booking confirmation', { bookingNumber });

    // Get booking details
    const bookingResult = await this.query<BookingEmailRow>(
      `SELECT
        id, booking_number, customer_name, customer_email, tour_date,
        start_time, end_time, duration_hours, party_size, pickup_location,
        total_price, deposit_amount
       FROM bookings
       WHERE booking_number = $1`,
      [bookingNumber]
    );

    if (bookingResult.rows.length === 0) {
      throw new NotFoundError('Booking not found');
    }

    const booking = bookingResult.rows[0];

    // Get wineries for this booking
    const wineriesResult = await this.query<WineryEmailRow>(
      `SELECT w.name, w.city
       FROM itinerary_stops ist
       JOIN itineraries i ON ist.itinerary_id = i.id
       JOIN wineries w ON ist.winery_id = w.id
       WHERE i.booking_id = $1
       ORDER BY ist.stop_order`,
      [booking.id]
    );

    const wineries = wineriesResult.rows;

    // Calculate balance
    const totalPrice = parseFloat(booking.total_price);
    const depositPaid = parseFloat(booking.deposit_amount);
    const balanceDue = totalPrice - depositPaid;

    // Send confirmation email
    const emailSent = await sendEmail({
      to: booking.customer_email,
      ...EmailTemplates.bookingConfirmation({
        customer_name: booking.customer_name,
        booking_number: booking.booking_number,
        tour_date: booking.tour_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_hours: booking.duration_hours,
        party_size: booking.party_size,
        pickup_location: booking.pickup_location,
        total_price: totalPrice,
        deposit_paid: depositPaid,
        balance_due: balanceDue,
        wineries: wineries,
      }),
    });

    this.log(`Confirmation email ${emailSent ? 'sent' : 'failed'}`, { bookingNumber });

    return {
      email_sent: emailSent,
      booking_number: booking.booking_number,
      customer_email: booking.customer_email,
    };
  }
}

export const emailService = new EmailService();




