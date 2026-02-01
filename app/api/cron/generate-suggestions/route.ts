/**
 * Cron: Generate Daily Content Suggestions
 *
 * Runs daily at 6 AM Pacific to generate AI-powered content suggestions
 * backed by real data (events, competitors, seasonal context).
 *
 * Schedule: 0 6 * * * (6 AM daily, adjusted for Pacific time)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting daily content suggestion generation')

  try {
    // Check if suggestions already exist for today
    const existingResult = await query<{ count: number }>(`
      SELECT COUNT(*)::int as count
      FROM content_suggestions
      WHERE suggestion_date = CURRENT_DATE
        AND status = 'pending'
    `)

    if (existingResult.rows[0].count > 0) {
      logger.info('Suggestions already generated for today', { count: existingResult.rows[0].count })
      return NextResponse.json({
        success: true,
        message: `Suggestions already exist for today (${existingResult.rows[0].count} pending)`,
        skipped: true,
        timestamp: new Date().toISOString(),
      })
    }

    // Expire old pending suggestions (older than 7 days)
    await query(`
      UPDATE content_suggestions
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending'
        AND suggestion_date < CURRENT_DATE - INTERVAL '7 days'
    `)

    // Generate new suggestions
    const suggestions = await socialIntelligenceService.generateDailySuggestions()

    if (suggestions.length === 0) {
      logger.warn('No suggestions generated')
      return NextResponse.json({
        success: true,
        message: 'No suggestions generated',
        count: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Save to database
    const savedIds = await socialIntelligenceService.saveSuggestions(suggestions)

    logger.info('Content suggestions generated successfully', {
      count: savedIds.length,
      ids: savedIds,
    })

    return NextResponse.json({
      success: true,
      message: `Generated ${savedIds.length} content suggestions`,
      count: savedIds.length,
      suggestion_ids: savedIds,
      platforms: suggestions.map(s => s.platform),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate content suggestions', { error: errorMessage })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export const POST = GET
