'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

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
  generated_at: string
}

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/marketing/metrics?period=30')
      if (!res.ok) {
        throw new Error(`Failed to load metrics (${res.status})`)
      }
      const data = await res.json()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const marketingModules = [
    {
      title: 'AI Content Generator',
      description: 'Generate social media posts for partner wineries using AI',
      icon: '🤖',
      href: '/admin/marketing/ai-generator',
      color: 'from-violet-500 to-purple-600',
      stats: 'NEW',
    },
    {
      title: 'Analytics',
      description: 'Track performance, conversions, and ROI across all channels',
      icon: '📈',
      href: '/admin/marketing/analytics',
      color: 'from-indigo-500 to-purple-600',
      stats: metrics ? `${metrics.summary.leads.conversion_rate}% conv. rate` : 'Loading...',
    },
    {
      title: 'A/B Testing',
      description: 'Test content, timing, and messaging to optimize conversions',
      icon: '🧪',
      href: '/admin/marketing/ab-testing',
      color: 'from-purple-500 to-indigo-600',
      stats: metrics ? `${metrics.summary.ab_tests.active} active tests` : 'Loading...',
    },
    {
      title: 'Lead Management',
      description: 'Track and nurture leads through the sales pipeline',
      icon: '🎯',
      href: '/admin/marketing/leads',
      color: 'from-green-500 to-emerald-600',
      stats: metrics ? `${metrics.summary.leads.new} new leads` : 'Loading...',
    },
    {
      title: 'Social Media',
      description: 'Schedule posts and track engagement across platforms',
      icon: '📱',
      href: '/admin/marketing/social',
      color: 'from-pink-500 to-rose-600',
      stats: metrics ? `${metrics.summary.social.scheduled} scheduled` : 'Loading...',
    },
    {
      title: 'Blog Content',
      description: 'Generate and manage long-form SEO blog articles',
      icon: '📝',
      href: '/admin/marketing/blog',
      color: 'from-indigo-500 to-blue-600',
      stats: 'NEW',
    },
    {
      title: 'Content Suggestions',
      description: 'AI-generated daily content ideas backed by real data',
      icon: '💡',
      href: '/admin/marketing/suggestions',
      color: 'from-amber-500 to-orange-600',
      stats: metrics
        ? metrics.summary.suggestions.pending > 0
          ? `${metrics.summary.suggestions.pending} pending`
          : 'No pending'
        : 'Loading...',
      statsColor: metrics && metrics.summary.suggestions.pending > 0 ? 'text-emerald-600' : undefined,
    },
    {
      title: 'Competitor Monitor',
      description: 'Track competitor pricing and promotions',
      icon: '👁️',
      href: '/admin/marketing/competitors',
      color: 'from-orange-500 to-amber-600',
      stats: metrics && metrics.summary.competitors.unreviewed_changes > 0
        ? `${metrics.summary.competitors.unreviewed_changes} unreviewed`
        : 'All clear',
      statsColor: metrics && metrics.summary.competitors.unreviewed_changes > 0 ? 'text-orange-600' : undefined,
    },
    {
      title: 'Email Campaigns',
      description: 'Create and track email marketing campaigns',
      icon: '📧',
      href: '/admin/marketing/email',
      color: 'from-blue-500 to-cyan-600',
      stats: metrics ? `${metrics.summary.bookings.period_count} bookings/30d` : 'Loading...',
    },
    {
      title: 'Content Calendar',
      description: 'Plan and organize your content strategy',
      icon: '📅',
      href: '/admin/marketing/calendar',
      color: 'from-teal-500 to-green-600',
      stats: metrics ? `${metrics.summary.social.published_this_week} this week` : 'Loading...',
    },
    {
      title: 'SEO & Content Freshness',
      description: 'Search performance, keyword opportunities, and stale content detection',
      icon: '🔍',
      href: '/admin/marketing/seo',
      color: 'from-emerald-500 to-teal-600',
      stats: 'NEW',
    },
    {
      title: 'Campaigns',
      description: 'Multi-channel campaigns coordinating social, email, and content',
      icon: '🚀',
      href: '/admin/marketing/campaigns',
      color: 'from-violet-500 to-indigo-600',
      stats: metrics
        ? metrics.summary.campaigns.draft > 0
          ? `${metrics.summary.campaigns.draft} draft`
          : 'No drafts'
        : 'Loading...',
      statsColor: metrics && metrics.summary.campaigns.draft > 0 ? 'text-indigo-600' : undefined,
    },
    {
      title: 'Weekly Strategy',
      description: 'AI-generated weekly marketing strategy and content plans',
      icon: '🧠',
      href: '/admin/marketing/strategy',
      color: 'from-cyan-500 to-blue-600',
      stats: metrics
        ? metrics.summary.strategies.draft > 0
          ? `${metrics.summary.strategies.draft} draft`
          : metrics.summary.strategies.active > 0
            ? 'Active'
            : 'No strategies'
        : 'Loading...',
      statsColor: metrics && metrics.summary.strategies.draft > 0 ? 'text-violet-600' : metrics && metrics.summary.strategies.active > 0 ? 'text-emerald-600' : undefined,
    },
    {
      title: 'Settings',
      description: 'Connect Buffer, Google Search Console, and manage integrations',
      icon: '⚙️',
      href: '/admin/marketing/settings',
      color: 'from-gray-500 to-slate-600',
      stats: 'Buffer',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing Hub</h1>
            <p className="text-gray-700 mt-2">
              Manage all your marketing activities in one place
            </p>
          </div>
          {metrics && (
            <p className="text-xs text-gray-500">
              Updated {new Date(metrics.generated_at).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-sm text-red-700 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))
          ) : metrics ? (
            <>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.leads.total.toLocaleString()}</p>
                <p className="text-xs text-gray-700">{metrics.summary.leads.period_count} this month</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Hot Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.leads.hot}</p>
                <p className="text-xs text-gray-700">{metrics.summary.leads.qualified} qualified</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.bookings.confirmed}</p>
                <p className="text-xs text-gray-700">{metrics.summary.bookings.pending} pending</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${metrics.summary.bookings.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-700">{metrics.summary.bookings.period_count} bookings/30d</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Conversion</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.leads.conversion_rate}%</p>
                <p className="text-xs text-gray-700">{metrics.summary.leads.converted} converted</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-700 uppercase font-medium">Social Posts</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.social.published_this_week}</p>
                <p className="text-xs text-gray-700">{metrics.summary.social.scheduled} scheduled</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Alert Banners */}
        {metrics && metrics.summary.suggestions.pending > 0 && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {metrics.summary.suggestions.pending} content suggestion{metrics.summary.suggestions.pending !== 1 ? 's are' : ' is'} ready for your review.
              </p>
            </div>
            <Link
              href="/admin/marketing/suggestions"
              className="text-sm font-medium text-indigo-700 hover:text-indigo-900 whitespace-nowrap ml-4"
            >
              Review suggestions →
            </Link>
          </div>
        )}

        {metrics && metrics.summary.strategies.draft > 0 && (
          <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                A new weekly strategy is ready for review.
              </p>
            </div>
            <Link
              href="/admin/marketing/strategy"
              className="text-sm font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap ml-4"
            >
              Review strategy →
            </Link>
          </div>
        )}

        {metrics && metrics.summary.competitors.high_priority > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {metrics.summary.competitors.high_priority} high-priority competitor change{metrics.summary.competitors.high_priority !== 1 ? 's need' : ' needs'} your review.
              </p>
            </div>
            <Link
              href="/admin/marketing/competitors"
              className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap ml-4"
            >
              Review changes →
            </Link>
          </div>
        )}

        {/* Marketing Modules */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketingModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${module.color}`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl">{module.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2 group-hover:text-purple-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-sm font-medium ${module.statsColor || 'text-gray-700'}`}>{module.stats}</span>
                  <span className="text-purple-600 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/marketing/ab-testing/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              New A/B Test
            </Link>
            <Link
              href="/admin/marketing/leads/new"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Add Lead
            </Link>
            <Link
              href="/admin/marketing/social/schedule"
              className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
            >
              Schedule Post
            </Link>
            <Link
              href="/admin/marketing/email/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              New Campaign
            </Link>
            <Link
              href="/admin/marketing/suggestions"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
            >
              Review Suggestions
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
