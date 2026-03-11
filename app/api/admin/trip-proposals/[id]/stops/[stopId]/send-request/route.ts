import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { renderPartnerRequestEmail } from '@/lib/email/templates/partner-request';
import { partnerRequestService } from '@/lib/services/partner-request.service';
import { CreateRequestSchema } from '@/lib/types/partner-request';
import { logger } from '@/lib/logger';

interface RouteParams { id: string; stopId: string; }

/**
 * POST /api/admin/trip-proposals/[id]/stops/[stopId]/send-request
 *
 * Compose and send a partner booking request email.
 * Creates a token, sends branded email via Resend, logs the interaction.
 */
export const POST = withAdminAuth(
    async (request: NextRequest, session: AuthSession, context?) => {
      const { id, stopId } = await (context as RouteContext<RouteParams>).params;
      const proposalId = parseInt(id, 10);
      const stopIdNum = parseInt(stopId, 10);

      // Parse and validate body
      const body = CreateRequestSchema.parse(await request.json());

      // Verify stop belongs to proposal
      const stopExists = await partnerRequestService.verifyStop(stopIdNum, proposalId);
      if (!stopExists) {
        return NextResponse.json(
          { success: false, error: 'Stop not found or does not belong to this proposal' },
          { status: 404 }
        );
      }

      // Get stop + proposal details for email template
      const stopDetailsRows = await prisma.$queryRaw<{
        venue_name: string;
        stop_type: string;
        date: string | null;
        time: string | null;
        party_size: number;
        duration_minutes: number | null;
        customer_name: string;
      }[]>`SELECT
          COALESCE(s.custom_name, w.name, r.name, h.name, 'Venue') as venue_name,
          s.stop_type,
          d.date::text as date,
          s.scheduled_time as time,
          tp.party_size,
          s.duration_minutes,
          tp.customer_name
         FROM trip_proposal_stops s
         JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
         JOIN trip_proposals tp ON tp.id = d.trip_proposal_id
         LEFT JOIN wineries w ON w.id = s.winery_id
         LEFT JOIN restaurants r ON r.id = s.restaurant_id
         LEFT JOIN hotels h ON h.id = s.hotel_id
         WHERE s.id = ${stopIdNum} AND d.trip_proposal_id = ${proposalId}`;

      const stopDetails = stopDetailsRows[0] ?? null;

      if (!stopDetails) {
        return NextResponse.json(
          { success: false, error: 'Could not load stop details' },
          { status: 404 }
        );
      }

      // Create the request token (does NOT send email)
      const requestToken = await partnerRequestService.createRequest({
        stop_id: stopIdNum,
        proposal_id: proposalId,
        partner_email: body.partner_email,
        partner_name: body.partner_name,
        request_type: body.request_type,
        request_subject: body.request_subject,
        request_body: body.request_body,
        sent_by: parseInt(session.userId, 10),
        expires_in_days: body.expires_in_days,
      });

      // Format date for email
      const formattedDate = stopDetails.date
        ? new Date(stopDetails.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Date TBD';

      // Format time for email
      let formattedTime = 'Time TBD';
      if (stopDetails.time) {
        const [h, m] = stopDetails.time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        formattedTime = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
      }

      // Format duration
      const duration = stopDetails.duration_minutes
        ? `~${stopDetails.duration_minutes} minutes`
        : undefined;

      // Customer first name only (privacy)
      const customerFirstName = stopDetails.customer_name
        ? stopDetails.customer_name.split(' ')[0]
        : '';

      // Build response URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel';
      const responseUrl = `${appUrl}/partner-respond/${requestToken.token}`;

      // Render email template
      const { html, text } = renderPartnerRequestEmail({
        partnerName: body.partner_name || 'there',
        customerFirstName,
        date: formattedDate,
        time: formattedTime,
        partySize: stopDetails.party_size,
        duration,
        customMessage: body.request_body,
        responseUrl,
        stopType: stopDetails.stop_type,
      });

      // Build subject line
      const subject = body.request_subject
        || `Reservation Request — ${customerFirstName || 'Guest'}, ${formattedDate}, ${stopDetails.party_size} guests`;

      // Send email
      const replyTo = partnerRequestService.getReplyToAddress(stopIdNum);

      const emailSent = await sendEmail({
        to: body.partner_email,
        subject,
        html,
        text,
        replyTo,
      });

      if (!emailSent) {
        logger.error('Failed to send partner request email', {
          tokenId: requestToken.id,
          partnerEmail: body.partner_email,
        });
        return NextResponse.json(
          { success: false, error: 'Email could not be sent. The request has been created but the partner was not notified.' },
          { status: 502 }
        );
      }

      // Update the message ID (Resend doesn't return it through sendEmail currently,
      // but we record the token for future reference)
      logger.info('Partner request email sent', {
        tokenId: requestToken.id,
        stopId: stopIdNum,
        partnerEmail: body.partner_email,
      });

      return NextResponse.json({
        success: true,
        data: {
          tokenId: requestToken.id,
          status: 'sent',
          partnerEmail: body.partner_email,
        },
      });
    }
);
