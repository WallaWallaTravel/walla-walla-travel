'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id?: number;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  excerpt: string;
  topic_type: string;
  difficulty: string;
  hero_image_url: string;
  display_order: number;
  is_featured: boolean;
  is_published: boolean;
  related_winery_ids: number[];
  related_topic_ids: number[];
  author_name: string;
  sources: string;
  verified: boolean;
}

interface TopicEditorProps {
  initialData?: Partial<Topic>;
  isEditing?: boolean;
}

const TOPIC_TYPES = [
  { value: 'overview', label: 'Overview' },
  { value: 'ice_age_floods', label: 'Ice Age Floods' },
  { value: 'soil_types', label: 'Soil Types' },
  { value: 'basalt', label: 'Basalt' },
  { value: 'terroir', label: 'Terroir' },
  { value: 'climate', label: 'Climate' },
  { value: 'water', label: 'Water' },
  { value: 'wine_connection', label: 'Wine Connection' },
];

const DIFFICULTY_LEVELS = [
  { value: 'general', label: 'General (Everyone)' },
  { value: 'intermediate', label: 'Intermediate (Wine Enthusiasts)' },
  { value: 'advanced', label: 'Advanced (Geology Nerds)' },
];

// ============================================================================
// Component
// ============================================================================

export function TopicEditor({ initialData, isEditing = false }: TopicEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<Topic>({
    slug: initialData?.slug || '',
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    topic_type: initialData?.topic_type || 'overview',
    difficulty: initialData?.difficulty || 'general',
    hero_image_url: initialData?.hero_image_url || '',
    display_order: initialData?.display_order || 0,
    is_featured: initialData?.is_featured || false,
    is_published: initialData?.is_published || false,
    related_winery_ids: initialData?.related_winery_ids || [],
    related_topic_ids: initialData?.related_topic_ids || [],
    author_name: initialData?.author_name || '',
    sources: initialData?.sources || '',
    verified: initialData?.verified || false,
    ...(initialData?.id && { id: initialData.id }),
  });

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug if it's a new topic or slug is empty
      slug: !isEditing || !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        is_published: publish ? true : formData.is_published,
      };

      const url = isEditing
        ? `/api/admin/geology/topics/${initialData?.id}`
        : '/api/admin/geology/topics';

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save topic');
      }

      router.push('/admin/geology/topics');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this topic? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/geology/topics/${initialData?.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete topic');
      }

      router.push('/admin/geology/topics');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
              Geology
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/admin/geology/topics" className="text-gray-500 hover:text-gray-700">
              Topics
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{isEditing ? 'Edit' : 'New'}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Topic' : 'Create New Topic'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {showPreview ? (
        /* Preview Mode */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="max-w-3xl mx-auto">
            {formData.hero_image_url && (
              <img
                src={formData.hero_image_url}
                alt={formData.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900">{formData.title || 'Untitled'}</h1>
            {formData.subtitle && (
              <p className="mt-2 text-xl text-gray-600">{formData.subtitle}</p>
            )}
            <div className="mt-6 prose prose-stone max-w-none">
              {/* Simple markdown-like rendering */}
              {formData.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-xl font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="mb-4">{line}</p>;
              })}
            </div>
            {formData.sources && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 uppercase">Sources</h4>
                <p className="mt-2 text-sm text-gray-600">{formData.sources}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., The Ice Age Floods That Shaped Walla Walla"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="A brief tagline or summary"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">/geology/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="ice-age-floods"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Use ## for headings, ### for subheadings. Just write naturally - formatting is simple.
              </p>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your article here...

## The Story Begins

About 15,000 years ago, massive floods carved through this land..."
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent font-mono text-sm"
                required
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excerpt (for cards/previews)
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="A 1-2 sentence summary for listing pages..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.excerpt.length}/500</p>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Topic Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.topic_type}
                  onChange={(e) => setFormData({ ...formData, topic_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                >
                  {TOPIC_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hero Image */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  value={formData.hero_image_url}
                  onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Sources */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sources / Citations
                </label>
                <textarea
                  value={formData.sources}
                  onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
                  placeholder="List your sources for verification..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-gray-300 text-[#722F37] focus:ring-[#722F37]"
                />
                <span className="text-sm text-gray-700">Featured topic</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete Topic
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/geology/topics"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c] disabled:opacity-50"
              >
                {saving ? 'Publishing...' : formData.is_published ? 'Update & Publish' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
