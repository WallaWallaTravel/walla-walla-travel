import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

const ResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/reset-password
 * Request a password reset email
 * Always returns success to prevent email enumeration
 */
export const POST = withRateLimit(rateLimiters.auth)(
  withErrorHandling(async (request: NextRequest) => {
    const { email } = await validateBody(request, ResetRequestSchema);

    // Look up user (but always return success regardless)
    const userResult = await query<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Generate reset token (1 hour expiry)
      // Store only the hash in the database; email the raw token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await query(
        `UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
        [hashedToken, expiresAt, user.id]
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await sendEmail({
        to: email.toLowerCase(),
        subject: 'Reset Your Password - Walla Walla Travel',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
                    Password Reset
                  </h1>
                </div>
                <div style="padding: 40px 30px;">
                  <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                    Hi <strong>${user.name}</strong>,
                  </p>
                  <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                    We received a request to reset your password. Click the button below to choose a new password.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: #059669; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #9ca3af; text-align: center; margin: 20px 0;">
                    This link expires in 1 hour.
                  </p>
                  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                      <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>
                      <span style="color: #059669; word-break: break-all;">${resetUrl}</span>
                    </p>
                  </div>
                  <p style="font-size: 14px; color: #9ca3af; margin: 0;">
                    If you didn't request this, you can safely ignore this email. Your password will not change.
                  </p>
                </div>
                <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    Walla Walla Travel &bull; Walla Walla, Washington
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${user.name},\n\nWe received a request to reset your password.\n\nReset your password here: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nWalla Walla Travel`,
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
      timestamp: new Date().toISOString(),
    });
  })
);
