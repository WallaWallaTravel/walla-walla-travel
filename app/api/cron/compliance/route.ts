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

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for cron job

export async function GET(request: NextRequest) {
  // Verify cron secret or authorization
  const cronSecret = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  // Check for valid cron secret
  if (cronSecret && cronSecret === expectedSecret) {
    // Valid cron request
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    // Check for bearer token matching cron secret
    const token = authHeader.replace('Bearer ', '');
    if (token !== expectedSecret) {
      logger.warn('Unauthorized cron access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    logger.warn('Missing cron authentication', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Starting daily compliance notification run');

    const result = await runComplianceNotifications();

    logger.info('Compliance notification run completed', result);

    return NextResponse.json({
      success: true,
      message: 'Compliance check completed',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Compliance cron job failed', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Compliance check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for webhooks
export async function POST(request: NextRequest) {
  return GET(request);
}
