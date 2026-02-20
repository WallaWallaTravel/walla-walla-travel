import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

// POST - Approve campaign: creates scheduled_posts from social items, marks items as scheduled
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const { id } = await params
  const campaignId = parseInt(id, 10)
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 })
  }

  // Get the campaign
  const campaignResult = await query(
    'SELECT * FROM marketing_campaigns WHERE id = $1',
    [campaignId]
  )

  if (campaignResult.rows.length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const campaign = campaignResult.rows[0]
  if (campaign.status !== 'draft') {
    return NextResponse.json(
      { error: `Campaign must be in "draft" status to approve, currently "${campaign.status}"` },
      { status: 400 }
    )
  }

  // Get all draft social post items for this campaign
  const itemsResult = await query(`
    SELECT * FROM campaign_items
    WHERE campaign_id = $1
      AND item_type = 'social_post'
      AND status = 'draft'
    ORDER BY scheduled_for ASC
  `, [campaignId])

  const socialItems = itemsResult.rows
  let scheduledCount = 0

  // Create scheduled_posts from each social campaign item
  for (const item of socialItems) {
    const postResult = await query(`
      INSERT INTO scheduled_posts (
        content, media_urls, hashtags, platform,
        scheduled_for, timezone, status,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'America/Los_Angeles', 'scheduled',
        $6, NOW(), NOW()
      ) RETURNING id
    `, [
      item.content,
      item.media_urls || [],
      [],
      item.channel,
      item.scheduled_for,
      session.user.id || null,
    ])

    const scheduledPostId = postResult.rows[0].id

    // Link campaign item to scheduled post and mark as scheduled
    await query(`
      UPDATE campaign_items
      SET scheduled_post_id = $1, status = 'scheduled', updated_at = NOW()
      WHERE id = $2
    `, [scheduledPostId, item.id])

    scheduledCount++
  }

  // Mark email items as approved (they get sent through a different pipeline)
  await query(`
    UPDATE campaign_items
    SET status = 'approved', updated_at = NOW()
    WHERE campaign_id = $1
      AND item_type = 'email_blast'
      AND status = 'draft'
  `, [campaignId])

  // Update campaign status to scheduled
  await query(`
    UPDATE marketing_campaigns
    SET status = 'scheduled', updated_at = NOW()
    WHERE id = $1
  `, [campaignId])

  logger.info('Campaign approved', {
    campaignId,
    scheduledPosts: scheduledCount,
  })

  return NextResponse.json({
    success: true,
    scheduledPosts: scheduledCount,
    message: `Campaign approved. ${scheduledCount} social posts scheduled.`,
  })
});
