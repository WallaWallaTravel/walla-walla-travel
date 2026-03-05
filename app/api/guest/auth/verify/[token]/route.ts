/**
 * GET /api/guest/auth/verify/[token]
 *
 * Validates a magic link token → sets guest session cookie → redirects to guest portal.
 *
 * Flow:
 * 1. Guest clicks link in email
 * 2. Token is verified (must be unused and not expired)
 * 3. Token is marked as used
 * 4. Guest session JWT is created and set as cookie
 * 5. Redirect to /my-trips (guest portal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { guestProfileService } from '@/lib/services/guest-profile.service';
import {
  createGuestSession,
  setGuestSessionCookie,
} from '@/lib/api/middleware/guest-auth';
import { logger } from '@/lib/logger';

export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ token: string }> }
  ) => {
    const { token } = await context.params;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Validate token format (64-char hex)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      logger.warn('Invalid magic link token format', {
        tokenLength: token?.length,
      });
      return NextResponse.redirect(
        `${appUrl}/guest/login?error=invalid_link`
      );
    }

    // Verify and consume the token
    const guestProfile = await guestProfileService.verifyMagicLink(token);

    if (!guestProfile) {
      logger.warn('Magic link verification failed', {
        tokenPrefix: token.substring(0, 8),
      });
      return NextResponse.redirect(
        `${appUrl}/guest/login?error=expired_link`
      );
    }

    // Create guest session JWT
    const sessionToken = await createGuestSession(
      guestProfile.id,
      guestProfile.email
    );

    // Redirect to guest portal with session cookie
    const redirectUrl = `${appUrl}/my-trips`;
    const response = NextResponse.redirect(redirectUrl);
    setGuestSessionCookie(response, sessionToken);

    logger.info('Guest authenticated via magic link', {
      guestProfileId: guestProfile.id,
    });

    return response;
  }
);
