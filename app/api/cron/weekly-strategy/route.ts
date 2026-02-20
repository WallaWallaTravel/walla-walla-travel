/**
 * Cron: Weekly Strategy Generation
 *
 * Runs Monday 10 AM Pacific (18:00 UTC), after the weekly report.
 * Gathers comprehensive marketing data and uses AI to create a
 * weekly marketing strategy with theme, post ideas, keyword focus,
 * and content refresh priorities.
 *
 * Schedule: 0 18 * * 1 (6 PM UTC Monday = 10 AM PST Monday)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import { logger } from '@/lib/logger'
import { withCronAuth } from '@/lib/api/middleware/cron-auth'
import Anthropic from '@anthropic-ai/sdk'

// ---------- Types ----------

interface SocialPerformance {
  platform: string
  post_count: number
  total_engagement: number
  total_impressions: number
  total_clicks: number
  avg_engagement: number
}

interface SearchTrend {
  query: string
  current_impressions: number
  previous_impressions: number
  current_clicks: number
  previous_clicks: number
  current_ctr: number
  current_position: number
  impression_change: number
}

interface CompetitorActivity {
  competitor_name: string
  change_type: string
  title: string
  description: string
  significance: string
  detected_at: string
}

interface TopPost {
  id: number
  platform: string
  content: string
  content_type: string | null
  engagement: number
  impressions: number
  published_at: string
}

interface ContentGapData {
  platform: string
  days_since_last_post: number
  total_posts_30d: number
}

interface StrategyOutput {
  theme: string
  summary: string
  recommended_posts: Array<{
    platform: string
    content_type: string
    content: string
    hashtags: string[]
    reasoning: string
    day_of_week: string
    priority: number
  }>
  keyword_focus: Array<{
    keyword: string
    rationale: string
    current_position: number | null
    target_action: string
  }>
  content_refresh_priorities: Array<{
    page_or_topic: string
    reason: string
    urgency: string
  }>
  content_gaps: Array<{
    area: string
    recommendation: string
  }>
}

// ---------- Data Gathering ----------

async function getSocialPerformance(): Promise<SocialPerformance[]> {
  try {
    const result = await query<SocialPerformance>(`
      SELECT
        platform,
        COUNT(*)::int AS post_count,
        COALESCE(SUM(engagement), 0)::int AS total_engagement,
        COALESCE(SUM(impressions), 0)::int AS total_impressions,
        COALESCE(SUM(clicks), 0)::int AS total_clicks,
        ROUND(COALESCE(AVG(engagement), 0))::int AS avg_engagement
      FROM scheduled_posts
      WHERE status = 'published'
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY platform
      ORDER BY total_engagement DESC
    `)
    return result.rows
  } catch (error) {
    logger.warn('Failed to fetch social performance', { error })
    return []
  }
}

async function getSearchConsoleTrends(): Promise<SearchTrend[]> {
  try {
    const result = await query<SearchTrend>(`
      WITH current_week AS (
        SELECT
          query,
          SUM(impressions) AS current_impressions,
          SUM(clicks) AS current_clicks,
          ROUND(AVG(ctr)::numeric, 4) AS current_ctr,
          ROUND(AVG(position)::numeric, 1) AS current_position
        FROM search_console_data
        WHERE data_date >= CURRENT_DATE - INTERVAL '7 days'
          AND query IS NOT NULL
        GROUP BY query
      ),
      previous_week AS (
        SELECT
          query,
          SUM(impressions) AS previous_impressions,
          SUM(clicks) AS previous_clicks
        FROM search_console_data
        WHERE data_date >= CURRENT_DATE - INTERVAL '14 days'
          AND data_date < CURRENT_DATE - INTERVAL '7 days'
          AND query IS NOT NULL
        GROUP BY query
      )
      SELECT
        c.query,
        c.current_impressions::int,
        COALESCE(p.previous_impressions, 0)::int AS previous_impressions,
        c.current_clicks::int,
        COALESCE(p.previous_clicks, 0)::int AS previous_clicks,
        c.current_ctr::float,
        c.current_position::float,
        (c.current_impressions - COALESCE(p.previous_impressions, 0))::int AS impression_change
      FROM current_week c
      LEFT JOIN previous_week p ON c.query = p.query
      ORDER BY c.current_impressions DESC
      LIMIT 20
    `)
    return result.rows
  } catch (error) {
    logger.warn('Failed to fetch search console trends', { error })
    return []
  }
}

async function getCompetitorActivity(): Promise<CompetitorActivity[]> {
  try {
    const result = await query<CompetitorActivity>(`
      SELECT
        c.name AS competitor_name,
        cc.change_type,
        cc.title,
        cc.description,
        cc.significance,
        cc.detected_at::text
      FROM competitor_changes cc
      JOIN competitors c ON cc.competitor_id = c.id
      WHERE cc.detected_at >= NOW() - INTERVAL '7 days'
      ORDER BY cc.detected_at DESC
      LIMIT 10
    `)
    return result.rows
  } catch (error) {
    logger.warn('Failed to fetch competitor activity', { error })
    return []
  }
}

async function getTopPerformingPosts(): Promise<TopPost[]> {
  try {
    const result = await query<TopPost>(`
      SELECT
        id,
        platform,
        LEFT(content, 300) AS content,
        content_type,
        engagement,
        impressions,
        published_at::text
      FROM scheduled_posts
      WHERE status = 'published'
        AND published_at >= NOW() - INTERVAL '14 days'
        AND engagement > 0
      ORDER BY engagement DESC
      LIMIT 5
    `)
    return result.rows
  } catch (error) {
    logger.warn('Failed to fetch top posts', { error })
    return []
  }
}

async function getContentGaps(): Promise<ContentGapData[]> {
  try {
    const result = await query<ContentGapData>(`
      WITH platform_stats AS (
        SELECT
          platform,
          MAX(published_at) AS last_post,
          COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '30 days') AS posts_30d
        FROM scheduled_posts
        WHERE status = 'published'
        GROUP BY platform
      )
      SELECT
        platform,
        EXTRACT(DAY FROM NOW() - COALESCE(last_post, NOW() - INTERVAL '30 days'))::int AS days_since_last_post,
        COALESCE(posts_30d, 0)::int AS total_posts_30d
      FROM platform_stats
      UNION ALL
      SELECT p.platform, 30, 0
      FROM (VALUES ('instagram'), ('facebook'), ('linkedin')) AS p(platform)
      WHERE p.platform NOT IN (SELECT platform FROM platform_stats)
    `)
    return result.rows
  } catch (error) {
    logger.warn('Failed to fetch content gaps', { error })
    return []
  }
}

async function checkExistingStrategy(weekStart: string): Promise<boolean> {
  try {
    const result = await query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM marketing_strategies
      WHERE week_start = $1
    `, [weekStart])
    return result.rows[0].count > 0
  } catch {
    return false
  }
}

// ---------- Strategy Execution Tracking ----------

interface ExecutionStats {
  previousStrategyId: number | null
  recommendedPostCount: number
  publishedFromStrategy: number
  executionRate: number
  strategyPostAvgEngagement: number
  adHocPostAvgEngagement: number
  performanceLift: number | null
}

async function getLastWeekExecutionStats(): Promise<ExecutionStats | null> {
  try {
    // Find last week's strategy
    const stratResult = await query<{
      id: number
      recommended_posts: string
      week_start: string
      week_end: string
    }>(`
      SELECT id, recommended_posts, week_start::text, week_end::text
      FROM marketing_strategies
      WHERE week_start < CURRENT_DATE
      ORDER BY week_start DESC
      LIMIT 1
    `)

    if (stratResult.rows.length === 0) return null

    const prevStrategy = stratResult.rows[0]
    const recommendedPosts = typeof prevStrategy.recommended_posts === 'string'
      ? JSON.parse(prevStrategy.recommended_posts)
      : prevStrategy.recommended_posts

    const recommendedPostCount = Array.isArray(recommendedPosts) ? recommendedPosts.length : 0

    // Count posts linked to this strategy
    const linkedResult = await query<{ count: number; avg_engagement: number }>(`
      SELECT
        COUNT(*)::int AS count,
        ROUND(COALESCE(AVG(engagement), 0))::int AS avg_engagement
      FROM scheduled_posts
      WHERE strategy_id = $1
        AND status = 'published'
    `, [prevStrategy.id])

    const publishedFromStrategy = linkedResult.rows[0]?.count || 0
    const strategyPostAvgEngagement = linkedResult.rows[0]?.avg_engagement || 0

    // Get avg engagement of ad-hoc posts in the same period
    const adHocResult = await query<{ avg_engagement: number }>(`
      SELECT ROUND(COALESCE(AVG(engagement), 0))::int AS avg_engagement
      FROM scheduled_posts
      WHERE strategy_id IS NULL
        AND status = 'published'
        AND published_at >= $1::date
        AND published_at <= $2::date + INTERVAL '1 day'
        AND engagement > 0
    `, [prevStrategy.week_start, prevStrategy.week_end])

    const adHocPostAvgEngagement = adHocResult.rows[0]?.avg_engagement || 0

    const executionRate = recommendedPostCount > 0
      ? Math.round((publishedFromStrategy / recommendedPostCount) * 100)
      : 0

    const performanceLift = adHocPostAvgEngagement > 0 && strategyPostAvgEngagement > 0
      ? Math.round(((strategyPostAvgEngagement - adHocPostAvgEngagement) / adHocPostAvgEngagement) * 100)
      : null

    // Save execution summary back to the previous strategy
    await query(`
      UPDATE marketing_strategies
      SET execution_summary = $1, updated_at = NOW()
      WHERE id = $2
    `, [
      JSON.stringify({
        recommended_post_count: recommendedPostCount,
        published_from_strategy: publishedFromStrategy,
        execution_rate_pct: executionRate,
        strategy_avg_engagement: strategyPostAvgEngagement,
        ad_hoc_avg_engagement: adHocPostAvgEngagement,
        performance_lift_pct: performanceLift,
        computed_at: new Date().toISOString(),
      }),
      prevStrategy.id,
    ])

    return {
      previousStrategyId: prevStrategy.id,
      recommendedPostCount,
      publishedFromStrategy,
      executionRate,
      strategyPostAvgEngagement,
      adHocPostAvgEngagement,
      performanceLift,
    }
  } catch (error) {
    logger.warn('Failed to compute execution stats', { error })
    return null
  }
}

// ---------- Strategy Generation ----------

async function generateStrategy(data: {
  socialPerformance: SocialPerformance[]
  searchTrends: SearchTrend[]
  competitorActivity: CompetitorActivity[]
  topPosts: TopPost[]
  contentGaps: ContentGapData[]
  seasonalContext: ReturnType<typeof socialIntelligenceService.getSeasonalContext>
  benchmarks?: { byContentType: Array<{ dimension_value: string; avg_engagement: number; avg_impressions: number; post_count: number }>; byPlatform: Array<{ dimension_value: string; avg_engagement: number; avg_impressions: number; post_count: number }> }
  executionStats?: ExecutionStats | null
  weekStart: string
  weekEnd: string
}): Promise<StrategyOutput> {
  const anthropic = new Anthropic()

  const prompt = `You are a senior digital marketing strategist for Walla Walla Travel, a destination management company in Walla Walla wine country, Washington.

Based on the following performance data, create a comprehensive weekly marketing strategy for the week of ${data.weekStart} to ${data.weekEnd}.

BUSINESS CONTEXT:
- Walla Walla Travel is a destination management company for wine country tourism
- Tours use Mercedes Sprinter vans (3 van fleet)
- Sweet spot is 3 wineries per tour (max 4, never more)
- Standard tour is 6 hours
- Tasting fees are NEVER included in tour pricing
- Target audience: wine enthusiasts, couples, corporate groups, special occasions

LAST 7 DAYS - SOCIAL MEDIA PERFORMANCE:
${JSON.stringify(data.socialPerformance, null, 2)}

SEARCH CONSOLE TRENDS (this week vs. last week):
${JSON.stringify(data.searchTrends.slice(0, 15), null, 2)}

COMPETITOR ACTIVITY (last 7 days):
${JSON.stringify(data.competitorActivity, null, 2)}

TOP PERFORMING CONTENT (last 14 days):
${JSON.stringify(data.topPosts, null, 2)}

CONTENT GAPS BY PLATFORM:
${JSON.stringify(data.contentGaps, null, 2)}

SEASONAL CONTEXT:
- Season: ${data.seasonalContext.season}
- Upcoming holidays: ${data.seasonalContext.upcomingHolidays.join(', ') || 'None in next 14 days'}
- Wine seasons: ${data.seasonalContext.winerySeasons.join(', ') || 'None active'}
- Tourism context: ${data.seasonalContext.tourismContext}

${data.benchmarks ? `PERFORMANCE BENCHMARKS (90-day averages — use this to recommend content types that actually perform well):
By content type: ${JSON.stringify(data.benchmarks.byContentType)}
By platform: ${JSON.stringify(data.benchmarks.byPlatform)}` : ''}

${data.executionStats ? `LAST WEEK'S STRATEGY EXECUTION:
- Recommended posts: ${data.executionStats.recommendedPostCount}
- Actually published: ${data.executionStats.publishedFromStrategy}
- Execution rate: ${data.executionStats.executionRate}%
- Strategy posts avg engagement: ${data.executionStats.strategyPostAvgEngagement}
- Ad-hoc posts avg engagement: ${data.executionStats.adHocPostAvgEngagement}
${data.executionStats.performanceLift !== null ? `- Performance lift: ${data.executionStats.performanceLift > 0 ? '+' : ''}${data.executionStats.performanceLift}% vs ad-hoc` : '- Not enough data to compare'}
Consider this execution feedback when making this week's recommendations. If execution rate was low, make recommendations more actionable. If strategy posts outperformed, lean into what worked.` : ''}

Create a strategy with:

1. THEME: A unifying theme for this week's content (short, catchy)
2. SUMMARY: 2-3 paragraph strategic overview explaining why this theme, key focus areas, and expected outcomes
3. RECOMMENDED POSTS: Exactly 7 ready-to-publish social post ideas (one per day, Mon-Sun), varied across platforms
4. KEYWORD FOCUS: Top 3-5 keywords to focus on based on search trends
5. CONTENT REFRESH PRIORITIES: Pages or topics that need updating based on data
6. CONTENT GAPS: Areas where we're underserving audiences

Respond with ONLY a JSON object in this exact format:
{
  "theme": "Week's theme",
  "summary": "Strategic overview...",
  "recommended_posts": [
    {
      "platform": "instagram",
      "content_type": "wine_spotlight",
      "content": "Ready to publish post text...",
      "hashtags": ["WallaWallaWine", "WineCountry"],
      "reasoning": "Why this post, what data supports it",
      "day_of_week": "Monday",
      "priority": 8
    }
  ],
  "keyword_focus": [
    {
      "keyword": "walla walla wine tours",
      "rationale": "Growing impressions, opportunity to improve position",
      "current_position": 12.5,
      "target_action": "Create dedicated landing page content"
    }
  ],
  "content_refresh_priorities": [
    {
      "page_or_topic": "/wine-tours",
      "reason": "Declining impressions, outdated seasonal info",
      "urgency": "high"
    }
  ],
  "content_gaps": [
    {
      "area": "LinkedIn thought leadership",
      "recommendation": "Share industry insights about wine tourism trends"
    }
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from AI')
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse strategy JSON from AI response')
  }

  return JSON.parse(jsonMatch[0]) as StrategyOutput
}

// ---------- Storage ----------

async function saveStrategy(
  weekStart: string,
  weekEnd: string,
  strategy: StrategyOutput,
  dataInputs: Record<string, unknown>
): Promise<number> {
  const result = await query<{ id: number }>(`
    INSERT INTO marketing_strategies (
      week_start, week_end, theme, summary,
      data_inputs, recommended_posts,
      keyword_opportunities, content_gaps,
      performance_summary, status,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), NOW()
    )
    RETURNING id
  `, [
    weekStart,
    weekEnd,
    strategy.theme,
    strategy.summary,
    JSON.stringify(dataInputs),
    JSON.stringify(strategy.recommended_posts),
    JSON.stringify(strategy.keyword_focus),
    JSON.stringify(strategy.content_gaps),
    JSON.stringify({
      content_refresh_priorities: strategy.content_refresh_priorities,
    }),
  ])

  return result.rows[0].id
}

async function createSuggestionsFromStrategy(
  strategyId: number,
  posts: StrategyOutput['recommended_posts']
): Promise<number[]> {
  const ids: number[] = []
  const dayOffsets: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
  }

  const now = new Date()
  // Find next Monday (or today if Monday)
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : 8 - dayOfWeek)
  const monday = new Date(now)
  monday.setDate(monday.getDate() + daysUntilMonday)

  const optimalTimes: Record<string, number> = {
    instagram: 19,
    facebook: 13,
    linkedin: 10,
  }

  for (const post of posts) {
    const offset = dayOffsets[post.day_of_week] ?? 0
    const postDate = new Date(monday)
    postDate.setDate(postDate.getDate() + offset)
    const hour = optimalTimes[post.platform] ?? 12
    postDate.setHours(hour, 0, 0, 0)

    try {
      const result = await query<{ id: number }>(`
        INSERT INTO content_suggestions (
          suggestion_date, platform, content_type,
          winery_id, winery_name,
          suggested_content, suggested_hashtags,
          suggested_time, reasoning,
          data_sources, priority,
          suggested_media_urls, media_source,
          image_search_query, status, created_at
        ) VALUES (
          $1, $2, $3, NULL, NULL, $4, $5, $6, $7,
          $8, $9, '{}', 'unsplash', $10, 'pending', NOW()
        )
        RETURNING id
      `, [
        postDate.toISOString().split('T')[0],
        post.platform,
        post.content_type,
        post.content,
        post.hashtags || [],
        postDate.toISOString(),
        post.reasoning,
        JSON.stringify([{ type: 'strategy', id: strategyId, detail: 'Generated from weekly strategy' }]),
        post.priority || 5,
        `walla walla ${post.content_type.replace(/_/g, ' ')}`,
      ])
      ids.push(result.rows[0].id)
    } catch (error) {
      logger.warn('Failed to create suggestion from strategy post', { error, post: post.day_of_week })
    }
  }

  return ids
}

// ---------- Route Handlers ----------

export const GET = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting weekly strategy generation')

  try {
    // Calculate current week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(monday.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]

    // Check if strategy already exists for this week
    const exists = await checkExistingStrategy(weekStart)
    if (exists) {
      logger.info('Strategy already exists for this week', { weekStart })
      return NextResponse.json({
        success: true,
        message: `Strategy already exists for week of ${weekStart}`,
        skipped: true,
        timestamp: new Date().toISOString(),
      })
    }

    // Gather all data sources in parallel
    const [
      socialPerformance,
      searchTrends,
      competitorActivity,
      topPosts,
      contentGaps,
      benchmarks,
      executionStats,
    ] = await Promise.all([
      getSocialPerformance(),
      getSearchConsoleTrends(),
      getCompetitorActivity(),
      getTopPerformingPosts(),
      getContentGaps(),
      socialIntelligenceService.getPerformanceBenchmarks(),
      getLastWeekExecutionStats(),
    ])

    const seasonalContext = socialIntelligenceService.getSeasonalContext()

    const dataInputs = {
      social_posts_analyzed: socialPerformance.reduce((s, p) => s + p.post_count, 0),
      search_queries_analyzed: searchTrends.length,
      competitor_changes: competitorActivity.length,
      top_posts_reviewed: topPosts.length,
      platforms_tracked: contentGaps.length,
      season: seasonalContext.season,
      holidays: seasonalContext.upcomingHolidays,
      wine_seasons: seasonalContext.winerySeasons,
    }

    // Generate AI strategy
    const strategy = await generateStrategy({
      socialPerformance,
      searchTrends,
      competitorActivity,
      topPosts,
      contentGaps,
      seasonalContext,
      benchmarks: {
        byContentType: benchmarks.byContentType,
        byPlatform: benchmarks.byPlatform,
      },
      executionStats,
      weekStart,
      weekEnd,
    })

    // Save strategy to database
    const strategyId = await saveStrategy(weekStart, weekEnd, strategy, dataInputs)

    // Create content suggestions from recommended posts
    const suggestionIds = await createSuggestionsFromStrategy(
      strategyId,
      strategy.recommended_posts
    )

    logger.info('Weekly strategy generated successfully', {
      strategyId,
      theme: strategy.theme,
      postsRecommended: strategy.recommended_posts.length,
      suggestionsCreated: suggestionIds.length,
      keywordFocusAreas: strategy.keyword_focus.length,
    })

    return NextResponse.json({
      success: true,
      strategy_id: strategyId,
      theme: strategy.theme,
      posts_recommended: strategy.recommended_posts.length,
      suggestions_created: suggestionIds.length,
      keyword_focus_areas: strategy.keyword_focus.length,
      content_refresh_items: strategy.content_refresh_priorities.length,
      week: { start: weekStart, end: weekEnd },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate weekly strategy', { error: errorMessage })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
})

export const POST = GET
