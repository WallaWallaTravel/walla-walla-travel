import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logAuthEvent } from '@/lib/services/auth-audit.service';
import crypto from 'crypto';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/partner/auth/forgot-password
 * Request a password reset email for partners (hotel partners AND business partners)
 * Always returns success to prevent email enumeration
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.passwordReset)(
  withErrorHandling(async (request: NextRequest) => {
    const { email } = await validateBody(request, ForgotPasswordSchema);
    const normalizedEmail = email.toLowerCase();

    // Try hotel partner first, then business partner (users table)
    const hotelResult = await query<{ id: number; name: string }>(
      `SELECT id, name FROM hotel_partners WHERE email = $1 AND is_active = true`,
      [normalizedEmail]
    );

    const businessResult = await query<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE email = $1 AND is_active = true AND role = 'partner'`,
      [normalizedEmail]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle hotel partner reset
    if (hotelResult.rows.length > 0) {
      const hotel = hotelResult.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await query(
        `UPDATE hotel_partners SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, hotel.id]
      );

      const resetUrl = `${appUrl}/partner-portal/reset-password?token=${rawToken}&type=hotel`;
      await sendPartnerResetEmail(normalizedEmail, hotel.name, resetUrl);

      logAuthEvent({
        eventType: 'password_reset_request',
        partnerType: 'hotel',
        partnerId: hotel.id,
        email: normalizedEmail,
        request,
      });
    }

    // Handle business partner reset
    if (businessResult.rows.length > 0) {
      const user = businessResult.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await query(
        `UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, user.id]
      );

      const resetUrl = `${appUrl}/partner-portal/reset-password?token=${rawToken}&type=business`;
      await sendPartnerResetEmail(normalizedEmail, user.name, resetUrl);

      logAuthEvent({
        eventType: 'password_reset_request',
        partnerType: 'business',
        partnerId: user.id,
        email: normalizedEmail,
        request,
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
      timestamp: new Date().toISOString(),
    });
  })
)
);

/**
 * Send the branded password reset email
 */
async function sendPartnerResetEmail(to: string, name: string, resetUrl: string) {
  await sendEmail({
    to,
    subject: 'Reset Your Password - Walla Walla Travel Partner Portal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${emailDarkModeStyles()}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
        <div class="em-wrapper" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px #e5e7eb;">
            <div style="background-color: #8B1538; background: linear-gradient(135deg, #8B1538 0%, #6B1029 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                Partner Password Reset
              </h1>
            </div>
            <div class="em-body" style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your partner portal password. Click the button below to choose a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #8B1538; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 20px 0;">
                This link expires in 1 hour.
              </p>
              <div class="em-card" style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;">
                  <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>
                  <span style="color: #8B1538; word-break: break-all;">${resetUrl}</span>
                </p>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                If you didn't request this, you can safely ignore this email. Your password will not change.
              </p>
            </div>
            <div class="em-footer" style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                Walla Walla Travel Partner Portal &bull; Walla Walla, Washington
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name},\n\nWe received a request to reset your partner portal password.\n\nReset your password here: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nWalla Walla Travel Partner Portal`,
  });
}
