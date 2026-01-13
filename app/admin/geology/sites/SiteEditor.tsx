'use client';

/**
 * Site Editor Component
 *
 * Client component for creating/editing geological sites.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface SiteData {
  id?: number;
  name: string;
  slug: string;
  description: string | null;
  site_type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  directions: string | null;
  is_public_access: boolean;
  requires_appointment: boolean;
  best_time_to_visit: string | null;
  photos: string[] | null;
  related_topic_ids: number[] | null;
  nearby_winery_ids: number[] | null;
  is_published: boolean;
}

interface SiteEditorProps {
  initialData?: SiteData;
  isEditing?: boolean;
}

const SITE_TYPES = [
  { value: '', label: 'Select type' },
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'formation', label: 'Geological Formation' },
  { value: 'vineyard_example', label: 'Vineyard Example' },
  { value: 'educational_marker', label: 'Educational Marker' },
];

// ============================================================================
// Component
// ============================================================================

export function SiteEditor({ initialData, isEditing = false }: SiteEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [siteType, setSiteType] = useState(initialData?.site_type || '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [directions, setDirections] = useState(initialData?.directions || '');
  const [isPublicAccess, setIsPublicAccess] = useState(initialData?.is_public_access ?? true);
  const [requiresAppointment, setRequiresAppointment] = useState(
    initialData?.requires_appointment ?? false
  );
  const [bestTimeToVisit, setBestTimeToVisit] = useState(initialData?.best_time_to_visit || '');
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && name && !slug) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [name, slug, isEditing]);

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      slug,
      description: description || null,
      site_type: siteType || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      address: address || null,
      directions: directions || null,
      is_public_access: isPublicAccess,
      requires_appointment: requiresAppointment,
      best_time_to_visit: bestTimeToVisit || null,
      is_published: publish ? true : isPublished,
    };

    try {
      const url = isEditing
        ? `/api/admin/geology/sites/${initialData?.id}`
        : '/api/admin/geology/sites';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save site');
      }

      router.push('/admin/geology/sites');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/geology/sites/${initialData?.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete site');
      }

      router.push('/admin/geology/sites');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
            Geology
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/geology/sites" className="text-gray-500 hover:text-gray-700">
            Sites
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{isEditing ? 'Edit' : 'New'}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Site' : 'New Site'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  placeholder="Blue Mountains Viewpoint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  placeholder="blue-mountains-viewpoint"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Type</label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              >
                {SITE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="A panoramic viewpoint showcasing the effects of the Ice Age floods..."
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  placeholder="46.0646"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  placeholder="-118.3430"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="1234 Vineyard Road, Walla Walla, WA 99362"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Directions</label>
              <textarea
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="From downtown, head east on Highway 12 for 5 miles..."
              />
            </div>
          </div>
        </div>

        {/* Access & Visiting */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Access & Visiting</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicAccess}
                    onChange={(e) => setIsPublicAccess(e.target.checked)}
                    className="w-4 h-4 text-[#722F37] border-gray-300 rounded focus:ring-[#722F37]"
                  />
                  <span className="text-sm font-medium text-gray-700">Public access</span>
                </label>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresAppointment}
                    onChange={(e) => setRequiresAppointment(e.target.checked)}
                    className="w-4 h-4 text-[#722F37] border-gray-300 rounded focus:ring-[#722F37]"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires appointment</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Best Time to Visit
              </label>
              <input
                type="text"
                value={bestTimeToVisit}
                onChange={(e) => setBestTimeToVisit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="Spring through fall, best at sunrise for photos"
              />
            </div>
          </div>
        </div>

        {/* Publishing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Publishing</h2>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-[#722F37] border-gray-300 rounded focus:ring-[#722F37]"
              />
              <span className="text-sm font-medium text-gray-700">Published</span>
            </label>
            <p className="ml-6 text-xs text-gray-500">
              Only published sites are visible to the public.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete Site
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/geology/sites"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !name.trim() || !slug.trim()}
              className="px-6 py-2 bg-[#722F37] text-white rounded-lg text-sm font-medium hover:bg-[#5a252c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
