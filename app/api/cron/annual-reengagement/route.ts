/**
 * Cron: Annual Re-engagement
 * POST /api/cron/annual-reengagement
 *
 * Creates follow-up tasks for customers whose last tour was approximately 1 year ago.
 * Should be called by a cron job daily.
 *
 * Protected by CRON_SECRET in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { crmTaskAutomationService } from '@/lib/services/crm-task-automation.service';
import { logger } from '@/lib/logger';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request to annual-reengagement');
      throw new UnauthorizedError('Unauthorized');
    }
  }

  logger.info('Processing annual re-engagement tasks');

  const result = await crmTaskAutomationService.processAnnualReengagement();

  logger.info('Annual re-engagement complete', result);

  return NextResponse.json({
    success: true,
    message: 'Annual re-engagement processed',
    data: {
      processed: result.processed,
      tasks_created: result.tasksCreated,
      errors: result.errors,
      processed_at: new Date().toISOString(),
    },
  });
});

// Also support GET for easy testing
export const GET = POST;
