/**
 * Cron: Seasonal Content Refresh
 *
 * Monthly cron that scans public-facing pages for stale content:
 * - Old year references (e.g., "2025" when it's now 2026)
 * - Outdated seasonal information
 * - Stale pricing references
 * - Old event dates
 * - Pages not updated in 90+ days
 *
 * Uses Claude AI to analyze page content and stores suggestions
 * in the content_refresh_suggestions table.
 *
 * Schedule: 0 9 1 * * (1st of each month at 9 AM UTC)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for AI analysis

// Known public page paths to scan
const PUBLIC_PAGES = [
  { path: '/', title: 'Home' },
  { path: '/about', title: 'About' },
  { path: '/about/walla-walla-wine-facts', title: 'Wine Facts' },
  { path: '/plan-your-visit', title: 'Plan Your Visit' },
  { path: '/wineries', title: 'Wineries Directory' },
  { path: '/wineries/discover', title: 'Discover Wineries' },
  { path: '/guides', title: 'Travel Guides' },
  { path: '/itineraries', title: 'Itineraries' },
  { path: '/neighborhoods', title: 'Neighborhoods' },
  { path: '/geology', title: 'Geology' },
  { path: '/history', title: 'History' },
  { path: '/best-of', title: 'Best Of' },
  { path: '/inquiry', title: 'Inquiry / Contact' },
]

interface ContentIssue {
  page_path: string
  page_title: string
  reason: 'stale_date' | 'declining_traffic' | 'outdated_info' | 'seasonal_update' | 'keyword_opportunity'
  current_content: string
  suggested_update: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  const xCronSecret = request.headers.get('x-cron-secret')
  if (xCronSecret === cronSecret) {
    return true
  }

  return false
}

function extractText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000)
}

async function fetchPageContent(baseUrl: string, path: string): Promise<string | null> {
  try {
    const url = `${baseUrl}${path}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WallaWallaTravel-ContentRefresh/1.0',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      logger.warn('Failed to fetch page for content refresh', { path, status: response.status })
      return null
    }

    const html = await response.text()
    return extractText(html)
  } catch (error) {
    logger.warn('Error fetching page for content refresh', {
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

async function getSearchConsoleData(): Promise<Map<string, { lastDate: string; impressionsTrend: string }>> {
  const dataMap = new Map<string, { lastDate: string; impressionsTrend: string }>()

  try {
    const result = await query<{
      page_url: string
      latest_date: string
      recent_impressions: number
      older_impressions: number
    }>(`
      WITH recent AS (
        SELECT page_url, SUM(impressions) as impressions
        FROM search_console_data
        WHERE data_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY page_url
      ),
      older AS (
        SELECT page_url, SUM(impressions) as impressions
        FROM search_console_data
        WHERE data_date >= CURRENT_DATE - INTERVAL '60 days'
          AND data_date < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY page_url
      )
      SELECT
        COALESCE(r.page_url, o.page_url) as page_url,
        (SELECT MAX(data_date)::text FROM search_console_data WHERE page_url = COALESCE(r.page_url, o.page_url)) as latest_date,
        COALESCE(r.impressions, 0)::int as recent_impressions,
        COALESCE(o.impressions, 0)::int as older_impressions
      FROM recent r
      FULL OUTER JOIN older o ON r.page_url = o.page_url
    `)

    for (const row of result.rows) {
      let trend = 'stable'
      if (row.older_impressions > 0) {
        const change = (row.recent_impressions - row.older_impressions) / row.older_impressions
        if (change < -0.3) trend = 'declining'
        else if (change < -0.1) trend = 'slight_decline'
        else if (change > 0.3) trend = 'growing'
        else if (change > 0.1) trend = 'slight_growth'
      }

      // Extract path from full URL
      try {
        const url = new URL(row.page_url)
        dataMap.set(url.pathname, { lastDate: row.latest_date, impressionsTrend: trend })
      } catch {
        // If it's already a path, use directly
        dataMap.set(row.page_url, { lastDate: row.latest_date, impressionsTrend: trend })
      }
    }
  } catch (error) {
    logger.warn('Could not fetch search console data for content refresh', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return dataMap
}

async function analyzeContentWithAI(
  pages: { path: string; title: string; content: string }[],
  currentDate: string,
  currentYear: number,
  currentMonth: number
): Promise<ContentIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not set, skipping AI content analysis')
    return []
  }

  const anthropic = new Anthropic({ apiKey })

  const seasonMap: Record<number, string> = {
    1: 'winter', 2: 'winter', 3: 'spring',
    4: 'spring', 5: 'spring', 6: 'summer',
    7: 'summer', 8: 'summer', 9: 'fall',
    10: 'fall', 11: 'fall', 12: 'winter',
  }
  const currentSeason = seasonMap[currentMonth]

  const pagesSummary = pages.map(p =>
    `--- PAGE: ${p.title} (${p.path}) ---\n${p.content.slice(0, 3000)}\n`
  ).join('\n')

  const issues: ContentIssue[] = []

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are a content freshness auditor for a Walla Walla wine country travel website (wallawalla.travel).

Today's date: ${currentDate}
Current year: ${currentYear}
Current month: ${currentMonth}
Current season: ${currentSeason}

Analyze the following page content for staleness issues. Look for:

1. **stale_date**: Year references that are old (e.g., mentioning "${currentYear - 1}" or older years as current/upcoming). Specific past event dates that have passed.
2. **outdated_info**: Information that seems outdated - old pricing, closed businesses, deprecated terms.
3. **seasonal_update**: Content that references the wrong season (e.g., promoting "summer" events when it's ${currentSeason}). Content that should be updated for the current season.
4. **keyword_opportunity**: Content missing timely keywords like "${currentYear}", "${currentSeason}", or current event references that could improve SEO.

For each issue found, respond in JSON format as an array of objects:
[
  {
    "page_path": "/path",
    "page_title": "Title",
    "reason": "stale_date|outdated_info|seasonal_update|keyword_opportunity",
    "current_content": "the problematic snippet (max 200 chars)",
    "suggested_update": "what it should say instead (max 500 chars)",
    "urgency": "low|medium|high|critical"
  }
]

Urgency guide:
- critical: Wrong year presented as current, past events listed as upcoming
- high: Seasonal mismatch, significantly outdated pricing
- medium: Could benefit from seasonal refresh, minor date references
- low: Keyword opportunities, nice-to-have updates

If no issues are found for a page, omit it from the array. Return ONLY the JSON array, no other text. If there are no issues at all, return an empty array [].

${pagesSummary}`,
        },
      ],
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return []
    }

    // Extract JSON from the response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return []
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      page_path: string
      page_title: string
      reason: string
      current_content: string
      suggested_update: string
      urgency: string
    }>

    const validReasons = ['stale_date', 'declining_traffic', 'outdated_info', 'seasonal_update', 'keyword_opportunity']
    const validUrgencies = ['low', 'medium', 'high', 'critical']

    for (const item of parsed) {
      if (!item.page_path || !item.reason || !item.current_content || !item.suggested_update) {
        continue
      }

      const reason = validReasons.includes(item.reason)
        ? item.reason as ContentIssue['reason']
        : 'outdated_info'
      const urgency = validUrgencies.includes(item.urgency)
        ? item.urgency as ContentIssue['urgency']
        : 'medium'

      issues.push({
        page_path: item.page_path,
        page_title: item.page_title || '',
        reason,
        current_content: item.current_content.slice(0, 500),
        suggested_update: item.suggested_update.slice(0, 1000),
        urgency,
      })
    }
  } catch (error) {
    logger.error('AI content analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return issues
}

async function checkForDecliningPages(
  searchConsoleData: Map<string, { lastDate: string; impressionsTrend: string }>
): Promise<ContentIssue[]> {
  const issues: ContentIssue[] = []

  for (const [pagePath, data] of Array.from(searchConsoleData.entries())) {
    if (data.impressionsTrend === 'declining') {
      const matchedPage = PUBLIC_PAGES.find(p => pagePath.endsWith(p.path) || pagePath === p.path)
      const title = matchedPage?.title || pagePath

      issues.push({
        page_path: matchedPage?.path || pagePath,
        page_title: title,
        reason: 'declining_traffic',
        current_content: `Page traffic has been declining over the last 30 days compared to the prior 30 days.`,
        suggested_update: `Review and refresh page content. Consider updating with current seasonal information, new keywords, or improved meta descriptions to regain search visibility.`,
        urgency: 'medium',
      })
    }
  }

  return issues
}

async function checkStalePages(): Promise<ContentIssue[]> {
  const issues: ContentIssue[] = []

  try {
    // Check for pages with old content_refresh_suggestions that were applied long ago
    // or pages that haven't had any suggestions in a while
    const result = await query<{
      page_path: string
      page_title: string
      last_update: string
      days_ago: number
    }>(`
      SELECT DISTINCT ON (page_path)
        page_path,
        page_title,
        COALESCE(applied_at, created_at)::text as last_update,
        EXTRACT(DAY FROM NOW() - COALESCE(applied_at, created_at))::int as days_ago
      FROM content_refresh_suggestions
      WHERE status = 'applied'
      ORDER BY page_path, COALESCE(applied_at, created_at) DESC
    `)

    for (const row of result.rows) {
      if (row.days_ago > 90) {
        issues.push({
          page_path: row.page_path,
          page_title: row.page_title || row.page_path,
          reason: 'outdated_info',
          current_content: `Last content update was ${row.days_ago} days ago (${row.last_update}).`,
          suggested_update: `This page has not been refreshed in over 90 days. Review for accuracy and update with current information.`,
          urgency: row.days_ago > 180 ? 'high' : 'medium',
        })
      }
    }
  } catch {
    // Table may not have data yet - that's fine
  }

  return issues
}

async function saveSuggestions(issues: ContentIssue[]): Promise<number[]> {
  const savedIds: number[] = []

  for (const issue of issues) {
    try {
      // Check for duplicate pending suggestions for the same page and reason
      const existing = await query<{ id: number }>(`
        SELECT id FROM content_refresh_suggestions
        WHERE page_path = $1
          AND reason = $2
          AND status = 'pending'
        LIMIT 1
      `, [issue.page_path, issue.reason])

      if (existing.rows.length > 0) {
        // Update existing suggestion instead of creating a duplicate
        await query(`
          UPDATE content_refresh_suggestions
          SET current_content = $1,
              suggested_update = $2,
              urgency = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [issue.current_content, issue.suggested_update, issue.urgency, existing.rows[0].id])
        savedIds.push(existing.rows[0].id)
        continue
      }

      const result = await query<{ id: number }>(`
        INSERT INTO content_refresh_suggestions (
          page_path, page_title, reason, current_content, suggested_update,
          urgency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `, [
        issue.page_path,
        issue.page_title,
        issue.reason,
        issue.current_content,
        issue.suggested_update,
        issue.urgency,
      ])

      if (result.rows[0]) {
        savedIds.push(result.rows[0].id)
      }
    } catch (error) {
      logger.error('Failed to save content refresh suggestion', {
        page: issue.page_path,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return savedIds
}

async function runSeasonalContentRefresh(): Promise<{
  pagesScanned: number
  issuesFound: number
  suggestionIds: number[]
  issues: ContentIssue[]
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentDate = now.toISOString().split('T')[0]

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || baseUrl

  logger.info('Starting seasonal content refresh scan', {
    currentDate,
    currentYear,
    currentMonth,
    siteUrl,
    pageCount: PUBLIC_PAGES.length,
  })

  // Fetch search console data for traffic trends
  const searchConsoleData = await getSearchConsoleData()

  // Fetch all page content
  const pagesWithContent: { path: string; title: string; content: string }[] = []

  for (const page of PUBLIC_PAGES) {
    const content = await fetchPageContent(siteUrl, page.path)
    if (content) {
      pagesWithContent.push({
        path: page.path,
        title: page.title,
        content,
      })
    }
    // Small delay between fetches to be gentle on our own server
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  logger.info('Fetched page content for analysis', {
    totalPages: PUBLIC_PAGES.length,
    successfulFetches: pagesWithContent.length,
  })

  // Run AI analysis on fetched content
  const aiIssues = await analyzeContentWithAI(
    pagesWithContent,
    currentDate,
    currentYear,
    currentMonth
  )

  // Check for declining traffic pages
  const trafficIssues = await checkForDecliningPages(searchConsoleData)

  // Check for pages not updated in 90+ days
  const staleIssues = await checkStalePages()

  // Add impressions_trend data to AI issues where available
  for (const issue of aiIssues) {
    const scData = searchConsoleData.get(issue.page_path)
    if (scData) {
      // Store trend info in current_content as supplementary info if declining
      if (scData.impressionsTrend === 'declining' || scData.impressionsTrend === 'slight_decline') {
        issue.current_content = `[Traffic: ${scData.impressionsTrend}] ${issue.current_content}`.slice(0, 500)
      }
    }
  }

  // Combine all issues, deduplicating by page_path + reason
  const allIssues: ContentIssue[] = []
  const seen = new Set<string>()

  for (const issue of [...aiIssues, ...trafficIssues, ...staleIssues]) {
    const key = `${issue.page_path}::${issue.reason}`
    if (!seen.has(key)) {
      seen.add(key)
      allIssues.push(issue)
    }
  }

  // Save suggestions to database
  const suggestionIds = await saveSuggestions(allIssues)

  return {
    pagesScanned: pagesWithContent.length,
    issuesFound: allIssues.length,
    suggestionIds,
    issues: allIssues,
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    logger.info('Seasonal content refresh cron started')

    const result = await runSeasonalContentRefresh()

    const duration = Date.now() - startTime

    logger.info('Seasonal content refresh cron completed', {
      duration: `${duration}ms`,
      pagesScanned: result.pagesScanned,
      issuesFound: result.issuesFound,
      suggestionIds: result.suggestionIds,
    })

    return NextResponse.json({
      success: true,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      pages_scanned: result.pagesScanned,
      issues_found: result.issuesFound,
      suggestion_ids: result.suggestionIds,
      summary: {
        by_urgency: {
          critical: result.issues.filter(i => i.urgency === 'critical').length,
          high: result.issues.filter(i => i.urgency === 'high').length,
          medium: result.issues.filter(i => i.urgency === 'medium').length,
          low: result.issues.filter(i => i.urgency === 'low').length,
        },
        by_reason: {
          stale_date: result.issues.filter(i => i.reason === 'stale_date').length,
          outdated_info: result.issues.filter(i => i.reason === 'outdated_info').length,
          seasonal_update: result.issues.filter(i => i.reason === 'seasonal_update').length,
          declining_traffic: result.issues.filter(i => i.reason === 'declining_traffic').length,
          keyword_opportunity: result.issues.filter(i => i.reason === 'keyword_opportunity').length,
        },
      },
      issues: result.issues.map(i => ({
        page_path: i.page_path,
        page_title: i.page_title,
        reason: i.reason,
        urgency: i.urgency,
        current_content: i.current_content.slice(0, 100) + (i.current_content.length > 100 ? '...' : ''),
      })),
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('Seasonal content refresh cron failed', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Content refresh scan failed',
      duration_ms: duration,
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
