/**
 * Cron: Tour Reminders
 * POST /api/cron/tour-reminders
 *
 * Sends reminder emails to customers with tours in the next 48 hours.
 * Should be called by a cron job (e.g., hourly)
 *
 * Protected by CRON_SECRET in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request');
      throw new UnauthorizedError('Unauthorized');
    }
  }

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







