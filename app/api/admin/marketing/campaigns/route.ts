import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSessionFromRequest } from '@/lib/auth/session'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey })
}

// GET - List campaigns with filters
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let queryText = `
    SELECT
      mc.*,
      (SELECT COUNT(*) FROM campaign_items ci WHERE ci.campaign_id = mc.id) AS items_count,
      (SELECT COUNT(*) FROM campaign_items ci WHERE ci.campaign_id = mc.id AND ci.status = 'published') AS published_count,
      u.name AS created_by_name
    FROM marketing_campaigns mc
    LEFT JOIN users u ON mc.created_by = u.id
    WHERE 1=1
  `
  const params: (string | number)[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND mc.status = $${paramIndex++}`
    params.push(status)
  }

  if (startDate) {
    queryText += ` AND mc.start_date >= $${paramIndex++}`
    params.push(startDate)
  }

  if (endDate) {
    queryText += ` AND mc.end_date <= $${paramIndex++}`
    params.push(endDate)
  }

  queryText += ` ORDER BY mc.created_at DESC`

  const result = await query(queryText, params)

  return NextResponse.json({
    campaigns: result.rows,
    total: result.rows.length,
  })
});

// POST - Create campaign with AI-generated content items
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await request.json()
  const { name, theme, channels, startDate, endDate, targetAudience } = body

  if (!name || !theme || !channels || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json(
      { error: 'Name, theme, and at least one channel are required' },
      { status: 400 }
    )
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Start date and end date are required' },
      { status: 400 }
    )
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end <= start) {
    return NextResponse.json(
      { error: 'End date must be after start date' },
      { status: 400 }
    )
  }

  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (dayCount > 31) {
    return NextResponse.json(
      { error: 'Campaign cannot exceed 31 days' },
      { status: 400 }
    )
  }

  // Create the campaign
  const campaignResult = await query(`
    INSERT INTO marketing_campaigns (
      name, description, theme, status, start_date, end_date,
      channels, target_audience, auto_generated, created_by,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'draft', $4, $5, $6, $7, true, $8, NOW(), NOW()
    ) RETURNING *
  `, [
    name,
    `AI-generated campaign: ${theme}`,
    theme,
    startDate,
    endDate,
    channels,
    targetAudience || null,
    session.user.id || null,
  ])

  const campaign = campaignResult.rows[0]

  // Generate content items with AI
  const socialChannels = channels.filter((c: string) => ['instagram', 'facebook', 'linkedin'].includes(c))
  const hasEmail = channels.includes('email')

  const contentItems: Array<{
    channel: string
    item_type: string
    content: string
    subject_line: string | null
    scheduled_for: string
  }> = []

  try {
    const anthropic = getAnthropicClient()

    // Gather performance intelligence for smarter campaign content
    const [benchmarks, pastCampaigns] = await Promise.all([
      socialIntelligenceService.getPerformanceBenchmarks(),
      query<{ name: string; theme: string; performance: string }>(`
        SELECT name, theme, performance::text
        FROM marketing_campaigns
        WHERE status = 'completed'
          AND performance != '{}'::jsonb
        ORDER BY end_date DESC
        LIMIT 3
      `).then(r => r.rows).catch(() => []),
    ])

    let campaignIntelligence = ''
    if (benchmarks.byContentType.length > 0) {
      campaignIntelligence += `\nPERFORMANCE DATA (use this to create better-performing content):
Content type benchmarks: ${benchmarks.byContentType.map(b => `${b.dimension_value}: avg ${b.avg_engagement} engagement`).join(', ')}
Platform benchmarks: ${benchmarks.byPlatform.map(b => `${b.dimension_value}: avg ${b.avg_engagement} engagement`).join(', ')}\n`
    }
    if (benchmarks.byLengthBucket.length > 0) {
      campaignIntelligence += `Optimal content length: ${benchmarks.byLengthBucket[0].dimension_value} performs best (avg ${benchmarks.byLengthBucket[0].avg_engagement} engagement)\n`
    }
    if (pastCampaigns.length > 0) {
      campaignIntelligence += `\nPAST CAMPAIGN RESULTS (learn from these):
${pastCampaigns.map(c => {
  const perf = typeof c.performance === 'string' ? JSON.parse(c.performance) : c.performance
  return `- "${c.name}" (${c.theme}): ${perf.total_engagement || 0} total engagement, ${perf.avg_engagement || 0} avg per post`
}).join('\n')}\n`
    }

    // Generate social posts for each channel for each day
    if (socialChannels.length > 0) {
      const socialPrompt = `You are a social media marketing expert for Walla Walla wine country tourism.

Generate social media posts for a marketing campaign.

Campaign Details:
- Name: ${name}
- Theme: ${theme}
- Target Audience: ${targetAudience || 'Wine tourists and travel enthusiasts'}
- Duration: ${dayCount} days (${startDate} to ${endDate})
- Channels: ${socialChannels.join(', ')}

IMPORTANT BUSINESS RULES:
- Walla Walla Travel is a destination management company
- Tours use Mercedes Sprinter vans only (no other vehicles)
- 3 wineries per tour is the sweet spot (max 4, never more)
- Tasting fees are NEVER included in tour pricing
- Standard tour is 6 hours
- Do not claim specific years of experience
${campaignIntelligence}
Generate exactly ${socialChannels.length * dayCount} posts total (one per channel per day).

Respond with a JSON array. Each item must have:
- "channel": one of ${JSON.stringify(socialChannels)}
- "day": day number (1 to ${dayCount})
- "content": the post text (appropriate length for the channel)
- "hashtags": array of 3-5 relevant hashtags

Keep posts varied, engaging, and authentic. Use emojis naturally but don't overdo it.
For Instagram: visual/story-driven, up to 2200 chars
For Facebook: conversational, community-focused, up to 500 chars
For LinkedIn: professional, up to 700 chars
Match the content length and style that historically gets the best engagement.

Return ONLY the JSON array, no other text.`

      const socialResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: socialPrompt }],
        max_tokens: 4000,
      })

      const socialText = socialResponse.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('')

      let socialPosts: Array<{
        channel: string
        day: number
        content: string
        hashtags?: string[]
      }> = []

      try {
        const jsonMatch = socialText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          socialPosts = JSON.parse(jsonMatch[0])
        }
      } catch (parseErr) {
        logger.warn('Failed to parse social posts JSON, creating fallback', { parseErr })
      }

      for (const post of socialPosts) {
        const postDate = new Date(start)
        postDate.setDate(postDate.getDate() + (post.day - 1))

        const hashtags = post.hashtags ? post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : ''
        const fullContent = hashtags ? `${post.content}\n\n${hashtags}` : post.content

        contentItems.push({
          channel: post.channel,
          item_type: 'social_post',
          content: fullContent,
          subject_line: null,
          scheduled_for: postDate.toISOString(),
        })
      }
    }

    // Generate email content
    if (hasEmail) {
      const emailPrompt = `You are an email marketing expert for Walla Walla wine country tourism.

Generate a promotional email for this campaign:
- Campaign Name: ${name}
- Theme: ${theme}
- Target Audience: ${targetAudience || 'Wine tourists and travel enthusiasts'}

IMPORTANT BUSINESS RULES:
- Walla Walla Travel is a destination management company
- Tours use Mercedes Sprinter vans only
- 3 wineries per tour is the sweet spot (max 4)
- Tasting fees are NEVER included in tour pricing
- Standard tour is 6 hours

Generate a single email with:
- "subject": compelling subject line (under 60 chars)
- "preview": preview text (under 100 chars)
- "body": the email body in plain text with clear sections

Return ONLY JSON object, no other text.`

      const emailResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: emailPrompt }],
        max_tokens: 2000,
      })

      const emailText = emailResponse.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('')

      try {
        const jsonMatch = emailText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const emailData = JSON.parse(jsonMatch[0])
          contentItems.push({
            channel: 'email',
            item_type: 'email_blast',
            content: emailData.body || emailText,
            subject_line: emailData.subject || `${name} - ${theme}`,
            scheduled_for: start.toISOString(),
          })
        }
      } catch {
        contentItems.push({
          channel: 'email',
          item_type: 'email_blast',
          content: emailText,
          subject_line: `${name} - ${theme}`,
          scheduled_for: start.toISOString(),
        })
      }
    }

    // Insert all content items
    for (const item of contentItems) {
      await query(`
        INSERT INTO campaign_items (
          campaign_id, channel, item_type, content,
          subject_line, scheduled_for, status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', NOW(), NOW())
      `, [
        campaign.id,
        item.channel,
        item.item_type,
        item.content,
        item.subject_line,
        item.scheduled_for,
      ])
    }

    logger.info('Campaign created with AI-generated content', {
      campaignId: campaign.id,
      itemsCreated: contentItems.length,
      channels,
    })

  } catch (aiError) {
    logger.error('AI content generation failed for campaign', { aiError, campaignId: campaign.id })
    // Campaign is still created, just without items — user can add manually
  }

  // Fetch the campaign with items count
  const finalResult = await query(`
    SELECT mc.*,
      (SELECT COUNT(*) FROM campaign_items ci WHERE ci.campaign_id = mc.id) AS items_count
    FROM marketing_campaigns mc
    WHERE mc.id = $1
  `, [campaign.id])

  return NextResponse.json({
    success: true,
    campaign: finalResult.rows[0],
    itemsGenerated: contentItems.length,
  })
});
