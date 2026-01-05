'use client';

/**
 * Admin Announcements Page
 * Manage site-wide banners and promotional announcements
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface Announcement {
  id: number;
  title: string;
  message: string | null;
  link_text: string | null;
  link_url: string | null;
  type: 'info' | 'warning' | 'promo' | 'event';
  position: 'top' | 'homepage' | 'booking';
  background_color: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  status: 'active' | 'inactive' | 'expired' | 'scheduled';
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM: Partial<Announcement> = {
  title: '',
  message: '',
  link_text: '',
  link_url: '',
  type: 'info',
  position: 'top',
  background_color: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
};

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-800' },
  { value: 'promo', label: 'Promo', color: 'bg-purple-100 text-purple-800' },
  { value: 'event', label: 'Event', color: 'bg-emerald-100 text-emerald-800' },
];

const POSITION_OPTIONS = [
  { value: 'top', label: 'All Pages (Top)' },
  { value: 'homepage', label: 'Homepage Only' },
  { value: 'booking', label: 'Booking Flow' },
];

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      logger.error('Failed to load announcements', { error });
      setMessage({ type: 'error', text: 'Failed to load announcements' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setMessage({ type: 'error', text: 'Title is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      // Clean up empty strings to nulls
      const cleanBody = Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, v === '' ? null : v])
      );

      const response = await fetch('/api/admin/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanBody),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: editingId ? 'Announcement updated!' : 'Announcement created!' });
        setShowForm(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        loadAnnouncements();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message || '',
      link_text: announcement.link_text || '',
      link_url: announcement.link_url || '',
      type: announcement.type,
      position: announcement.position,
      background_color: announcement.background_color || '',
      starts_at: announcement.starts_at ? announcement.starts_at.slice(0, 16) : '',
      expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 16) : '',
      is_active: announcement.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Announcement deleted' });
        loadAnnouncements();
      } else {
        throw new Error('Failed to delete');
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete announcement' });
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: announcement.id, is_active: !announcement.is_active }),
      });

      if (response.ok) {
        loadAnnouncements();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to toggle status' });
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-500 mt-1">Manage site-wide banners and promotions</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Announcement
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Announcement title"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional details..."
                />
              </div>

              {/* Type and Position */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type || 'info'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Announcement['type'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={formData.position || 'top'}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as Announcement['position'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Text <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.link_text || ''}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Learn More"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link URL <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.link_url || ''}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starts At <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at || ''}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires At <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at || ''}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Custom Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Background Color <span className="text-gray-400">(optional, overrides type default)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.background_color || '#FFFFFF'}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color || ''}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#FFFFFF (leave empty for default)"
                  />
                  {formData.background_color && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, background_color: '' })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active !== false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (visible to users)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">All Announcements ({announcements.length})</h2>
          </div>

          {announcements.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>No announcements yet.</p>
              <p className="mt-1 text-sm">Create your first announcement to display on the site.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => {
                const typeInfo = TYPE_OPTIONS.find((t) => t.value === announcement.type);
                return (
                  <div key={announcement.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGES[announcement.status]}`}>
                            {announcement.status}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeInfo?.color || 'bg-gray-100'}`}>
                            {announcement.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {announcement.position === 'top' ? 'All pages' : announcement.position}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                        {announcement.message && (
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{announcement.message}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Created {formatDate(announcement.created_at)}</span>
                          {announcement.starts_at && <span>Starts {formatDate(announcement.starts_at)}</span>}
                          {announcement.expires_at && <span>Expires {formatDate(announcement.expires_at)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setPreviewAnnouncement(announcement)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                          title="Preview"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleActive(announcement)}
                          className={`p-2 rounded hover:bg-gray-100 ${
                            announcement.is_active ? 'text-green-600' : 'text-gray-400'
                          }`}
                          title={announcement.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {announcement.is_active ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewAnnouncement && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Preview</h3>
                <button
                  onClick={() => setPreviewAnnouncement(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">This is how the announcement will appear:</p>
                {/* Preview Banner */}
                <div
                  className={`relative border rounded-lg px-4 py-3 ${
                    previewAnnouncement.background_color
                      ? ''
                      : previewAnnouncement.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : previewAnnouncement.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : previewAnnouncement.type === 'promo' ? 'bg-purple-50 border-purple-200 text-purple-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                  style={previewAnnouncement.background_color ? { backgroundColor: previewAnnouncement.background_color } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{previewAnnouncement.title}</span>
                    {previewAnnouncement.message && (
                      <span className="opacity-90">{previewAnnouncement.message}</span>
                    )}
                    {previewAnnouncement.link_url && previewAnnouncement.link_text && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-current/10 hover:bg-current/20">
                        {previewAnnouncement.link_text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
