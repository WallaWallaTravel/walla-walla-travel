'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'

interface ScheduledPost {
  id: number
  content: string
  media_urls: string[]
  hashtags: string[]
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok'
  scheduled_for: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  impressions: number
  engagement: number
}

export default function SocialMediaScheduler() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showComposeModal, setShowComposeModal] = useState(false)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    setTimeout(() => {
      setPosts([
        {
          id: 1,
          content: 'Just wrapped up an incredible day in Walla Walla wine country! Our guests from Seattle spent 6 hours exploring three amazing wineries. ✨🍷',
          media_urls: ['/images/winery-tour.jpg'],
          hashtags: ['WallaWallaWine', 'WineCountry', 'WashingtonWine'],
          platform: 'instagram',
          scheduled_for: format(addDays(new Date(), 1), "yyyy-MM-dd'T'19:00:00"),
          status: 'scheduled',
          impressions: 0,
          engagement: 0,
        },
        {
          id: 2,
          content: 'Planning a corporate event? Our team-building wine tours combine the best of Walla Walla with unforgettable experiences. 🍷',
          media_urls: [],
          hashtags: ['CorporateEvents', 'TeamBuilding'],
          platform: 'linkedin',
          scheduled_for: format(addDays(new Date(), 2), "yyyy-MM-dd'T'10:00:00"),
          status: 'scheduled',
          impressions: 0,
          engagement: 0,
        },
        {
          id: 3,
          content: 'Weekend vibes in wine country 🌅🍇 Who else loves a sunset tasting?',
          media_urls: ['/images/sunset-vineyard.jpg'],
          hashtags: ['WineLife', 'WeekendGetaway'],
          platform: 'instagram',
          scheduled_for: format(addDays(new Date(), 3), "yyyy-MM-dd'T'18:30:00"),
          status: 'draft',
          impressions: 0,
          engagement: 0,
        },
        {
          id: 4,
          content: 'Behind the scenes: Our drivers getting ready for another amazing day of wine tours! 🚐✨',
          media_urls: ['/images/driver-prep.jpg'],
          hashtags: ['BehindTheScenes', 'WineTour'],
          platform: 'facebook',
          scheduled_for: format(addDays(new Date(), 4), "yyyy-MM-dd'T'09:00:00"),
          status: 'scheduled',
          impressions: 0,
          engagement: 0,
        },
        {
          id: 5,
          content: 'What makes Walla Walla wine so special? Thread 🧵👇',
          media_urls: [],
          hashtags: ['WineEducation', 'WallaWalla'],
          platform: 'linkedin',
          scheduled_for: format(addDays(new Date(), 5), "yyyy-MM-dd'T'12:00:00"),
          status: 'scheduled',
          impressions: 0,
          engagement: 0,
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

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
    }
    return styles[status] || styles.draft
  }

  const getPostsForDay = (date: Date) => {
    return posts.filter(post => isSameDay(new Date(post.scheduled_for), date))
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
              <span>Social Media</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">📱 Social Media Scheduler</h1>
            <p className="text-gray-600 mt-1">Plan and schedule your social content</p>
          </div>
          <button
            onClick={() => setShowComposeModal(true)}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 flex items-center gap-2"
          >
            <span>+</span> Create Post
          </button>
        </div>

        {/* Platform Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['instagram', 'facebook', 'linkedin', 'tiktok'].map((platform) => {
            const info = getPlatformInfo(platform)
            const platformPosts = posts.filter(p => p.platform === platform)
            return (
              <div key={platform} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 ${info.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white">{info.emoji}</span>
                  </div>
                  <span className="font-medium text-gray-900">{info.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{platformPosts.length} scheduled</span>
                  <span className="text-green-600">+12% reach</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Calendar View */}
        {view === 'calendar' && (
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
                            setSelectedDate(day)
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
        {view === 'list' && (
          <div className="space-y-4">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts scheduled</h3>
                <button
                  onClick={() => setShowComposeModal(true)}
                  className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              posts.map((post) => {
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

                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-blue-600">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <button className="text-sm text-gray-600 hover:text-gray-900">✏️ Edit</button>
                          <button className="text-sm text-gray-600 hover:text-gray-900">📋 Duplicate</button>
                          <button className="text-sm text-red-600 hover:text-red-700">🗑️ Delete</button>
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
                  {['instagram', 'facebook', 'linkedin', 'tiktok'].map((p) => {
                    const info = getPlatformInfo(p)
                    return (
                      <button
                        key={p}
                        className={`p-3 rounded-lg border-2 border-gray-200 hover:border-pink-300 flex flex-col items-center`}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
                  rows={5}
                  placeholder="What's happening in wine country? ✨"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">280 characters recommended</p>
              </div>

              {/* Media */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <span className="text-3xl mb-2 block">📷</span>
                  <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="#WallaWallaWine #WineCountry"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    defaultValue={format(selectedDate, 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    defaultValue="19:00"
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
              <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Save Draft
              </button>
              <button className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

