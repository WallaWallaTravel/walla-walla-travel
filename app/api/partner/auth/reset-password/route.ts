import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { query } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/passwords';
import crypto from 'crypto';
import { withCSRF } from '@/lib/api/middleware/csrf';

const ResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/partner/auth/reset-password
 * Validates token and sets new password for hotel partners
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.passwordReset)(
  withErrorHandling(async (request: NextRequest) => {
    const { token, password } = await validateBody(request, ResetConfirmSchema);

    // Validate password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new BadRequestError(strength.errors.join('. '));
    }

    // Hash the incoming token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find hotel partner by hashed reset token (FOR UPDATE prevents race conditions)
    const hotelResult = await query<{ id: number; reset_token_expires_at: string }>(
      `SELECT id, reset_token_expires_at FROM hotel_partners
       WHERE reset_token = $1 AND is_active = true
       FOR UPDATE`,
      [hashedToken]
    );

    if (hotelResult.rows.length === 0) {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const hotel = hotelResult.rows[0];

    // Check expiry
    if (new Date(hotel.reset_token_expires_at) < new Date()) {
      // Clear expired token
      await query(
        `UPDATE hotel_partners SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1`,
        [hotel.id]
      );
      throw new BadRequestError('Reset link has expired. Please request a new one.');
    }

    // Hash new password (uses centralized SALT_ROUNDS = 12)
    const passwordHash = await hashPassword(password);

    // Update password and clear token
    await query(
      `UPDATE hotel_partners
       SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, hotel.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password has been reset. You can now sign in with your new password.',
      timestamp: new Date().toISOString(),
    });
  })
)
);
