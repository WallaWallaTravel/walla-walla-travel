/**
 * Cron Endpoint for Daily Compliance Notifications
 *
 * This endpoint should be called daily by a cron job (e.g., Vercel Cron, external cron service).
 * It checks all driver and vehicle compliance items and sends notifications at specific thresholds.
 *
 * Authentication: Requires CRON_SECRET header or admin session
 *
 * Notification schedule:
 * - 40 days: First notice (email to staff + driver)
 * - 20 days: Reminder
 * - 10 days: Urgent warning
 * - 5 days: Critical alert
 * - 1 day: Final notice
 * - 0 days: Expired notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { runComplianceNotifications } from '@/lib/services/compliance-notification.service';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for cron job

export const GET = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting daily compliance notification run');

  const result = await runComplianceNotifications();

  logger.info('Compliance notification run completed', result);

  return NextResponse.json({
    success: true,
    message: 'Compliance check completed',
    result,
    timestamp: new Date().toISOString(),
  });
});

// Also support POST for webhooks
export const POST = GET;
