import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/test-email
 * Send a test email to verify Resend configuration
 *
 * Body: { to?: string } - defaults to STAFF_NOTIFICATION_EMAIL
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json().catch(() => ({}));
  const toEmail = body.to || process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

  // Validate email format
  if (!toEmail.includes('@')) {
    throw new BadRequestError('Invalid email address');
  }

  const testDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🍷 Walla Walla Travel</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email System Test</p>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1E3A5F; margin-top: 0;">✅ Email Delivery Successful!</h2>

        <p>This is a test email to verify that the Resend email service is properly configured.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Sent To:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">From Domain:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">wallawalla.travel</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Test Time:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${testDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Service:</td>
              <td style="padding: 8px 0; font-weight: 500;">Resend</td>
            </tr>
          </table>
        </div>

        <p style="color: #059669; font-weight: 500;">✓ Your email configuration is working correctly!</p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This email was sent from the Walla Walla Travel admin panel to test email delivery.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Walla Walla Travel • info@wallawalla.travel • (509) 200-8000</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Walla Walla Travel - Email System Test

✅ Email Delivery Successful!

This is a test email to verify that the Resend email service is properly configured.

Configuration Details:
- Sent To: ${toEmail}
- From Domain: wallawalla.travel
- Test Time: ${testDate}
- Service: Resend

✓ Your email configuration is working correctly!

---
Walla Walla Travel
info@wallawalla.travel
(509) 200-8000
  `.trim();

  logger.info('[Test Email] Sending test email', { to: toEmail });

  const success = await sendEmail({
    to: toEmail,
    subject: '✅ Walla Walla Travel - Email Test Successful',
    html,
    text,
  });

  if (!success) {
    return NextResponse.json({
      success: false,
      error: 'Email send failed - check server logs for details',
      message: 'The email service returned an error. This could be due to:\n' +
        '- Invalid RESEND_API_KEY\n' +
        '- Domain not verified in Resend\n' +
        '- Rate limiting\n' +
        '- Invalid recipient email',
    }, { status: 500 });
  }

  logger.info('[Test Email] Test email sent successfully', { to: toEmail });

  return NextResponse.json({
    success: true,
    message: `Test email sent to ${toEmail}`,
    data: {
      recipient: toEmail,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/admin/test-email
 * Check email configuration status
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const hasApiKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'bookings@wallawalla.travel';
  const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    success: true,
    data: {
      configured: hasApiKey,
      from_email: fromEmail,
      staff_email: staffEmail,
      app_url: appUrl,
      api_key_present: hasApiKey,
      api_key_prefix: hasApiKey ? process.env.RESEND_API_KEY?.substring(0, 10) + '...' : null,
    },
  });
});
