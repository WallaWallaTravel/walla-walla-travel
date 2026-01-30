/**
 * Deposit Request API
 * Send deposit request emails and SMS to customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { Resend } from 'resend';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface DepositRequestBody {
  depositAmount: number;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  sendEmail: boolean;
  sendSms: boolean;
}

export const POST = withErrorHandling(async (
  request: NextRequest,
  context
) => {
  const { id } = await context.params;
  const reservationId = parseInt(id, 10);

  if (isNaN(reservationId)) {
    throw new BadRequestError('Invalid reservation ID');
  }

  const body: DepositRequestBody = await request.json();

  // Get reservation with customer info
  const result = await query(
    `SELECT r.*, c.email, c.name, c.phone, c.sms_marketing_consent
     FROM reservations r
     LEFT JOIN customers c ON r.customer_id = c.id
     WHERE r.id = $1`,
    [reservationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Reservation not found');
  }

  const reservation = result.rows[0];
  const customerEmail = reservation.email;
  const customerPhone = reservation.phone;

  const results = {
    emailSent: false,
    smsSent: false,
    errors: [] as string[],
  };

  // Send email if requested
  if (body.sendEmail && customerEmail) {
    try {
      if (!resend) {
        results.errors.push('Email service not configured (RESEND_API_KEY missing)');
      } else {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@wallawalla.travel',
          to: customerEmail,
          subject: body.emailSubject,
          text: body.emailBody,
        });
        results.emailSent = true;
      }
    } catch (emailError) {
      logger.error('Email send error', { error: emailError });
      results.errors.push(`Email failed: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
    }
  }

  // Send SMS if requested
  if (body.sendSms && customerPhone) {
    try {
      // Check if Twilio is configured
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        results.errors.push('SMS service not configured (Twilio credentials missing)');
      } else {
        // Format phone number (ensure it starts with +1 for US)
        let formattedPhone = customerPhone.replace(/[^\d]/g, '');
        if (formattedPhone.length === 10) {
          formattedPhone = `+1${formattedPhone}`;
        } else if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+${formattedPhone}`;
        }

        // Use Twilio REST API directly
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioFromNumber,
            To: formattedPhone,
            Body: body.smsMessage,
          }),
        });

        if (twilioResponse.ok) {
          results.smsSent = true;
        } else {
          const twilioError = await twilioResponse.json();
          throw new Error(twilioError.message || 'Twilio API error');
        }
      }
    } catch (smsError) {
      logger.error('SMS send error', { error: smsError });
      results.errors.push(`SMS failed: ${smsError instanceof Error ? smsError.message : 'Unknown error'}`);
    }
  }

  // Update reservation with deposit amount and mark as contacted
  await query(
    `UPDATE reservations
     SET deposit_amount = $1,
         contacted_at = COALESCE(contacted_at, NOW()),
         status = CASE WHEN status = 'pending' THEN 'contacted' ELSE status END,
         updated_at = NOW()
     WHERE id = $2`,
    [body.depositAmount, reservationId]
  );

  // Log activity
  await query(
    `INSERT INTO activity_log (
      activity_type,
      user_type,
      description,
      metadata,
      created_at
    ) VALUES ('deposit_request_sent', 'admin', $1, $2, NOW())`,
    [
      `Deposit request sent for ${reservation.reservation_number}`,
      JSON.stringify({
        reservation_id: reservationId,
        deposit_amount: body.depositAmount,
        email_sent: results.emailSent,
        sms_sent: results.smsSent,
      }),
    ]
  );

  // Return success with any warnings
  if (results.errors.length > 0 && !results.emailSent && !results.smsSent) {
    return NextResponse.json(
      { success: false, message: results.errors.join('; '), results },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Deposit request sent successfully${results.errors.length > 0 ? ` (with warnings: ${results.errors.join('; ')})` : ''}`,
    results,
  });
});
