'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { logger } from '@/lib/logger'

interface Winery {
  id: number
  name: string
  slug: string
  city: string
  ava: string
  is_verified: boolean
  is_featured: boolean
  is_active: boolean
  tasting_room_fee: number | null
  reservation_required: boolean
  walk_ins_welcome: boolean
  amenities: string[]
  logo_url: string | null
  hero_image_url: string | null
  featured_photo_override_id: number | null
}

interface MediaItem {
  id: number
  file_name: string
  file_path: string
  title: string | null
  thumbnail_path: string | null
}

export default function WineDirectoryPage() {
  const [wineries, setWineries] = useState<Winery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'featured' | 'verified'>('all')
  const [search, setSearch] = useState('')
  const [selectedWinery, setSelectedWinery] = useState<Winery | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  // Photo picker state
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [internalMedia, setInternalMedia] = useState<MediaItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [updatingPhoto, setUpdatingPhoto] = useState(false)

  useEffect(() => {
    fetchWineries()
  }, [])

  // Fetch internal winery media when photo picker is opened
  const fetchInternalMedia = useCallback(async () => {
    if (internalMedia.length > 0) return // Already loaded

    setLoadingMedia(true)
    try {
      const res = await fetch('/api/media?category=winery&limit=100')
      const data = await res.json()
      if (data.success && data.data) {
        setInternalMedia(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch internal media', { error })
    } finally {
      setLoadingMedia(false)
    }
  }, [internalMedia.length])

  useEffect(() => {
    if (showPhotoPicker) {
      fetchInternalMedia()
    }
  }, [showPhotoPicker, fetchInternalMedia])

  async function fetchWineries() {
    try {
      const res = await fetch('/api/admin/wine-directory')
      const data = await res.json()
      if (data.wineries) {
        setWineries(data.wineries)
      }
    } catch (error) {
      logger.error('Failed to fetch wineries', { error })
    } finally {
      setLoading(false)
    }
  }

  async function toggleFeatured(winery: Winery) {
    setUpdating(winery.id)
    try {
      const res = await fetch(`/api/admin/wine-directory/${winery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !winery.is_featured })
      })

      if (res.ok) {
        // Update local state
        const newFeatured = !winery.is_featured
        setWineries(prev => prev.map(w =>
          w.id === winery.id ? { ...w, is_featured: newFeatured } : w
        ))
        if (selectedWinery?.id === winery.id) {
          setSelectedWinery({ ...selectedWinery, is_featured: newFeatured })
        }
      }
    } catch (error) {
      logger.error('Failed to update winery', { error, wineryId: winery.id })
    } finally {
      setUpdating(null)
    }
  }

  async function setPhotoOverride(winery: Winery, mediaId: number | null) {
    setUpdatingPhoto(true)
    try {
      const res = await fetch(`/api/admin/wine-directory/${winery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_photo_override_id: mediaId })
      })

      if (res.ok) {
        // Update local state
        setWineries(prev => prev.map(w =>
          w.id === winery.id ? { ...w, featured_photo_override_id: mediaId } : w
        ))
        if (selectedWinery?.id === winery.id) {
          setSelectedWinery({ ...selectedWinery, featured_photo_override_id: mediaId })
        }
        setShowPhotoPicker(false)
      }
    } catch (error) {
      logger.error('Failed to update photo override', { error, wineryId: winery.id })
    } finally {
      setUpdatingPhoto(false)
    }
  }

  const filteredWineries = wineries.filter(w => {
    if (filter === 'featured' && !w.is_featured) return false
    if (filter === 'verified' && !w.is_verified) return false
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const getAmenityIcon = (amenity: string) => {
    const icons: Record<string, string> = {
      picnic_area: '🧺',
      dog_friendly: '🐕',
      food_available: '🍽️',
      wheelchair_accessible: '♿',
      private_tasting: '🥂',
      vineyard_tour: '🍇',
      live_music: '🎵',
    }
    return icons[amenity] || '✨'
  }

  const stats = {
    total: wineries.length,
    active: wineries.filter(w => w.is_active).length,
    featured: wineries.filter(w => w.is_featured).length,
    verified: wineries.filter(w => w.is_verified).length,
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wine Directory</h1>
            <p className="text-gray-600 mt-1">Manage wineries for tours and recommendations</p>
          </div>
          <Link
            href="/admin/wine-directory/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <span>+</span> Add Winery
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Wineries</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Featured on Homepage</p>
            <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Verified</p>
            <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(['all', 'featured', 'verified'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f === 'featured' ? 'Featured' : f === 'verified' ? 'Verified' : 'All'}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search wineries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Winery Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Winery List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredWineries.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🍷</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No wineries found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredWineries.map((winery) => (
                  <div
                    key={winery.id}
                    onClick={() => setSelectedWinery(winery)}
                    className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selectedWinery?.id === winery.id ? 'ring-2 ring-purple-500' : ''
                    } ${!winery.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 relative">
                      {winery.hero_image_url ? (
                        <Image src={winery.hero_image_url} alt={winery.name} className="object-cover" fill unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl">🍇</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {winery.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded text-xs font-medium">
                            Featured
                          </span>
                        )}
                        {winery.is_verified && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                      {winery.featured_photo_override_id && (
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs font-medium">
                            Custom Photo
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{winery.name}</h3>
                      <p className="text-sm text-gray-500">{winery.city || 'Walla Walla'} {winery.ava ? `• ${winery.ava}` : ''}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-1">
                          {(winery.amenities || []).slice(0, 3).map((amenity) => (
                            <span key={amenity} title={amenity.replace('_', ' ')}>
                              {getAmenityIcon(amenity)}
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {winery.tasting_room_fee ? `$${winery.tasting_room_fee} tasting` : 'Free tasting'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedWinery ? (
              <div className="bg-white rounded-xl shadow-sm sticky top-4">
                <div className="h-48 bg-gradient-to-br from-purple-200 to-pink-200 rounded-t-xl relative overflow-hidden">
                  {selectedWinery.hero_image_url ? (
                    <Image src={selectedWinery.hero_image_url} alt={selectedWinery.name} className="object-cover rounded-t-xl" fill unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-7xl">🍷</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedWinery.name}</h2>
                      <p className="text-gray-500">{selectedWinery.city || 'Walla Walla'}, WA</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {selectedWinery.is_verified && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Verified
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedWinery.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedWinery.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Featured Toggle */}
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-yellow-900">Homepage Featured</p>
                        <p className="text-xs text-yellow-700">Show on homepage featured section</p>
                      </div>
                      <button
                        onClick={() => toggleFeatured(selectedWinery)}
                        disabled={updating === selectedWinery.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          selectedWinery.is_featured ? 'bg-yellow-500' : 'bg-gray-300'
                        } ${updating === selectedWinery.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            selectedWinery.is_featured ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Featured Photo Override Section */}
                  {selectedWinery.is_featured && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="mb-2">
                        <p className="font-medium text-purple-900">Featured Photo Override</p>
                        <p className="text-xs text-purple-700">
                          {selectedWinery.featured_photo_override_id
                            ? 'Using custom photo from WWT media library'
                            : 'Using partner\'s default hero photo'}
                        </p>
                      </div>

                      {selectedWinery.featured_photo_override_id && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded border border-purple-100">
                          <span className="text-purple-600 text-sm">Override active</span>
                          <span className="text-xs text-gray-500">ID: {selectedWinery.featured_photo_override_id}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                          className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                          {showPhotoPicker ? 'Hide Photos' : 'Choose Photo'}
                        </button>
                        {selectedWinery.featured_photo_override_id && (
                          <button
                            onClick={() => setPhotoOverride(selectedWinery, null)}
                            disabled={updatingPhoto}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Use Default
                          </button>
                        )}
                      </div>

                      {/* Photo Picker Grid */}
                      {showPhotoPicker && (
                        <div className="mt-3 pt-3 border-t border-purple-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-purple-800">WWT Internal Media (winery category)</p>
                            <Link
                              href="/admin/media/upload"
                              className="text-xs text-purple-600 hover:text-purple-800 underline"
                            >
                              Upload New
                            </Link>
                          </div>

                          {loadingMedia ? (
                            <div className="grid grid-cols-3 gap-2">
                              {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
                              ))}
                            </div>
                          ) : internalMedia.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              <p>No winery photos in media library.</p>
                              <Link href="/admin/media/upload" className="text-purple-600 underline">
                                Upload photos
                              </Link>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                              {internalMedia.map((media) => (
                                <button
                                  key={media.id}
                                  onClick={() => setPhotoOverride(selectedWinery, media.id)}
                                  disabled={updatingPhoto}
                                  className={`aspect-square relative rounded overflow-hidden border-2 transition-all hover:opacity-90 ${
                                    selectedWinery.featured_photo_override_id === media.id
                                      ? 'border-purple-600 ring-2 ring-purple-300'
                                      : 'border-transparent hover:border-purple-300'
                                  } ${updatingPhoto ? 'opacity-50' : ''}`}
                                  title={media.title || media.file_name}
                                >
                                  <Image
                                    src={media.thumbnail_path || media.file_path}
                                    alt={media.title || media.file_name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                  {selectedWinery.featured_photo_override_id === media.id && (
                                    <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                                      <span className="text-white text-lg">✓</span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {selectedWinery.ava && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">AVA Region</h4>
                        <p className="text-gray-900">{selectedWinery.ava}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Tasting Room</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p>💰 {selectedWinery.tasting_room_fee ? `$${selectedWinery.tasting_room_fee} fee` : 'Free tasting'}</p>
                        <p>📅 {selectedWinery.reservation_required ? 'Reservation required' : 'No reservation needed'}</p>
                        <p>🚶 {selectedWinery.walk_ins_welcome ? 'Walk-ins welcome' : 'By appointment only'}</p>
                      </div>
                    </div>

                    {(selectedWinery.amenities || []).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedWinery.amenities.map((amenity) => (
                            <span key={amenity} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                              {getAmenityIcon(amenity)} {amenity.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                    <Link
                      href={`/admin/wine-directory/${selectedWinery.id}`}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white text-center rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                      Edit Winery
                    </Link>
                    <Link
                      href={`/wineries/${selectedWinery.slug}`}
                      target="_blank"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      View Public
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center sticky top-4">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-gray-500">Select a winery to view details and toggle featured status</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
