'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Media {
  id: number;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video';
  file_size: number;
  category: string;
  subcategory?: string;
  title: string;
  description?: string;
  alt_text?: string;
  tags: string[];
  is_hero: boolean;
  view_count: number;
  created_at: string;
}

interface _MediaGroup {
  category: string;
  count: number;
  media: Media[];
}

export default function MediaLibraryPage() {
  const _router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Categories
  const categories = [
    { value: 'all', label: 'All Media', icon: '🎨' },
    { value: 'winery', label: 'Wineries', icon: '🍷' },
    { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { value: 'lodging', label: 'Lodging', icon: '🏨' },
    { value: 'shop', label: 'Shops', icon: '🛍️' },
    { value: 'service', label: 'Services', icon: '🚐' },
    { value: 'vehicle', label: 'Vehicles', icon: '🚙' },
    { value: 'location', label: 'Locations', icon: '📍' },
    { value: 'brand', label: 'Brand', icon: '✨' }
  ];

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    filterMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, selectedCategory, searchTerm]);

  const loadMedia = async () => {
    try {
      const response = await fetch('/api/media?limit=100');
      const result = await response.json();
      if (result.success) {
        setMedia(result.data || []);
      }
    } catch (error) {
      logger.error('Failed to load media', { error });
    } finally {
      setLoading(false);
    }
  };

  const filterMedia = () => {
    let filtered = media;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(term) ||
        m.file_name.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredMedia(filtered);
  };

  const deleteMedia = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMedia(media.filter(m => m.id !== id));
        alert('Media deleted successfully');
      }
    } catch (error) {
      logger.error('Failed to delete media', { error });
      alert('Failed to delete media');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Group media by category for stats
  const mediaStats = categories.slice(1).map(cat => ({
    ...cat,
    count: media.filter(m => m.category === cat.value).length
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600 font-semibold">Loading media library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📸 Media Library</h1>
            <p className="text-gray-600">Manage photos and videos for proposals and itineraries</p>
          </div>
          <Link
            href="/admin/media/upload"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors shadow-lg"
          >
            + Upload Media
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-3xl mb-2">🎨</div>
            <div className="text-2xl font-bold">{media.length}</div>
            <div className="text-sm opacity-90">Total Media</div>
          </div>
          {mediaStats.map(stat => (
            <div key={stat.value} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition-colors">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by title, filename, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            {/* View Mode */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">View</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🔲 Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
                    viewMode === 'list'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📋 List
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing <span className="font-bold text-gray-900">{filteredMedia.length}</span> of{' '}
            <span className="font-bold text-gray-900">{media.length}</span> items
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="max-w-7xl mx-auto">
        {filteredMedia.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-md">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No media found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first photo or video to get started'}
            </p>
            <Link
              href="/admin/media/upload"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
            >
              + Upload Media
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMedia.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border-2 border-gray-200 hover:border-purple-300"
              >
                {/* Media Preview */}
                <div className="relative aspect-square bg-gray-100">
                  {item.file_type === 'image' ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.file_path}
                      alt={item.alt_text || 'Media preview'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.file_path}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  )}
                  {item.is_hero && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ⭐ Hero
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {item.file_type === 'image' ? '📸' : '🎥'} {item.file_type}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.category} {item.subcategory && `• ${item.subcategory}`}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {formatFileSize(item.file_size)} • {item.view_count} views
                  </p>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/media/${item.id}/edit`}
                      className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-bold text-center transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Preview</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Size</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Views</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedia.map(item => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {item.file_type === 'image' ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.file_path}
                            alt={item.alt_text || 'Media thumbnail'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.file_path}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.title}</div>
                      {item.is_hero && (
                        <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                          ⭐ Hero
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {item.category}
                      {item.subcategory && <div className="text-sm text-gray-500">{item.subcategory}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{item.file_type}</td>
                    <td className="px-6 py-4 text-gray-700">{formatFileSize(item.file_size)}</td>
                    <td className="px-6 py-4 text-gray-700">{item.view_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/media/${item.id}/edit`}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-bold transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteMedia(item.id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

