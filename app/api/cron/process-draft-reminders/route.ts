import { NextRequest, NextResponse } from 'next/server';
import { draftReminderService } from '@/lib/services/draft-reminder.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Cron Job: Process Draft Reminders
 *
 * Runs daily at 2:00 PM UTC (morning Pacific).
 * Creates CRM tasks for stale draft proposals every 5 days.
 *
 * Protected by CRON_SECRET (fail-closed).
 */
export const POST = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting draft reminder processing');

  const result = await draftReminderService.processDraftReminders();

  logger.info('Draft reminders complete', result);

  return NextResponse.json({
    success: true,
    message: 'Draft reminders processed',
    processed: result.processed,
    tasksCreated: result.tasksCreated,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  });
});

export const GET = withCronAuth(async (_request: NextRequest) => {
  return NextResponse.json({
    endpoint: '/api/cron/process-draft-reminders',
    method: 'POST',
    description: 'Creates CRM tasks as reminders for stale draft proposals. Runs every 5 days per draft.',
    schedule: '0 14 * * * (daily, 2 PM UTC / morning Pacific)',
    requires_auth: true,
  });
});
