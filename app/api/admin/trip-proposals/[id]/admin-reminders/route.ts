import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession, RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { adminReminderService } from '@/lib/services/admin-reminder.service';
import { prisma } from '@/lib/prisma';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

interface RouteParams { id: string; }

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_manual'),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    reminder_date: z.string().min(1),
  }),
  z.object({
    action: z.literal('create_milestone'),
    milestone: z.string().min(1).max(255),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
  }),
  z.object({
    action: z.literal('dismiss'),
    reminder_id: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('snooze'),
    reminder_id: z.number().int().positive(),
    days: z.number().int().min(1).max(365),
  }),
]);

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
export const POST = withCSRF(
  withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?) => {
    const { id } = await (context as RouteContext<RouteParams>).params;
    const proposalId = parseInt(id, 10);
    const body = BodySchema.parse(await request.json());

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
        const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
          'SELECT id FROM admin_reminders WHERE id = $1 AND trip_proposal_id = $2',
          body.reminder_id, proposalId
        );
        const reminder = rows[0];
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
        // C4: Validate snooze days (already validated by Zod: 1-365)
        const days = body.days;
        // C3 FIX: Verify reminder belongs to this proposal
        const snoozeRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
          'SELECT id FROM admin_reminders WHERE id = $1 AND trip_proposal_id = $2',
          body.reminder_id, proposalId
        );
        const snoozedReminder = snoozeRows[0];
        if (!snoozedReminder) {
          return NextResponse.json(
            { success: false, error: 'Reminder not found in this proposal' },
            { status: 404 }
          );
        }
        await adminReminderService.snoozeReminder(body.reminder_id, days);
        return NextResponse.json({ success: true });
      }

      default: {
        const _exhaustive: never = body;
        return NextResponse.json(
          { success: false, error: `Unknown action` },
          { status: 400 }
        );
      }
    }
  }
)
);
