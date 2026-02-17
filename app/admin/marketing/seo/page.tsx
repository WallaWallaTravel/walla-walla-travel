'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// Types
interface PagePerformance {
  page_url: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  data_date: string
}

interface ContentFreshness {
  id: number
  page_path: string
  page_title: string
  reason: string
  suggested_update: string
  urgency: string
  days_since_detected: number
  status: string
}

interface KeywordOpportunity {
  query: string
  page_url: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  data_date: string
}

interface DecliningPage {
  page_url: string
  recent_impressions: number
  previous_impressions: number
  change_pct: number
}

interface ConnectionStatus {
  connected: boolean
  lastSyncAt: string | null
  lastError: string | null
  isActive: boolean
}

interface SEOData {
  connectionStatus: ConnectionStatus
  authUrl: string | null
  pagePerformance: PagePerformance[]
  contentFreshness: ContentFreshness[]
  keywordOpportunities: KeywordOpportunity[]
  decliningPages: DecliningPage[]
}

type TabId = 'performance' | 'freshness' | 'keywords' | 'setup'
type SortField = 'page_url' | 'impressions' | 'clicks' | 'ctr' | 'position' | 'data_date'
type SortDirection = 'asc' | 'desc'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'performance', label: 'Page Performance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'freshness', label: 'Content Freshness', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'keywords', label: 'Keyword Opportunities', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'setup', label: 'Search Console Setup', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function formatUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname || '/'
  } catch {
    return url
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function positionColorClass(position: number): string {
  if (position < 10) return 'text-emerald-700 bg-emerald-50'
  if (position <= 20) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function urgencyBadgeClass(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'bg-red-100 text-red-800'
    case 'high': return 'bg-amber-100 text-amber-800'
    case 'medium': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function suggestedAction(position: number): string {
  if (position <= 8) return 'Optimize meta title/description for higher CTR'
  if (position <= 12) return 'Add internal links and expand content'
  if (position <= 16) return 'Create supporting content and build topical authority'
  return 'Major content update needed — expand depth and add media'
}

export default function SEODashboard() {
  const [data, setData] = useState<SEOData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('performance')
  const [sortField, setSortField] = useState<SortField>('impressions')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/marketing/seo')
      if (!res.ok) {
        throw new Error(`Failed to load SEO data (${res.status})`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedPages = data?.pagePerformance
    ? [...data.pagePerformance].sort((a, b) => {
        const aVal = a[sortField as keyof PagePerformance]
        const bVal = b[sortField as keyof PagePerformance]
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal
        }
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    : []

  // Skeleton loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 mb-4">
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/admin/marketing" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
              &larr; Back to Marketing
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">SEO Content Freshness Dashboard</h1>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Failed to load SEO data</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/marketing" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
            &larr; Back to Marketing
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SEO Content Freshness Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor search performance, content freshness, and keyword opportunities</p>
            </div>
            <div className="flex items-center gap-3">
              {data.connectionStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                  Not Connected
                </span>
              )}
              <button
                onClick={fetchData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-600">Tracked Pages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.pagePerformance.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-600">Stale Content Alerts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.contentFreshness.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-600">Keyword Opportunities</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.keywordOpportunities.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-600">Declining Pages</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{data.decliningPages.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'performance' && (
          <PerformanceTab
            pages={sortedPages}
            decliningPages={data.decliningPages}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
        {activeTab === 'freshness' && (
          <FreshnessTab items={data.contentFreshness} />
        )}
        {activeTab === 'keywords' && (
          <KeywordsTab keywords={data.keywordOpportunities} />
        )}
        {activeTab === 'setup' && (
          <SetupTab
            connectionStatus={data.connectionStatus}
            authUrl={data.authUrl}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab 1: Page Performance
// ============================================================
function PerformanceTab({
  pages,
  decliningPages,
  sortField,
  sortDir,
  onSort,
}: {
  pages: PagePerformance[]
  decliningPages: DecliningPage[]
  sortField: SortField
  sortDir: SortDirection
  onSort: (field: SortField) => void
}) {
  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <svg className={`w-3 h-3 ${sortDir === 'desc' ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        )}
      </span>
    </th>
  )

  if (pages.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No performance data yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Connect Google Search Console to start tracking page performance. Data will appear after the first daily sync.
        </p>
        <p className="text-sm text-gray-500 mt-3">Go to the &quot;Search Console Setup&quot; tab to connect.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Declining pages alert */}
      {decliningPages.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                {decliningPages.length} page{decliningPages.length !== 1 ? 's' : ''} with declining impressions
              </h3>
              <p className="text-sm text-amber-700 mt-0.5">Compared to the previous 7-day period</p>
              <div className="mt-2 space-y-1">
                {decliningPages.slice(0, 5).map(page => (
                  <div key={page.page_url} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="font-mono text-xs truncate max-w-xs">{formatUrl(page.page_url)}</span>
                    <span className="text-red-700 font-medium">{page.change_pct}%</span>
                    <span className="text-amber-600">({page.previous_impressions} &rarr; {page.recent_impressions})</span>
                  </div>
                ))}
                {decliningPages.length > 5 && (
                  <p className="text-xs text-amber-600">and {decliningPages.length - 5} more...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortHeader field="page_url" label="Page" />
                <SortHeader field="impressions" label="Impressions" />
                <SortHeader field="clicks" label="Clicks" />
                <SortHeader field="ctr" label="CTR" />
                <SortHeader field="position" label="Avg Position" />
                <SortHeader field="data_date" label="Last Updated" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 font-mono truncate block max-w-xs" title={page.page_url}>
                      {formatUrl(page.page_url)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {page.impressions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {page.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {(page.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium tabular-nums ${positionColorClass(page.position)}`}>
                      {page.position.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(page.data_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab 2: Content Freshness
// ============================================================
function FreshnessTab({ items }: { items: ContentFreshness[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-12 h-12 text-emerald-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">All content is fresh</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          No stale content detected. The seasonal refresh cron will flag pages that need updating.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {item.page_title || item.page_path}
                </h3>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${urgencyBadgeClass(item.urgency)}`}>
                  {item.urgency}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {item.reason.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mb-2">{item.page_path}</p>
              {item.suggested_update && (
                <p className="text-sm text-gray-700 leading-relaxed">{item.suggested_update}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                {item.days_since_detected > 90 ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {item.days_since_detected} day{item.days_since_detected !== 1 ? 's' : ''} ago
                </span>
              </div>
              <a
                href={item.page_path}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                View Page
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Tab 3: Keyword Opportunities
// ============================================================
function KeywordsTab({ keywords }: { keywords: KeywordOpportunity[] }) {
  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No keyword opportunities found</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Keyword opportunities appear for queries ranking #5-20 with at least 5 impressions. Connect Search Console and wait for data to accumulate.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Query</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Page</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Impressions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CTR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keywords.map((kw, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{kw.query}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 font-mono truncate block max-w-[200px]" title={kw.page_url}>
                    {formatUrl(kw.page_url)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium tabular-nums ${positionColorClass(kw.position)}`}>
                    #{kw.position.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                  {kw.impressions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                  {(kw.ctr * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{suggestedAction(kw.position)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Tab 4: Google Search Console Setup
// ============================================================
function SetupTab({
  connectionStatus,
  authUrl,
}: {
  connectionStatus: ConnectionStatus
  authUrl: string | null
}) {
  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h3>

        {connectionStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
              <svg className="w-8 h-8 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-emerald-800">Google Search Console Connected</p>
                <p className="text-sm text-emerald-700">Data is being synced automatically via the daily cron job.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Sync</p>
                <p className="text-sm font-medium text-gray-900">
                  {connectionStatus.lastSyncAt
                    ? formatDate(connectionStatus.lastSyncAt)
                    : 'Never synced'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-sm font-medium text-gray-900">
                  {connectionStatus.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            {connectionStatus.lastError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Last Error</p>
                <p className="text-sm text-red-700 mt-1">{connectionStatus.lastError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div>
                <p className="font-semibold text-gray-900">Not Connected</p>
                <p className="text-sm text-gray-600">Connect Google Search Console to start tracking search performance data.</p>
              </div>
            </div>

            {authUrl ? (
              <a
                href={authUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Google Search Console
              </a>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">OAuth credentials not configured</p>
                <p className="text-sm text-amber-700 mt-1">Set the environment variables listed below to enable the Connect button.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Create Google Cloud Project</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Go to the Google Cloud Console and create a new project (or use an existing one).
                Enable the &quot;Google Search Console API&quot; in the API library.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Configure OAuth Credentials</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Create OAuth 2.0 credentials (Web Application type). Add the redirect URI:
              </p>
              <code className="block mt-1 text-xs bg-gray-100 text-gray-800 px-3 py-2 rounded-lg font-mono">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/api/admin/marketing/seo/oauth`
                  : 'https://your-domain.com/api/admin/marketing/seo/oauth'}
              </code>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Set Environment Variables</p>
              <p className="text-sm text-gray-600 mt-0.5">Add these to your Vercel environment or <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">.env.local</code>:</p>
              <div className="mt-2 bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono space-y-1">
                <p><span className="text-emerald-400">GOOGLE_CLIENT_ID</span>=your-client-id.apps.googleusercontent.com</p>
                <p><span className="text-emerald-400">GOOGLE_CLIENT_SECRET</span>=your-client-secret</p>
                <p><span className="text-emerald-400">GOOGLE_SEARCH_CONSOLE_SITE_URL</span>=https://wallawalla.travel</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">4</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Connect and Authorize</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Click the &quot;Connect Google Search Console&quot; button above.
                Sign in with the Google account that owns the Search Console property.
                Data will begin syncing the next time the daily cron runs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
