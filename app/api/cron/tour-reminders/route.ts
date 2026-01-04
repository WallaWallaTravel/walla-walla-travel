/**
 * Cron: Tour Reminders
 * POST /api/cron/tour-reminders
 * 
 * Sends reminder emails to customers with tours in the next 48 hours.
 * Should be called by a cron job (e.g., hourly)
 * 
 * Protected by CRON_SECRET in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron request');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    logger.info('Processing tour reminders');

    const result = await processTourReminders();

    logger.info('Tour reminders complete', { sent: result.sent, failed: result.failed });

    return NextResponse.json({
      success: true,
      message: 'Tour reminders processed',
      data: {
        sent: result.sent,
        failed: result.failed,
        processed_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Error processing tour reminders', { error });
    const message = error instanceof Error ? error.message : 'Failed to process tour reminders';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}







