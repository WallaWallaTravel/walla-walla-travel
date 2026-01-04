import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';

/**
 * Cron Job: Send Tour Reminders
 * 
 * Should be called every hour by external scheduler:
 * - Vercel: Use Vercel Cron Jobs (vercel.json) or cron-job.org
 * - External: curl -X POST https://yoursite.com/api/cron/send-reminders -H "Authorization: Bearer YOUR_CRON_SECRET"
 * 
 * Sends reminder emails to customers 48 hours before their tour.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if no secret is set (development) or if secret matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

  } catch (error) {
    logger.error('Error processing reminders', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process reminders'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(_request: NextRequest) {
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
}

