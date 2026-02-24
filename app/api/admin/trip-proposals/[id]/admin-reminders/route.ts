import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { adminReminderService } from '@/lib/services/admin-reminder.service';
import { queryOne } from '@/lib/db-helpers';

interface RouteParams { id: string; }

/**
 * GET /api/admin/trip-proposals/[id]/admin-reminders
 * Fetch admin internal reminders for a proposal
 */
export const GET = withAdminAuth(
  async (_request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);

    const reminders = await adminReminderService.getReminders(proposalId);

    return NextResponse.json({ success: true, data: reminders });
  }
);

/**
 * POST /api/admin/trip-proposals/[id]/admin-reminders
 *
 * Body: { action: 'create_manual', title, description, reminder_date }
 *   OR  { action: 'create_milestone', milestone, title, description }
 *   OR  { action: 'dismiss', reminder_id }
 *   OR  { action: 'snooze', reminder_id, days }
 */
export const POST = withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const body = await request.json();

    switch (body.action) {
      case 'create_manual': {
        if (!body.title || !body.reminder_date) {
          return NextResponse.json(
            { success: false, error: 'title and reminder_date are required' },
            { status: 400 }
          );
        }
        const result = await adminReminderService.createManualReminder(
          proposalId,
          body.title,
          body.description || '',
          body.reminder_date
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'create_milestone': {
        if (!body.milestone || !body.title) {
          return NextResponse.json(
            { success: false, error: 'milestone and title are required' },
            { status: 400 }
          );
        }
        const result = await adminReminderService.createMilestoneReminder(
          proposalId,
          body.milestone,
          body.title,
          body.description || ''
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'dismiss': {
        if (!body.reminder_id) {
          return NextResponse.json(
            { success: false, error: 'reminder_id is required' },
            { status: 400 }
          );
        }
        // C3 FIX: Verify reminder belongs to this proposal
        const reminder = await queryOne(
          'SELECT id FROM admin_reminders WHERE id = $1 AND trip_proposal_id = $2',
          [body.reminder_id, proposalId]
        );
        if (!reminder) {
          return NextResponse.json(
            { success: false, error: 'Reminder not found in this proposal' },
            { status: 404 }
          );
        }
        await adminReminderService.dismissReminder(body.reminder_id);
        return NextResponse.json({ success: true });
      }

      case 'snooze': {
        if (!body.reminder_id || !body.days) {
          return NextResponse.json(
            { success: false, error: 'reminder_id and days are required' },
            { status: 400 }
          );
        }
        // C4: Validate snooze days
        const days = parseInt(body.days, 10);
        if (isNaN(days) || days < 1 || days > 365) {
          return NextResponse.json(
            { success: false, error: 'days must be between 1 and 365' },
            { status: 400 }
          );
        }
        // C3 FIX: Verify reminder belongs to this proposal
        const snoozedReminder = await queryOne(
          'SELECT id FROM admin_reminders WHERE id = $1 AND trip_proposal_id = $2',
          [body.reminder_id, proposalId]
        );
        if (!snoozedReminder) {
          return NextResponse.json(
            { success: false, error: 'Reminder not found in this proposal' },
            { status: 404 }
          );
        }
        await adminReminderService.snoozeReminder(body.reminder_id, days);
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
