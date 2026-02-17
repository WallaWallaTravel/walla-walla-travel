import { NextRequest, NextResponse } from 'next/server';
import {
  getIntegration,
  refreshAccessToken,
  syncDailyData,
} from '@/lib/services/search-console.service';
import { logger } from '@/lib/logger';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    logger.info('Starting Search Console sync cron job');

    // Check if integration is configured
    const integration = await getIntegration();
    if (!integration) {
      logger.warn('Search Console sync skipped: integration not configured');
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Google Search Console integration not configured',
      });
    }

    if (!integration.refresh_token_encrypted) {
      logger.warn('Search Console sync skipped: no refresh token');
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'No refresh token stored. Re-authorize at /admin/marketing/seo',
      });
    }

    // Refresh the access token before syncing
    await refreshAccessToken();

    // Pull and store yesterday's data
    const result = await syncDailyData();

    const duration = Date.now() - startTime;
    logger.info('Search Console sync cron job completed', {
      duration: `${duration}ms`,
      ...result,
    });

    return NextResponse.json({
      success: true,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      date: result.date,
      queries_stored: result.queriesStored,
      pages_stored: result.pagesStored,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Search Console sync cron job failed', {
      error,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync job failed',
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const integration = await getIntegration();

    return NextResponse.json({
      status: integration ? 'configured' : 'not_configured',
      is_active: integration?.is_active ?? false,
      last_sync_at: integration?.last_sync_at ?? null,
      last_error: integration?.last_error ?? null,
      token_expires_at: integration?.token_expires_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
