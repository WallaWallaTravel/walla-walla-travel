import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { paymentReminderService } from '@/lib/services/payment-reminder.service';
import { queryOne } from '@/lib/db-helpers';

interface RouteParams { id: string; }

const VALID_URGENCIES = ['friendly', 'firm', 'urgent', 'final'];

/**
 * GET /api/admin/trip-proposals/[id]/reminders
 * Fetch reminder history for a proposal
 */
export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);

    const reminders = await paymentReminderService.getReminderHistory(proposalId);

    return NextResponse.json({ success: true, data: reminders });
  }
);

/**
 * POST /api/admin/trip-proposals/[id]/reminders
 * Generate auto-schedule OR add manual reminder
 *
 * Body: { action: 'generate_schedule' }
 *   OR  { action: 'add_manual', scheduled_date, urgency, custom_message?, guest_id? }
 *   OR  { action: 'cancel', reminder_id }
 *   OR  { action: 'pause_guest', guest_id }
 *   OR  { action: 'resume_guest', guest_id }
 *   OR  { action: 'pause_proposal' }
 *   OR  { action: 'resume_proposal' }
 */
export const POST = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const body = await request.json();

    switch (body.action) {
      case 'generate_schedule': {
        const result = await paymentReminderService.generateReminderSchedule(proposalId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'add_manual': {
        if (!body.scheduled_date || !body.urgency) {
          return NextResponse.json(
            { success: false, error: 'scheduled_date and urgency are required' },
            { status: 400 }
          );
        }
        // C4: Validate urgency enum at the route level
        if (!VALID_URGENCIES.includes(body.urgency)) {
          return NextResponse.json(
            { success: false, error: `Invalid urgency. Must be one of: ${VALID_URGENCIES.join(', ')}` },
            { status: 400 }
          );
        }
        const result = await paymentReminderService.addManualReminder(
          proposalId,
          body.scheduled_date,
          body.urgency,
          body.custom_message,
          body.guest_id
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'cancel': {
        if (!body.reminder_id) {
          return NextResponse.json(
            { success: false, error: 'reminder_id is required' },
            { status: 400 }
          );
        }
        // C3 FIX: Verify reminder belongs to this proposal
        const cancelReminder = await queryOne(
          'SELECT id FROM payment_reminders WHERE id = $1 AND trip_proposal_id = $2',
          [body.reminder_id, proposalId]
        );
        if (!cancelReminder) {
          return NextResponse.json(
            { success: false, error: 'Reminder not found in this proposal' },
            { status: 404 }
          );
        }
        await paymentReminderService.cancelReminder(body.reminder_id);
        return NextResponse.json({ success: true });
      }

      case 'pause_guest': {
        if (!body.guest_id) {
          return NextResponse.json(
            { success: false, error: 'guest_id is required' },
            { status: 400 }
          );
        }
        await paymentReminderService.pauseRemindersForGuest(body.guest_id);
        return NextResponse.json({ success: true });
      }

      case 'resume_guest': {
        if (!body.guest_id) {
          return NextResponse.json(
            { success: false, error: 'guest_id is required' },
            { status: 400 }
          );
        }
        await paymentReminderService.resumeRemindersForGuest(body.guest_id);
        return NextResponse.json({ success: true });
      }

      case 'pause_proposal': {
        await paymentReminderService.pauseRemindersForProposal(proposalId);
        return NextResponse.json({ success: true });
      }

      case 'resume_proposal': {
        await paymentReminderService.resumeRemindersForProposal(proposalId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${body.action}` },
          { status: 400 }
        );
    }
  }
);
