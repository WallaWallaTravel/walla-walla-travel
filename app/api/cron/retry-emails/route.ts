/**
 * Cron: Retry Failed Emails
 *
 * Retries confirmation emails that failed to send (up to 3 attempts per email).
 * Processes up to 10 failed emails per run.
 * Recommended schedule: every 15 minutes.
 * Protected by CRON_SECRET (fail-closed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEmails } from '@/lib/services/email-automation.service';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';
import { logger } from '@/lib/logger';

export const GET = withCronAuth(async (_request: NextRequest) => {
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
