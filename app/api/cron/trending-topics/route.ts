/**
 * Cron: Trending Topics Detection
 *
 * Weekly cron that uses Claude AI to identify trending wine/travel topics
 * relevant to Walla Walla, stores them for editorial review, and expires
 * old topics.
 *
 * Schedule: Weekly on Mondays at 3 PM UTC (vercel.json: "0 15 * * 1")
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

interface TrendingTopic {
  topic: string
  category: string
  summary: string
  relevance_score: number
  suggested_content: string
  suggested_angle: string
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey })
}

const currentMonth = () => {
  const now = new Date()
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const currentSeason = () => {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting trending topics detection cron')

  try {
    // 1. Expire old topics (older than 30 days)
    const expireResult = await query(`
      UPDATE trending_topics
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('new')
        AND detected_at < NOW() - INTERVAL '30 days'
    `)
    logger.info(`Expired ${expireResult.rowCount} old trending topics`)

    // 2. Get recently detected topics to avoid duplicates
    const recentResult = await query<{ topic: string }>(`
      SELECT topic FROM trending_topics
      WHERE detected_at > NOW() - INTERVAL '14 days'
        AND status IN ('new', 'actioned')
    `)
    const recentTopics = recentResult.rows.map(r => r.topic)

    // 3. Use Claude to research trending topics
    const anthropic = getAnthropicClient()

    const systemPrompt = `You are a content strategist specializing in wine tourism marketing for the Walla Walla Valley, Washington State. Your job is to identify trending topics that a wine tourism business could create content about.

You research and identify trends across these areas:
- Wine tourism trends (nationally and regionally in the Pacific Northwest)
- Walla Walla regional news and events
- Seasonal wine activities and events (harvest, barrel tastings, new releases)
- Wine industry awards and recognition
- Food and wine pairings trending in media
- Travel trends affecting wine country visits
- Lifestyle trends that intersect with wine culture

Current date: ${new Date().toISOString().split('T')[0]}
Current month: ${currentMonth()}
Current season: ${currentSeason()}

IMPORTANT: Return realistic, actionable topics. Focus on things a small wine tourism company could actually write about.`

    const userPrompt = `Identify 5-7 trending topics relevant to Walla Walla wine country right now (${currentMonth()}, ${currentSeason()}).

${recentTopics.length > 0 ? `AVOID these topics we've already covered recently:\n${recentTopics.map(t => `- ${t}`).join('\n')}\n` : ''}

For each topic, provide:
- topic: A concise title (under 100 chars)
- category: One of: wine, travel, local_news, events, seasonal, industry, food, lifestyle
- summary: 2-3 sentence summary of the trend (under 500 chars)
- relevance_score: 1-10 how relevant to Walla Walla wine tourism (10 = perfect fit)
- suggested_content: What type of content to create (blog post, social series, guide, etc.)
- suggested_angle: The specific angle for Walla Walla (under 300 chars)

Respond with ONLY a JSON array, no markdown formatting:
[
  {
    "topic": "...",
    "category": "...",
    "summary": "...",
    "relevance_score": 8,
    "suggested_content": "...",
    "suggested_angle": "..."
  }
]`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 2000,
    })

    const responseText = completion.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    let topics: TrendingTopic[] = []
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      logger.error('Failed to parse trending topics response', {
        error: parseError,
        response: responseText.substring(0, 500),
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }

    // 4. Store topics in database
    const validCategories = ['wine', 'travel', 'local_news', 'events', 'seasonal', 'industry', 'food', 'lifestyle']
    let inserted = 0

    for (const topic of topics) {
      try {
        const category = validCategories.includes(topic.category) ? topic.category : 'wine'
        const score = Math.min(10, Math.max(1, Math.round(topic.relevance_score)))

        await query(`
          INSERT INTO trending_topics (
            topic, category, summary, relevance_score,
            suggested_content, suggested_angle,
            detected_at, expires_at, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            NOW(), NOW() + INTERVAL '30 days', 'new', NOW(), NOW()
          )
        `, [
          topic.topic.substring(0, 500),
          category,
          topic.summary.substring(0, 2000),
          score,
          topic.suggested_content?.substring(0, 2000) || null,
          topic.suggested_angle?.substring(0, 2000) || null,
        ])
        inserted++
      } catch (err) {
        logger.error('Failed to insert trending topic', { error: err, topic: topic.topic })
      }
    }

    logger.info('Trending topics detection complete', {
      detected: topics.length,
      inserted,
      expired: expireResult.rowCount,
    })

    return NextResponse.json({
      success: true,
      message: `Detected ${topics.length} topics, inserted ${inserted}, expired ${expireResult.rowCount}`,
      topics: topics.map(t => ({ topic: t.topic, category: t.category, score: t.relevance_score })),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Trending topics detection failed', { error: errorMessage })
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export const POST = GET
