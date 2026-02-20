/**
 * Cron: Annual Re-engagement
 * POST /api/cron/annual-reengagement
 *
 * Creates follow-up tasks for customers whose last tour was approximately 1 year ago.
 * Should be called daily.
 * Protected by CRON_SECRET (fail-closed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { crmTaskAutomationService } from '@/lib/services/crm-task-automation.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

export const POST = withCronAuth(async (_request: NextRequest) => {
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
