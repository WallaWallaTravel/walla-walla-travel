/**
 * Cron: Abandoned Cart Recovery Emails
 *
 * Sends follow-up emails to users who started booking but didn't complete.
 * Run hourly to catch abandoned carts within the 30min-48hr window.
 *
 * For Vercel: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/abandoned-cart-emails",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { bookingTrackingService } from '@/lib/services/booking-tracking.service';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const GET = withCronAuth(async (_request: NextRequest) => {
  // Check if Resend is configured
  if (!resend) {
    return NextResponse.json({
      success: false,
      message: 'Email service not configured - RESEND_API_KEY missing',
      processed: 0
    }, { status: 503 });
  }

  // Get abandoned bookings ready for follow-up
  const abandoned = await bookingTrackingService.getAbandonedForFollowUp({
    minAgeMinutes: 30,  // Wait 30 min before emailing
    maxAgeHours: 48,    // Don't email if older than 48 hours
    limit: 20           // Process in batches
  });

  if (abandoned.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No abandoned carts to process',
      processed: 0
    });
  }

  let sent = 0;
  let failed = 0;

  for (const attempt of abandoned) {
    if (!attempt.email) continue;

    try {
      // Build personalized email
      const tourDateStr = attempt.tour_date
        ? new Date(attempt.tour_date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })
        : null;

      const emailResult = await resend.emails.send({
        from: 'Walla Walla Travel <bookings@wallawalla.travel>',
        to: attempt.email,
        subject: tourDateStr
          ? `Still planning your ${tourDateStr} wine tour?`
          : 'Complete your Walla Walla wine tour booking',
        html: generateAbandonedCartEmail({
          name: attempt.name,
          tourDate: tourDateStr,
          partySize: attempt.party_size,
          step: attempt.step_reached
        })
      });

      // Mark as sent
      await bookingTrackingService.markFollowUpSent(
        attempt.id,
        emailResult.data?.id || 'unknown'
      );
      sent++;

    } catch (emailError) {
      const message = emailError instanceof Error ? emailError.message : 'Unknown error';
      logger.error('Failed to send abandoned cart email', { email: attempt.email, error: message });
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${abandoned.length} abandoned carts`,
    sent,
    failed,
    timestamp: new Date().toISOString()
  });
});

export const POST = GET;

// ============================================================================
// Email Template
// ============================================================================

function generateAbandonedCartEmail(data: {
  name: string | null;
  tourDate: string | null;
  partySize: number | null;
  step: string;
}): string {
  const greeting = data.name ? `Hi ${data.name.split(' ')[0]},` : 'Hi there,';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Booking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #722F37; margin: 0;">Walla Walla Travel</h1>
    <p style="color: #666; margin: 5px 0;">Wine Country Tours & Experiences</p>
  </div>

  <div style="background: #f8f5f0; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <p style="font-size: 18px; margin-top: 0;">${greeting}</p>

    <p>We noticed you were exploring our wine tour options${data.tourDate ? ` for <strong>${data.tourDate}</strong>` : ''} but didn't complete your booking.</p>

    ${data.partySize ? `<p>We're holding availability for your group of <strong>${data.partySize}</strong>!</p>` : ''}

    <p>No worries - life gets busy! Your selections are saved, and we'd love to help you experience Walla Walla wine country.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wallawalla.travel/book" style="display: inline-block; background: #722F37; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">Complete Your Booking</a>
    </div>

    <p style="font-size: 14px; color: #666;">
      <strong>Questions?</strong> Just reply to this email or call us at (509) 555-WINE.
      We're happy to help you plan the perfect tour!
    </p>
  </div>

  <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
    <p>Walla Walla Travel | Your Gateway to Wine Country</p>
    <p>
      <a href="https://wallawalla.travel/unsubscribe" style="color: #888;">Unsubscribe</a> |
      <a href="https://wallawalla.travel/privacy" style="color: #888;">Privacy Policy</a>
    </p>
  </div>

</body>
</html>
  `;
}
