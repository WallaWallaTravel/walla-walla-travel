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
import { query } from '@/lib/db';
import { z } from 'zod';

interface RouteParams {
  token: string;
  guestId: string;
}

const RegisterGuestSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
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

    const result = await query(
      `UPDATE trip_proposal_guests
       SET name = $1, email = $2, phone = $3, is_registered = true, updated_at = NOW()
       WHERE id = $4 AND trip_proposal_id = $5
       RETURNING id, name, email, phone, is_registered, is_primary,
                 dietary_restrictions, accessibility_needs, special_requests`,
      [name, email, phone || null, guestIdNum, proposal.id]
    );

    if (!result.rows[0]) {
      throw new NotFoundError('Guest not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
);
