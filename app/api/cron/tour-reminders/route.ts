/**
 * Cron: Tour Reminders
 * POST /api/cron/tour-reminders
 *
 * Sends reminder emails to customers with tours in the next 48 hours.
 * Should be called hourly.
 * Protected by CRON_SECRET (fail-closed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

export const POST = withCronAuth(async (_request: NextRequest) => {
  logger.info('Processing tour reminders');

  const result = await processTourReminders();

  logger.info('Tour reminders complete', { sent: result.sent, failed: result.failed });

  return NextResponse.json({
    success: true,
    message: 'Tour reminders processed',
    data: {
      sent: result.sent,
      failed: result.failed,
      processed_at: new Date().toISOString(),
    },
  });
});

// Also support GET for easy testing
export const GET = POST;
