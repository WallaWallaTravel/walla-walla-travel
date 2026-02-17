'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface RecommendedPost {
  platform: string
  content_type: string
  content: string
  hashtags: string[]
  reasoning: string
  day_of_week: string
  priority: number
}

interface KeywordFocus {
  keyword: string
  rationale: string
  current_position: number | null
  target_action: string
}

interface ContentGap {
  area: string
  recommendation: string
}

interface ContentRefreshPriority {
  page_or_topic: string
  reason: string
  urgency: string
}

interface DataInputs {
  social_posts_analyzed: number
  search_queries_analyzed: number
  competitor_changes: number
  top_posts_reviewed: number
  platforms_tracked: number
  season: string
  holidays: string[]
  wine_seasons: string[]
}

interface Strategy {
  id: number
  week_start: string
  week_end: string
  theme: string
  summary: string
  data_inputs: DataInputs
  recommended_posts: RecommendedPost[]
  keyword_opportunities: KeywordFocus[]
  content_gaps: ContentGap[]
  performance_summary: {
    content_refresh_priorities?: ContentRefreshPriority[]
  }
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

const PLATFORM_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  instagram: { label: 'Instagram', bgClass: 'bg-pink-100', textClass: 'text-pink-800' },
  facebook: { label: 'Facebook', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  linkedin: { label: 'LinkedIn', bgClass: 'bg-sky-100', textClass: 'text-sky-800' },
}

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  draft: { label: 'Draft', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
  active: { label: 'Active', bgClass: 'bg-green-100', textClass: 'text-green-800' },
  completed: { label: 'Completed', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  archived: { label: 'Archived', bgClass: 'bg-gray-100', textClass: 'text-gray-600' },
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function StrategyPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [applyingStrategy, setApplyingStrategy] = useState<number | null>(null)
  const [expandedPast, setExpandedPast] = useState<Set<number>>(new Set())

  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/marketing/strategies?limit=8')
      if (response.ok) {
        const data = await response.json()
        setStrategies(data.strategies || [])
      } else {
        setError('Failed to load strategies')
      }
    } catch {
      setError('Failed to load strategies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStrategies()
  }, [fetchStrategies])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/marketing/strategies', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(`Strategy generated: "${data.theme}" with ${data.posts_recommended} post ideas`)
        setTimeout(() => setSuccess(null), 5000)
        fetchStrategies()
      } else {
        setError(data.error || 'Failed to generate strategy')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate strategy')
    } finally {
      setGenerating(false)
    }
  }

  const handleActivate = async (strategyId: number) => {
    try {
      const response = await fetch('/api/admin/marketing/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strategyId, status: 'active' }),
      })

      if (response.ok) {
        setSuccess('Strategy activated')
        setTimeout(() => setSuccess(null), 3000)
        fetchStrategies()
      }
    } catch {
      setError('Failed to activate strategy')
    }
  }

  const handleArchive = async (strategyId: number) => {
    try {
      const response = await fetch('/api/admin/marketing/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strategyId, status: 'archived' }),
      })

      if (response.ok) {
        setSuccess('Strategy archived')
        setTimeout(() => setSuccess(null), 3000)
        fetchStrategies()
      }
    } catch {
      setError('Failed to archive strategy')
    }
  }

  const handleApplyStrategy = async (strategy: Strategy) => {
    setApplyingStrategy(strategy.id)
    setError(null)

    try {
      // Create content suggestions from recommended posts via the cron endpoint
      // The strategy was already saved with posts; just activate it
      await handleActivate(strategy.id)
      setSuccess(`Strategy "${strategy.theme}" is now active. ${strategy.recommended_posts.length} post suggestions are available in Content Suggestions.`)
      setTimeout(() => setSuccess(null), 5000)
    } catch {
      setError('Failed to apply strategy')
    } finally {
      setApplyingStrategy(null)
    }
  }

  const togglePastExpanded = (id: number) => {
    setExpandedPast(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const currentStrategy = strategies[0]
  const pastStrategies = strategies.slice(1)

  // Sort recommended posts by day order
  const sortPostsByDay = (posts: RecommendedPost[]) => {
    return [...posts].sort((a, b) => {
      const aIdx = DAY_ORDER.indexOf(a.day_of_week)
      const bIdx = DAY_ORDER.indexOf(b.day_of_week)
      return aIdx - bIdx
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-indigo-600">Marketing</Link>
              <span>/</span>
              <span>Weekly Strategy</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Strategy</h1>
            <p className="text-gray-600 mt-1">AI-generated marketing strategies informed by real performance data</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Strategy'
            )}
          </button>
        </div>

        {/* Success / Error banners */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 ml-4">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="h-24 bg-gray-200 rounded-lg" />
                  <div className="h-24 bg-gray-200 rounded-lg" />
                  <div className="h-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && strategies.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No strategies yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Strategies are generated weekly on Mondays, or you can generate one now based on your current performance data.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Generate First Strategy
            </button>
          </div>
        )}

        {/* Current Strategy */}
        {!loading && currentStrategy && (
          <div className="mb-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Strategy header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">{currentStrategy.theme}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[currentStrategy.status]?.bgClass || 'bg-gray-100'} ${STATUS_CONFIG[currentStrategy.status]?.textClass || 'text-gray-700'}`}>
                        {STATUS_CONFIG[currentStrategy.status]?.label || currentStrategy.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Week of {format(new Date(currentStrategy.week_start + 'T00:00:00'), 'MMM d')} - {format(new Date(currentStrategy.week_end + 'T00:00:00'), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStrategy.status === 'draft' && (
                      <button
                        onClick={() => handleApplyStrategy(currentStrategy)}
                        disabled={applyingStrategy === currentStrategy.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm"
                      >
                        {applyingStrategy === currentStrategy.id ? 'Applying...' : 'Apply Strategy'}
                      </button>
                    )}
                    {currentStrategy.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(currentStrategy.id)}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-6 border-b border-gray-100">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{currentStrategy.summary}</p>
              </div>

              {/* Recommended Posts */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Recommended Posts ({currentStrategy.recommended_posts.length})</h3>
                <div className="grid gap-3">
                  {sortPostsByDay(currentStrategy.recommended_posts).map((post, idx) => {
                    const platform = PLATFORM_CONFIG[post.platform] || { label: post.platform, bgClass: 'bg-gray-100', textClass: 'text-gray-700' }
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900 w-24">{post.day_of_week}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${platform.bgClass} ${platform.textClass}`}>
                            {platform.label}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {post.content_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                            post.priority >= 8 ? 'bg-red-100 text-red-700' :
                            post.priority >= 5 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            P{post.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 line-clamp-3">{post.content}</p>
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-indigo-600">
                                #{tag.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">{post.reasoning}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Keyword Focus */}
              {currentStrategy.keyword_opportunities && currentStrategy.keyword_opportunities.length > 0 && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Keyword Focus Areas</h3>
                  <div className="space-y-3">
                    {currentStrategy.keyword_opportunities.map((kw, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">{kw.keyword}</span>
                            {kw.current_position !== null && (
                              <span className="text-xs text-gray-500">
                                Position: {kw.current_position}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{kw.rationale}</p>
                          <p className="text-xs text-indigo-600 mt-1">{kw.target_action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Gaps + Refresh Priorities */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Content Gaps */}
                {currentStrategy.content_gaps && currentStrategy.content_gaps.length > 0 && (
                  <div className="p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Content Gaps</h3>
                    <div className="space-y-2">
                      {currentStrategy.content_gaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <p className="text-sm font-medium text-amber-900">{gap.area}</p>
                          <p className="text-xs text-amber-700 mt-1">{gap.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Refresh Priorities */}
                {currentStrategy.performance_summary?.content_refresh_priorities &&
                  currentStrategy.performance_summary.content_refresh_priorities.length > 0 && (
                  <div className="p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Refresh Priorities</h3>
                    <div className="space-y-2">
                      {currentStrategy.performance_summary.content_refresh_priorities.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{item.page_or_topic}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.urgency === 'high' || item.urgency === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : item.urgency === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.urgency}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Inputs Summary */}
              {currentStrategy.data_inputs && (
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Inputs</h3>
                  <div className="flex flex-wrap gap-3">
                    <DataBadge label="Social Posts Analyzed" value={currentStrategy.data_inputs.social_posts_analyzed} />
                    <DataBadge label="Search Queries" value={currentStrategy.data_inputs.search_queries_analyzed} />
                    <DataBadge label="Competitor Changes" value={currentStrategy.data_inputs.competitor_changes} />
                    <DataBadge label="Top Posts Reviewed" value={currentStrategy.data_inputs.top_posts_reviewed} />
                    <DataBadge label="Season" value={currentStrategy.data_inputs.season} />
                    {currentStrategy.data_inputs.holidays && currentStrategy.data_inputs.holidays.length > 0 && (
                      <DataBadge label="Holidays" value={currentStrategy.data_inputs.holidays.join(', ')} />
                    )}
                    {currentStrategy.data_inputs.wine_seasons && currentStrategy.data_inputs.wine_seasons.length > 0 && (
                      <DataBadge label="Wine Season" value={currentStrategy.data_inputs.wine_seasons.join(', ')} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Past Strategies */}
        {!loading && pastStrategies.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Strategies</h2>
            <div className="space-y-3">
              {pastStrategies.map(strategy => {
                const isExpanded = expandedPast.has(strategy.id)
                const statusCfg = STATUS_CONFIG[strategy.status] || STATUS_CONFIG.draft

                return (
                  <div key={strategy.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => togglePastExpanded(strategy.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{strategy.theme}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bgClass} ${statusCfg.textClass}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {format(new Date(strategy.week_start + 'T00:00:00'), 'MMM d')} - {format(new Date(strategy.week_end + 'T00:00:00'), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        <div className="p-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-4">{strategy.summary}</p>

                          {strategy.recommended_posts && strategy.recommended_posts.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Posts ({strategy.recommended_posts.length})</h4>
                              <div className="space-y-2">
                                {sortPostsByDay(strategy.recommended_posts).map((post, idx) => {
                                  const platform = PLATFORM_CONFIG[post.platform] || { label: post.platform, bgClass: 'bg-gray-100', textClass: 'text-gray-700' }
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                                      <span className="font-medium text-gray-700 w-20 text-xs">{post.day_of_week}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${platform.bgClass} ${platform.textClass}`}>
                                        {platform.label}
                                      </span>
                                      <span className="text-gray-600 truncate">{post.content.slice(0, 80)}...</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {strategy.keyword_opportunities && strategy.keyword_opportunities.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Keywords</h4>
                              <div className="flex flex-wrap gap-2">
                                {strategy.keyword_opportunities.map((kw, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                                    {kw.keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DataBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{String(value)}</span>
    </span>
  )
}
