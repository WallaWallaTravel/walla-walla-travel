import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch marketing metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    // Get lead metrics
    const leadsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'new') as new_leads,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
        COUNT(*) FILTER (WHERE status = 'won') as converted_leads,
        COUNT(*) FILTER (WHERE temperature = 'hot') as hot_leads,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '${parseInt(period)} days') as leads_this_period
      FROM leads
    `).catch(() => ({ rows: [{}] }))

    // Get booking inquiry metrics (if bookings table exists)
    const bookingsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '${parseInt(period)} days') as bookings_this_period
      FROM bookings
    `).catch(() => ({ rows: [{ total_bookings: 0, pending_bookings: 0, confirmed_bookings: 0, total_revenue: 0, bookings_this_period: 0 }] }))

    // Get A/B test metrics
    const abTestsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE status = 'running') as active_tests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tests
      FROM ab_tests
    `).catch(() => ({ rows: [{ total_tests: 0, active_tests: 0, completed_tests: 0 }] }))

    // Get competitor change metrics
    const competitorQuery = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'new') as unreviewed_changes,
        COUNT(*) FILTER (WHERE significance = 'high' AND status = 'new') as high_priority_changes
      FROM competitor_changes
    `).catch(() => ({ rows: [{ unreviewed_changes: 0, high_priority_changes: 0 }] }))

    // Get scheduled posts count
    const socialQuery = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_posts,
        COUNT(*) FILTER (WHERE status = 'published' AND published_at > NOW() - INTERVAL '7 days') as published_this_week
      FROM scheduled_posts
    `).catch(() => ({ rows: [{ scheduled_posts: 0, published_this_week: 0 }] }))

    // Calculate conversion rate
    const leads = leadsQuery.rows[0] || {}
    const totalLeads = parseInt(leads.total_leads) || 1
    const convertedLeads = parseInt(leads.converted_leads) || 0
    const conversionRate = ((convertedLeads / totalLeads) * 100).toFixed(1)

    // Daily lead trend (last 7 days)
    const leadTrendQuery = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM leads
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `).catch(() => ({ rows: [] }))

    // Lead source breakdown
    const sourceBreakdownQuery = await pool.query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM leads
      GROUP BY source
      ORDER BY count DESC
      LIMIT 5
    `).catch(() => ({ rows: [] }))

    return NextResponse.json({
      summary: {
        leads: {
          total: parseInt(leads.total_leads) || 0,
          new: parseInt(leads.new_leads) || 0,
          qualified: parseInt(leads.qualified_leads) || 0,
          converted: convertedLeads,
          hot: parseInt(leads.hot_leads) || 0,
          period_count: parseInt(leads.leads_this_period) || 0,
          conversion_rate: parseFloat(conversionRate)
        },
        bookings: {
          total: parseInt(bookingsQuery.rows[0]?.total_bookings) || 0,
          pending: parseInt(bookingsQuery.rows[0]?.pending_bookings) || 0,
          confirmed: parseInt(bookingsQuery.rows[0]?.confirmed_bookings) || 0,
          revenue: parseFloat(bookingsQuery.rows[0]?.total_revenue) || 0,
          period_count: parseInt(bookingsQuery.rows[0]?.bookings_this_period) || 0
        },
        ab_tests: {
          total: parseInt(abTestsQuery.rows[0]?.total_tests) || 0,
          active: parseInt(abTestsQuery.rows[0]?.active_tests) || 0,
          completed: parseInt(abTestsQuery.rows[0]?.completed_tests) || 0
        },
        competitors: {
          unreviewed_changes: parseInt(competitorQuery.rows[0]?.unreviewed_changes) || 0,
          high_priority: parseInt(competitorQuery.rows[0]?.high_priority_changes) || 0
        },
        social: {
          scheduled: parseInt(socialQuery.rows[0]?.scheduled_posts) || 0,
          published_this_week: parseInt(socialQuery.rows[0]?.published_this_week) || 0
        }
      },
      trends: {
        leads_daily: leadTrendQuery.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count)
        }))
      },
      breakdowns: {
        lead_sources: sourceBreakdownQuery.rows.map(r => ({
          source: r.source,
          count: parseInt(r.count)
        }))
      },
      period_days: parseInt(period),
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching marketing metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marketing metrics' },
      { status: 500 }
    )
  }
}




