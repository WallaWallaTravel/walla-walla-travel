'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EventItem {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  category_name?: string;
  status: string;
  views?: number;
}

type StatusFilter = 'all' | 'draft' | 'pending_review' | 'published' | 'cancelled';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Published', value: 'published' },
  { label: 'Cancelled', value: 'cancelled' },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-emerald-50 text-emerald-800',
    pending_review: 'bg-amber-50 text-amber-800',
    cancelled: 'bg-red-50 text-red-800',
    past: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    pending_review: 'Pending Review',
    cancelled: 'Cancelled',
    past: 'Past',
  };
  const cls = styles[status] || 'bg-gray-100 text-gray-700';
  const label = labels[status] || status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
            <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<StatusFilter>('all');
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/organizer/events');
      if (!res.ok) {
        setError('Failed to load events.');
        return;
      }
      const data = await res.json();
      setEvents(data.events || data || []);
    } catch {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForReview(eventId: number) {
    if (!confirm('Submit this event for review? An admin will review and publish it.')) return;
    setSubmitting(eventId);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/submit`, { method: 'POST' });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: 'pending_review' } : e))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to submit event for review.');
      }
    } catch {
      alert('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDelete(eventId: number) {
    if (!confirm('Are you sure you want to delete this draft event? This cannot be undone.')) return;
    setDeleting(eventId);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete event.');
      }
    } catch {
      alert('Failed to delete event. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  const filteredEvents = activeTab === 'all' ? events : events.filter((e) => e.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
        <Link
          href="/organizer-portal/events/new"
          className="inline-flex items-center gap-2 bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12m6-6H4" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1" role="tablist" aria-label="Filter events by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && <TableSkeleton />}

      {/* Events table */}
      {!loading && !error && (
        <>
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <p className="text-gray-700 font-medium">No events yet</p>
              <p className="text-gray-600 text-sm mt-1">Create your first event to get started!</p>
              <Link
                href="/organizer-portal/events/new"
                className="inline-flex items-center gap-2 mt-4 bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
              >
                Create Event
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Views</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900">{event.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{formatEventDate(event.start_date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{event.category_name || '-'}</span>
                        </td>
                        <td className="px-4 py-3">{statusBadge(event.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-700">{event.views ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(event.status === 'draft' || event.status === 'pending_review') && (
                              <Link
                                href={`/organizer-portal/events/${event.id}/edit`}
                                className="text-sm font-medium text-[#8B1538] hover:underline"
                              >
                                Edit
                              </Link>
                            )}
                            {event.status === 'draft' && (
                              <button
                                onClick={() => handleSubmitForReview(event.id)}
                                disabled={submitting === event.id}
                                className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
                              >
                                {submitting === event.id ? 'Submitting...' : 'Submit for Review'}
                              </button>
                            )}
                            {event.status === 'draft' && (
                              <button
                                onClick={() => handleDelete(event.id)}
                                disabled={deleting === event.id}
                                className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                              >
                                {deleting === event.id ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                      {statusBadge(event.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatEventDate(event.start_date)}
                      {event.category_name && ` \u00B7 ${event.category_name}`}
                    </p>
                    <p className="text-xs text-gray-600">{event.views ?? 0} views</p>
                    <div className="flex items-center gap-3 pt-1">
                      {(event.status === 'draft' || event.status === 'pending_review') && (
                        <Link
                          href={`/organizer-portal/events/${event.id}/edit`}
                          className="text-sm font-medium text-[#8B1538] hover:underline"
                        >
                          Edit
                        </Link>
                      )}
                      {event.status === 'draft' && (
                        <button
                          onClick={() => handleSubmitForReview(event.id)}
                          disabled={submitting === event.id}
                          className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
                        >
                          {submitting === event.id ? 'Submitting...' : 'Submit'}
                        </button>
                      )}
                      {event.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting === event.id}
                          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                        >
                          {deleting === event.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
