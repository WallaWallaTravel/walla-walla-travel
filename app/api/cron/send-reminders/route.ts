import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

/**
 * Cron Job: Send Tour Reminders
 *
 * Should be called every hour by external scheduler:
 * - Vercel: Use Vercel Cron Jobs (vercel.json) or cron-job.org
 * - External: curl -X POST https://yoursite.com/api/cron/send-reminders -H "Authorization: Bearer YOUR_CRON_SECRET"
 *
 * Sends reminder emails to customers 48 hours before their tour.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no secret is set (development) or if secret matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron attempt');
    throw new UnauthorizedError('Unauthorized');
  }

  logger.info('Starting tour reminder processing');

  const result = await processTourReminders();

  logger.info('Tour reminders complete', { sent: result.sent, failed: result.failed });

  return NextResponse.json({
    success: true,
    message: 'Tour reminders processed',
    sent: result.sent,
    failed: result.failed,
    timestamp: new Date().toISOString(),
  });
});

// GET endpoint for manual testing
export const GET = withErrorHandling(async () => {
  // Check if this is just a status check
  return NextResponse.json({
    endpoint: '/api/cron/send-reminders',
    method: 'POST',
    description: 'Sends tour reminder emails to customers 48 hours before their tour',
    schedule: 'Recommended: Every hour',
    requires_auth: !!process.env.CRON_SECRET,
    setup: {
      vercel: 'Use Vercel Cron Jobs or cron-job.org',
      manual: 'POST with Authorization: Bearer YOUR_CRON_SECRET header',
    },
  });
});

