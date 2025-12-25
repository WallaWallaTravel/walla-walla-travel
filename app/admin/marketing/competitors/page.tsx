'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Competitor {
  id: number
  name: string
  website_url: string
  description: string
  priority_level: 'high' | 'medium' | 'low'
  is_active: boolean
  last_checked_at: string | null
  unreviewed_changes: number
}

interface CompetitorChange {
  id: number
  competitor_id: number
  competitor_name: string
  change_type: 'pricing' | 'promotion' | 'package' | 'content' | 'design'
  significance: 'high' | 'medium' | 'low'
  description: string
  previous_value: string | null
  new_value: string | null
  threat_level: 'high' | 'medium' | 'low' | 'none' | null
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed'
  detected_at: string
  recommended_actions: string[]
}

export default function CompetitorMonitoring() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [changes, setChanges] = useState<CompetitorChange[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setCompetitors([
        {
          id: 1,
          name: 'Blue Mountain Wine Tours',
          website_url: 'https://bluemountainwinetours.com',
          description: 'Main competitor in the region',
          priority_level: 'high',
          is_active: true,
          last_checked_at: '2025-11-28T14:30:00',
          unreviewed_changes: 2,
        },
        {
          id: 2,
          name: 'Valley Wine Adventures',
          website_url: 'https://valleywineadventures.com',
          description: 'Premium tour provider',
          priority_level: 'high',
          is_active: true,
          last_checked_at: '2025-11-28T14:30:00',
          unreviewed_changes: 1,
        },
        {
          id: 3,
          name: 'Sunset Cellars Tours',
          website_url: 'https://sunsetcellarstours.com',
          description: 'Budget-focused competitor',
          priority_level: 'medium',
          is_active: true,
          last_checked_at: '2025-11-28T08:00:00',
          unreviewed_changes: 0,
        },
        {
          id: 4,
          name: 'Pacific Wine Experiences',
          website_url: 'https://pacificwineexp.com',
          description: 'Multi-region operator',
          priority_level: 'medium',
          is_active: true,
          last_checked_at: '2025-11-27T20:00:00',
          unreviewed_changes: 0,
        },
        {
          id: 5,
          name: 'Grape Escape Tours',
          website_url: 'https://grapeescapetours.com',
          description: 'Small local operator',
          priority_level: 'low',
          is_active: true,
          last_checked_at: '2025-11-26T14:00:00',
          unreviewed_changes: 1,
        },
      ])

      setChanges([
        {
          id: 1,
          competitor_id: 1,
          competitor_name: 'Blue Mountain Wine Tours',
          change_type: 'pricing',
          significance: 'high',
          description: 'Weekend tour pricing reduced by 15%',
          previous_value: '$175/person',
          new_value: '$149/person',
          threat_level: 'high',
          status: 'new',
          detected_at: '2025-11-28T12:00:00',
          recommended_actions: [
            'Consider matching weekend pricing',
            'Highlight unique value propositions',
            'Create promotional bundle',
          ],
        },
        {
          id: 2,
          competitor_id: 1,
          competitor_name: 'Blue Mountain Wine Tours',
          change_type: 'promotion',
          significance: 'medium',
          description: 'New "Book 5, Get 6th Free" group promotion launched',
          previous_value: null,
          new_value: 'Group discount: 6th person free on groups of 5+',
          threat_level: 'medium',
          status: 'new',
          detected_at: '2025-11-28T12:00:00',
          recommended_actions: [
            'Review group pricing structure',
            'Consider loyalty program enhancement',
          ],
        },
        {
          id: 3,
          competitor_id: 2,
          competitor_name: 'Valley Wine Adventures',
          change_type: 'package',
          significance: 'high',
          description: 'New "VIP Sunset Experience" package added',
          previous_value: null,
          new_value: 'Premium sunset tour with private tastings - $299/person',
          threat_level: 'medium',
          status: 'new',
          detected_at: '2025-11-27T18:00:00',
          recommended_actions: [
            'Evaluate premium offering gap',
            'Consider launching competitor experience',
          ],
        },
        {
          id: 4,
          competitor_id: 5,
          competitor_name: 'Grape Escape Tours',
          change_type: 'content',
          significance: 'low',
          description: 'Updated testimonials section with 15 new reviews',
          previous_value: '23 testimonials',
          new_value: '38 testimonials',
          threat_level: 'low',
          status: 'new',
          detected_at: '2025-11-26T10:00:00',
          recommended_actions: [
            'Request reviews from recent customers',
            'Update testimonials page',
          ],
        },
      ])

      setLoading(false)
    }, 500)
  }, [])

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    }
    return colors[priority] || colors.low
  }

  const getChangeTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      pricing: '💰',
      promotion: '🎁',
      package: '📦',
      content: '📝',
      design: '🎨',
    }
    return emojis[type] || '📋'
  }

  const getThreatColor = (threat: string | null) => {
    const colors: Record<string, string> = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-orange-600 bg-orange-50',
      low: 'text-yellow-600 bg-yellow-50',
      none: 'text-green-600 bg-green-50',
    }
    return colors[threat || 'none'] || colors.none
  }

  const getSignificanceColor = (sig: string) => {
    const colors: Record<string, string> = {
      high: 'border-l-red-500',
      medium: 'border-l-yellow-500',
      low: 'border-l-gray-300',
    }
    return colors[sig] || colors.low
  }

  const newChanges = changes.filter(c => c.status === 'new')

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Competitors</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">👁️ Competitor Monitoring</h1>
            <p className="text-gray-600 mt-1">Track competitor pricing, promotions, and changes</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center gap-2"
          >
            <span>+</span> Add Competitor
          </button>
        </div>

        {/* Alert Banner */}
        {newChanges.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-red-800">
                  {newChanges.length} New Competitor Changes Detected
                </p>
                <p className="text-sm text-red-600">
                  {newChanges.filter(c => c.threat_level === 'high').length} high-threat changes require attention
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Review All
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Competitors List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Monitored Competitors</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))
                ) : (
                  competitors.map((competitor) => (
                    <div
                      key={competitor.id}
                      onClick={() => setSelectedCompetitor(competitor)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCompetitor?.id === competitor.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                        {competitor.unreviewed_changes > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {competitor.unreviewed_changes}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{competitor.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(competitor.priority_level)}`}>
                          {competitor.priority_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {competitor.last_checked_at ? format(new Date(competitor.last_checked_at), 'MMM d, h:mm a') : 'Never'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Changes Feed */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-900">Recent Changes</h2>
            
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))
            ) : changes.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No changes detected</h3>
                <p className="text-gray-500">All competitors are stable</p>
              </div>
            ) : (
              changes
                .filter(c => !selectedCompetitor || c.competitor_id === selectedCompetitor.id)
                .map((change) => (
                  <div
                    key={change.id}
                    className={`bg-white rounded-lg shadow-sm border-l-4 overflow-hidden ${getSignificanceColor(change.significance)}`}
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getChangeTypeEmoji(change.change_type)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{change.competitor_name}</h3>
                            <p className="text-xs text-gray-500">
                              {format(new Date(change.detected_at), 'MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {change.threat_level && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getThreatColor(change.threat_level)}`}>
                              {change.threat_level} threat
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            change.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            change.status === 'reviewed' ? 'bg-gray-100 text-gray-700' :
                            change.status === 'actioned' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {change.status}
                          </span>
                        </div>
                      </div>

                      {/* Change Description */}
                      <p className="text-gray-700 mb-4">{change.description}</p>

                      {/* Before/After */}
                      {(change.previous_value || change.new_value) && (
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          {change.previous_value && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-xs font-medium text-red-700 uppercase mb-1">Before</p>
                              <p className="text-sm text-gray-700">{change.previous_value}</p>
                            </div>
                          )}
                          {change.new_value && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs font-medium text-green-700 uppercase mb-1">After</p>
                              <p className="text-sm text-gray-700">{change.new_value}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {change.recommended_actions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">🤖 AI Recommendations</p>
                          <ul className="space-y-1">
                            {change.recommended_actions.map((action, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-500 mt-0.5">✓</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      {change.status === 'new' && (
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                            ✅ Mark Reviewed
                          </button>
                          <button className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                            🎯 Take Action
                          </button>
                          <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
                            🚫 Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Competitor Comparison */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Quick Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Competitor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Base Tour Price</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Premium Package</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Group Discount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Current Promo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-orange-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Walla Walla Travel (You)</td>
                  <td className="px-4 py-3 text-gray-700">$165/person</td>
                  <td className="px-4 py-3 text-gray-700">$289/person</td>
                  <td className="px-4 py-3 text-gray-700">10% off 8+</td>
                  <td className="px-4 py-3 text-green-600">Holiday Special 15% off</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Blue Mountain</td>
                  <td className="px-4 py-3 text-red-600">$149/person ↓</td>
                  <td className="px-4 py-3 text-gray-700">$275/person</td>
                  <td className="px-4 py-3 text-red-600">6th free on 5+ ↓</td>
                  <td className="px-4 py-3 text-gray-500">None</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Valley Wine Adventures</td>
                  <td className="px-4 py-3 text-gray-700">$185/person</td>
                  <td className="px-4 py-3 text-red-600">$299/person (new) ↑</td>
                  <td className="px-4 py-3 text-gray-700">15% off 10+</td>
                  <td className="px-4 py-3 text-gray-500">None</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Sunset Cellars</td>
                  <td className="px-4 py-3 text-gray-700">$125/person</td>
                  <td className="px-4 py-3 text-gray-700">$199/person</td>
                  <td className="px-4 py-3 text-gray-700">10% off 6+</td>
                  <td className="px-4 py-3 text-gray-500">Winter 20% off</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Competitor</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Competitor name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input type="url" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monitor</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Pricing changes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Promotions</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">New packages</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Add Competitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}







