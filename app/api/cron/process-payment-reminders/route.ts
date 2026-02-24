import { NextRequest, NextResponse } from 'next/server';
import { paymentReminderService } from '@/lib/services/payment-reminder.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Cron Job: Process Payment Reminders
 *
 * Runs daily at 2:00 PM UTC (morning Pacific).
 * Processes all pending payment reminders where scheduled_date <= today.
 *
 * Safety: Each reminder re-queries guest payment status from the database
 * at send time — never uses cached data for send decisions.
 *
 * Protected by CRON_SECRET (fail-closed).
 */
export const POST = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting payment reminder processing');

  const result = await paymentReminderService.processScheduledReminders();

  logger.info('Payment reminders complete', {
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
  });

  return NextResponse.json({
    success: true,
    message: 'Payment reminders processed',
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    details: result.details,
    timestamp: new Date().toISOString(),
  });
});

export const GET = withCronAuth(async (_request: NextRequest) => {
  return NextResponse.json({
    endpoint: '/api/cron/process-payment-reminders',
    method: 'POST',
    description: 'Processes scheduled payment reminders for guest billing. Re-checks payment status at send time.',
    schedule: '0 14 * * * (daily, 2 PM UTC / morning Pacific)',
    requires_auth: true,
  });
});
