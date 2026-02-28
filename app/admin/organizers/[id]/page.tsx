'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';

interface Organizer {
  id: string;
  organization_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'pending' | 'active' | 'suspended';
  trust_level: 'standard' | 'trusted';
  auto_approve: boolean;
  created_at: string;
  setup_completed_at?: string;
  notes?: string;
}

interface OrganizerEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  slug?: string;
}

export default function OrganizerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState('');
  const [trustLevel, setTrustLevel] = useState<'standard' | 'trusted'>('standard');
  const [autoApprove, setAutoApprove] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchOrganizer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/organizers/${id}`);
      if (!res.ok) throw new Error('Failed to load organizer details');
      const data = await res.json();
      const org = data.organizer || data;
      setOrganizer(org);
      setTrustLevel(org.trust_level || 'standard');
      setAutoApprove(org.auto_approve || false);
      setEvents(data.events || org.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrganizer();
  }, [fetchOrganizer]);

  async function handleStatusChange(newStatus: 'active' | 'suspended') {
    if (!organizer) return;
    try {
      setStatusAction(newStatus);
      const res = await fetch(`/api/admin/organizers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to ${newStatus === 'active' ? 'activate' : 'suspend'} organizer`);
      const data = await res.json();
      const updated = data.organizer || data;
      setOrganizer((prev) => (prev ? { ...prev, ...updated, status: newStatus } : prev));
      setActionMessage({
        type: 'success',
        text: `Organizer ${newStatus === 'active' ? 'activated' : 'suspended'} successfully.`,
      });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setStatusAction('');
    }
  }

  async function handleTrustUpdate() {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/organizers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trust_level: trustLevel, auto_approve: autoApprove }),
      });
      if (!res.ok) throw new Error('Failed to update trust settings');
      const data = await res.json();
      const updated = data.organizer || data;
      setOrganizer((prev) =>
        prev ? { ...prev, ...updated, trust_level: trustLevel, auto_approve: autoApprove } : prev
      );
      setActionMessage({
        type: 'success',
        text: 'Trust settings updated successfully.',
      });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update trust settings',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveEvent(eventId: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/publish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve event');
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: 'published' } : e))
      );
      setActionMessage({ type: 'success', text: 'Event approved and published.' });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to approve event',
      });
    }
  }

  async function handleRejectEvent(eventId: string) {
    if (!rejectReason.trim()) return;
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', rejection_reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error('Failed to reject event');
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: 'draft' } : e))
      );
      setRejectingEventId(null);
      setRejectReason('');
      setActionMessage({ type: 'success', text: 'Event rejected and moved to draft.' });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reject event',
      });
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-800',
      active: 'bg-emerald-50 text-emerald-800',
      suspended: 'bg-red-50 text-red-800',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function getEventStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-amber-50 text-amber-800',
      published: 'bg-emerald-50 text-emerald-800',
      cancelled: 'bg-red-50 text-red-800',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      published: 'Published',
      cancelled: 'Cancelled',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-6 mb-6">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-6">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !organizer) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-800 font-medium">Error loading organizer</p>
          <p className="text-red-700 text-sm mt-1">
            {error || 'Organizer not found'}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={fetchOrganizer}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/admin/organizers')}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Organizers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <button
        onClick={() => router.push('/admin/organizers')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Organizers
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {organizer.organization_name}
        </h1>
        {getStatusBadge(organizer.status)}
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              actionMessage.type === 'success' ? 'text-emerald-800' : 'text-red-800'
            }`}
          >
            {actionMessage.text}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Organizer Information
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-600">Contact Name</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {organizer.contact_name}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">Email</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              <a
                href={`mailto:${organizer.email}`}
                className="text-[#1E3A5F] hover:underline"
              >
                {organizer.email}
              </a>
            </dd>
          </div>
          {organizer.phone && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Phone</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{organizer.phone}</dd>
            </div>
          )}
          {organizer.website && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Website</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                <a
                  href={organizer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1E3A5F] hover:underline"
                >
                  {organizer.website}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-600">Member Since</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {formatDate(organizer.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">Setup Completed</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {organizer.setup_completed_at
                ? formatDate(organizer.setup_completed_at)
                : 'Not yet completed'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Trust Level Section */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Trust Settings
        </h2>
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 mb-2">
              Trust Level
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="trust_level"
                  value="standard"
                  checked={trustLevel === 'standard'}
                  onChange={() => setTrustLevel('standard')}
                  className="h-4 w-4 text-[#1E3A5F] border-gray-300 focus:ring-[#1E3A5F]/30"
                  aria-label="Standard trust level"
                />
                <span className="text-sm text-gray-900">Standard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="trust_level"
                  value="trusted"
                  checked={trustLevel === 'trusted'}
                  onChange={() => setTrustLevel('trusted')}
                  className="h-4 w-4 text-[#1E3A5F] border-gray-300 focus:ring-[#1E3A5F]/30"
                  aria-label="Trusted trust level"
                />
                <span className="text-sm text-gray-900">Trusted</span>
              </label>
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              Trusted organizers have higher visibility and priority placement.
            </p>
          </fieldset>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4 rounded text-[#1E3A5F] border-gray-300 focus:ring-[#1E3A5F]/30"
                aria-label="Auto-approve events"
              />
              <span className="text-sm text-gray-900">
                Auto-approve events from this organizer
              </span>
            </label>
          </div>
          <p className="text-sm text-gray-600">
            When enabled, events submitted by this organizer will be published
            automatically without admin review.
          </p>

          <div className="pt-2">
            <button
              onClick={handleTrustUpdate}
              disabled={saving}
              className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving...' : 'Save Trust Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Management */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Account Status
        </h2>
        <p className="text-sm text-gray-700 mb-4">
          Current status:{' '}
          <span className="font-medium">
            {organizer.status.charAt(0).toUpperCase() + organizer.status.slice(1)}
          </span>
        </p>
        <div className="flex gap-3">
          {organizer.status !== 'active' && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={!!statusAction}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusAction === 'active' ? 'Activating...' : 'Activate Organizer'}
            </button>
          )}
          {organizer.status !== 'suspended' && (
            <button
              onClick={() => handleStatusChange('suspended')}
              disabled={!!statusAction}
              className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusAction === 'suspended'
                ? 'Suspending...'
                : 'Suspend Organizer'}
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
        </div>
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              This organizer has not submitted any events yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className={`transition-colors ${
                      event.status === 'pending_review'
                        ? 'bg-amber-50/50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {event.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {formatDate(event.date)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getEventStatusBadge(event.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {event.status === 'pending_review' && (
                          <>
                            <button
                              onClick={() => handleApproveEvent(event.id)}
                              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                            >
                              Approve
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() =>
                                setRejectingEventId(
                                  rejectingEventId === event.id
                                    ? null
                                    : event.id
                                )
                              }
                              className="text-sm font-medium text-red-700 hover:text-red-800 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                      {/* Reject reason input */}
                      {rejectingEventId === event.id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection"
                            aria-label="Reason for rejecting this event"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
                          />
                          <button
                            onClick={() => handleRejectEvent(event.id)}
                            disabled={!rejectReason.trim()}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setRejectingEventId(null);
                              setRejectReason('');
                            }}
                            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
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
