'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

export default function WineDirectoryPage() {
  const [wineries, setWineries] = useState<Winery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'featured' | 'verified'>('all')
  const [search, setSearch] = useState('')
  const [selectedWinery, setSelectedWinery] = useState<Winery | null>(null)

  useEffect(() => {
    // Simulated data
    setTimeout(() => {
      setWineries([
        {
          id: 1,
          name: "L'Ecole No 41",
          slug: 'lecole-no-41',
          city: 'Lowden',
          ava: 'Walla Walla Valley',
          is_verified: true,
          is_featured: true,
          is_active: true,
          tasting_room_fee: 20,
          reservation_required: false,
          walk_ins_welcome: true,
          amenities: ['picnic_area', 'dog_friendly', 'food_available'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 2,
          name: 'Leonetti Cellar',
          slug: 'leonetti-cellar',
          city: 'Walla Walla',
          ava: 'Walla Walla Valley',
          is_verified: true,
          is_featured: true,
          is_active: true,
          tasting_room_fee: 50,
          reservation_required: true,
          walk_ins_welcome: false,
          amenities: ['private_tasting'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 3,
          name: 'Woodward Canyon',
          slug: 'woodward-canyon',
          city: 'Lowden',
          ava: 'Walla Walla Valley',
          is_verified: true,
          is_featured: true,
          is_active: true,
          tasting_room_fee: 25,
          reservation_required: false,
          walk_ins_welcome: true,
          amenities: ['picnic_area', 'wheelchair_accessible'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 4,
          name: 'Cayuse Vineyards',
          slug: 'cayuse-vineyards',
          city: 'Walla Walla',
          ava: 'The Rocks District',
          is_verified: true,
          is_featured: false,
          is_active: true,
          tasting_room_fee: 75,
          reservation_required: true,
          walk_ins_welcome: false,
          amenities: ['private_tasting', 'vineyard_tour'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 5,
          name: 'Amavi Cellars',
          slug: 'amavi-cellars',
          city: 'Walla Walla',
          ava: 'Walla Walla Valley',
          is_verified: true,
          is_featured: false,
          is_active: true,
          tasting_room_fee: 15,
          reservation_required: false,
          walk_ins_welcome: true,
          amenities: ['picnic_area', 'dog_friendly', 'wheelchair_accessible'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 6,
          name: 'Gramercy Cellars',
          slug: 'gramercy-cellars',
          city: 'Walla Walla',
          ava: 'Walla Walla Valley',
          is_verified: false,
          is_featured: false,
          is_active: true,
          tasting_room_fee: 20,
          reservation_required: true,
          walk_ins_welcome: false,
          amenities: [],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 7,
          name: 'Beresan Winery',
          slug: 'beresan-winery',
          city: 'Walla Walla',
          ava: 'Walla Walla Valley',
          is_verified: true,
          is_featured: false,
          is_active: true,
          tasting_room_fee: 10,
          reservation_required: false,
          walk_ins_welcome: true,
          amenities: ['picnic_area', 'food_available', 'live_music'],
          logo_url: null,
          hero_image_url: null,
        },
        {
          id: 8,
          name: 'College Cellars',
          slug: 'college-cellars',
          city: 'Walla Walla',
          ava: 'Walla Walla Valley',
          is_verified: false,
          is_featured: false,
          is_active: false,
          tasting_room_fee: null,
          reservation_required: false,
          walk_ins_welcome: true,
          amenities: [],
          logo_url: null,
          hero_image_url: null,
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

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
            <h1 className="text-3xl font-bold text-gray-900">🍷 Wine Directory</h1>
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
            <p className="text-sm text-gray-500">Featured</p>
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
                {f === 'featured' ? '⭐ Featured' : f === 'verified' ? '✓ Verified' : 'All'}
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
                        <img src={winery.hero_image_url} alt={winery.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl">🍇</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {winery.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded text-xs font-medium">
                            ⭐ Featured
                          </span>
                        )}
                        {winery.is_verified && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-medium">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{winery.name}</h3>
                      <p className="text-sm text-gray-500">{winery.city} • {winery.ava}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-1">
                          {winery.amenities.slice(0, 3).map((amenity) => (
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
                <div className="h-48 bg-gradient-to-br from-purple-200 to-pink-200 rounded-t-xl relative">
                  {selectedWinery.hero_image_url ? (
                    <img src={selectedWinery.hero_image_url} alt={selectedWinery.name} className="w-full h-full object-cover rounded-t-xl" />
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
                      <p className="text-gray-500">{selectedWinery.city}, WA</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {selectedWinery.is_featured && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Featured
                        </span>
                      )}
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

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">AVA Region</h4>
                      <p className="text-gray-900">{selectedWinery.ava}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Tasting Room</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p>💰 {selectedWinery.tasting_room_fee ? `$${selectedWinery.tasting_room_fee} fee` : 'Free tasting'}</p>
                        <p>📅 {selectedWinery.reservation_required ? 'Reservation required' : 'No reservation needed'}</p>
                        <p>🚶 {selectedWinery.walk_ins_welcome ? 'Walk-ins welcome' : 'By appointment only'}</p>
                      </div>
                    </div>

                    {selectedWinery.amenities.length > 0 && (
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
                      href={`/admin/wine-directory/${selectedWinery.id}/edit`}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white text-center rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                      Edit Winery
                    </Link>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                      View Public
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center sticky top-4">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-gray-500">Select a winery to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




