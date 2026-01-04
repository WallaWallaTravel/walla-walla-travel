'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MarketingMetrics {
  website_visits: number
  booking_inquiries: number
  bookings_made: number
  new_leads: number
  emails_sent: number
  instagram_followers: number
}

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulated metrics for demo
    setTimeout(() => {
      setMetrics({
        website_visits: 1247,
        booking_inquiries: 23,
        bookings_made: 8,
        new_leads: 15,
        emails_sent: 156,
        instagram_followers: 2340,
      })
      setLoading(false)
    }, 500)
  }, [])

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
      stats: 'Real-time data',
    },
    {
      title: 'A/B Testing',
      description: 'Test content, timing, and messaging to optimize conversions',
      icon: '🧪',
      href: '/admin/marketing/ab-testing',
      color: 'from-purple-500 to-indigo-600',
      stats: '3 active tests',
    },
    {
      title: 'Lead Management',
      description: 'Track and nurture leads through the sales pipeline',
      icon: '🎯',
      href: '/admin/marketing/leads',
      color: 'from-green-500 to-emerald-600',
      stats: '15 new leads',
    },
    {
      title: 'Social Media',
      description: 'Schedule posts and track engagement across platforms',
      icon: '📱',
      href: '/admin/marketing/social',
      color: 'from-pink-500 to-rose-600',
      stats: '12 scheduled',
    },
    {
      title: 'Competitor Monitor',
      description: 'Track competitor pricing and promotions',
      icon: '👁️',
      href: '/admin/marketing/competitors',
      color: 'from-orange-500 to-amber-600',
      stats: '5 competitors',
    },
    {
      title: 'Email Campaigns',
      description: 'Create and track email marketing campaigns',
      icon: '📧',
      href: '/admin/marketing/email',
      color: 'from-blue-500 to-cyan-600',
      stats: '2 active',
    },
    {
      title: 'Content Calendar',
      description: 'Plan and organize your content strategy',
      icon: '📅',
      href: '/admin/marketing/calendar',
      color: 'from-teal-500 to-green-600',
      stats: '8 planned',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Marketing Hub</h1>
          <p className="text-gray-600 mt-2">
            Manage all your marketing activities in one place
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Website Visits</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.website_visits.toLocaleString()}</p>
                <p className="text-xs text-green-600">+12% vs last week</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Inquiries</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.booking_inquiries}</p>
                <p className="text-xs text-green-600">+8% vs last week</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.bookings_made}</p>
                <p className="text-xs text-green-600">+5% vs last week</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">New Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.new_leads}</p>
                <p className="text-xs text-green-600">+15% vs last week</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Emails Sent</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.emails_sent}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">IG Followers</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.instagram_followers.toLocaleString()}</p>
                <p className="text-xs text-green-600">+45 this week</p>
              </div>
            </>
          )}
        </div>

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
                    <p className="text-sm text-gray-600 mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{module.stats}</span>
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
              🧪 New A/B Test
            </Link>
            <Link
              href="/admin/marketing/leads/new"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              ➕ Add Lead
            </Link>
            <Link
              href="/admin/marketing/social/schedule"
              className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
            >
              📱 Schedule Post
            </Link>
            <Link
              href="/admin/marketing/email/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              📧 New Campaign
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🧪</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">A/B Test &quot;Caption Length&quot; completed</p>
                <p className="text-xs text-gray-500">Winner: Long captions (+50% conversions)</p>
              </div>
              <span className="text-xs text-gray-400">2h ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🎯</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New lead: Sarah Johnson</p>
                <p className="text-xs text-gray-500">Corporate event, 20 guests</p>
              </div>
              <span className="text-xs text-gray-400">4h ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">📱</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Instagram post published</p>
                <p className="text-xs text-gray-500">124 likes, 8 comments</p>
              </div>
              <span className="text-xs text-gray-400">Yesterday</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">👁️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Competitor price change detected</p>
                <p className="text-xs text-gray-500">Blue Mountain Tours: -15% on weekend tours</p>
              </div>
              <span className="text-xs text-gray-400">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

