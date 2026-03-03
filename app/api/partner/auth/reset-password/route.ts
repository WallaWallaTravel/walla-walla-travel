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
  type: z.enum(['hotel', 'business']),
});

/**
 * POST /api/partner/auth/reset-password
 * Validates token and sets new password for partners (hotel or business)
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.passwordReset)(
  withErrorHandling(async (request: NextRequest) => {
    const { token, password, type } = await validateBody(request, ResetConfirmSchema);

    // Validate password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new BadRequestError(strength.errors.join('. '));
    }

    // Hash the incoming token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (type === 'hotel') {
      await resetHotelPartnerPassword(hashedToken, password);
    } else {
      await resetBusinessPartnerPassword(hashedToken, password);
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset. You can now sign in with your new password.',
      timestamp: new Date().toISOString(),
    });
  })
)
);

/**
 * Reset password for hotel partners (hotel_partners table)
 */
async function resetHotelPartnerPassword(hashedToken: string, password: string) {
  const result = await query<{ id: number; reset_token_expires_at: string }>(
    `SELECT id, reset_token_expires_at FROM hotel_partners
     WHERE reset_token = $1 AND is_active = true
     FOR UPDATE`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new BadRequestError('Invalid or expired reset link');
  }

  const hotel = result.rows[0];

  if (new Date(hotel.reset_token_expires_at) < new Date()) {
    await query(
      `UPDATE hotel_partners SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1`,
      [hotel.id]
    );
    throw new BadRequestError('Reset link has expired. Please request a new one.');
  }

  const passwordHash = await hashPassword(password);

  await query(
    `UPDATE hotel_partners
     SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, hotel.id]
  );
}

/**
 * Reset password for business partners (users table)
 */
async function resetBusinessPartnerPassword(hashedToken: string, password: string) {
  const result = await query<{ id: number; reset_token_expires_at: string }>(
    `SELECT id, reset_token_expires_at FROM users
     WHERE reset_token = $1 AND is_active = true AND role = 'partner'
     FOR UPDATE`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new BadRequestError('Invalid or expired reset link');
  }

  const user = result.rows[0];

  if (new Date(user.reset_token_expires_at) < new Date()) {
    await query(
      `UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1`,
      [user.id]
    );
    throw new BadRequestError('Reset link has expired. Please request a new one.');
  }

  const passwordHash = await hashPassword(password);

  await query(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  // Revoke all sessions — forces re-login with new password
  const { sessionStoreService } = await import('@/lib/services/session-store.service');
  await sessionStoreService.revokeAllUserSessions(user.id);
}
