/**
 * Cron: Sync Post Metrics from Buffer
 *
 * Runs daily to pull engagement analytics (impressions, clicks, shares, etc.)
 * from Buffer for published posts, updating the scheduled_posts table.
 *
 * Schedule: 0 8 * * * (8 AM daily)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { bufferService } from '@/lib/services/buffer.service'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import { logger } from '@/lib/logger'
import { withCronAuth } from '@/lib/api/middleware/cron-auth'

interface PostToSync {
  id: number
  buffer_update_id: string
  platform: string
  account_id: number
  access_token_encrypted: string
  connection_status: string
}

export const GET = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting post metrics sync cron')

  try {
    // Find published posts with buffer_update_id that need analytics sync
    // Either never synced (analytics_synced_at IS NULL) or not synced in last 24 hours
    const postsResult = await query<PostToSync>(`
      SELECT
        sp.id,
        sp.buffer_update_id,
        sp.platform,
        sp.account_id,
        sa.access_token_encrypted,
        sa.connection_status
      FROM scheduled_posts sp
      INNER JOIN social_accounts sa ON sp.account_id = sa.id
      WHERE sp.status = 'published'
        AND sp.buffer_update_id IS NOT NULL
        AND sa.connection_status = 'connected'
        AND sa.access_token_encrypted IS NOT NULL
        AND (
          sp.analytics_synced_at IS NULL
          OR sp.analytics_synced_at < NOW() - INTERVAL '24 hours'
        )
      ORDER BY sp.published_at DESC NULLS LAST
      LIMIT 50
    `)

    const posts = postsResult.rows
    logger.info(`Found ${posts.length} posts to sync metrics for`)

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts need metrics sync',
        synced: 0,
        timestamp: new Date().toISOString(),
      })
    }

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Group posts by access token to avoid redundant API calls with the same credentials
    for (const post of posts) {
      try {
        const metrics = await bufferService.getUpdateInteractions(
          post.access_token_encrypted,
          post.buffer_update_id
        )

        await query(`
          UPDATE scheduled_posts SET
            impressions = $1,
            engagement = $2,
            clicks = $3,
            shares = $4,
            analytics_synced_at = NOW(),
            updated_at = NOW()
          WHERE id = $5
        `, [metrics.impressions, metrics.engagement, metrics.clicks, metrics.shares, post.id])

        results.synced++
        logger.info(`Synced metrics for post ${post.id}`, {
          platform: post.platform,
          impressions: metrics.impressions,
          engagement: metrics.engagement,
          clicks: metrics.clicks,
          shares: metrics.shares,
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.failed++
        results.errors.push(`Post ${post.id}: ${errorMessage}`)
        logger.error(`Failed to sync metrics for post ${post.id}`, {
          error: errorMessage,
          platform: post.platform,
          bufferUpdateId: post.buffer_update_id,
        })
      }
    }

    logger.info('Post metrics sync cron complete', results)

    // After syncing metrics, categorize any uncategorized posts
    // This ensures benchmark data by content_type stays useful
    let categorization = { categorized: 0, errors: 0 }
    try {
      categorization = await socialIntelligenceService.categorizeUncategorizedPosts()
    } catch (error) {
      logger.warn('Post categorization step failed (non-blocking)', { error })
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced} posts, ${results.failed} failed. Categorized ${categorization.categorized} posts.`,
      results,
      categorization,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to run post metrics sync cron', { error: errorMessage })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
})

// Also support POST for manual triggering
export const POST = GET
