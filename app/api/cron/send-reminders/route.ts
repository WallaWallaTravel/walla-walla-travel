import { NextRequest, NextResponse } from 'next/server';
import { processTourReminders } from '@/lib/services/email-automation.service';

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
      console.log('[Cron] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting tour reminder processing...');
    
    const result = await processTourReminders();
    
    console.log(`[Cron] Tour reminders complete: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Tour reminders processed',
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Error processing reminders:', error);
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
export async function GET(request: NextRequest) {
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

