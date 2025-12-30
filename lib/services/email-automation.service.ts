import { logger } from '@/lib/logger';
/**
 * Email Automation Service
 * Handles automated email triggers and scheduled emails
 */

import { sendEmail, EmailTemplates } from '@/lib/email';
import { query } from '@/lib/db';
import { queryOne, queryMany } from '@/lib/db-helpers';

interface BookingData {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  start_time: string;
  end_time?: string;
  duration_hours: number;
  party_size: number;
  pickup_location: string;
  total_price: number;
  deposit_amount: number;
  balance_due: number;
  driver_name?: string;
  driver_email?: string;
  status: string;
}

interface PaymentData {
  id: number;
  booking_id: number;
  amount: number;
  payment_type: string;
  payment_method: string;
  stripe_payment_intent_id?: string;
  customer_name: string;
  customer_email: string;
  booking_number: string;
}

/**
 * Send booking confirmation email
 * Triggered when a new booking is created
 */
export async function sendBookingConfirmationEmail(bookingId: number): Promise<boolean> {
  try {
    const booking = await queryOne<BookingData>(`
      SELECT 
        b.*,
        u.name as driver_name,
        u.email as driver_email
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      WHERE b.id = $1
    `, [bookingId]);

    if (!booking || !booking.customer_email) {
      logger.error('[EmailAutomation] Booking not found or no email:', bookingId);
      return false;
    }

    // Get wineries for this booking
    const wineries = await queryMany<{ name: string; city: string }>(`
      SELECT w.name, w.city
      FROM itinerary_stops its
      JOIN wineries w ON its.winery_id = w.id
      WHERE its.booking_id = $1
      ORDER BY its.stop_order
    `, [bookingId]);

    const template = EmailTemplates.bookingConfirmation({
      customer_name: booking.customer_name,
      booking_number: booking.booking_number,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: booking.duration_hours || 4,
      party_size: booking.party_size,
      pickup_location: booking.pickup_location || 'TBD',
      total_price: booking.total_price || 0,
      deposit_paid: booking.deposit_amount || 0,
      balance_due: booking.balance_due || 0,
      wineries: wineries.length > 0 ? wineries : undefined,
    });

    const result = await sendEmail({
      to: booking.customer_email,
      ...template,
    });

    if (result) {
      // Log email sent
      await query(`
        INSERT INTO email_logs (
          booking_id,
          email_type,
          recipient,
          subject,
          sent_at,
          status
        ) VALUES ($1, $2, $3, $4, NOW(), 'sent')
      `, [bookingId, 'booking_confirmation', booking.customer_email, template.subject]);
    }

    logger.info(`[EmailAutomation] Booking confirmation ${result ? 'sent' : 'failed'} for booking #${booking.booking_number}`);
    return result;

  } catch (error) {
    logger.error('[EmailAutomation] Error sending booking confirmation:', error);
    return false;
  }
}

/**
 * Send payment receipt email
 * Triggered after successful payment
 */
export async function sendPaymentReceiptEmail(paymentId: number): Promise<boolean> {
  try {
    const payment = await queryOne<PaymentData>(`
      SELECT 
        p.*,
        b.customer_name,
        b.customer_email,
        b.booking_number
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.id = $1
    `, [paymentId]);

    if (!payment || !payment.customer_email) {
      logger.error('[EmailAutomation] Payment not found or no email:', paymentId);
      return false;
    }

    const result = await sendEmail({
      to: payment.customer_email,
      subject: `✅ Payment Received - ${payment.booking_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h1 style="margin: 0;">Payment Received!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <p>Hi ${payment.customer_name},</p>
            
            <p>Thank you! We've received your ${payment.payment_type === 'deposit' ? 'deposit' : 'payment'}.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>Booking:</strong> ${payment.booking_number}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> $${payment.amount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${payment.payment_method}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              ${payment.stripe_payment_intent_id ? `<p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${payment.stripe_payment_intent_id}</p>` : ''}
            </div>
            
            <p>If you have any questions, please don't hesitate to reach out.</p>
            
            <p>Cheers!<br>Walla Walla Travel Team</p>
          </div>
        </div>
      `,
    });

    if (result) {
      await query(`
        INSERT INTO email_logs (
          booking_id,
          email_type,
          recipient,
          subject,
          sent_at,
          status
        ) VALUES ($1, $2, $3, $4, NOW(), 'sent')
      `, [payment.booking_id, 'payment_receipt', payment.customer_email, 'Payment Received']);
    }

    logger.info(`[EmailAutomation] Payment receipt ${result ? 'sent' : 'failed'} for booking #${payment.booking_number}`);
    return result;

  } catch (error) {
    logger.error('[EmailAutomation] Error sending payment receipt:', error);
    return false;
  }
}

/**
 * Send tour reminder email
 * Triggered 48 hours before tour date
 */
export async function sendTourReminderEmail(bookingId: number): Promise<boolean> {
  try {
    const booking = await queryOne<BookingData>(`
      SELECT 
        b.*,
        u.name as driver_name,
        u.phone as driver_phone
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      WHERE b.id = $1
    `, [bookingId]);

    if (!booking || !booking.customer_email) {
      logger.error('[EmailAutomation] Booking not found or no email:', bookingId);
      return false;
    }

    // Get itinerary
    const stops = await queryMany<{ name: string; arrival_time: string; city: string }>(`
      SELECT w.name, its.arrival_time::text, w.city
      FROM itinerary_stops its
      JOIN wineries w ON its.winery_id = w.id
      WHERE its.booking_id = $1
      ORDER BY its.stop_order
    `, [bookingId]);

    const tourDate = new Date(booking.tour_date);
    const formattedDate = tourDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const result = await sendEmail({
      to: booking.customer_email,
      subject: `🍷 Your Tour is Coming Up! ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">🍷</div>
            <h1 style="margin: 0;">Your Tour is Almost Here!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${formattedDate}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <p>Hi ${booking.customer_name},</p>
            
            <p>We're excited for your upcoming wine tour! Here's everything you need to know:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin-top: 0; color: #7c3aed;">📋 Tour Details</h2>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Pickup Time:</strong> ${booking.start_time}</p>
              <p style="margin: 5px 0;"><strong>📍 Pickup Location:</strong> ${booking.pickup_location || 'TBD'}</p>
              <p style="margin: 5px 0;"><strong>👥 Party Size:</strong> ${booking.party_size} guests</p>
              ${booking.driver_name ? `<p style="margin: 5px 0;"><strong>🚗 Driver:</strong> ${booking.driver_name}</p>` : ''}
            </div>
            
            ${stops.length > 0 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">🗺️ Your Itinerary</h3>
              ${stops.map((stop: { name: string; city: string; arrival_time?: string }, i: number) => `
                <p style="margin: 8px 0; padding-left: 20px; border-left: 2px solid #e5e7eb;">
                  <strong>${i + 1}. ${stop.name}</strong><br>
                  <span style="color: #6b7280; font-size: 14px;">${stop.city} • ${stop.arrival_time || 'Time TBD'}</span>
                </p>
              `).join('')}
            </div>
            ` : ''}
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">📝 Reminders</h3>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                <li>Wear comfortable shoes for walking through vineyards</li>
                <li>Bring a light jacket - wine caves can be cool</li>
                <li>Have a light breakfast before tasting</li>
                <li>Bring water to stay hydrated</li>
                <li>Camera for those vineyard views! 📸</li>
              </ul>
            </div>
            
            <p>We can't wait to show you the best of Walla Walla wine country!</p>
            
            <p>Questions? Reply to this email or call us at (509) 555-0199.</p>
            
            <p>Cheers! 🥂<br>Walla Walla Travel Team</p>
          </div>
        </div>
      `,
    });

    if (result) {
      await query(`
        INSERT INTO email_logs (
          booking_id,
          email_type,
          recipient,
          subject,
          sent_at,
          status
        ) VALUES ($1, $2, $3, $4, NOW(), 'sent')
      `, [bookingId, 'tour_reminder', booking.customer_email, 'Your Tour is Coming Up']);
      
      // Mark reminder as sent
      await query(`
        UPDATE bookings SET reminder_sent = true WHERE id = $1
      `, [bookingId]);
    }

    logger.info(`[EmailAutomation] Tour reminder ${result ? 'sent' : 'failed'} for booking #${booking.booking_number}`);
    return result;

  } catch (error) {
    logger.error('[EmailAutomation] Error sending tour reminder:', error);
    return false;
  }
}

/**
 * Process pending tour reminders
 * Should be called by cron job every hour
 */
export async function processTourReminders(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    // Find bookings needing reminders (48 hours before tour)
    const bookings = await queryMany<{ id: number; booking_number: string }>(`
      SELECT id, booking_number
      FROM bookings
      WHERE status IN ('confirmed', 'pending')
      AND (reminder_sent IS NULL OR reminder_sent = false)
      AND tour_date >= CURRENT_DATE
      AND tour_date <= CURRENT_DATE + INTERVAL '2 days'
      AND customer_email IS NOT NULL
    `);

    logger.info(`[EmailAutomation] Found ${bookings.length} bookings needing tour reminders`);

    for (const booking of bookings) {
      const result = await sendTourReminderEmail(booking.id);
      if (result) {
        sent++;
      } else {
        failed++;
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    logger.error('[EmailAutomation] Error processing tour reminders:', error);
  }

  return { sent, failed };
}

/**
 * Send driver assignment notification to customer
 */
export async function sendDriverAssignmentToCustomer(bookingId: number): Promise<boolean> {
  try {
    const booking = await queryOne<BookingData & { 
      driver_phone: string;
      vehicle_number: string;
      vehicle_make: string;
      vehicle_model: string;
    }>(`
      SELECT 
        b.*,
        u.name as driver_name,
        u.phone as driver_phone,
        v.vehicle_number,
        v.make as vehicle_make,
        v.model as vehicle_model
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN vehicle_assignments va ON va.booking_id = b.id
      LEFT JOIN vehicles v ON va.vehicle_id = v.id
      WHERE b.id = $1
    `, [bookingId]);

    if (!booking || !booking.customer_email || !booking.driver_name) {
      logger.error('[EmailAutomation] Booking, email, or driver not found:', bookingId);
      return false;
    }

    const tourDate = new Date(booking.tour_date);
    const formattedDate = tourDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });

    const result = await sendEmail({
      to: booking.customer_email,
      subject: `🚗 Your Driver is Confirmed - ${booking.booking_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">🚗</div>
            <h1 style="margin: 0;">Driver Confirmed!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <p>Hi ${booking.customer_name},</p>
            
            <p>Great news! Your driver has been assigned for your ${formattedDate} tour.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">👨‍✈️</div>
              <h2 style="margin: 0; color: #1f2937;">${booking.driver_name}</h2>
              ${booking.driver_phone ? `<p style="color: #6b7280; margin: 10px 0;">${booking.driver_phone}</p>` : ''}
            </div>
            
            ${booking.vehicle_number ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Vehicle</p>
              <p style="margin: 5px 0; font-weight: bold; color: #1f2937;">
                ${booking.vehicle_number} - ${booking.vehicle_make} ${booking.vehicle_model}
              </p>
            </div>
            ` : ''}
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;">
                <strong>📅 ${formattedDate}</strong><br>
                🕐 ${booking.start_time} pickup at ${booking.pickup_location || 'TBD'}
              </p>
            </div>
            
            <p>Your driver will be in touch closer to your tour date with any final details.</p>
            
            <p>See you soon! 🍷<br>Walla Walla Travel Team</p>
          </div>
        </div>
      `,
    });

    if (result) {
      await query(`
        INSERT INTO email_logs (
          booking_id,
          email_type,
          recipient,
          subject,
          sent_at,
          status
        ) VALUES ($1, $2, $3, $4, NOW(), 'sent')
      `, [bookingId, 'driver_assignment_customer', booking.customer_email, 'Driver Confirmed']);
    }

    logger.info(`[EmailAutomation] Driver assignment to customer ${result ? 'sent' : 'failed'} for booking #${booking.booking_number}`);
    return result;

  } catch (error) {
    logger.error('[EmailAutomation] Error sending driver assignment to customer:', error);
    return false;
  }
}

export const EmailAutomation = {
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  sendTourReminderEmail,
  sendDriverAssignmentToCustomer,
  processTourReminders,
};

