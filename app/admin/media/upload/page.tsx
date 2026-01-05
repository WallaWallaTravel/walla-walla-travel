'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MediaUploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

  const [formData, setFormData] = useState({
    file: null as File | null,
    category: 'winery',
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
    setFileType(type);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Update form data
    setFormData({
      ...formData,
      file,
      title: formData.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      alt_text: formData.alt_text || file.name.replace(/\.[^/.]+$/, '')
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);

    try {
      const data = new FormData();
      data.append('file', formData.file);
      data.append('category', formData.category);
      data.append('subcategory', formData.subcategory);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('alt_text', formData.alt_text);
      data.append('tags', formData.tags);
      data.append('is_hero', formData.is_hero.toString());

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: data
      });

      const result = await response.json();

      if (result.success) {
        alert('Media uploaded successfully!');
        router.push('/admin/media');
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📤 Upload Media</h1>
          <p className="text-gray-600">Add photos or videos to your media library</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8">
          {/* File Upload */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-900 mb-3">File *</label>
            
            {!preview ? (
              <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  required
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-600">
                    JPG, PNG, WebP, GIF, MP4, or WebM (max 50MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
                  {fileType === 'image' ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain bg-gray-100"
                    />
                  ) : (
                    <video
                      src={preview}
                      controls
                      className="w-full h-auto max-h-96 bg-gray-100"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFileType(null);
                    setFormData({ ...formData, file: null });
                  }}
                  className="absolute top-4 right-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-colors"
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Category *</label>
            <div className="grid grid-cols-5 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.category === cat.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="text-sm font-bold text-gray-900">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Subcategory (Optional)
            </label>
            <input
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="e.g., 'lecole-no-41', 'wine-tours', 'sprinter-van'"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
            <p className="text-sm text-gray-600 mt-2">
              Specific winery name, service type, or vehicle model
            </p>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 'L'Ecole No 41 Tasting Room'"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what's in this photo/video..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
          </div>

          {/* Alt Text */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Alt Text (for accessibility) *
            </label>
            <input
              type="text"
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              placeholder="e.g., 'Historic schoolhouse winery tasting room'"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              required
            />
            <p className="text-sm text-gray-600 mt-2">
              Describe the image for screen readers and SEO
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="wine, tasting, outdoor, summer (comma-separated)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
            <p className="text-sm text-gray-600 mt-2">
              Add tags for better searchability (separate with commas)
            </p>
          </div>

          {/* Hero Image */}
          <div className="mb-8">
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
            <p className="text-sm text-gray-600 mt-2 ml-8">
              Hero images are featured prominently in proposals and galleries
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={uploading || !formData.file}
              className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              {uploading ? '⏳ Uploading...' : '📤 Upload Media'}
            </button>
            <Link
              href="/admin/media"
              className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Tips for Great Media</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>High Quality:</strong> Upload high-resolution images (at least 1920px wide)</li>
            <li>• <strong>Good Lighting:</strong> Well-lit photos perform better</li>
            <li>• <strong>Descriptive Titles:</strong> Help with organization and SEO</li>
            <li>• <strong>Relevant Tags:</strong> Make media easier to find later</li>
            <li>• <strong>Alt Text:</strong> Improves accessibility and search rankings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

