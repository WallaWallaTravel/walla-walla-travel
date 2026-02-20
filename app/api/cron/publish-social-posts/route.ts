/**
 * Cron: Publish Scheduled Social Posts
 *
 * Runs every 15 minutes to check for posts ready to be published.
 * Sends them to Buffer for actual posting to social platforms.
 *
 * Schedule: every 15 minutes (cron: 0/15 * * * *)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { bufferService, BufferCreateUpdatePayload } from '@/lib/services/buffer.service'
import { withCronAuth } from '@/lib/api/middleware/cron-auth'
import { logger } from '@/lib/logger'

interface PostToPublish {
  id: number
  content: string
  media_urls: string[]
  hashtags: string[]
  platform: string
  scheduled_for: string
  account_id: number | null
  buffer_profile_id: string | null
  access_token_encrypted: string | null
  connection_status: string | null
}

export const GET = withCronAuth(async (_request: NextRequest) => {
  logger.info('Starting social post publishing cron')

  // Find posts ready to publish
  const postsResult = await query<PostToPublish>(`
    SELECT
      sp.id,
      sp.content,
      sp.media_urls,
      sp.hashtags,
      sp.platform,
      sp.scheduled_for,
      sp.account_id,
      sa.buffer_profile_id,
      sa.access_token_encrypted,
      sa.connection_status
    FROM scheduled_posts sp
    LEFT JOIN social_accounts sa ON sp.account_id = sa.id
    WHERE sp.status = 'scheduled'
      AND sp.scheduled_for <= NOW()
      AND sp.retry_count < 3
    ORDER BY sp.scheduled_for ASC
    LIMIT 20
  `)

  const posts = postsResult.rows
  logger.info(`Found ${posts.length} posts to publish`)

  const results = {
    published: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const post of posts) {
    try {
      // Mark as publishing
      await query(
        'UPDATE scheduled_posts SET status = $1, updated_at = NOW() WHERE id = $2',
        ['publishing', post.id]
      )

      // Check if we have a valid Buffer connection
      if (!post.buffer_profile_id || !post.access_token_encrypted) {
        // No Buffer connection - mark as failed with helpful message
        await query(`
          UPDATE scheduled_posts SET
            status = 'failed',
            error_message = $1,
            retry_count = retry_count + 1,
            updated_at = NOW()
          WHERE id = $2
        `, ['No Buffer account connected for this platform. Connect Buffer in Marketing Settings.', post.id])

        results.skipped++
        logger.warn(`Post ${post.id}: No Buffer connection`, { platform: post.platform })
        continue
      }

      // Check connection status
      if (post.connection_status !== 'connected') {
        await query(`
          UPDATE scheduled_posts SET
            status = 'failed',
            error_message = $1,
            retry_count = retry_count + 1,
            updated_at = NOW()
          WHERE id = $2
        `, [`Buffer connection status: ${post.connection_status}. Please reconnect.`, post.id])

        results.skipped++
        continue
      }

      // Build content with hashtags
      const contentWithHashtags = post.hashtags?.length > 0
        ? `${post.content}\n\n${post.hashtags.map(t => `#${t}`).join(' ')}`
        : post.content

      // Create Buffer update
      const payload: BufferCreateUpdatePayload = {
        profile_ids: [post.buffer_profile_id],
        text: contentWithHashtags,
        now: true, // Post immediately since we're past scheduled time
      }

      // Add media if available
      if (post.media_urls?.length > 0) {
        payload.media = {
          photo: post.media_urls[0], // Buffer only supports one image per update in basic API
        }
      }

      const update = await bufferService.createUpdate(post.access_token_encrypted, payload)

      // Mark as published
      await query(`
        UPDATE scheduled_posts SET
          status = 'published',
          buffer_post_id = $1,
          buffer_update_id = $1,
          published_at = NOW(),
          error_message = NULL,
          updated_at = NOW()
        WHERE id = $2
      `, [update.id, post.id])

      results.published++
      logger.info(`Post ${post.id} published to Buffer`, { bufferId: update.id, platform: post.platform })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Update post with error
      await query(`
        UPDATE scheduled_posts SET
          status = 'failed',
          error_message = $1,
          retry_count = retry_count + 1,
          updated_at = NOW()
        WHERE id = $2
      `, [errorMessage.substring(0, 500), post.id])

      results.failed++
      results.errors.push(`Post ${post.id}: ${errorMessage}`)
      logger.error(`Failed to publish post ${post.id}`, { error: errorMessage })
    }
  }

  logger.info('Social post publishing cron complete', results)

  return NextResponse.json({
    success: true,
    message: `Published ${results.published}, failed ${results.failed}, skipped ${results.skipped}`,
    results,
    timestamp: new Date().toISOString(),
  })
})

// Also support POST for manual triggering
export const POST = GET
