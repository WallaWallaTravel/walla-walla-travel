'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type MarketingCampaignListItem = {
  id: number
  name: string
  description: string | null
  theme: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  channels: string[]
  target_audience: string | null
  budget: number | null
  goals: unknown
  performance: unknown
  auto_generated: boolean | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
  items_count: number
  published_count: number
  created_by_name: string | null
}

export type EmailCampaignItem = {
  id: number
  name: string
  subject: string
  preview_text: string | null
  status: string | null
  campaign_type: string | null
  scheduled_for: string | null
  sent_at: string | null
  recipients_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export type MarketingMetrics = {
  summary: {
    leads: {
      total: number
      new: number
      qualified: number
      converted: number
      hot: number
      period_count: number
      conversion_rate: number
    }
    bookings: {
      total: number
      pending: number
      confirmed: number
      revenue: number
      period_count: number
    }
    ab_tests: {
      total: number
      active: number
      completed: number
    }
    competitors: {
      unreviewed_changes: number
      high_priority: number
    }
    suggestions: {
      pending: number
      today: number
    }
    strategies: {
      draft: number
      active: number
    }
    campaigns: {
      draft: number
    }
    social: {
      scheduled: number
      published_this_week: number
    }
  }
  trends: {
    leads_daily: Array<{ date: string; count: number }>
  }
  breakdowns: {
    lead_sources: Array<{ source: string; count: number }>
  }
  period_days: number
}

// ============================================================================
// MARKETING CAMPAIGN QUERIES (marketing_campaigns has a Prisma model)
// ============================================================================

export async function getMarketingCampaigns(filters?: {
  status?: string
  start_date?: string
  end_date?: string
}): Promise<{ campaigns: MarketingCampaignListItem[]; total: number }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { campaigns: [], total: 0 }
  }

  // marketing_campaigns has relations, but we need aggregate counts from campaign_items
  // Using raw query for the join + subquery counts
  const conditions: string[] = ['1=1']
  const params: (string | number)[] = []
  let paramIdx = 1

  if (filters?.status && filters.status !== 'all') {
    conditions.push(`mc.status = $${paramIdx++}`)
    params.push(filters.status)
  }
  if (filters?.start_date) {
    conditions.push(`mc.start_date >= $${paramIdx++}`)
    params.push(filters.start_date)
  }
  if (filters?.end_date) {
    conditions.push(`mc.end_date <= $${paramIdx++}`)
    params.push(filters.end_date)
  }

  const rows = await prisma.$queryRawUnsafe<MarketingCampaignListItem[]>(
    `SELECT
      mc.*,
      (SELECT COUNT(*)::int FROM campaign_items ci WHERE ci.campaign_id = mc.id) AS items_count,
      (SELECT COUNT(*)::int FROM campaign_items ci WHERE ci.campaign_id = mc.id AND ci.status = 'published') AS published_count,
      u.name AS created_by_name
    FROM marketing_campaigns mc
    LEFT JOIN users u ON mc.created_by = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY mc.created_at DESC`,
    ...params
  )

  return {
    campaigns: rows.map((r) => ({
      ...r,
      start_date: r.start_date ? String(r.start_date) : null,
      end_date: r.end_date ? String(r.end_date) : null,
      created_at: r.created_at ? String(r.created_at) : null,
      updated_at: r.updated_at ? String(r.updated_at) : null,
      budget: r.budget ? Number(r.budget) : null,
    })),
    total: rows.length,
  }
}

// ============================================================================
// EMAIL CAMPAIGN QUERIES (no Prisma model — raw queries)
// ============================================================================

export async function getEmailCampaigns(filters?: {
  status?: string
  campaign_type?: string
}): Promise<{
  campaigns: EmailCampaignItem[]
  stats: {
    total_sent: number
    total_opened: number
    total_clicked: number
    avg_open_rate: number
    avg_click_rate: number
  }
  total: number
}> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return {
      campaigns: [],
      stats: {
        total_sent: 0,
        total_opened: 0,
        total_clicked: 0,
        avg_open_rate: 0,
        avg_click_rate: 0,
      },
      total: 0,
    }
  }

  const conditions: string[] = ['1=1']
  const params: string[] = []
  let paramIdx = 1

  if (filters?.status && filters.status !== 'all') {
    conditions.push(`status = $${paramIdx++}`)
    params.push(filters.status)
  }
  if (filters?.campaign_type && filters.campaign_type !== 'all') {
    conditions.push(`campaign_type = $${paramIdx++}`)
    params.push(filters.campaign_type)
  }

  const rows = await prisma.$queryRawUnsafe<EmailCampaignItem[]>(
    `SELECT
      id, name, subject, preview_text,
      status, campaign_type,
      scheduled_for, sent_at,
      COALESCE(recipients_count, 0)::int AS recipients_count,
      COALESCE(opened_count, 0)::int AS opened_count,
      COALESCE(clicked_count, 0)::int AS clicked_count,
      COALESCE(bounced_count, 0)::int AS bounced_count,
      COALESCE(unsubscribed_count, 0)::int AS unsubscribed_count,
      created_by, created_at, updated_at
    FROM email_campaigns
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC`,
    ...params
  )

  // Calculate aggregate stats
  const sentCampaigns = rows.filter((c) => c.status === 'sent')
  const totalSent = sentCampaigns.reduce(
    (sum, c) => sum + (c.recipients_count || 0),
    0
  )
  const totalOpened = rows.reduce((sum, c) => sum + (c.opened_count || 0), 0)
  const totalClicked = rows.reduce((sum, c) => sum + (c.clicked_count || 0), 0)

  const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
  const avgClickRate =
    totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0

  return {
    campaigns: rows.map((r) => ({
      ...r,
      scheduled_for: r.scheduled_for ? String(r.scheduled_for) : null,
      sent_at: r.sent_at ? String(r.sent_at) : null,
      created_at: r.created_at ? String(r.created_at) : null,
      updated_at: r.updated_at ? String(r.updated_at) : null,
    })),
    stats: {
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      avg_open_rate: avgOpenRate,
      avg_click_rate: avgClickRate,
    },
    total: rows.length,
  }
}

// ============================================================================
// MARKETING DASHBOARD METRICS (mixed Prisma + raw for missing models)
// ============================================================================

export async function getMarketingMetrics(
  periodDays = 30
): Promise<MarketingMetrics> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return {
      summary: {
        leads: {
          total: 0,
          new: 0,
          qualified: 0,
          converted: 0,
          hot: 0,
          period_count: 0,
          conversion_rate: 0,
        },
        bookings: {
          total: 0,
          pending: 0,
          confirmed: 0,
          revenue: 0,
          period_count: 0,
        },
        ab_tests: { total: 0, active: 0, completed: 0 },
        competitors: { unreviewed_changes: 0, high_priority: 0 },
        suggestions: { pending: 0, today: 0 },
        strategies: { draft: 0, active: 0 },
        campaigns: { draft: 0 },
        social: { scheduled: 0, published_this_week: 0 },
      },
      trends: { leads_daily: [] },
      breakdowns: { lead_sources: [] },
      period_days: periodDays,
    }
  }

  const period = Math.max(1, Math.min(365, periodDays))

  // All queries use raw SQL since many tables have no Prisma model
  // (leads, ab_tests, email_campaigns, etc.)
  const [
    leadsResult,
    bookingsResult,
    abTestsResult,
    competitorResult,
    suggestionsResult,
    strategiesResult,
    campaignsResult,
    socialResult,
    leadTrendResult,
    sourceBreakdownResult,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      total_leads: number
      new_leads: number
      qualified_leads: number
      converted_leads: number
      hot_leads: number
      leads_this_period: number
    }>>(
      `SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE status = 'new')::int AS new_leads,
        COUNT(*) FILTER (WHERE status = 'qualified')::int AS qualified_leads,
        COUNT(*) FILTER (WHERE status = 'won')::int AS converted_leads,
        COUNT(*) FILTER (WHERE temperature = 'hot')::int AS hot_leads,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day' * $1)::int AS leads_this_period
      FROM leads`,
      period
    ).catch(() => [{
      total_leads: 0, new_leads: 0, qualified_leads: 0,
      converted_leads: 0, hot_leads: 0, leads_this_period: 0,
    }]),

    prisma.$queryRawUnsafe<Array<{
      total_bookings: number
      pending_bookings: number
      confirmed_bookings: number
      total_revenue: number
      bookings_this_period: number
    }>>(
      `SELECT
        COUNT(*)::int AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_bookings,
        COALESCE(SUM(total_price), 0)::float AS total_revenue,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day' * $1)::int AS bookings_this_period
      FROM bookings`,
      period
    ).catch(() => [{
      total_bookings: 0, pending_bookings: 0, confirmed_bookings: 0,
      total_revenue: 0, bookings_this_period: 0,
    }]),

    prisma.$queryRawUnsafe<Array<{
      total_tests: number
      active_tests: number
      completed_tests: number
    }>>(
      `SELECT
        COUNT(*)::int AS total_tests,
        COUNT(*) FILTER (WHERE status = 'running')::int AS active_tests,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tests
      FROM ab_tests`
    ).catch(() => [{ total_tests: 0, active_tests: 0, completed_tests: 0 }]),

    prisma.competitor_changes
      .groupBy({
        by: ['status', 'significance'],
        _count: true,
      })
      .then((groups) => {
        const unreviewed = groups
          .filter((g) => g.status === 'new')
          .reduce((sum, g) => sum + g._count, 0)
        const highPriority = groups
          .filter((g) => g.status === 'new' && g.significance === 'high')
          .reduce((sum, g) => sum + g._count, 0)
        return { unreviewed_changes: unreviewed, high_priority: highPriority }
      })
      .catch(() => ({ unreviewed_changes: 0, high_priority: 0 })),

    prisma.content_suggestions
      .groupBy({
        by: ['status'],
        _count: true,
      })
      .then((groups) => {
        const pending = groups
          .filter((g) => g.status === 'pending')
          .reduce((sum, g) => sum + g._count, 0)
        return { pending, today: 0 }
      })
      .catch(() => ({ pending: 0, today: 0 })),

    prisma.marketing_strategies
      .groupBy({
        by: ['status'],
        _count: true,
      })
      .then((groups) => {
        const draft = groups
          .filter((g) => g.status === 'draft')
          .reduce((sum, g) => sum + g._count, 0)
        const active = groups
          .filter((g) => g.status === 'active')
          .reduce((sum, g) => sum + g._count, 0)
        return { draft, active }
      })
      .catch(() => ({ draft: 0, active: 0 })),

    prisma.marketing_campaigns
      .count({ where: { status: 'draft' } })
      .then((count) => ({ draft: count }))
      .catch(() => ({ draft: 0 })),

    prisma.scheduled_posts
      .groupBy({
        by: ['status'],
        _count: true,
      })
      .then((groups) => {
        const scheduled = groups
          .filter((g) => g.status === 'scheduled')
          .reduce((sum, g) => sum + g._count, 0)
        return { scheduled, published_this_week: 0 }
      })
      .catch(() => ({ scheduled: 0, published_this_week: 0 })),

    prisma.$queryRawUnsafe<Array<{ date: string; count: number }>>(
      `SELECT
        DATE(created_at)::text AS date,
        COUNT(*)::int AS count
      FROM leads
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date`
    ).catch(() => []),

    prisma.$queryRawUnsafe<Array<{ source: string; count: number }>>(
      `SELECT
        source,
        COUNT(*)::int AS count
      FROM leads
      GROUP BY source
      ORDER BY count DESC
      LIMIT 5`
    ).catch(() => []),
  ])

  const leads = leadsResult[0] || {
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    converted_leads: 0,
    hot_leads: 0,
    leads_this_period: 0,
  }

  const totalLeads = leads.total_leads || 1
  const convertedLeads = leads.converted_leads || 0
  const conversionRate = parseFloat(
    ((convertedLeads / totalLeads) * 100).toFixed(1)
  )

  const bookings = bookingsResult[0] || {
    total_bookings: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    total_revenue: 0,
    bookings_this_period: 0,
  }

  const abTests = abTestsResult[0] || {
    total_tests: 0,
    active_tests: 0,
    completed_tests: 0,
  }

  return {
    summary: {
      leads: {
        total: leads.total_leads,
        new: leads.new_leads,
        qualified: leads.qualified_leads,
        converted: convertedLeads,
        hot: leads.hot_leads,
        period_count: leads.leads_this_period,
        conversion_rate: conversionRate,
      },
      bookings: {
        total: bookings.total_bookings,
        pending: bookings.pending_bookings,
        confirmed: bookings.confirmed_bookings,
        revenue: bookings.total_revenue,
        period_count: bookings.bookings_this_period,
      },
      ab_tests: {
        total: abTests.total_tests,
        active: abTests.active_tests,
        completed: abTests.completed_tests,
      },
      competitors: competitorResult,
      suggestions: suggestionsResult,
      strategies: strategiesResult,
      campaigns: campaignsResult,
      social: socialResult,
    },
    trends: {
      leads_daily: leadTrendResult.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    },
    breakdowns: {
      lead_sources: sourceBreakdownResult.map((r) => ({
        source: String(r.source),
        count: Number(r.count),
      })),
    },
    period_days: period,
  }
}
