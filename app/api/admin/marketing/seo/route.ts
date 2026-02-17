import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSessionFromRequest } from '@/lib/auth/session'
import { generateAuthUrl, getIntegration } from '@/lib/services/search-console.service'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

// GET - Fetch SEO dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Always fetch integration status
    const integration = await getIntegration()
    const connectionStatus = {
      connected: !!integration,
      lastSyncAt: integration?.last_sync_at || null,
      lastError: integration?.last_error || null,
      isActive: integration?.is_active || false,
    }

    // Generate OAuth URL for connect button
    let authUrl: string | null = null
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const redirectUri = new URL('/api/admin/marketing/seo/oauth', baseUrl).toString()
      authUrl = generateAuthUrl(redirectUri)
    } catch {
      // OAuth env vars not configured — that's ok, we'll show setup instructions
    }

    // Page Performance — latest data per page
    const pagePerformance = await query(`
      SELECT DISTINCT ON (page_url)
        page_url, impressions, clicks, ctr, position, data_date
      FROM search_console_data
      WHERE query IS NULL
      ORDER BY page_url, data_date DESC
    `).catch(() => ({ rows: [] }))

    // Content freshness — stale content from content_refresh_suggestions
    const contentFreshness = await query(`
      SELECT
        id, page_path, page_title, reason, suggested_update, urgency, status,
        EXTRACT(DAY FROM NOW() - created_at)::int AS days_since_detected
      FROM content_refresh_suggestions
      WHERE status IN ('pending', 'approved')
      ORDER BY
        CASE urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at ASC
    `).catch(() => ({ rows: [] }))

    // Keyword opportunities — queries ranking position 5-20 with decent impressions
    const keywordOpportunities = await query(`
      SELECT DISTINCT ON (query)
        query, page_url, impressions, clicks, ctr, position, data_date
      FROM search_console_data
      WHERE query IS NOT NULL
        AND position >= 5
        AND position <= 20
        AND impressions >= 5
      ORDER BY query, data_date DESC
    `).catch(() => ({ rows: [] }))

    // Sort keyword opportunities by impressions desc (best opportunities first)
    const sortedKeywords = keywordOpportunities.rows.sort(
      (a: { impressions: number }, b: { impressions: number }) => b.impressions - a.impressions
    )

    // Declining pages — compare last 7 days vs previous 7 days
    const decliningPages = await query(`
      WITH recent AS (
        SELECT page_url, SUM(impressions) as total_impressions
        FROM search_console_data
        WHERE query IS NULL
          AND data_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY page_url
      ),
      previous AS (
        SELECT page_url, SUM(impressions) as total_impressions
        FROM search_console_data
        WHERE query IS NULL
          AND data_date >= CURRENT_DATE - INTERVAL '14 days'
          AND data_date < CURRENT_DATE - INTERVAL '7 days'
        GROUP BY page_url
      )
      SELECT
        r.page_url,
        r.total_impressions::int as recent_impressions,
        p.total_impressions::int as previous_impressions,
        CASE WHEN p.total_impressions > 0
          THEN ROUND(((r.total_impressions - p.total_impressions)::numeric / p.total_impressions) * 100, 1)
          ELSE 0
        END as change_pct
      FROM recent r
      JOIN previous p ON r.page_url = p.page_url
      WHERE p.total_impressions > 0
        AND r.total_impressions < p.total_impressions
      ORDER BY change_pct ASC
      LIMIT 20
    `).catch(() => ({ rows: [] }))

    logger.info('SEO dashboard data fetched', {
      pages: pagePerformance.rows.length,
      staleContent: contentFreshness.rows.length,
      keywords: sortedKeywords.length,
      declining: decliningPages.rows.length,
    })

    return NextResponse.json({
      connectionStatus,
      authUrl,
      pagePerformance: pagePerformance.rows,
      contentFreshness: contentFreshness.rows,
      keywordOpportunities: sortedKeywords,
      decliningPages: decliningPages.rows,
    })
  } catch (error) {
    logger.error('Failed to fetch SEO dashboard data', { error })
    return NextResponse.json(
      { error: 'Failed to fetch SEO dashboard data' },
      { status: 500 }
    )
  }
}
