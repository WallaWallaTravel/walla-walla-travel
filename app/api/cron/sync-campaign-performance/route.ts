/**
 * Cron: Sync Campaign Performance
 *
 * Runs daily to aggregate performance metrics from scheduled_posts back into
 * campaign_items and marketing_campaigns JSONB performance fields.
 * Turns campaigns from fire-and-forget into tracked, measurable efforts.
 *
 * Schedule: 0 17 * * * (5 PM UTC = 9 AM PST, after post metrics sync)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

interface CampaignToSync {
  id: number
  name: string
  start_date: string
  end_date: string
  status: string
}

interface ItemWithMetrics {
  id: number
  campaign_id: number
  channel: string
  scheduled_post_id: number | null
  engagement: number | null
  impressions: number | null
  clicks: number | null
  shares: number | null
  post_status: string | null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting campaign performance sync')

  try {
    // Find campaigns that are scheduled, active, or completed (not draft/cancelled)
    const campaignsResult = await query<CampaignToSync>(`
      SELECT id, name, start_date::text, end_date::text, status
      FROM marketing_campaigns
      WHERE status IN ('scheduled', 'active', 'completed')
      ORDER BY start_date DESC
      LIMIT 50
    `)

    const campaigns = campaignsResult.rows
    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No campaigns to sync',
        synced: 0,
        timestamp: new Date().toISOString(),
      })
    }

    let campaignsSynced = 0
    let itemsUpdated = 0

    for (const campaign of campaigns) {
      // Get all social post items for this campaign that have linked scheduled_posts
      const itemsResult = await query<ItemWithMetrics>(`
        SELECT
          ci.id,
          ci.campaign_id,
          ci.channel,
          ci.scheduled_post_id,
          sp.engagement,
          sp.impressions,
          sp.clicks,
          sp.shares,
          sp.status AS post_status
        FROM campaign_items ci
        LEFT JOIN scheduled_posts sp ON ci.scheduled_post_id = sp.id
        WHERE ci.campaign_id = $1
          AND ci.item_type = 'social_post'
      `, [campaign.id])

      // Update individual campaign item performance
      for (const item of itemsResult.rows) {
        if (item.scheduled_post_id && item.engagement !== null) {
          await query(`
            UPDATE campaign_items
            SET performance = $1, updated_at = NOW()
            WHERE id = $2
          `, [
            JSON.stringify({
              engagement: item.engagement || 0,
              impressions: item.impressions || 0,
              clicks: item.clicks || 0,
              shares: item.shares || 0,
              post_status: item.post_status,
              synced_at: new Date().toISOString(),
            }),
            item.id,
          ])
          itemsUpdated++
        }
      }

      // Aggregate campaign-level performance
      const publishedItems = itemsResult.rows.filter(i => i.post_status === 'published')
      const totalEngagement = publishedItems.reduce((sum, i) => sum + (i.engagement || 0), 0)
      const totalImpressions = publishedItems.reduce((sum, i) => sum + (i.impressions || 0), 0)
      const totalClicks = publishedItems.reduce((sum, i) => sum + (i.clicks || 0), 0)

      // Performance by channel
      const byChannel: Record<string, { posts: number; engagement: number; impressions: number }> = {}
      for (const item of publishedItems) {
        if (!byChannel[item.channel]) {
          byChannel[item.channel] = { posts: 0, engagement: 0, impressions: 0 }
        }
        byChannel[item.channel].posts++
        byChannel[item.channel].engagement += item.engagement || 0
        byChannel[item.channel].impressions += item.impressions || 0
      }

      const campaignPerformance = {
        total_items: itemsResult.rows.length,
        published_items: publishedItems.length,
        total_engagement: totalEngagement,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_engagement: publishedItems.length > 0 ? Math.round(totalEngagement / publishedItems.length) : 0,
        by_channel: byChannel,
        synced_at: new Date().toISOString(),
      }

      await query(`
        UPDATE marketing_campaigns
        SET performance = $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(campaignPerformance), campaign.id])

      // Auto-complete campaigns past their end date with published posts
      if (campaign.status === 'active' || campaign.status === 'scheduled') {
        const endDate = new Date(campaign.end_date)
        if (endDate < new Date() && publishedItems.length > 0) {
          await query(`
            UPDATE marketing_campaigns
            SET status = 'completed', updated_at = NOW()
            WHERE id = $1 AND status IN ('active', 'scheduled')
          `, [campaign.id])
        }
      }

      campaignsSynced++
    }

    logger.info('Campaign performance sync complete', {
      campaignsSynced,
      itemsUpdated,
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${campaignsSynced} campaigns, ${itemsUpdated} items updated`,
      campaignsSynced,
      itemsUpdated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to sync campaign performance', { error: errorMessage })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export const POST = GET
