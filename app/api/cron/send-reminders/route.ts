import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Cron Job: Send Tour Reminders
 *
 * Sends reminder emails to customers 48 hours before their tour.
 * Protected by CRON_SECRET (fail-closed).
 */
export const POST = withCronAuth(async (_request: NextRequest) => {
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

// GET endpoint for status check (also protected)
export const GET = withCronAuth(async (_request: NextRequest) => {
  return NextResponse.json({
    endpoint: '/api/cron/send-reminders',
    method: 'POST',
    description: 'Sends tour reminder emails to customers 48 hours before their tour',
    schedule: 'Recommended: Every hour',
    requires_auth: true,
  });
});

