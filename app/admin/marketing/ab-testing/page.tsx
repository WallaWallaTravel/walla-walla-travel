'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ABTest {
  id: number
  name: string
  hypothesis: string
  test_type: string
  platform: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  variant_a: TestVariant
  variant_b: TestVariant
  winner: 'a' | 'b' | 'inconclusive' | null
  confidence_level: number | null
}

interface TestVariant {
  name: string
  impressions: number
  engagement: number
  clicks: number
  conversions: number
}

export default function ABTestingDashboard() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all')
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)

  useEffect(() => {
    // Simulated data for demo
    setTimeout(() => {
      setTests([
        {
          id: 1,
          name: 'Caption Length: Short vs Long',
          hypothesis: 'Longer captions with storytelling will drive higher engagement',
          test_type: 'content',
          platform: 'instagram',
          status: 'completed',
          start_date: '2025-11-01',
          end_date: '2025-11-15',
          variant_a: { name: 'Short Caption', impressions: 12450, engagement: 1247, clicks: 156, conversions: 8 },
          variant_b: { name: 'Long Caption', impressions: 12380, engagement: 1486, clicks: 198, conversions: 12 },
          winner: 'b',
          confidence_level: 98,
        },
        {
          id: 2,
          name: 'Posting Time: Morning vs Evening',
          hypothesis: 'Evening posts will outperform morning posts',
          test_type: 'timing',
          platform: 'instagram',
          status: 'running',
          start_date: '2025-11-20',
          end_date: '2025-12-04',
          variant_a: { name: 'Morning (9am)', impressions: 8320, engagement: 832, clicks: 95, conversions: 4 },
          variant_b: { name: 'Evening (7pm)', impressions: 8150, engagement: 978, clicks: 118, conversions: 6 },
          winner: null,
          confidence_level: 87,
        },
        {
          id: 3,
          name: 'CTA Style: Direct vs Soft',
          hypothesis: 'Soft CTAs will feel less salesy and drive more clicks',
          test_type: 'content',
          platform: 'all',
          status: 'running',
          start_date: '2025-11-22',
          end_date: '2025-12-06',
          variant_a: { name: 'Direct CTA', impressions: 5200, engagement: 416, clicks: 78, conversions: 3 },
          variant_b: { name: 'Soft CTA', impressions: 5180, engagement: 466, clicks: 93, conversions: 5 },
          winner: null,
          confidence_level: 72,
        },
        {
          id: 4,
          name: 'Image Style: Professional vs Candid',
          hypothesis: 'Candid lifestyle shots will feel more authentic',
          test_type: 'format',
          platform: 'instagram',
          status: 'draft',
          start_date: null,
          end_date: null,
          variant_a: { name: 'Professional', impressions: 0, engagement: 0, clicks: 0, conversions: 0 },
          variant_b: { name: 'Candid', impressions: 0, engagement: 0, clicks: 0, conversions: 0 },
          winner: null,
          confidence_level: null,
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const filteredTests = tests.filter(test => {
    if (filter === 'all') return true
    return test.status === filter
  })

  const calculateEngagementRate = (variant: TestVariant) => {
    if (variant.impressions === 0) return 0
    return ((variant.engagement / variant.impressions) * 100).toFixed(1)
  }

  const calculateCTR = (variant: TestVariant) => {
    if (variant.impressions === 0) return 0
    return ((variant.clicks / variant.impressions) * 100).toFixed(2)
  }

  const calculateConversionRate = (variant: TestVariant) => {
    if (variant.clicks === 0) return 0
    return ((variant.conversions / variant.clicks) * 100).toFixed(1)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      running: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return styles[status] || styles.draft
  }

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      instagram: '📸',
      facebook: '👥',
      linkedin: '💼',
      tiktok: '🎵',
      email: '📧',
      website: '🌐',
      all: '🌍',
    }
    return emojis[platform] || '📱'
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
              <span>A/B Testing</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">🧪 A/B Testing Dashboard</h1>
            <p className="text-gray-600 mt-1">Test, measure, and optimize your marketing</p>
          </div>
          <Link
            href="/admin/marketing/ab-testing/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <span>+</span> New Test
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Active Tests</p>
            <p className="text-2xl font-bold text-green-600">
              {tests.filter(t => t.status === 'running').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-blue-600">
              {tests.filter(t => t.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Avg Confidence</p>
            <p className="text-2xl font-bold text-purple-600">
              {tests.filter(t => t.confidence_level).length > 0
                ? Math.round(
                    tests
                      .filter(t => t.confidence_level)
                      .reduce((sum, t) => sum + (t.confidence_level || 0), 0) /
                    tests.filter(t => t.confidence_level).length
                  )
                : 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Draft Tests</p>
            <p className="text-2xl font-bold text-gray-600">
              {tests.filter(t => t.status === 'draft').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'running', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tests Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-gray-100 rounded"></div>
                  <div className="h-24 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))
          ) : filteredTests.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🧪</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
              <p className="text-gray-500 mb-4">Create your first A/B test to start optimizing</p>
              <Link
                href="/admin/marketing/ab-testing/new"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg"
              >
                Create Test
              </Link>
            </div>
          ) : (
            filteredTests.map((test) => (
              <div
                key={test.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  selectedTest?.id === test.id ? 'ring-2 ring-purple-500' : ''
                }`}
                onClick={() => setSelectedTest(test)}
              >
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPlatformEmoji(test.platform)}</span>
                      <h3 className="font-semibold text-gray-900">{test.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(test.status)}`}>
                      {test.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{test.hypothesis}</p>
                </div>

                {/* Variants Comparison */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Variant A */}
                    <div className={`p-3 rounded-lg ${test.winner === 'a' ? 'bg-green-50 ring-1 ring-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">VARIANT A</span>
                        {test.winner === 'a' && <span className="text-xs font-medium text-green-600">✓ Winner</span>}
                      </div>
                      <p className="font-medium text-gray-900 text-sm mb-2">{test.variant_a.name}</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Engagement</span>
                          <span className="font-medium">{calculateEngagementRate(test.variant_a)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR</span>
                          <span className="font-medium">{calculateCTR(test.variant_a)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conv. Rate</span>
                          <span className="font-medium">{calculateConversionRate(test.variant_a)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Variant B */}
                    <div className={`p-3 rounded-lg ${test.winner === 'b' ? 'bg-green-50 ring-1 ring-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">VARIANT B</span>
                        {test.winner === 'b' && <span className="text-xs font-medium text-green-600">✓ Winner</span>}
                      </div>
                      <p className="font-medium text-gray-900 text-sm mb-2">{test.variant_b.name}</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Engagement</span>
                          <span className="font-medium">{calculateEngagementRate(test.variant_b)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR</span>
                          <span className="font-medium">{calculateCTR(test.variant_b)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conv. Rate</span>
                          <span className="font-medium">{calculateConversionRate(test.variant_b)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confidence */}
                  {test.confidence_level !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Confidence Level</span>
                        <span className={`text-xs font-medium ${
                          test.confidence_level >= 95 ? 'text-green-600' : 
                          test.confidence_level >= 80 ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {test.confidence_level}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            test.confidence_level >= 95 ? 'bg-green-500' :
                            test.confidence_level >= 80 ? 'bg-yellow-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${test.confidence_level}%` }}
                        ></div>
                      </div>
                      {test.confidence_level < 95 && test.status === 'running' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Need {95 - test.confidence_level}% more for statistical significance
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {test.start_date ? `Started ${test.start_date}` : 'Not started'}
                  </span>
                  <div className="flex gap-2">
                    {test.status === 'running' && (
                      <button className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                        Pause
                      </button>
                    )}
                    {test.status === 'draft' && (
                      <button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                        Start
                      </button>
                    )}
                    <button className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Learning Library */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📚 What We&apos;ve Learned</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">Images</p>
              <p className="text-sm text-gray-900">Candid lifestyle shots: +42% saves</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">Captions</p>
              <p className="text-sm text-gray-900">180-220 chars with stories: +50% conv</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">Timing</p>
              <p className="text-sm text-gray-900">7pm PST on Thu/Fri: peak engagement</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">CTAs</p>
              <p className="text-sm text-gray-900">Soft, question-based: +28% clicks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




