/**
 * Cron: Weekly Marketing Report
 *
 * Runs Monday 8 AM Pacific (16:00 UTC) to compile and send a
 * weekly marketing performance summary with AI-generated recommendations.
 *
 * Schedule: 0 16 * * 1 (4 PM UTC Monday = 8 AM PST Monday)
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'

// ---------- Types ----------

interface PostMetrics {
  total_posts: number
  total_engagement: number
  total_impressions: number
  total_clicks: number
}

interface TopPost {
  id: number
  platform: string
  content: string
  published_at: string
  engagement: number
  impressions: number
  clicks: number
}

interface PlatformActivity {
  platform: string
  post_count: number
}

interface SuggestionMetrics {
  generated: number
  accepted: number
}

interface WeeklyData {
  periodStart: string
  periodEnd: string
  metrics: PostMetrics
  topPost: TopPost | null
  platformActivity: PlatformActivity[]
  contentGaps: string[]
  suggestions: SuggestionMetrics
}

// ---------- Data Gathering ----------

async function gatherWeeklyData(): Promise<WeeklyData> {
  // Calculate last Monday to Sunday (the completed week)
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon
  // Go back to the previous Monday
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1 + 7
  const periodStart = new Date(now)
  periodStart.setUTCDate(now.getUTCDate() - daysBack)
  periodStart.setUTCHours(0, 0, 0, 0)

  const periodEnd = new Date(periodStart)
  periodEnd.setUTCDate(periodStart.getUTCDate() + 6)
  periodEnd.setUTCHours(23, 59, 59, 999)

  const startISO = periodStart.toISOString()
  const endISO = periodEnd.toISOString()

  // 1. Aggregate post metrics for the period
  const metricsResult = await query<PostMetrics>(`
    SELECT
      COUNT(*)::int AS total_posts,
      COALESCE(SUM(engagement), 0)::int AS total_engagement,
      COALESCE(SUM(impressions), 0)::int AS total_impressions,
      COALESCE(SUM(clicks), 0)::int AS total_clicks
    FROM scheduled_posts
    WHERE status = 'published'
      AND published_at >= $1
      AND published_at <= $2
  `, [startISO, endISO])

  const metrics = metricsResult.rows[0]

  // 2. Top performing post (highest engagement)
  const topPostResult = await query<TopPost>(`
    SELECT id, platform, content, published_at,
           engagement, impressions, clicks
    FROM scheduled_posts
    WHERE status = 'published'
      AND published_at >= $1
      AND published_at <= $2
    ORDER BY engagement DESC
    LIMIT 1
  `, [startISO, endISO])

  const topPost = topPostResult.rows[0] || null

  // 3. Platform activity breakdown
  const platformResult = await query<PlatformActivity>(`
    SELECT platform, COUNT(*)::int AS post_count
    FROM scheduled_posts
    WHERE status = 'published'
      AND published_at >= $1
      AND published_at <= $2
    GROUP BY platform
    ORDER BY post_count DESC
  `, [startISO, endISO])

  // 4. Find content gaps (platforms with zero posts)
  const allPlatforms = ['instagram', 'facebook', 'linkedin']
  const activePlatforms = platformResult.rows.map(r => r.platform)
  const contentGaps = allPlatforms.filter(p => !activePlatforms.includes(p))

  // 5. Content suggestions generated vs accepted this period
  const suggestionsResult = await query<SuggestionMetrics>(`
    SELECT
      COUNT(*)::int AS generated,
      COUNT(*) FILTER (WHERE status IN ('accepted', 'modified'))::int AS accepted
    FROM content_suggestions
    WHERE suggestion_date >= $1::date
      AND suggestion_date <= $2::date
  `, [startISO, endISO])

  const suggestions = suggestionsResult.rows[0]

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    metrics,
    topPost,
    platformActivity: platformResult.rows,
    contentGaps,
    suggestions,
  }
}

// ---------- AI Summary ----------

async function generateAISummary(data: WeeklyData): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not configured — skipping AI summary')
    return 'AI summary unavailable (API key not configured).'
  }

  const client = new Anthropic({ apiKey })

  const prompt = `You are a marketing analyst for Walla Walla Travel, a wine tourism destination management company in Walla Walla, Washington. Write a concise weekly marketing report summary with actionable recommendations.

Period: ${data.periodStart} to ${data.periodEnd}

Performance Data:
- Posts published: ${data.metrics.total_posts}
- Total impressions: ${data.metrics.total_impressions.toLocaleString()}
- Total engagement: ${data.metrics.total_engagement.toLocaleString()}
- Total clicks: ${data.metrics.total_clicks.toLocaleString()}
- Engagement rate: ${data.metrics.total_impressions > 0 ? ((data.metrics.total_engagement / data.metrics.total_impressions) * 100).toFixed(2) : '0'}%

Platform breakdown: ${data.platformActivity.map(p => `${p.platform}: ${p.post_count} posts`).join(', ') || 'No posts'}
Content gaps (platforms with no posts): ${data.contentGaps.length > 0 ? data.contentGaps.join(', ') : 'None — all platforms covered'}

Top performing post: ${data.topPost ? `[${data.topPost.platform}] "${data.topPost.content.substring(0, 120)}..." (${data.topPost.engagement} engagements, ${data.topPost.impressions} impressions)` : 'No published posts this period'}

AI suggestions: ${data.suggestions.generated} generated, ${data.suggestions.accepted} accepted (${data.suggestions.generated > 0 ? Math.round((data.suggestions.accepted / data.suggestions.generated) * 100) : 0}% acceptance rate)

Write the summary in 3 sections:
1. **Performance Overview** (2-3 sentences summarizing the week)
2. **Key Insights** (3-4 bullet points about what worked, what didn't)
3. **Recommendations for Next Week** (3-4 actionable bullet points)

Keep it professional, concise, and focused on actionable insights. Do not use markdown headers — just use the section labels as plain text followed by a colon.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  return textBlock?.text || 'Unable to generate summary.'
}

// ---------- Email HTML Builder ----------

function buildReportEmail(data: WeeklyData, aiSummary: string): string {
  const engagementRate = data.metrics.total_impressions > 0
    ? ((data.metrics.total_engagement / data.metrics.total_impressions) * 100).toFixed(2)
    : '0.00'

  const topPostHtml = data.topPost
    ? `
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Top Performing Post</div>
        <div style="font-size: 12px; color: #78350f; margin-bottom: 4px; font-weight: 600;">${data.topPost.platform.toUpperCase()} &middot; ${new Date(data.topPost.published_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        <div style="font-size: 14px; color: #1e293b; line-height: 1.5; margin-bottom: 12px;">${data.topPost.content.substring(0, 200)}${data.topPost.content.length > 200 ? '...' : ''}</div>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #64748b;">
          <span>${data.topPost.engagement.toLocaleString()} engagements</span> &middot;
          <span>${data.topPost.impressions.toLocaleString()} impressions</span> &middot;
          <span>${data.topPost.clicks.toLocaleString()} clicks</span>
        </div>
      </div>`
    : `
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; color: #64748b; font-size: 14px;">
        No published posts this period.
      </div>`

  const platformRows = data.platformActivity.length > 0
    ? data.platformActivity.map(p => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-transform: capitalize;">${p.platform}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: right;">${p.post_count}</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 14px;">No platform data</td></tr>`

  const gapsBadges = data.contentGaps.length > 0
    ? data.contentGaps.map(g => `<span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 12px; padding: 4px 10px; border-radius: 12px; margin: 2px 4px; text-transform: capitalize;">${g}</span>`).join('')
    : `<span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; padding: 4px 10px; border-radius: 12px;">All platforms covered</span>`

  // Convert AI summary line breaks to HTML
  const aiSummaryHtml = aiSummary
    .replace(/\n\n/g, '</p><p style="margin: 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">')
    .replace(/\n- /g, '<br>&bull; ')
    .replace(/\n\* /g, '<br>&bull; ')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">

    <!-- Header -->
    <div style="background: #8B1538; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: bold;">Weekly Marketing Report</h1>
      <p style="color: #f1d4db; margin: 0; font-size: 14px;">Walla Walla Travel &middot; ${data.periodStart} to ${data.periodEnd}</p>
    </div>

    <!-- Key Metrics Cards -->
    <div style="padding: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${data.metrics.total_posts}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Posts Published</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${data.metrics.total_engagement.toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Engagements</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${data.metrics.total_impressions.toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Impressions</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${data.metrics.total_clicks.toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Clicks</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${engagementRate}%</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Engagement Rate</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #8B1538;">${data.suggestions.accepted}/${data.suggestions.generated}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Suggestions Accepted</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Platform Breakdown -->
    <div style="padding: 0 24px 16px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0;">Platform Breakdown</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Platform</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Posts</th>
          </tr>
        </thead>
        <tbody>
          ${platformRows}
        </tbody>
      </table>
    </div>

    <!-- Content Gaps -->
    <div style="padding: 0 24px 16px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0;">Content Gaps</h2>
      <div>${gapsBadges}</div>
    </div>

    <!-- Top Post -->
    <div style="padding: 0 24px 16px;">
      ${topPostHtml}
    </div>

    <!-- AI Recommendations -->
    <div style="padding: 0 24px 24px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0;">AI Analysis &amp; Recommendations</h2>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">${aiSummaryHtml}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">This report was automatically generated by Walla Walla Travel marketing automation.</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Report date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>

  </div>
</body>
</html>`
}

// ---------- Route Handler ----------

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('Starting weekly marketing report generation')

  try {
    // 1. Gather data from the last 7 days
    const weeklyData = await gatherWeeklyData()

    logger.info('Weekly data gathered', {
      period: `${weeklyData.periodStart} to ${weeklyData.periodEnd}`,
      totalPosts: weeklyData.metrics.total_posts,
      totalEngagement: weeklyData.metrics.total_engagement,
    })

    // 2. Generate AI narrative summary
    const aiSummary = await generateAISummary(weeklyData)

    // 3. Build email HTML
    const emailHtml = buildReportEmail(weeklyData, aiSummary)

    // 4. Send the report email
    const adminEmail = process.env.ADMIN_EMAIL || 'info@wallawalla.travel'
    const emailSent = await sendEmail({
      to: adminEmail,
      subject: `Weekly Marketing Report: ${weeklyData.periodStart} - ${weeklyData.periodEnd}`,
      html: emailHtml,
    })

    // 5. Log the report in marketing_report_logs
    await query(`
      INSERT INTO marketing_report_logs (report_type, report_date, report_content, metrics, sent_to, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'weekly_summary',
      weeklyData.periodStart,
      aiSummary,
      JSON.stringify({
        total_posts: weeklyData.metrics.total_posts,
        total_engagement: weeklyData.metrics.total_engagement,
        total_impressions: weeklyData.metrics.total_impressions,
        total_clicks: weeklyData.metrics.total_clicks,
        suggestions_generated: weeklyData.suggestions.generated,
        suggestions_accepted: weeklyData.suggestions.accepted,
        content_gaps: weeklyData.contentGaps,
        top_post_id: weeklyData.topPost?.id || null,
      }),
      [adminEmail],
      emailSent ? new Date().toISOString() : null,
    ])

    logger.info('Weekly marketing report completed', {
      emailSent,
      recipient: adminEmail,
      period: `${weeklyData.periodStart} to ${weeklyData.periodEnd}`,
    })

    return NextResponse.json({
      success: true,
      message: 'Weekly marketing report generated and sent',
      period: {
        start: weeklyData.periodStart,
        end: weeklyData.periodEnd,
      },
      metrics: weeklyData.metrics,
      emailSent,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate weekly marketing report', { error: errorMessage })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export const POST = GET
