'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'

interface ContentItem {
  id: number
  title: string
  description: string
  content_type: 'post' | 'story' | 'reel' | 'video' | 'carousel' | 'article' | 'ad' | 'email'
  platforms: string[]
  status: 'idea' | 'planned' | 'in_progress' | 'ready' | 'scheduled' | 'published'
  planned_date: string
  assigned_to: string | null
  goal: string | null
  color: string
}

export default function ContentCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'list'>('month')

  // Calculate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  useEffect(() => {
    setTimeout(() => {
      setContent([
        {
          id: 1,
          title: 'Holiday Wine Tour Promo',
          description: 'Promote holiday special pricing',
          content_type: 'post',
          platforms: ['instagram', 'facebook'],
          status: 'scheduled',
          planned_date: '2025-12-01',
          assigned_to: 'Marketing Team',
          goal: 'Drive holiday bookings',
          color: '#EC4899',
        },
        {
          id: 2,
          title: 'Winemaker Interview',
          description: 'Interview with L\'Ecole winemaker',
          content_type: 'video',
          platforms: ['instagram', 'youtube'],
          status: 'in_progress',
          planned_date: '2025-12-03',
          assigned_to: 'Content Creator',
          goal: 'Educational content',
          color: '#8B5CF6',
        },
        {
          id: 3,
          title: 'December Newsletter',
          description: 'Monthly newsletter with events',
          content_type: 'email',
          platforms: ['email'],
          status: 'planned',
          planned_date: '2025-12-01',
          assigned_to: 'Marketing Team',
          goal: 'Engagement',
          color: '#3B82F6',
        },
        {
          id: 4,
          title: 'Behind the Scenes Reel',
          description: 'Day in the life of a wine tour',
          content_type: 'reel',
          platforms: ['instagram', 'tiktok'],
          status: 'idea',
          planned_date: '2025-12-05',
          assigned_to: null,
          goal: 'Brand awareness',
          color: '#10B981',
        },
        {
          id: 5,
          title: 'Customer Testimonial',
          description: 'Feature Johnson wedding party',
          content_type: 'carousel',
          platforms: ['instagram', 'facebook'],
          status: 'ready',
          planned_date: '2025-12-07',
          assigned_to: 'Content Creator',
          goal: 'Social proof',
          color: '#F59E0B',
        },
        {
          id: 6,
          title: 'New Year Promo Launch',
          description: 'NYE special packages',
          content_type: 'ad',
          platforms: ['instagram', 'facebook', 'google'],
          status: 'planned',
          planned_date: '2025-12-15',
          assigned_to: 'Marketing Team',
          goal: 'NYE bookings',
          color: '#EF4444',
        },
        {
          id: 7,
          title: 'Winter Wine Guide',
          description: 'Blog post: Best winter wines',
          content_type: 'article',
          platforms: ['blog', 'linkedin'],
          status: 'in_progress',
          planned_date: '2025-12-10',
          assigned_to: 'Content Writer',
          goal: 'SEO & education',
          color: '#6366F1',
        },
        {
          id: 8,
          title: 'Sunset Vineyard Story',
          description: 'Golden hour at the vineyard',
          content_type: 'story',
          platforms: ['instagram'],
          status: 'idea',
          planned_date: '2025-12-08',
          assigned_to: null,
          goal: 'Engagement',
          color: '#EC4899',
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getContentForDay = (date: Date) => {
    return content.filter(item => isSameDay(new Date(item.planned_date), date))
  }

  const getStatusColor = (status: ContentItem['status']) => {
    const colors: Record<string, string> = {
      idea: 'bg-gray-100 text-gray-600',
      planned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      ready: 'bg-green-100 text-green-700',
      scheduled: 'bg-purple-100 text-purple-700',
      published: 'bg-emerald-100 text-emerald-700',
    }
    return colors[status] || colors.idea
  }

  const getContentTypeIcon = (type: ContentItem['content_type']) => {
    const icons: Record<string, string> = {
      post: '📱',
      story: '📖',
      reel: '🎬',
      video: '🎥',
      carousel: '🎠',
      article: '📝',
      ad: '💰',
      email: '📧',
    }
    return icons[type] || '📋'
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: '📸',
      facebook: '👥',
      linkedin: '💼',
      tiktok: '🎵',
      youtube: '▶️',
      blog: '📰',
      email: '📧',
      google: '🔍',
    }
    return icons[platform] || '🌐'
  }

  // Stats
  const statusCounts = useMemo(() => {
    return {
      idea: content.filter(c => c.status === 'idea').length,
      planned: content.filter(c => c.status === 'planned').length,
      in_progress: content.filter(c => c.status === 'in_progress').length,
      ready: content.filter(c => c.status === 'ready').length,
      scheduled: content.filter(c => c.status === 'scheduled').length,
    }
  }, [content])

  const selectedDayContent = selectedDay ? getContentForDay(selectedDay) : []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Content Calendar</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">📅 Content Calendar</h1>
            <p className="text-gray-600 mt-1">Plan and organize your content strategy</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2"
          >
            <span>+</span> Add Content
          </button>
        </div>

        {/* Status Pipeline */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status as ContentItem['status'])}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="text-2xl font-bold text-gray-900">{count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="px-3 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
            >
              ← Prev
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="px-3 py-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Next →
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200"
            >
              Today
            </button>
          </div>
          <div className="flex gap-2">
            {(['month', 'week', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Week Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dayContent = getContentForDay(day)
                  const isToday = isSameDay(day, new Date())
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = selectedDay && isSameDay(day, selectedDay)

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[120px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      } ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          isToday ? 'w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center' :
                          !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {dayContent.length > 3 && (
                          <span className="text-xs text-gray-500">+{dayContent.length - 3} more</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayContent.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="text-xs px-2 py-1 rounded truncate text-white"
                            style={{ backgroundColor: item.color }}
                            title={item.title}
                          >
                            {getContentTypeIcon(item.content_type)} {item.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="lg:col-span-1">
            {selectedDay ? (
              <div className="bg-white rounded-xl shadow-sm sticky top-4">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">
                    {format(selectedDay, 'EEEE, MMMM d')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDayContent.length} item{selectedDayContent.length !== 1 ? 's' : ''} planned
                  </p>
                </div>

                <div className="p-5">
                  {selectedDayContent.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-2">📭</div>
                      <p className="text-gray-500 text-sm">No content planned</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200"
                      >
                        + Add Content
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayContent.map((item) => (
                        <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span>{getContentTypeIcon(item.content_type)}</span>
                              <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                          <div className="flex items-center gap-1">
                            {item.platforms.map((p) => (
                              <span key={p} className="text-sm" title={p}>
                                {getPlatformIcon(p)}
                              </span>
                            ))}
                          </div>
                          {item.assigned_to && (
                            <p className="text-xs text-gray-500 mt-2">👤 {item.assigned_to}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">
                              Edit
                            </button>
                            <button className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">
                              Move
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center sticky top-4">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-gray-500">Select a day to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Type Legend */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-medium text-gray-900 mb-4">Content Types</h3>
          <div className="flex flex-wrap gap-4">
            {['post', 'story', 'reel', 'video', 'carousel', 'article', 'ad', 'email'].map((type) => (
              <div key={type} className="flex items-center gap-2 text-sm text-gray-600">
                <span>{getContentTypeIcon(type as ContentItem['content_type'])}</span>
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add Content to Calendar</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Content title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Brief description"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="post">📱 Post</option>
                    <option value="story">📖 Story</option>
                    <option value="reel">🎬 Reel</option>
                    <option value="video">🎥 Video</option>
                    <option value="carousel">🎠 Carousel</option>
                    <option value="article">📝 Article</option>
                    <option value="ad">💰 Ad</option>
                    <option value="email">📧 Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="idea">💡 Idea</option>
                    <option value="planned">📋 Planned</option>
                    <option value="in_progress">🔨 In Progress</option>
                    <option value="ready">✅ Ready</option>
                    <option value="scheduled">📅 Scheduled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  defaultValue={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'blog', 'email'].map((p) => (
                    <label key={p} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{getPlatformIcon(p)} {p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Drive bookings, Brand awareness" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                Add Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

