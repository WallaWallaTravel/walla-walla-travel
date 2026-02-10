/**
 * Cron: Retry Failed Emails
 *
 * Retries confirmation emails that failed to send (up to 3 attempts per email).
 * Processes up to 10 failed emails per run.
 *
 * For Vercel: Add to vercel.json with path "/api/cron/retry-emails"
 * Recommended schedule: every 15 minutes
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEmails } from '@/lib/services/email-automation.service';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify cron secret (for Vercel cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError('Unauthorized');
  }

  const result = await retryFailedEmails();

  if (result.retried > 0) {
    logger.info('[Cron] Email retry completed', result);
  }

  return NextResponse.json({
    success: true,
    message: `Retried ${result.retried} emails: ${result.succeeded} succeeded, ${result.failed} failed`,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

export const POST = GET;
