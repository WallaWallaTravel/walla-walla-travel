/**
 * Guest Self-Registration API
 * POST /api/my-trip/[token]/guests/[guestId]/register
 * Allows a guest to register their name, email, and phone
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  RouteContext,
  NotFoundError,
  BadRequestError,
} from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { noDisposableEmail } from '@/lib/utils/email-validation';

interface RouteParams {
  token: string;
  guestId: string;
}

const RegisterGuestSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().superRefine(noDisposableEmail),
  phone: z.string().max(50).optional().or(z.literal('')),
});

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token, guestId } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const guestIdNum = parseInt(guestId, 10);
    if (isNaN(guestIdNum)) {
      throw new BadRequestError('Invalid guest ID');
    }

    const body = await request.json();
    const parseResult = RegisterGuestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError('Invalid registration data');
    }

    const { name, email, phone } = parseResult.data;

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      UPDATE trip_proposal_guests
      SET name = ${name}, email = ${email}, phone = ${phone || null}, is_registered = true, updated_at = NOW()
      WHERE id = ${guestIdNum} AND trip_proposal_id = ${proposal.id}
      RETURNING id, name, email, phone, is_registered, is_primary,
               dietary_restrictions, accessibility_needs, special_requests`;

    if (!rows[0]) {
      throw new NotFoundError('Guest not found');
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  }
);
