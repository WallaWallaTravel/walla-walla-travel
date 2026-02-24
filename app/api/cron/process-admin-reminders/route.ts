import { NextRequest, NextResponse } from 'next/server';
import { adminReminderService } from '@/lib/services/admin-reminder.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Cron Job: Process Admin Internal Reminders
 *
 * Runs daily. Triggers time-based admin reminders where reminder_date <= today
 * and un-snoozes reminders whose snooze period has passed.
 *
 * These are admin-facing only — no emails sent to guests.
 */
export const POST = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting admin reminder processing');

  const result = await adminReminderService.processTimeBased();

  logger.info('Admin reminders processed', { triggered: result.triggered });

  return NextResponse.json({
    success: true,
    message: 'Admin reminders processed',
    triggered: result.triggered,
    timestamp: new Date().toISOString(),
  });
});

export const GET = withCronAuth(async (_request: NextRequest) => {
  return NextResponse.json({
    endpoint: '/api/cron/process-admin-reminders',
    method: 'POST',
    description: 'Triggers time-based admin internal reminders (deferred deposits, etc.)',
    schedule: '0 14 * * * (daily, 2 PM UTC)',
    requires_auth: true,
  });
});
