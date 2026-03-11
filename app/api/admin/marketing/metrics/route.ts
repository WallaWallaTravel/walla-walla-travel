import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'

type LeadRow = { total_leads: bigint; new_leads: bigint; qualified_leads: bigint; converted_leads: bigint; hot_leads: bigint; leads_this_period: bigint }
type BookingRow = { total_bookings: bigint; pending_bookings: bigint; confirmed_bookings: bigint; total_revenue: number; bookings_this_period: bigint }
type AbTestRow = { total_tests: bigint; active_tests: bigint; completed_tests: bigint }
type CompetitorRow = { unreviewed_changes: bigint; high_priority_changes: bigint }
type SuggestionRow = { pending: bigint; today: bigint }
type StrategyRow = { draft: bigint; active: bigint }
type CampaignRow = { draft: bigint }
type SocialRow = { scheduled_posts: bigint; published_this_week: bigint }
type TrendRow = { date: Date; count: bigint }
type SourceRow = { source: string; count: bigint }

// GET - Fetch marketing metrics
async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '30' // days
  const periodDays = parseInt(period)

  // Get lead metrics
  const leadsRows = await prisma.$queryRawUnsafe<LeadRow[]>(`
    SELECT
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE status = 'new') as new_leads,
      COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
      COUNT(*) FILTER (WHERE status = 'won') as converted_leads,
      COUNT(*) FILTER (WHERE temperature = 'hot') as hot_leads,
      COUNT(*) FILTER (WHERE created_at > NOW() - make_interval(days => $1)) as leads_this_period
    FROM leads
  `, periodDays).catch(() => [] as LeadRow[])

  // Get booking inquiry metrics (if bookings table exists)
  const bookingsRows = await prisma.$queryRawUnsafe<BookingRow[]>(`
    SELECT
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
      COALESCE(SUM(total_price), 0) as total_revenue,
      COUNT(*) FILTER (WHERE created_at > NOW() - make_interval(days => $1)) as bookings_this_period
    FROM bookings
  `, periodDays).catch(() => [] as BookingRow[])

  // Get A/B test metrics
  const abTestsRows = await prisma.$queryRawUnsafe<AbTestRow[]>(`
    SELECT
      COUNT(*) as total_tests,
      COUNT(*) FILTER (WHERE status = 'running') as active_tests,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_tests
    FROM ab_tests
  `).catch(() => [] as AbTestRow[])

  // Get competitor change metrics
  const competitorRows = await prisma.$queryRawUnsafe<CompetitorRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new') as unreviewed_changes,
      COUNT(*) FILTER (WHERE significance = 'high' AND status = 'new') as high_priority_changes
    FROM competitor_changes
  `).catch(() => [] as CompetitorRow[])

  // Get content suggestion metrics
  const suggestionsRows = await prisma.$queryRawUnsafe<SuggestionRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'pending' AND suggestion_date = CURRENT_DATE) as today
    FROM content_suggestions
  `).catch(() => [] as SuggestionRow[])

  // Get marketing strategy metrics
  const strategiesRows = await prisma.$queryRawUnsafe<StrategyRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'active') as active
    FROM marketing_strategies
  `).catch(() => [] as StrategyRow[])

  // Get campaign metrics
  const campaignsRows = await prisma.$queryRawUnsafe<CampaignRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft') as draft
    FROM marketing_campaigns
  `).catch(() => [] as CampaignRow[])

  // Get scheduled posts count
  const socialRows = await prisma.$queryRawUnsafe<SocialRow[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_posts,
      COUNT(*) FILTER (WHERE status = 'published' AND published_at > NOW() - INTERVAL '7 days') as published_this_week
    FROM scheduled_posts
  `).catch(() => [] as SocialRow[])

  // Calculate conversion rate
  const leads = leadsRows[0] || { total_leads: BigInt(0), new_leads: BigInt(0), qualified_leads: BigInt(0), converted_leads: BigInt(0), hot_leads: BigInt(0), leads_this_period: BigInt(0) }
  const totalLeads = Number(leads.total_leads) || 1
  const convertedLeads = Number(leads.converted_leads) || 0
  const conversionRate = ((convertedLeads / totalLeads) * 100).toFixed(1)

  // Daily lead trend (last 7 days)
  const leadTrendRows = await prisma.$queryRawUnsafe<TrendRow[]>(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM leads
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `).catch(() => [] as TrendRow[])

  // Lead source breakdown
  const sourceBreakdownRows = await prisma.$queryRawUnsafe<SourceRow[]>(`
    SELECT
      source,
      COUNT(*) as count
    FROM leads
    GROUP BY source
    ORDER BY count DESC
    LIMIT 5
  `).catch(() => [] as SourceRow[])

  return NextResponse.json({
    summary: {
      leads: {
        total: Number(leads.total_leads) || 0,
        new: Number(leads.new_leads) || 0,
        qualified: Number(leads.qualified_leads) || 0,
        converted: convertedLeads,
        hot: Number(leads.hot_leads) || 0,
        period_count: Number(leads.leads_this_period) || 0,
        conversion_rate: parseFloat(conversionRate)
      },
      bookings: {
        total: Number(bookingsRows[0]?.total_bookings) || 0,
        pending: Number(bookingsRows[0]?.pending_bookings) || 0,
        confirmed: Number(bookingsRows[0]?.confirmed_bookings) || 0,
        revenue: Number(bookingsRows[0]?.total_revenue) || 0,
        period_count: Number(bookingsRows[0]?.bookings_this_period) || 0
      },
      ab_tests: {
        total: Number(abTestsRows[0]?.total_tests) || 0,
        active: Number(abTestsRows[0]?.active_tests) || 0,
        completed: Number(abTestsRows[0]?.completed_tests) || 0
      },
      competitors: {
        unreviewed_changes: Number(competitorRows[0]?.unreviewed_changes) || 0,
        high_priority: Number(competitorRows[0]?.high_priority_changes) || 0
      },
      suggestions: {
        pending: Number(suggestionsRows[0]?.pending) || 0,
        today: Number(suggestionsRows[0]?.today) || 0
      },
      strategies: {
        draft: Number(strategiesRows[0]?.draft) || 0,
        active: Number(strategiesRows[0]?.active) || 0
      },
      campaigns: {
        draft: Number(campaignsRows[0]?.draft) || 0
      },
      social: {
        scheduled: Number(socialRows[0]?.scheduled_posts) || 0,
        published_this_week: Number(socialRows[0]?.published_this_week) || 0
      }
    },
    trends: {
      leads_daily: leadTrendRows.map(r => ({
        date: r.date,
        count: Number(r.count)
      }))
    },
    breakdowns: {
      lead_sources: sourceBreakdownRows.map(r => ({
        source: r.source,
        count: Number(r.count)
      }))
    },
    period_days: periodDays,
    generated_at: new Date().toISOString()
  })
}

export const GET = withAdminAuth(getHandler)
