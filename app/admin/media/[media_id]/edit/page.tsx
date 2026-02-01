'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import ImageEditorModal from '@/components/admin/ImageEditorModal';

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
  const [replacing, setReplacing] = useState(false);
  const [media, setMedia] = useState<Media | null>(null);

  // State for file replacement
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFilePreview, setNewFilePreview] = useState<string | null>(null);
  const [newFileType, setNewFileType] = useState<'image' | 'video' | null>(null);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isEdited, setIsEdited] = useState(false);

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
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'lodging', label: 'Lodging', icon: '🏨' },
    { value: 'shop', label: 'Shop', icon: '🛍️' },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];

    if (![...allowedImageTypes, ...allowedVideoTypes].includes(file.type)) {
      alert('Invalid file type. Please upload JPG, PNG, WebP, GIF, MP4, or WebM');
      return;
    }

    // Set file type
    const type = allowedImageTypes.includes(file.type) ? 'image' : 'video';
    setNewFileType(type);

    // For images, open editor automatically
    if (type === 'image') {
      setPendingFile(file);
      setShowEditor(true);
    } else {
      // For videos, just set the file directly
      setNewFile(file);
      setIsEdited(false);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle edited image from editor
  const handleEditorSave = (editedBlob: Blob, fileName: string) => {
    const editedFile = new File([editedBlob], fileName, { type: 'image/jpeg' });

    // Create preview for edited file
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewFilePreview(reader.result as string);
    };
    reader.readAsDataURL(editedFile);

    setNewFile(editedFile);
    setIsEdited(true);
    setShowEditor(false);
    setPendingFile(null);
  };

  // Cancel editor - use original file without edits
  const handleEditorCancel = () => {
    if (pendingFile) {
      // User cancelled, use original file
      setNewFile(pendingFile);
      setIsEdited(false);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFilePreview(reader.result as string);
      };
      reader.readAsDataURL(pendingFile);
    }
    setShowEditor(false);
    setPendingFile(null);
  };

  // Re-open editor for current file
  const handleOpenEditor = () => {
    if (newFile && newFileType === 'image') {
      setPendingFile(newFile);
      setShowEditor(true);
    }
  };

  const handleReplaceFile = async () => {
    if (!newFile) return;

    setReplacing(true);

    try {
      const data = new FormData();
      data.append('file', newFile);

      const response = await fetch(`/api/media/${media_id}/replace`, {
        method: 'POST',
        body: data
      });

      const result = await response.json();

      if (result.success) {
        alert('File replaced successfully!');
        // Update local state with new file info
        setMedia(result.data);
        // Clear replacement state
        setNewFile(null);
        setNewFilePreview(null);
        setNewFileType(null);
      } else {
        alert(`Replace failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Replace error', { error });
      alert('Failed to replace file');
    } finally {
      setReplacing(false);
    }
  };

  const cancelReplacement = () => {
    setNewFile(null);
    setNewFilePreview(null);
    setNewFileType(null);
    setIsEdited(false);
    setPendingFile(null);
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

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Check if the current image appears broken
  const isImageBroken = media && (!media.file_path || media.file_size === null || media.file_size === 0);

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

            {/* Current or New Preview */}
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {newFilePreview ? (
                // Show new file preview
                newFileType === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={newFilePreview}
                    alt="New file preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={newFilePreview}
                    controls
                    className="w-full h-full object-cover"
                  />
                )
              ) : media.file_type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={media.file_path}
                  alt={media.alt_text || 'Media preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Show broken image placeholder
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <video
                  src={media.file_path}
                  controls
                  className="w-full h-full object-cover"
                />
              )}
              {/* Broken image placeholder */}
              <div className="hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                <div className="text-6xl mb-2">🖼️</div>
                <p className="text-sm font-medium">Image not available</p>
              </div>

              {/* New file badge */}
              {newFilePreview && (
                <div className="absolute top-2 left-2 flex gap-2">
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                    New File
                  </span>
                  {isEdited && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                      Edited
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong className="text-gray-900">Filename:</strong> {newFile ? newFile.name : media.file_name}</p>
              <p><strong className="text-gray-900">Size:</strong> {newFile ? formatFileSize(newFile.size) : formatFileSize(media.file_size)}</p>
              <p><strong className="text-gray-900">Type:</strong> {newFileType || media.file_type}</p>
              <p><strong className="text-gray-900">Views:</strong> {media.view_count}</p>
              <p><strong className="text-gray-900">Uploaded:</strong> {new Date(media.created_at).toLocaleDateString()}</p>
            </div>

            {/* Replace File Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {isImageBroken ? '⚠️ Replace Missing File' : '🔄 Replace File'}
              </h3>

              {isImageBroken && !newFile && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-amber-800">
                    This file appears to be missing or corrupted. Upload a new file to fix it.
                  </p>
                </div>
              )}

              {!newFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="replace-file"
                  />
                  <label htmlFor="replace-file" className="cursor-pointer">
                    <div className="text-3xl mb-2">📤</div>
                    <p className="text-sm font-bold text-gray-900">Click to upload replacement</p>
                    <p className="text-xs text-gray-600">JPG, PNG, WebP, GIF, MP4, or WebM</p>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReplaceFile}
                      disabled={replacing}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      {replacing ? '⏳ Uploading...' : '✓ Confirm Replace'}
                    </button>
                    {newFileType === 'image' && (
                      <button
                        type="button"
                        onClick={handleOpenEditor}
                        disabled={replacing}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cancelReplacement}
                      disabled={replacing}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    This will replace the file but keep all metadata (title, tags, etc.)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Details</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        formData.category === cat.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
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

      {/* Image Editor Modal */}
      {showEditor && pendingFile && (
        <ImageEditorModal
          imageFile={pendingFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}
