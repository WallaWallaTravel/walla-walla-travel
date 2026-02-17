'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface ContentSuggestion {
  id: number
  suggestion_date: string
  platform: 'instagram' | 'facebook' | 'linkedin'
  content_type: string
  winery_id: number | null
  winery_name: string | null
  suggested_content: string
  suggested_hashtags: string[]
  suggested_time: string
  reasoning: string
  data_sources: Array<{ type: string; detail: string }>
  priority: number
  suggested_media_urls: string[]
  media_source: 'library' | 'unsplash' | 'none'
  image_search_query: string | null
  status: 'pending' | 'accepted' | 'modified' | 'dismissed' | 'expired'
  created_at: string
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Fetch suggestions
  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/admin/marketing/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch {
      setError('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  // Accept suggestion - create scheduled post
  const handleAccept = async (suggestion: ContentSuggestion) => {
    setProcessing(suggestion.id)
    setError(null)

    try {
      // Create scheduled post
      const response = await fetch('/api/admin/marketing/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: suggestion.suggested_content,
          media_urls: suggestion.suggested_media_urls,
          hashtags: suggestion.suggested_hashtags,
          platform: suggestion.platform,
          scheduled_for: suggestion.suggested_time,
          content_type: suggestion.content_type,
          winery_id: suggestion.winery_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create post')
      }

      const postData = await response.json()

      // Update suggestion status
      await fetch('/api/admin/marketing/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: suggestion.id,
          status: 'accepted',
          scheduled_post_id: postData.post.id,
        }),
      })

      setSuccess('Post scheduled successfully!')
      setTimeout(() => setSuccess(null), 3000)

      // Remove from list (use functional form to avoid stale closure)
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept suggestion')
    } finally {
      setProcessing(null)
    }
  }

  // Dismiss suggestion
  const handleDismiss = async (suggestionId: number) => {
    setProcessing(suggestionId)

    try {
      await fetch('/api/admin/marketing/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: suggestionId,
          status: 'dismissed',
        }),
      })

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch {
      setError('Failed to dismiss suggestion')
    } finally {
      setProcessing(null)
    }
  }

  // Manually trigger suggestion generation
  const handleGenerateNew = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/cron/generate-suggestions', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Generated ${data.count} new suggestions!`)
        setTimeout(() => setSuccess(null), 3000)
        fetchSuggestions()
      } else {
        throw new Error('Failed to generate suggestions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setGenerating(false)
    }
  }

  const getPlatformInfo = (platform: string) => {
    const platforms: Record<string, { emoji: string; color: string; name: string }> = {
      instagram: { emoji: '📸', color: 'bg-gradient-to-br from-purple-500 to-pink-500', name: 'Instagram' },
      facebook: { emoji: '👥', color: 'bg-blue-600', name: 'Facebook' },
      linkedin: { emoji: '💼', color: 'bg-blue-700', name: 'LinkedIn' },
    }
    return platforms[platform] || { emoji: '🔗', color: 'bg-gray-500', name: platform }
  }

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wine_spotlight: 'Wine Spotlight',
      event_promo: 'Event Promo',
      seasonal: 'Seasonal',
      educational: 'Educational',
      behind_scenes: 'Behind the Scenes',
      customer_story: 'Customer Story',
      general: 'General',
    }
    return labels[type] || type
  }

  const getDataSourceIcon = (type: string) => {
    const icons: Record<string, string> = {
      events: '📅',
      competitors: '📊',
      seasonal: '🌸',
      content_gap: '📈',
    }
    return icons[type] || '📋'
  }

  // Group suggestions by date
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const date = suggestion.suggestion_date
    if (!acc[date]) acc[date] = []
    acc[date].push(suggestion)
    return acc
  }, {} as Record<string, ContentSuggestion[]>)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Suggestions</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Content Suggestions</h1>
            <p className="text-gray-600 mt-1">AI-generated content ideas backed by real data</p>
          </div>
          <button
            onClick={handleGenerateNew}
            disabled={generating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span>🪄</span> Generate New
              </>
            )}
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading suggestions...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && suggestions.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">💡</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending suggestions</h3>
            <p className="text-gray-500 mb-6">
              Suggestions are generated daily at 6 AM, or you can generate them manually.
            </p>
            <button
              onClick={handleGenerateNew}
              disabled={generating}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              Generate Suggestions Now
            </button>
          </div>
        )}

        {/* Suggestions List */}
        {!loading && Object.entries(groupedSuggestions).map(([date, dateSuggestions]) => (
          <div key={date} className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              <span className="ml-2 text-gray-600">
                ({dateSuggestions.length} suggestion{dateSuggestions.length !== 1 ? 's' : ''})
              </span>
            </h2>

            <div className="space-y-4">
              {dateSuggestions.map(suggestion => {
                const platformInfo = getPlatformInfo(suggestion.platform)

                return (
                  <div key={suggestion.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${platformInfo.color} rounded-lg flex items-center justify-center`}>
                            <span className="text-white text-lg">{platformInfo.emoji}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{platformInfo.name}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {getContentTypeLabel(suggestion.content_type)}
                              </span>
                              {suggestion.winery_name && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  {suggestion.winery_name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Suggested for {format(new Date(suggestion.suggested_time), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            suggestion.priority >= 8 ? 'bg-red-100 text-red-700' :
                            suggestion.priority >= 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Priority: {suggestion.priority}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="p-4 bg-gray-50 rounded-lg mb-4">
                        <p className="text-gray-800 whitespace-pre-wrap">{suggestion.suggested_content}</p>
                      </div>

                      {/* Hashtags */}
                      {suggestion.suggested_hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {suggestion.suggested_hashtags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              #{tag.replace(/^#/, '')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reasoning */}
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 mb-4">
                        <p className="text-sm font-medium text-purple-900 mb-1">💡 Why this suggestion:</p>
                        <p className="text-sm text-purple-800">{suggestion.reasoning}</p>
                      </div>

                      {/* Data Sources */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {suggestion.data_sources.map((source, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            <span>{getDataSourceIcon(source.type)}</span>
                            {source.detail}
                          </span>
                        ))}
                      </div>

                      {/* Media preview */}
                      <div className="mb-4">
                        {suggestion.media_source === 'library' && suggestion.suggested_media_urls.length > 0 ? (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">From your media library</p>
                            <div className="flex gap-2 overflow-x-auto">
                              {suggestion.suggested_media_urls.slice(0, 3).map((url, i) => (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  key={i}
                                  src={url}
                                  alt={`Suggested media ${i + 1}`}
                                  className="w-24 h-24 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        ) : suggestion.media_source === 'unsplash' && suggestion.suggested_media_urls.length > 0 ? (
                          <div>
                            <div className="flex gap-3 items-start">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={suggestion.suggested_media_urls[0]}
                                alt={suggestion.image_search_query || 'Unsplash photo'}
                                className="w-32 h-24 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-600 mb-1">From Unsplash</p>
                                {suggestion.data_sources
                                  .filter((s) => s.type === 'unsplash')
                                  .map((s, i) => (
                                    <p key={i} className="text-xs text-gray-500">{s.detail}</p>
                                  ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 flex-shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">No image available</p>
                              <p className="text-xs text-gray-500">
                                <Link href="/admin/media/upload" className="text-purple-600 hover:text-purple-700 underline">
                                  Add photos to your library
                                </Link>
                                {' '}for automatic image matching
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handleAccept(suggestion)}
                        disabled={processing === suggestion.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing === suggestion.id ? 'Scheduling...' : '✓ Accept & Schedule'}
                      </button>
                      <Link
                        href={`/admin/marketing/ai-generator?content=${encodeURIComponent(suggestion.suggested_content)}&platform=${suggestion.platform}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                      >
                        ✏️ Modify
                      </Link>
                      <button
                        onClick={() => handleDismiss(suggestion.id)}
                        disabled={processing === suggestion.id}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
