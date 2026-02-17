'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BlogDraft {
  id: number
  title: string
  slug: string
  meta_description: string
  target_keywords: string[]
  content?: string
  word_count: number
  estimated_read_time: number
  json_ld?: Record<string, unknown>
  category: string
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
  seo_score: number | null
  readability_score: number | null
  published_at: string | null
  created_at: string
  updated_at: string
  created_by_name: string | null
}

interface TrendingTopic {
  id: number
  topic: string
  category: string
  summary: string
  relevance_score: number
  suggested_content: string
  suggested_angle: string
  status: 'new' | 'actioned' | 'dismissed' | 'expired'
  detected_at: string
}

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  review: { label: 'In Review', classes: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-800' },
  published: { label: 'Published', classes: 'bg-blue-100 text-blue-800' },
  archived: { label: 'Archived', classes: 'bg-gray-100 text-gray-600' },
}

const CATEGORY_OPTIONS = [
  'wine-tourism',
  'travel-guide',
  'winery-spotlight',
  'food-and-wine',
  'seasonal',
  'events',
  'tips-and-advice',
  'wine-education',
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'sophisticated', label: 'Sophisticated' },
  { value: 'educational', label: 'Educational' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
]

function getSeoScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-500'
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-amber-700'
  return 'text-red-700'
}

function getSeoScoreBg(score: number | null): string {
  if (score === null) return 'bg-gray-100'
  if (score >= 80) return 'bg-emerald-50'
  if (score >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BlogDashboard() {
  const [drafts, setDrafts] = useState<BlogDraft[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // View state
  const [activeTab, setActiveTab] = useState<'drafts' | 'trending'>('drafts')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDraft, setSelectedDraft] = useState<BlogDraft | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Generator form
  const [showGenerator, setShowGenerator] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formKeywords, setFormKeywords] = useState('')
  const [formCategory, setFormCategory] = useState('wine-tourism')
  const [formTone, setFormTone] = useState('professional')
  const [formWordCount, setFormWordCount] = useState(1500)

  const fetchDrafts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/marketing/blog-generator?${params}`)
      if (!res.ok) throw new Error('Failed to load drafts')
      const data = await res.json()
      setDrafts(data.drafts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog drafts')
    }
  }, [statusFilter])

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/marketing/trending?status=new')
      if (!res.ok) throw new Error('Failed to load trending topics')
      const data = await res.json()
      setTrendingTopics(data.topics || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending topics')
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchDrafts(), fetchTrending()]).finally(() => setLoading(false))
  }, [fetchDrafts, fetchTrending])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formTitle.trim()) {
      setError('Title is required')
      return
    }

    const keywords = formKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)

    if (keywords.length === 0) {
      setError('At least one keyword is required')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/marketing/blog-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          targetKeywords: keywords,
          category: formCategory,
          tone: formTone,
          wordCountTarget: formWordCount,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to generate article')
      }

      const data = await res.json()
      setSuccess('Article generated successfully!')
      setTimeout(() => setSuccess(null), 4000)

      setShowGenerator(false)
      setFormTitle('')
      setFormKeywords('')

      await fetchDrafts()
      setSelectedDraft(data.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate article')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateFromTopic = (topic: TrendingTopic) => {
    setFormTitle(topic.topic)
    setFormKeywords(topic.topic.toLowerCase())
    setFormCategory(
      topic.category === 'wine' ? 'wine-tourism' :
      topic.category === 'food' ? 'food-and-wine' :
      topic.category === 'events' ? 'events' :
      topic.category === 'seasonal' ? 'seasonal' :
      topic.category === 'travel' ? 'travel-guide' :
      'wine-tourism'
    )
    setShowGenerator(true)
    setActiveTab('drafts')
  }

  const handleStatusChange = async (draftId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/marketing/blog-generator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setSuccess(`Draft moved to ${newStatus}`)
      setTimeout(() => setSuccess(null), 3000)

      await fetchDrafts()

      if (selectedDraft?.id === draftId) {
        setSelectedDraft(prev => prev ? { ...prev, status: newStatus as BlogDraft['status'] } : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDismissTopic = async (topicId: number) => {
    try {
      await fetch('/api/admin/marketing/trending', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topicId, status: 'dismissed' }),
      })
      setTrendingTopics(prev => prev.filter(t => t.id !== topicId))
    } catch {
      setError('Failed to dismiss topic')
    }
  }

  const loadDraftPreview = async (draftId: number) => {
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/marketing/blog-generator?id=${draftId}`)
      if (!res.ok) throw new Error('Failed to load draft')
      const data = await res.json()
      setSelectedDraft(data.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft')
    } finally {
      setPreviewLoading(false)
    }
  }

  const statusWorkflow: Record<string, string[]> = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'review'],
    published: ['archived'],
    archived: ['draft'],
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-indigo-600">Marketing</Link>
              <span>/</span>
              <span>Blog</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Content</h1>
            <p className="text-gray-700 mt-1">Generate and manage long-form SEO content</p>
          </div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm"
          >
            Generate New Article
          </button>
        </div>

        {/* Success / Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-emerald-800">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800 text-sm">Dismiss</button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-sm">Dismiss</button>
          </div>
        )}

        {/* Generator Form */}
        {showGenerator && (
          <div className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Article</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label htmlFor="blog-title" className="block text-sm font-medium text-gray-900 mb-1">Article Title</label>
                <input
                  id="blog-title"
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. The Ultimate Guide to Walla Walla Wine Tasting"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="blog-keywords" className="block text-sm font-medium text-gray-900 mb-1">Target Keywords (comma-separated)</label>
                <input
                  id="blog-keywords"
                  type="text"
                  value={formKeywords}
                  onChange={e => setFormKeywords(e.target.value)}
                  placeholder="e.g. Walla Walla wine tasting, wine country guide, best wineries"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="blog-category" className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                  <select
                    id="blog-category"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="blog-tone" className="block text-sm font-medium text-gray-900 mb-1">Tone</label>
                  <select
                    id="blog-tone"
                    value={formTone}
                    onChange={e => setFormTone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TONE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="blog-wordcount" className="block text-sm font-medium text-gray-900 mb-1">Target Word Count</label>
                  <select
                    id="blog-wordcount"
                    value={formWordCount}
                    onChange={e => setFormWordCount(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1000}>~1,000 words</option>
                    <option value={1500}>~1,500 words</option>
                    <option value={2000}>~2,000 words</option>
                    <option value={2500}>~2,500 words</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Article'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                {generating && (
                  <p className="text-sm text-gray-600">This may take 30-60 seconds...</p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'drafts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Blog Drafts ({drafts.length})
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'trending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trending Topics ({trendingTopics.length})
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700">Loading content...</p>
          </div>
        )}

        {/* Drafts Tab */}
        {!loading && activeTab === 'drafts' && (
          <div className="flex gap-6">
            {/* Draft List */}
            <div className={`${selectedDraft ? 'w-1/2' : 'w-full'}`}>
              {/* Status Filter */}
              <div className="flex gap-2 mb-4">
                {['all', 'draft', 'review', 'approved', 'published'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'All' : (STATUS_LABELS[s]?.label || s)}
                  </button>
                ))}
              </div>

              {/* Empty State */}
              {drafts.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No blog drafts yet</h3>
                  <p className="text-gray-700 mb-6">Generate your first article to get started with SEO content.</p>
                  <button
                    onClick={() => setShowGenerator(true)}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm"
                  >
                    Generate New Article
                  </button>
                </div>
              )}

              {/* Draft Cards */}
              <div className="space-y-3">
                {drafts.map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => loadDraftPreview(draft.id)}
                    className={`w-full text-left bg-white rounded-xl border shadow-sm p-4 hover:border-indigo-300 transition-colors ${
                      selectedDraft?.id === draft.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{draft.title}</h3>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">{draft.meta_description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_LABELS[draft.status]?.classes || 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_LABELS[draft.status]?.label || draft.status}
                          </span>
                          <span className="text-xs text-gray-600">{draft.word_count.toLocaleString()} words</span>
                          <span className="text-xs text-gray-600">{draft.estimated_read_time} min read</span>
                          {draft.seo_score !== null && (
                            <span className={`text-xs font-medium ${getSeoScoreColor(draft.seo_score)}`}>
                              SEO: {draft.seo_score}/100
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(draft.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Draft Preview */}
            {selectedDraft && (
              <div className="w-1/2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-4">
                  {/* Preview Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">{selectedDraft.title}</h2>
                      <button
                        onClick={() => setSelectedDraft(null)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded"
                        aria-label="Close preview"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_LABELS[selectedDraft.status]?.classes || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[selectedDraft.status]?.label || selectedDraft.status}
                      </span>
                      <span className="text-gray-700">{selectedDraft.word_count.toLocaleString()} words</span>
                      <span className="text-gray-700">{selectedDraft.estimated_read_time} min read</span>
                      {selectedDraft.seo_score !== null && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeoScoreColor(selectedDraft.seo_score)} ${getSeoScoreBg(selectedDraft.seo_score)}`}>
                          SEO: {selectedDraft.seo_score}/100
                        </span>
                      )}
                    </div>

                    {/* Keywords */}
                    {selectedDraft.target_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {selectedDraft.target_keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{kw}</span>
                        ))}
                      </div>
                    )}

                    {/* Meta description */}
                    {selectedDraft.meta_description && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-0.5">Meta Description ({selectedDraft.meta_description.length} chars)</p>
                        <p className="text-sm text-gray-800">{selectedDraft.meta_description}</p>
                      </div>
                    )}

                    {/* Status Actions */}
                    {statusWorkflow[selectedDraft.status] && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-600">Move to:</span>
                        {statusWorkflow[selectedDraft.status].map(nextStatus => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusChange(selectedDraft.id, nextStatus)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              nextStatus === 'published'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : nextStatus === 'approved'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : nextStatus === 'review'
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {STATUS_LABELS[nextStatus]?.label || nextStatus}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Article Content */}
                  <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      </div>
                    ) : selectedDraft.content ? (
                      <article className="prose prose-gray max-w-none">
                        <MarkdownRenderer content={selectedDraft.content} />
                      </article>
                    ) : (
                      <p className="text-gray-600 text-center py-8">Content not loaded. Click the draft to load the preview.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trending Topics Tab */}
        {!loading && activeTab === 'trending' && (
          <div>
            {trendingTopics.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No trending topics right now</h3>
                <p className="text-gray-700">Trending topics are detected weekly on Mondays. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingTopics.map(topic => (
                  <div key={topic.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{topic.topic}</h3>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                            {topic.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{topic.summary}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {topic.suggested_content && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-600 mb-1">Suggested Content</p>
                              <p className="text-sm text-gray-800">{topic.suggested_content}</p>
                            </div>
                          )}
                          {topic.suggested_angle && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-600 mb-1">Walla Walla Angle</p>
                              <p className="text-sm text-gray-800">{topic.suggested_angle}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                          topic.relevance_score >= 8 ? 'bg-emerald-50 text-emerald-700' :
                          topic.relevance_score >= 5 ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {topic.relevance_score}
                        </div>
                        <span className="text-xs text-gray-500">Relevance</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleGenerateFromTopic(topic)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                      >
                        Generate Blog Article
                      </button>
                      <button
                        onClick={() => handleDismissTopic(topic.id)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                      >
                        Dismiss
                      </button>
                      <span className="text-xs text-gray-500 ml-auto">
                        Detected {formatDate(topic.detected_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-2">{line.replace('### ', '')}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-semibold text-gray-900 mt-8 mb-3">{line.replace('## ', '')}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{line.replace('# ', '')}</h1>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 mb-4 text-gray-700">
          {items.map((item, idx) => <li key={idx}>{formatInlineMarkdown(item)}</li>)}
        </ul>
      )
      continue
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 mb-4 text-gray-700">
          {items.map((item, idx) => <li key={idx}>{formatInlineMarkdown(item)}</li>)}
        </ol>
      )
      continue
    } else if (line.trim() === '') {
      // Skip empty lines
    } else {
      elements.push(<p key={i} className="text-gray-700 leading-relaxed mb-4">{formatInlineMarkdown(line)}</p>)
    }

    i++
  }

  return <>{elements}</>
}

function formatInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)

    if (boldMatch && boldMatch.index !== undefined && (!italicMatch || !italicMatch.index || boldMatch.index <= italicMatch.index)) {
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index))
      }
      parts.push(<strong key={key++} className="font-semibold text-gray-900">{boldMatch[1]}</strong>)
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length)
    } else if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(remaining.substring(0, italicMatch.index))
      }
      parts.push(<em key={key++}>{italicMatch[1]}</em>)
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length)
    } else {
      parts.push(remaining)
      remaining = ''
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}
