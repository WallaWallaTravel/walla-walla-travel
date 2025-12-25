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

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[Cron] Unauthorized cron request');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[Cron] Processing tour reminders...');
    
    const result = await processTourReminders();
    
    console.log(`[Cron] Tour reminders complete: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Tour reminders processed',
      data: {
        sent: result.sent,
        failed: result.failed,
        processed_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('[Cron] Error processing tour reminders:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process tour reminders',
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}







