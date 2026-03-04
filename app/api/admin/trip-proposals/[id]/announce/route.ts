/**
 * Group Announcement API
 * POST /api/admin/trip-proposals/[id]/announce
 *
 * Sends a group announcement email to all proposal guests with email addresses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { buildGroupAnnouncementEmail } from '@/lib/email/templates/group-announcement-emails';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const AnnounceSchema = z.object({
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, session, context) => {
    const { id } = await (context as unknown as RouteParams).params;
    const proposalId = parseInt(id, 10);

    if (isNaN(proposalId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid proposal ID' },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = AnnounceSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return NextResponse.json(
        { success: false, error: `Validation failed: ${messages}` },
        { status: 400 }
      );
    }

    const { subject, message } = parsed.data;

    // Fetch proposal with guests
    const proposal = await tripProposalService.getFullDetails(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Filter guests with email addresses
    const guestsWithEmail = (proposal.guests || []).filter(
      (g) => g.email && g.email.trim()
    );

    if (guestsWithEmail.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No guests have email addresses' },
        { status: 400 }
      );
    }

    // Send email to each guest
    const tripTitle = proposal.trip_title || proposal.proposal_number;
    let sentCount = 0;
    const errors: string[] = [];

    for (const guest of guestsWithEmail) {
      const portalUrl = guest.guest_access_token
        ? `${BASE_URL}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`
        : undefined;

      const emailContent = buildGroupAnnouncementEmail({
        tripTitle,
        proposalNumber: proposal.proposal_number,
        guestName: guest.name || 'Guest',
        senderName: session.email,
        message,
        portalUrl,
        brandId: proposal.brand_id ?? undefined,
      });

      const success = await sendEmail({
        to: guest.email!,
        subject: subject || emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (success) {
        sentCount++;
      } else {
        errors.push(`${guest.email}: failed to send`);
        logger.error('Failed to send announcement to guest', {
          proposalId,
          guestEmail: guest.email,
        });
      }
    }

    // Log activity
    await tripProposalService.logAnnouncementActivity(proposalId, {
      recipients: sentCount,
      subject: subject || `Update from ${session.email}: ${tripTitle}`,
      actor_user_id: parseInt(session.userId, 10),
    });

    return NextResponse.json({
      success: true,
      data: {
        recipients: sentCount,
        total_guests: guestsWithEmail.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  })
);
