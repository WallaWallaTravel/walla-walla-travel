import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

interface RouteParams { id: string; }

const RouteEmailSchema = z.object({
  stop_id: z.number().int().positive(),
  proposal_id: z.number().int().positive(),
});

/**
 * POST /api/admin/inbound-emails/[id]/route
 *
 * Manually route an unmatched inbound email to a specific stop.
 * Creates a vendor_interaction entry and updates the email log.
 */
export const POST =
  withAdminAuth(
    async (request: NextRequest, session: AuthSession, context?) => {
      const { id } = await (context as RouteContext<RouteParams>).params;
      const emailId = parseInt(id, 10);
      const body = RouteEmailSchema.parse(await request.json());

      // Verify the email exists and is unmatched
      const emailRows = await prisma.$queryRaw<Array<{
        id: number;
        from_address: string;
        subject: string | null;
        body_text: string | null;
        routing_method: string | null;
      }>>`SELECT id, from_address, subject, body_text, routing_method FROM inbound_email_log WHERE id = ${emailId}`;

      const email = emailRows[0] ?? null;

      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email not found' },
          { status: 404 }
        );
      }

      if (email.routing_method === 'auto_address' || email.routing_method === 'manual_link') {
        return NextResponse.json(
          { success: false, error: 'Email already routed' },
          { status: 400 }
        );
      }

      // Verify stop belongs to proposal
      const stopRows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT s.id FROM trip_proposal_stops s
         JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
         WHERE s.id = ${body.stop_id} AND d.trip_proposal_id = ${body.proposal_id}`;

      if (stopRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Stop not found or does not belong to proposal' },
          { status: 404 }
        );
      }

      // Create vendor interaction
      const content = `From: ${email.from_address}\nSubject: ${email.subject || '(no subject)'}\n\n${
        (email.body_text || '(empty)').slice(0, 5000)
      }`;

      await prisma.$executeRaw`
        INSERT INTO vendor_interactions (
          trip_proposal_stop_id, interaction_type, content, contacted_by
        ) VALUES (${body.stop_id}, 'email_received', ${content}, ${parseInt(session.userId, 10)})`;

      // Update email log
      await prisma.$executeRaw`
        UPDATE inbound_email_log
         SET routed_to_stop_id = ${body.stop_id}, routing_method = 'manual_link',
             routed_at = NOW(), routed_by = ${parseInt(session.userId, 10)}
         WHERE id = ${emailId}`;

      return NextResponse.json({ success: true });
    }
  );
