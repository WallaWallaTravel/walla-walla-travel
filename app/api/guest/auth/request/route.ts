/**
 * POST /api/guest/auth/request
 *
 * Guest enters their email → finds or creates guest_profile →
 * generates magic link token → sends email via Resend.
 *
 * Rate limited: 5 attempts per 15 minutes (auth limiter).
 * CSRF protected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { guestProfileService } from '@/lib/services/guest-profile.service';
import { sendGuestMagicLinkEmail } from '@/lib/email/templates/guest-magic-link';
import { logger } from '@/lib/logger';

const RequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
});

export const POST = withCSRF(
  withRateLimit(rateLimiters.auth)(
    withErrorHandling(async (request: NextRequest) => {
      const body = await request.json();
      const parsed = RequestSchema.safeParse(body);

      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues[0]?.message || 'Invalid request'
        );
      }

      const { email, name, phone } = parsed.data;

      // Find or create guest profile
      const profile = await guestProfileService.findOrCreateByEmail(email, {
        name,
        phone,
      });

      // Check for too many active links (max 3 outstanding)
      const activeCount = await guestProfileService.countActiveLinks(profile.id);
      if (activeCount >= 3) {
        // Still return success to avoid email enumeration
        logger.warn('Guest magic link rate limit hit', {
          guestProfileId: profile.id,
          activeCount,
        });
        return NextResponse.json({
          success: true,
          message: 'If an account exists with that email, a login link has been sent.',
        });
      }

      // Create magic link
      const token = await guestProfileService.createMagicLink(profile.id);

      // Send email
      const sent = await sendGuestMagicLinkEmail({
        email: profile.email,
        name: profile.name,
        token,
      });

      if (!sent) {
        logger.error('Failed to send guest magic link email', {
          guestProfileId: profile.id,
        });
      }

      // Always return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a login link has been sent.',
      });
    })
  )
);
