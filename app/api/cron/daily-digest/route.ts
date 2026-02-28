import { NextRequest, NextResponse } from 'next/server';
import { dailyDigestService } from '@/lib/services/daily-digest.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Cron Job: Daily Digest Email
 *
 * Runs daily at 3:00 PM UTC (morning Pacific).
 * Sends an aggregated email with all action items for the day.
 * Runs AFTER draft-reminders so new tasks are included.
 *
 * Protected by CRON_SECRET (fail-closed).
 */
export const POST = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting daily digest');

  const result = await dailyDigestService.sendDigest();

  logger.info('Daily digest complete', result);

  return NextResponse.json({
    success: true,
    message: result.sent ? 'Daily digest sent' : 'No action items — digest skipped',
    sent: result.sent,
    sections: result.sections,
    timestamp: new Date().toISOString(),
  });
});

export const GET = withCronAuth(async (_request: NextRequest) => {
  return NextResponse.json({
    endpoint: '/api/cron/daily-digest',
    method: 'POST',
    description: 'Sends aggregated daily digest email with overdue tasks, drafts, upcoming trips, and reminders.',
    schedule: '0 15 * * * (daily, 3 PM UTC / morning Pacific)',
    requires_auth: true,
  });
});
