'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams();
  const media_id = params.media_id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<Media | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    alt_text: '',
    tags: '',
    is_hero: false
  });

  const categories = [
    { value: 'winery', label: 'Winery', icon: '🍷' },
    { value: 'service', label: 'Service', icon: '🚐' },
    { value: 'vehicle', label: 'Vehicle', icon: '🚙' },
    { value: 'location', label: 'Location', icon: '📍' },
    { value: 'brand', label: 'Brand', icon: '✨' }
  ];

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media_id]);

  const loadMedia = async () => {
    try {
      const response = await fetch(`/api/media/${media_id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const mediaData = result.data;
        setMedia(mediaData);
        setFormData({
          category: mediaData.category,
          subcategory: mediaData.subcategory || '',
          title: mediaData.title,
          description: mediaData.description || '',
          alt_text: mediaData.alt_text || '',
          tags: mediaData.tags.join(', '),
          is_hero: mediaData.is_hero
        });
      } else {
        alert('Media not found');
        router.push('/admin/media');
      }
    } catch (error) {
      logger.error('Failed to load media', { error });
      alert('Failed to load media');
      router.push('/admin/media');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/media/${media_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          subcategory: formData.subcategory,
          title: formData.title,
          description: formData.description,
          alt_text: formData.alt_text,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          is_hero: formData.is_hero
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Media updated successfully!');
        router.push('/admin/media');
      } else {
        alert(`Update failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Update error', { error });
      alert('Failed to update media');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600 font-semibold">Loading media...</p>
        </div>
      </div>
    );
  }

  if (!media) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/media"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold mb-4"
          >
            ← Back to Media Library
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">✏️ Edit Media</h1>
          <p className="text-gray-600">Update media details and metadata</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Preview</h2>
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {media.file_type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={media.file_path}
                  alt={media.alt_text || 'Media preview'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={media.file_path}
                  controls
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong className="text-gray-900">Filename:</strong> {media.file_name}</p>
              <p><strong className="text-gray-900">Size:</strong> {formatFileSize(media.file_size)}</p>
              <p><strong className="text-gray-900">Type:</strong> {media.file_type}</p>
              <p><strong className="text-gray-900">Views:</strong> {media.view_count}</p>
              <p><strong className="text-gray-900">Uploaded:</strong> {new Date(media.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.category === cat.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className="text-xs font-bold text-gray-900">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Subcategory (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g., 'lecole-no-41', 'wine-tours'"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Alt Text (for accessibility) *
                </label>
                <input
                  type="text"
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="wine, tasting, outdoor (comma-separated)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              {/* Hero Image */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_hero}
                    onChange={(e) => setFormData({ ...formData, is_hero: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-gray-900">
                    ⭐ Set as hero image for this category
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors shadow-lg"
                >
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <Link
                  href="/admin/media"
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold transition-colors text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

