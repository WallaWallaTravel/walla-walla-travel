import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/passwords';
import crypto from 'crypto';

const ResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/auth/reset-password/confirm
 * Validates token and sets new password
 */
export const POST = withRateLimit(rateLimiters.passwordReset)(
  withErrorHandling(async (request: NextRequest) => {
    const { token, password } = await validateBody(request, ResetConfirmSchema);

    // Validate password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new BadRequestError(strength.errors.join('. '));
    }

    // Hash the incoming token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by hashed reset token (FOR UPDATE prevents race conditions)
    const userRows = await prisma.$queryRaw<{ id: number; reset_token_expires_at: string }[]>`
      SELECT id, reset_token_expires_at FROM users
      WHERE reset_token = ${hashedToken} AND is_active = true
      FOR UPDATE`;

    if (userRows.length === 0) {
      throw new BadRequestError('Invalid or expired reset link');
    }

    const user = userRows[0];

    // Check expiry
    if (new Date(user.reset_token_expires_at) < new Date()) {
      // Clear expired token
      await prisma.$executeRaw`
        UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = ${user.id}`;
      throw new BadRequestError('Reset link has expired. Please request a new one.');
    }

    // Hash new password (uses centralized SALT_ROUNDS = 12)
    const passwordHash = await hashPassword(password);

    // Update password and clear token
    await prisma.$executeRaw`
      UPDATE users
      SET password_hash = ${passwordHash}, reset_token = NULL, reset_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}`;

    // Revoke all sessions — forces re-login with new password
    const { sessionStoreService } = await import('@/lib/services/session-store.service');
    await sessionStoreService.revokeAllUserSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset. You can now sign in with your new password.',
      timestamp: new Date().toISOString(),
    });
  })
);
