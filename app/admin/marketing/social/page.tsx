'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'

interface ScheduledPost {
  id: number
  content: string
  media_urls: string[]
  hashtags: string[]
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok'
  scheduled_for: string
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled'
  impressions: number
  engagement: number
  content_type?: string
  winery_id?: number
  created_at?: string
}

interface NewPost {
  content: string
  media_urls: string[]
  hashtags: string
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok'
  scheduled_date: string
  scheduled_time: string
}

export default function SocialMediaScheduler() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')

  // New post form state
  const [newPost, setNewPost] = useState<NewPost>({
    content: '',
    media_urls: [],
    hashtags: '',
    platform: 'instagram',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '19:00',
  })

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterPlatform !== 'all') params.set('platform', filterPlatform)

      // For calendar view, get posts for a wider range
      const start = format(addDays(weekStart, -7), 'yyyy-MM-dd')
      const end = format(addDays(weekEnd, 14), 'yyyy-MM-dd')
      params.set('start_date', start)
      params.set('end_date', end)

      const response = await fetch(`/api/admin/marketing/social-posts?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch posts')
      }

      const data = await response.json()
      setPosts(data.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPlatform, weekStart, weekEnd])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Create new post
  const handleCreatePost = async (status: 'draft' | 'scheduled') => {
    if (!newPost.content.trim()) {
      setError('Content is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const scheduledFor = new Date(`${newPost.scheduled_date}T${newPost.scheduled_time}:00`)

      const response = await fetch('/api/admin/marketing/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPost.content,
          media_urls: newPost.media_urls,
          hashtags: newPost.hashtags
            .split(/[,\s]+/)
            .map(tag => tag.replace(/^#/, '').trim())
            .filter(Boolean),
          platform: newPost.platform,
          scheduled_for: scheduledFor.toISOString(),
          timezone: 'America/Los_Angeles',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create post')
      }

      // Reset form and close modal
      setNewPost({
        content: '',
        media_urls: [],
        hashtags: '',
        platform: 'instagram',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '19:00',
      })
      setShowComposeModal(false)
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setSaving(false)
    }
  }

  // Update post
  const handleUpdatePost = async (id: number, updates: Partial<ScheduledPost>) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/marketing/social-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update post')
      }

      setEditingPost(null)
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  // Delete post (update status to cancelled)
  const handleDeletePost = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await handleUpdatePost(id, { status: 'cancelled' as 'draft' })
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  // Duplicate post
  const handleDuplicatePost = (post: ScheduledPost) => {
    setNewPost({
      content: post.content,
      media_urls: post.media_urls || [],
      hashtags: post.hashtags?.join(', ') || '',
      platform: post.platform,
      scheduled_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      scheduled_time: format(new Date(post.scheduled_for), 'HH:mm'),
    })
    setShowComposeModal(true)
  }

  const getPlatformInfo = (platform: string) => {
    const platforms: Record<string, { emoji: string; color: string; name: string }> = {
      instagram: { emoji: '📸', color: 'bg-pink-500', name: 'Instagram' },
      facebook: { emoji: '👥', color: 'bg-blue-600', name: 'Facebook' },
      linkedin: { emoji: '💼', color: 'bg-blue-700', name: 'LinkedIn' },
      tiktok: { emoji: '🎵', color: 'bg-black', name: 'TikTok' },
    }
    return platforms[platform] || platforms.instagram
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-green-100 text-green-700',
      published: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-400',
    }
    return styles[status] || styles.draft
  }

  const getPostsForDay = (date: Date) => {
    return posts.filter(post =>
      post.status !== 'cancelled' &&
      isSameDay(new Date(post.scheduled_for), date)
    )
  }

  // Count posts by platform (excluding cancelled)
  const platformCounts = posts.reduce((acc, post) => {
    if (post.status !== 'cancelled') {
      acc[post.platform] = (acc[post.platform] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Social Media</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Social Media Scheduler</h1>
            <p className="text-gray-600 mt-1">Plan and schedule your social content</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/marketing/settings"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <span>⚙️</span> Settings
            </Link>
            <button
              onClick={() => {
                setNewPost({
                  ...newPost,
                  scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
                })
                setShowComposeModal(true)
              }}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 flex items-center gap-2"
            >
              <span>+</span> Create Post
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Platform Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['instagram', 'facebook', 'linkedin', 'tiktok'].map((platform) => {
            const info = getPlatformInfo(platform)
            const count = platformCounts[platform] || 0
            return (
              <div key={platform} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 ${info.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white">{info.emoji}</span>
                  </div>
                  <span className="font-medium text-gray-900">{info.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{count} scheduled</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'calendar' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📅 Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 List
              </button>
            </div>
            {view === 'list' && (
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="px-3 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
            >
              ←
            </button>
            <span className="text-sm font-medium text-gray-700">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="px-3 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
            >
              →
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading posts...</p>
          </div>
        )}

        {/* Calendar View */}
        {!loading && view === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-3 text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-lg font-semibold ${
                    isSameDay(day, new Date()) ? 'text-pink-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Week Body */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day) => {
                const dayPosts = getPostsForDay(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 border-r border-gray-100 last:border-r-0 ${
                      isSameDay(day, new Date()) ? 'bg-pink-50/50' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      {dayPosts.map((post) => {
                        const platform = getPlatformInfo(post.platform)
                        return (
                          <div
                            key={post.id}
                            onClick={() => setEditingPost(post)}
                            className={`p-2 rounded-lg ${platform.color} bg-opacity-10 border-l-2 cursor-pointer hover:bg-opacity-20 transition-colors`}
                            style={{ borderColor: platform.color.replace('bg-', '') }}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs">{platform.emoji}</span>
                              <span className="text-xs font-medium text-gray-700">
                                {format(new Date(post.scheduled_for), 'h:mm a')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {post.content.substring(0, 50)}...
                            </p>
                            <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(post.status)}`}>
                              {post.status}
                            </span>
                          </div>
                        )
                      })}
                      {dayPosts.length === 0 && (
                        <button
                          onClick={() => {
                            setNewPost({
                              ...newPost,
                              scheduled_date: format(day, 'yyyy-MM-dd'),
                            })
                            setShowComposeModal(true)
                          }}
                          className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm hover:border-pink-300 hover:text-pink-500 transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {!loading && view === 'list' && (
          <div className="space-y-4">
            {posts.filter(p => p.status !== 'cancelled').length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts scheduled</h3>
                <p className="text-gray-500 mb-4">Create your first post to get started</p>
                <button
                  onClick={() => setShowComposeModal(true)}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              posts.filter(p => p.status !== 'cancelled').map((post) => {
                const platform = getPlatformInfo(post.platform)
                return (
                  <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex">
                      {/* Platform Badge */}
                      <div className={`w-1 ${platform.color}`}></div>

                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center`}>
                              <span className="text-white text-sm">{platform.emoji}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{platform.name}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(post.scheduled_for), 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(post.status)}`}>
                            {post.status}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-3">{post.content}</p>

                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-blue-600">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingPost(post)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDuplicatePost(post)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            📋 Duplicate
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Best Times Insights */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Best Times to Post</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-pink-50 rounded-lg">
              <p className="text-sm font-medium text-pink-800">Instagram</p>
              <p className="text-lg font-bold text-gray-900">7:00 PM</p>
              <p className="text-xs text-gray-500">Thu, Fri best days</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Facebook</p>
              <p className="text-lg font-bold text-gray-900">1:00 PM</p>
              <p className="text-xs text-gray-500">Wed, Thu best days</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">LinkedIn</p>
              <p className="text-lg font-bold text-gray-900">10:00 AM</p>
              <p className="text-xs text-gray-500">Tue, Wed best days</p>
            </div>
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-sm font-medium text-gray-300">TikTok</p>
              <p className="text-lg font-bold text-white">8:00 PM</p>
              <p className="text-xs text-gray-400">Weekends best</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create New Post</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['instagram', 'facebook', 'linkedin', 'tiktok'] as const).map((p) => {
                    const info = getPlatformInfo(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPost({ ...newPost, platform: p })}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center transition-colors ${
                          newPost.platform === p
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{info.emoji}</span>
                        <span className="text-xs text-gray-600">{info.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  rows={5}
                  placeholder="What's happening in wine country?"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">{newPost.content.length} characters</p>
              </div>

              {/* Media */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <span className="text-3xl mb-2 block">📷</span>
                  <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">Coming soon: Media library integration</p>
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                <input
                  type="text"
                  value={newPost.hashtags}
                  onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="#WallaWallaWine, #WineCountry"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={newPost.scheduled_date}
                    onChange={(e) => setNewPost({ ...newPost, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={newPost.scheduled_time}
                    onChange={(e) => setNewPost({ ...newPost, scheduled_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowComposeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreatePost('draft')}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleCreatePost('scheduled')}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {saving ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit Post</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  rows={5}
                ></textarea>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                <input
                  type="text"
                  value={editingPost.hashtags?.join(', ') || ''}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    hashtags: e.target.value.split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean) as string[]
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={format(new Date(editingPost.scheduled_for), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const time = format(new Date(editingPost.scheduled_for), 'HH:mm')
                      const newDate = new Date(`${e.target.value}T${time}:00`)
                      setEditingPost({ ...editingPost, scheduled_for: newDate.toISOString() })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={format(new Date(editingPost.scheduled_for), 'HH:mm')}
                    onChange={(e) => {
                      const date = format(new Date(editingPost.scheduled_for), 'yyyy-MM-dd')
                      const newDate = new Date(`${date}T${e.target.value}:00`)
                      setEditingPost({ ...editingPost, scheduled_for: newDate.toISOString() })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editingPost.status}
                  onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value as ScheduledPost['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEditingPost(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePost(editingPost.id, {
                  content: editingPost.content,
                  hashtags: editingPost.hashtags,
                  scheduled_for: editingPost.scheduled_for,
                  status: editingPost.status,
                })}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
