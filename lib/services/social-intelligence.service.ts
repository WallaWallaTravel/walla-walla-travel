/**
 * Social Intelligence Service
 *
 * Aggregates data from multiple sources to generate smart, research-backed
 * content suggestions for social media posting.
 *
 * Data Sources:
 * - Winery events (upcoming in next 14 days)
 * - Competitor changes (recent pricing/promotion updates)
 * - Seasonal calendar (holidays, wine seasons, tourism peaks)
 * - Media library (available images by category)
 * - Past posts (content gaps, days since last post per platform)
 * - Top performing content (engagement feedback loop)
 * - Learned preferences from content approvals
 */

import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import Anthropic from '@anthropic-ai/sdk'

// Types
interface WineryEvent {
  id: number
  winery_id: number
  winery_name: string
  title: string
  description: string | null
  event_date: string
  event_type: string
}

interface CompetitorChange {
  id: number
  competitor_name: string
  change_type: string
  title: string
  description: string
  detected_at: string
  significance: string
}

interface MediaAsset {
  id: number
  file_path: string
  title: string
  category: string
  tags: string[]
  winery_id: number | null
}

interface ContentGap {
  platform: string
  days_since_last_post: number
  last_content_type: string | null
  total_posts_30d: number
}

interface SeasonalContext {
  season: string
  upcomingHolidays: string[]
  winerySeasons: string[]
  tourismContext: string
}

interface TopPerformingPost {
  id: number
  platform: string
  content: string
  content_type: string | null
  engagement: number
  impressions: number
  clicks: number
  published_at: string
}

interface LearnedPreference {
  preference_type: string
  platform: string | null
  pattern: string
  confidence_score: number
}

export interface ContentSuggestion {
  platform: 'instagram' | 'facebook' | 'linkedin'
  content_type: string
  winery_id: number | null
  winery_name: string | null
  suggested_content: string
  suggested_hashtags: string[]
  suggested_time: Date
  reasoning: string
  data_sources: Array<{ type: string; id?: number; detail: string }>
  priority: number
  suggested_media_urls: string[]
  media_source: 'library' | 'unsplash' | 'none'
  image_search_query: string | null
}

class SocialIntelligenceService {
  private anthropic: Anthropic | null = null

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = new Anthropic()
    }
    return this.anthropic
  }

  /**
   * Get upcoming winery events (next 14 days)
   */
  async getUpcomingEvents(): Promise<WineryEvent[]> {
    try {
      const result = await query<WineryEvent>(`
        SELECT
          e.id,
          e.winery_id,
          w.name as winery_name,
          e.title,
          e.description,
          e.event_date,
          e.event_type
        FROM winery_events e
        JOIN wineries w ON e.winery_id = w.id
        WHERE e.event_date >= CURRENT_DATE
          AND e.event_date <= CURRENT_DATE + INTERVAL '14 days'
          AND e.is_active = true
        ORDER BY e.event_date ASC
        LIMIT 10
      `)
      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch winery events (table may not exist)', { error })
      return []
    }
  }

  /**
   * Get recent competitor changes (last 7 days)
   */
  async getRecentCompetitorChanges(): Promise<CompetitorChange[]> {
    try {
      const result = await query<CompetitorChange>(`
        SELECT
          cc.id,
          c.name as competitor_name,
          cc.change_type,
          cc.title,
          cc.description,
          cc.detected_at,
          cc.significance
        FROM competitor_changes cc
        JOIN competitors c ON cc.competitor_id = c.id
        WHERE cc.detected_at >= NOW() - INTERVAL '7 days'
          AND cc.significance IN ('high', 'medium')
        ORDER BY cc.detected_at DESC
        LIMIT 5
      `)
      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch competitor changes', { error })
      return []
    }
  }

  /**
   * Get available media assets
   */
  async getAvailableMedia(wineryId?: number, category?: string): Promise<MediaAsset[]> {
    try {
      let queryText = `
        SELECT id, file_path, title, category, tags, winery_id
        FROM media
        WHERE is_active = true
      `
      const params: (number | string)[] = []

      if (wineryId) {
        params.push(wineryId)
        queryText += ` AND winery_id = $${params.length}`
      }

      if (category) {
        params.push(category)
        queryText += ` AND category = $${params.length}`
      }

      queryText += ` ORDER BY created_at DESC LIMIT 20`

      const result = await query<MediaAsset>(queryText, params)
      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch media assets', { error })
      return []
    }
  }

  /**
   * Analyze content gaps per platform
   */
  async getContentGaps(): Promise<ContentGap[]> {
    try {
      const result = await query<ContentGap>(`
        WITH platform_stats AS (
          SELECT
            platform,
            MAX(scheduled_for) as last_post,
            COUNT(*) FILTER (WHERE scheduled_for >= NOW() - INTERVAL '30 days') as posts_30d,
            (
              SELECT content_type
              FROM scheduled_posts sp2
              WHERE sp2.platform = sp.platform
                AND sp2.status = 'published'
              ORDER BY published_at DESC
              LIMIT 1
            ) as last_content_type
          FROM scheduled_posts sp
          WHERE status = 'published'
          GROUP BY platform
        )
        SELECT
          platform,
          EXTRACT(DAY FROM NOW() - COALESCE(last_post, NOW() - INTERVAL '30 days'))::int as days_since_last_post,
          last_content_type,
          COALESCE(posts_30d, 0)::int as total_posts_30d
        FROM platform_stats
        UNION ALL
        SELECT p.platform, 30, NULL, 0
        FROM (VALUES ('instagram'), ('facebook'), ('linkedin')) AS p(platform)
        WHERE p.platform NOT IN (SELECT platform FROM platform_stats)
      `)
      return result.rows
    } catch (error) {
      logger.warn('Failed to analyze content gaps', { error })
      return [
        { platform: 'instagram', days_since_last_post: 7, last_content_type: null, total_posts_30d: 0 },
        { platform: 'facebook', days_since_last_post: 7, last_content_type: null, total_posts_30d: 0 },
        { platform: 'linkedin', days_since_last_post: 7, last_content_type: null, total_posts_30d: 0 },
      ]
    }
  }

  /**
   * Get seasonal context based on current date
   */
  getSeasonalContext(): SeasonalContext {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    const _day = now.getDate()

    // Determine season
    let season: string
    if (month >= 3 && month <= 5) season = 'spring'
    else if (month >= 6 && month <= 8) season = 'summer'
    else if (month >= 9 && month <= 11) season = 'fall'
    else season = 'winter'

    // Upcoming holidays (next 14 days)
    const upcomingHolidays: string[] = []
    const holidays: Array<{ month: number; day: number; name: string }> = [
      { month: 1, day: 1, name: "New Year's Day" },
      { month: 2, day: 14, name: "Valentine's Day" },
      { month: 3, day: 17, name: "St. Patrick's Day" },
      { month: 5, day: 12, name: "Mother's Day" },
      { month: 6, day: 16, name: "Father's Day" },
      { month: 7, day: 4, name: "Independence Day" },
      { month: 9, day: 1, name: "Labor Day" },
      { month: 10, day: 31, name: "Halloween" },
      { month: 11, day: 28, name: "Thanksgiving" },
      { month: 12, day: 25, name: "Christmas" },
      { month: 12, day: 31, name: "New Year's Eve" },
    ]

    for (const holiday of holidays) {
      const holidayDate = new Date(now.getFullYear(), holiday.month - 1, holiday.day)
      const daysUntil = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil >= 0 && daysUntil <= 14) {
        upcomingHolidays.push(holiday.name)
      }
    }

    // Wine seasons
    const winerySeasons: string[] = []
    if (month >= 8 && month <= 10) winerySeasons.push('Harvest Season')
    if (month >= 11 || month <= 2) winerySeasons.push('Wine Club Release Season')
    if (month >= 3 && month <= 5) winerySeasons.push('Spring Release Season')
    if (month >= 6 && month <= 8) winerySeasons.push('Summer Tasting Season')

    // Tourism context
    let tourismContext: string
    if (month >= 5 && month <= 9) {
      tourismContext = 'Peak tourism season - visitors actively planning wine country trips'
    } else if (month >= 10 && month <= 11) {
      tourismContext = 'Fall color season - popular for harvest experiences and scenic tours'
    } else {
      tourismContext = 'Off-peak season - focus on locals, wine club members, and event planning'
    }

    return { season, upcomingHolidays, winerySeasons, tourismContext }
  }

  /**
   * Get top performing posts from the last 30 days
   * Feeds engagement data back into AI for smarter content generation
   */
  async getTopPerformingContent(): Promise<TopPerformingPost[]> {
    try {
      const result = await query<TopPerformingPost>(`
        SELECT
          id,
          platform,
          LEFT(content, 200) as content,
          content_type,
          engagement,
          impressions,
          clicks,
          published_at::text
        FROM scheduled_posts
        WHERE status = 'published'
          AND published_at >= NOW() - INTERVAL '30 days'
          AND engagement > 0
        ORDER BY engagement DESC
        LIMIT 10
      `)
      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch top performing content', { error })
      return []
    }
  }

  /**
   * Get learned preferences from content approval history
   * These patterns inform the AI about admin content preferences
   */
  async getLearnedPreferences(): Promise<LearnedPreference[]> {
    try {
      const result = await query<LearnedPreference>(`
        SELECT
          preference_type,
          platform,
          pattern,
          confidence_score
        FROM ai_learning_preferences
        WHERE is_active = true
          AND confidence_score >= 0.60
        ORDER BY confidence_score DESC
        LIMIT 15
      `)
      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch learned preferences (table may not exist yet)', { error })
      return []
    }
  }

  /**
   * Generate daily content suggestions using AI
   */
  async generateDailySuggestions(): Promise<ContentSuggestion[]> {
    // Gather all data sources including performance feedback
    const [events, competitorChanges, contentGaps, topPosts, preferences] = await Promise.all([
      this.getUpcomingEvents(),
      this.getRecentCompetitorChanges(),
      this.getContentGaps(),
      this.getTopPerformingContent(),
      this.getLearnedPreferences(),
    ])

    const seasonalContext = this.getSeasonalContext()

    // Build context for AI — includes performance feedback loop
    const dataContext = {
      upcomingEvents: events.map(e => ({
        winery: e.winery_name,
        event: e.title,
        date: e.event_date,
        type: e.event_type,
      })),
      competitorUpdates: competitorChanges.map(c => ({
        competitor: c.competitor_name,
        change: c.title,
        type: c.change_type,
        significance: c.significance,
      })),
      contentGaps: contentGaps,
      seasonal: seasonalContext,
      today: new Date().toISOString().split('T')[0],
      topPerformingContent: topPosts.map(p => ({
        platform: p.platform,
        content: p.content,
        type: p.content_type,
        engagement: p.engagement,
        impressions: p.impressions,
      })),
      learnedPreferences: preferences.map(p => ({
        type: p.preference_type,
        platform: p.platform,
        pattern: p.pattern,
        confidence: p.confidence_score,
      })),
    }

    // Generate suggestions using Claude
    const suggestions: ContentSuggestion[] = []

    try {
      const anthropic = this.getAnthropic()

      const prompt = `You are a social media strategist for a wine tour company in Walla Walla, Washington.

Based on the following data, generate 3 content suggestions (one for each platform: Instagram, Facebook, LinkedIn).

DATA CONTEXT:
${JSON.stringify(dataContext, null, 2)}

For each suggestion, provide:
1. Platform (instagram/facebook/linkedin)
2. Content type (wine_spotlight, event_promo, seasonal, educational, behind_scenes, or general)
3. If winery-specific, which winery
4. The actual post content (ready to use)
5. Hashtags (5-10 relevant ones)
6. Reasoning (why this content, backed by the data provided)
7. Priority (1-10, higher = more important)
8. Suggested image search query if needed

IMPORTANT:
- Make content specific and actionable
- Reference actual data (events, competitors, gaps)
- Match platform style (Instagram: visual/emoji, LinkedIn: professional, Facebook: community)
- Prioritize content gaps (platforms with no recent posts)
- Consider upcoming events and holidays
- LEARN FROM PERFORMANCE: The topPerformingContent shows what posts got the most engagement recently. Generate content similar in style, tone, and topic to high-performing posts.
- RESPECT LEARNED PREFERENCES: The learnedPreferences show patterns the admin prefers. Follow these patterns when generating content (e.g., preferred tone, emoji usage, hashtag style, content length).

Respond with a JSON array of suggestions in this exact format:
[
  {
    "platform": "instagram",
    "content_type": "event_promo",
    "winery_name": "L'Ecole No. 41",
    "suggested_content": "Your post text here...",
    "suggested_hashtags": ["WallaWallaWine", "WineCountry"],
    "reasoning": "Why this suggestion...",
    "priority": 8,
    "image_search_query": "walla walla vineyard sunset"
  }
]`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])

          for (const item of parsed) {
            // Find matching winery ID if winery name provided
            let wineryId: number | null = null
            if (item.winery_name) {
              const wineryResult = await query<{ id: number }>(
                'SELECT id FROM wineries WHERE name ILIKE $1 LIMIT 1',
                [`%${item.winery_name}%`]
              )
              if (wineryResult.rows.length > 0) {
                wineryId = wineryResult.rows[0].id
              }
            }

            // Check for available media
            const media = await this.getAvailableMedia(wineryId || undefined)

            suggestions.push({
              platform: item.platform,
              content_type: item.content_type,
              winery_id: wineryId,
              winery_name: item.winery_name || null,
              suggested_content: item.suggested_content,
              suggested_hashtags: item.suggested_hashtags || [],
              suggested_time: this.getOptimalPostTime(item.platform),
              reasoning: item.reasoning,
              data_sources: [
                ...(events.length > 0 ? [{ type: 'events', detail: `${events.length} upcoming events` }] : []),
                ...(competitorChanges.length > 0 ? [{ type: 'competitors', detail: `${competitorChanges.length} recent changes` }] : []),
                { type: 'seasonal', detail: seasonalContext.season },
                ...(topPosts.length > 0 ? [{ type: 'performance', detail: `${topPosts.length} top posts analyzed` }] : []),
                ...(preferences.length > 0 ? [{ type: 'preferences', detail: `${preferences.length} learned patterns applied` }] : []),
              ],
              priority: item.priority || 5,
              suggested_media_urls: media.slice(0, 3).map(m => m.file_path),
              media_source: media.length > 0 ? 'library' : (item.image_search_query ? 'unsplash' : 'none'),
              image_search_query: item.image_search_query || null,
            })
          }
        }
      }
    } catch (error) {
      logger.error('Failed to generate AI suggestions', { error })
      // Return basic suggestions if AI fails
      return this.generateFallbackSuggestions(contentGaps, seasonalContext)
    }

    return suggestions
  }

  /**
   * Get optimal posting time for a platform
   */
  private getOptimalPostTime(platform: string): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const times: Record<string, number> = {
      instagram: 19, // 7 PM
      facebook: 13,  // 1 PM
      linkedin: 10,  // 10 AM
    }

    tomorrow.setHours(times[platform] || 12, 0, 0, 0)
    return tomorrow
  }

  /**
   * Generate fallback suggestions when AI fails
   */
  private generateFallbackSuggestions(
    contentGaps: ContentGap[],
    seasonal: SeasonalContext
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = []

    // Prioritize platforms with biggest gaps
    const sortedGaps = [...contentGaps].sort((a, b) => b.days_since_last_post - a.days_since_last_post)

    for (const gap of sortedGaps.slice(0, 3)) {
      suggestions.push({
        platform: gap.platform as 'instagram' | 'facebook' | 'linkedin',
        content_type: 'general',
        winery_id: null,
        winery_name: null,
        suggested_content: this.getGenericContent(gap.platform, seasonal),
        suggested_hashtags: ['WallaWallaWine', 'WineCountry', 'WashingtonWine'],
        suggested_time: this.getOptimalPostTime(gap.platform),
        reasoning: `${gap.days_since_last_post} days since last ${gap.platform} post. Maintaining consistent presence.`,
        data_sources: [{ type: 'content_gap', detail: `${gap.days_since_last_post} days gap` }],
        priority: Math.min(10, gap.days_since_last_post),
        suggested_media_urls: [],
        media_source: 'unsplash',
        image_search_query: 'walla walla vineyard',
      })
    }

    return suggestions
  }

  /**
   * Generate generic content based on platform and season
   */
  private getGenericContent(platform: string, seasonal: SeasonalContext): string {
    const baseContent = `Discover the beauty of Walla Walla wine country this ${seasonal.season}.`

    if (seasonal.upcomingHolidays.length > 0) {
      return `${baseContent} ${seasonal.upcomingHolidays[0]} is coming up - treat someone special to a wine tour experience!`
    }

    if (seasonal.winerySeasons.length > 0) {
      return `${baseContent} It's ${seasonal.winerySeasons[0]} - the perfect time to explore local wineries!`
    }

    return baseContent
  }

  /**
   * Analyze Search Console data for keyword opportunities.
   * Finds keywords ranking #5-20 that could reach page 1 with optimization.
   * Also identifies question-based queries (how, what, where, etc.)
   */
  async getKeywordOpportunities(): Promise<Array<{
    query: string;
    avg_position: number;
    impressions: number;
    clicks: number;
    opportunity_type: string;
  }>> {
    try {
      const result = await query<{
        query: string;
        avg_position: number;
        impressions: number;
        clicks: number;
        opportunity_type: string;
      }>(`
        WITH keyword_stats AS (
          SELECT
            query,
            ROUND(AVG(position)::numeric, 2)::float AS avg_position,
            SUM(impressions)::int AS impressions,
            SUM(clicks)::int AS clicks
          FROM search_console_data
          WHERE query IS NOT NULL
            AND data_date >= CURRENT_DATE - INTERVAL '28 days'
          GROUP BY query
          HAVING AVG(position) BETWEEN 5 AND 20
             AND SUM(impressions) >= 10
        )
        SELECT
          query,
          avg_position,
          impressions,
          clicks,
          CASE
            WHEN avg_position BETWEEN 5 AND 10 THEN 'striking_distance'
            WHEN avg_position BETWEEN 11 AND 15 THEN 'near_page_one'
            WHEN avg_position BETWEEN 16 AND 20 THEN 'page_two'
            ELSE 'other'
          END AS opportunity_type
        FROM keyword_stats
        ORDER BY
          CASE
            WHEN avg_position BETWEEN 5 AND 10 THEN 1
            WHEN avg_position BETWEEN 11 AND 15 THEN 2
            ELSE 3
          END,
          impressions DESC
        LIMIT 50
      `)

      // Tag question-based queries separately
      const opportunities = result.rows.map(row => {
        const lowerQuery = row.query.toLowerCase()
        const isQuestion = /^(how|what|where|when|why|which|who|can|do|does|is|are)\b/.test(lowerQuery)
        return {
          ...row,
          opportunity_type: isQuestion ? 'question_keyword' : row.opportunity_type,
        }
      })

      return opportunities
    } catch (error) {
      logger.warn('Failed to fetch keyword opportunities (search_console_data may not exist)', { error })
      return []
    }
  }

  /**
   * Detect seasonal keyword spikes by comparing recent vs historical data.
   * Compares the last 7 days of impressions against the previous 30 days average.
   */
  async getSeasonalKeywordTrends(): Promise<Array<{
    query: string;
    current_impressions: number;
    previous_impressions: number;
    growth_pct: number;
  }>> {
    try {
      const result = await query<{
        query: string;
        current_impressions: number;
        previous_impressions: number;
        growth_pct: number;
      }>(`
        WITH recent AS (
          SELECT
            query,
            SUM(impressions)::int AS current_impressions
          FROM search_console_data
          WHERE query IS NOT NULL
            AND data_date >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY query
          HAVING SUM(impressions) >= 5
        ),
        previous AS (
          SELECT
            query,
            ROUND(SUM(impressions)::numeric * 7.0 / 30.0)::int AS previous_impressions
          FROM search_console_data
          WHERE query IS NOT NULL
            AND data_date >= CURRENT_DATE - INTERVAL '37 days'
            AND data_date < CURRENT_DATE - INTERVAL '7 days'
          GROUP BY query
          HAVING SUM(impressions) >= 5
        )
        SELECT
          r.query,
          r.current_impressions,
          COALESCE(p.previous_impressions, 0) AS previous_impressions,
          CASE
            WHEN COALESCE(p.previous_impressions, 0) = 0 THEN 100.0
            ELSE ROUND(
              ((r.current_impressions - p.previous_impressions)::numeric / p.previous_impressions * 100), 1
            )::float
          END AS growth_pct
        FROM recent r
        LEFT JOIN previous p ON r.query = p.query
        WHERE r.current_impressions > COALESCE(p.previous_impressions, 0)
        ORDER BY growth_pct DESC
        LIMIT 30
      `)

      return result.rows
    } catch (error) {
      logger.warn('Failed to fetch seasonal keyword trends', { error })
      return []
    }
  }

  /**
   * Save suggestions to database
   */
  async saveSuggestions(suggestions: ContentSuggestion[]): Promise<number[]> {
    const ids: number[] = []

    for (const suggestion of suggestions) {
      const result = await query<{ id: number }>(`
        INSERT INTO content_suggestions (
          suggestion_date,
          platform,
          content_type,
          winery_id,
          winery_name,
          suggested_content,
          suggested_hashtags,
          suggested_time,
          reasoning,
          data_sources,
          priority,
          suggested_media_urls,
          media_source,
          image_search_query,
          status,
          created_at
        ) VALUES (
          CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW()
        )
        RETURNING id
      `, [
        suggestion.platform,
        suggestion.content_type,
        suggestion.winery_id,
        suggestion.winery_name,
        suggestion.suggested_content,
        suggestion.suggested_hashtags,
        suggestion.suggested_time.toISOString(),
        suggestion.reasoning,
        JSON.stringify(suggestion.data_sources),
        suggestion.priority,
        suggestion.suggested_media_urls,
        suggestion.media_source,
        suggestion.image_search_query,
      ])

      ids.push(result.rows[0].id)
    }

    return ids
  }
}

export const socialIntelligenceService = new SocialIntelligenceService()
