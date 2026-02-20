import { NextRequest, NextResponse } from 'next/server';
import {
  getIntegration,
  refreshAccessToken,
  syncDailyData,
} from '@/lib/services/search-console.service';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

/**
 * Match published blog_drafts to Search Console data by slug.
 * Aggregates impressions, clicks, avg position over the last 30 days.
 */
async function syncBlogPerformance(): Promise<{ matched: number }> {
  let matched = 0;

  try {
    // Find published blogs with slugs
    const blogs = await query<{ id: number; slug: string }>(`
      SELECT id, slug
      FROM blog_drafts
      WHERE status = 'published'
        AND slug IS NOT NULL
        AND (performance_synced_at IS NULL OR performance_synced_at < NOW() - INTERVAL '24 hours')
      LIMIT 50
    `);

    for (const blog of blogs.rows) {
      // Match Search Console pages containing this slug
      const perfResult = await query<{
        total_impressions: number;
        total_clicks: number;
        avg_ctr: number;
        avg_position: number;
        top_queries: string;
      }>(`
        SELECT
          COALESCE(SUM(impressions), 0)::int AS total_impressions,
          COALESCE(SUM(clicks), 0)::int AS total_clicks,
          ROUND(COALESCE(AVG(ctr), 0)::numeric, 4)::float AS avg_ctr,
          ROUND(COALESCE(AVG(position), 0)::numeric, 1)::float AS avg_position,
          (
            SELECT COALESCE(json_agg(q), '[]'::json)::text
            FROM (
              SELECT query, SUM(clicks)::int AS clicks, SUM(impressions)::int AS impressions
              FROM search_console_data
              WHERE page_url LIKE '%' || $1 || '%'
                AND data_date >= CURRENT_DATE - INTERVAL '30 days'
                AND query IS NOT NULL
              GROUP BY query
              ORDER BY SUM(clicks) DESC
              LIMIT 5
            ) q
          ) AS top_queries
        FROM search_console_data
        WHERE page_url LIKE '%' || $1 || '%'
          AND data_date >= CURRENT_DATE - INTERVAL '30 days'
      `, [blog.slug]);

      const perf = perfResult.rows[0];
      if (perf && (perf.total_impressions > 0 || perf.total_clicks > 0)) {
        await query(`
          UPDATE blog_drafts
          SET performance = $1, performance_synced_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [
          JSON.stringify({
            impressions_30d: perf.total_impressions,
            clicks_30d: perf.total_clicks,
            avg_ctr: perf.avg_ctr,
            avg_position: perf.avg_position,
            top_queries: JSON.parse(perf.top_queries),
            synced_at: new Date().toISOString(),
          }),
          blog.id,
        ]);
        matched++;
      }
    }
  } catch (error) {
    logger.warn('Blog performance sync failed (non-blocking)', { error });
  }

  return { matched };
}

export const POST = withCronAuth(async (_request: NextRequest) => {
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

    // After syncing Search Console data, match blog performance
    const blogPerf = await syncBlogPerformance();

    const duration = Date.now() - startTime;
    logger.info('Search Console sync cron job completed', {
      duration: `${duration}ms`,
      ...result,
      blogsMatched: blogPerf.matched,
    });

    return NextResponse.json({
      success: true,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      date: result.date,
      queries_stored: result.queriesStored,
      pages_stored: result.pagesStored,
      blogs_matched: blogPerf.matched,
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
});

export const GET = withCronAuth(async (_request: NextRequest) => {
  const integration = await getIntegration();

  return NextResponse.json({
    status: integration ? 'configured' : 'not_configured',
    is_active: integration?.is_active ?? false,
    last_sync_at: integration?.last_sync_at ?? null,
    last_error: integration?.last_error ?? null,
    token_expires_at: integration?.token_expires_at ?? null,
  });
});
