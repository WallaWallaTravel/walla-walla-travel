/**
 * Guest Resolve API
 * POST /api/my-trip/[token]/guests/resolve
 * Looks up a guest by their unique guest_access_token within a proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { queryOne } from '@/lib/db-helpers';

interface RouteParams {
  token: string;
}

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const body = await request.json();
    const guestToken = body.guest_token;

    if (!guestToken || typeof guestToken !== 'string') {
      throw new BadRequestError('guest_token is required');
    }

    const guest = await queryOne<{
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      is_registered: boolean;
      is_primary: boolean;
      dietary_restrictions: string | null;
      accessibility_needs: string | null;
      special_requests: string | null;
    }>(
      `SELECT id, name, email, phone, is_registered, is_primary,
              dietary_restrictions, accessibility_needs, special_requests
       FROM trip_proposal_guests
       WHERE guest_access_token = $1 AND trip_proposal_id = $2`,
      [guestToken, proposal.id]
    );

    if (!guest) {
      throw new NotFoundError('Guest not found');
    }

    return NextResponse.json({
      success: true,
      data: {
        guest_id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        is_registered: guest.is_registered,
        is_primary: guest.is_primary,
        dietary_restrictions: guest.dietary_restrictions,
        accessibility_needs: guest.accessibility_needs,
        special_requests: guest.special_requests,
      },
    });
  }
);
