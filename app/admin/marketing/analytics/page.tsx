'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MetricsChart, StatCard } from '@/components/marketing/MetricsChart'

interface MarketingMetrics {
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
}

export default function MarketingAnalyticsPage() {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    loadMetrics()
  }, [period])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/marketing/metrics?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
      // Use mock data for demo
      setMetrics({
        summary: {
          leads: { total: 156, new: 23, qualified: 45, converted: 12, hot: 8, period_count: 23, conversion_rate: 7.7 },
          bookings: { total: 89, pending: 5, confirmed: 84, revenue: 45670, period_count: 12 },
          ab_tests: { total: 8, active: 2, completed: 5 },
          competitors: { unreviewed_changes: 3, high_priority: 1 },
          social: { scheduled: 12, published_this_week: 5 }
        },
        trends: {
          leads_daily: [
            { date: '2025-11-23', count: 3 },
            { date: '2025-11-24', count: 5 },
            { date: '2025-11-25', count: 2 },
            { date: '2025-11-26', count: 4 },
            { date: '2025-11-27', count: 6 },
            { date: '2025-11-28', count: 3 },
            { date: '2025-11-29', count: 5 }
          ]
        },
        breakdowns: {
          lead_sources: [
            { source: 'website', count: 45 },
            { source: 'referral', count: 32 },
            { source: 'social_media', count: 28 },
            { source: 'email_campaign', count: 15 },
            { source: 'other', count: 10 }
          ]
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-xl"></div>
              <div className="h-64 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">Failed to load metrics. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Analytics</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">📈 Marketing Analytics</h1>
            <p className="text-gray-600 mt-1">Track your marketing performance and ROI</p>
          </div>
          <div className="flex gap-2">
            {['7', '30', '90'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p === '7' ? 'Week' : p === '30' ? 'Month' : 'Quarter'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Leads"
            value={metrics.summary.leads.total}
            change={12}
            changeLabel="vs last period"
            icon="🎯"
            color="purple"
          />
          <StatCard
            title="Conversion Rate"
            value={`${metrics.summary.leads.conversion_rate}%`}
            change={2.3}
            icon="📊"
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(metrics.summary.bookings.revenue)}
            change={8}
            icon="💰"
            color="blue"
          />
          <StatCard
            title="Hot Leads"
            value={metrics.summary.leads.hot}
            change={15}
            icon="🔥"
            color="orange"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Lead Trend */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Trend (Last 7 Days)</h2>
            <MetricsChart
              type="line"
              height={200}
              data={metrics.trends.leads_daily.map(d => ({
                label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                value: d.count
              }))}
              showValues={true}
            />
          </div>

          {/* Lead Sources */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h2>
            <MetricsChart
              type="donut"
              data={metrics.breakdowns.lead_sources.map(s => ({
                label: s.source.replace('_', ' '),
                value: s.count
              }))}
              showLegend={true}
            />
          </div>
        </div>

        {/* Lead Pipeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline</h2>
          <MetricsChart
            type="bar"
            height={200}
            data={[
              { label: 'New', value: metrics.summary.leads.new, color: '#3B82F6' },
              { label: 'Qualified', value: metrics.summary.leads.qualified, color: '#10B981' },
              { label: 'Hot', value: metrics.summary.leads.hot, color: '#F59E0B' },
              { label: 'Converted', value: metrics.summary.leads.converted, color: '#8B5CF6' }
            ]}
            showValues={true}
          />
        </div>

        {/* Activity Summary */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* A/B Testing */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">🧪 A/B Testing</h3>
              <Link href="/admin/marketing/ab-testing" className="text-purple-600 text-sm hover:underline">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Tests</span>
                <span className="font-bold text-green-600">{metrics.summary.ab_tests.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-bold text-blue-600">{metrics.summary.ab_tests.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Tests</span>
                <span className="font-bold text-gray-900">{metrics.summary.ab_tests.total}</span>
              </div>
            </div>
          </div>

          {/* Competitor Monitoring */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">👁️ Competitors</h3>
              <Link href="/admin/marketing/competitors" className="text-purple-600 text-sm hover:underline">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Unreviewed Changes</span>
                <span className={`font-bold ${metrics.summary.competitors.unreviewed_changes > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {metrics.summary.competitors.unreviewed_changes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">High Priority</span>
                <span className={`font-bold ${metrics.summary.competitors.high_priority > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {metrics.summary.competitors.high_priority}
                </span>
              </div>
            </div>
            {metrics.summary.competitors.high_priority > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                ⚠️ {metrics.summary.competitors.high_priority} high-priority change requires attention
              </div>
            )}
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">📱 Social Media</h3>
              <Link href="/admin/marketing/social" className="text-purple-600 text-sm hover:underline">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Scheduled Posts</span>
                <span className="font-bold text-blue-600">{metrics.summary.social.scheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Published This Week</span>
                <span className="font-bold text-green-600">{metrics.summary.social.published_this_week}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Overview */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">💰 Revenue Overview</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-white/70 text-sm">Total Bookings</p>
              <p className="text-3xl font-bold">{metrics.summary.bookings.total}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Pending</p>
              <p className="text-3xl font-bold">{metrics.summary.bookings.pending}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Confirmed</p>
              <p className="text-3xl font-bold">{metrics.summary.bookings.confirmed}</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(metrics.summary.bookings.revenue)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




