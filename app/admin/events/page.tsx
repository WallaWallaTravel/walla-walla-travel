'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { EventWithCategory, EventStatus } from '@/lib/types/events';

interface EventListData {
  data: EventWithCategory[];
  total: number;
  hasMore: boolean;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-red-50 text-red-800',
  past: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-50 text-amber-800',
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideInstances, setHideInstances] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '50');

      const response = await fetch(`/api/admin/events?${params}`);
      if (response.ok) {
        const result = await response.json();
        setEvents(result);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePublish = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/events/${id}/publish`, { method: 'POST' });
      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this event?')) return;
    try {
      const response = await fetch(`/api/admin/events/${id}/cancel`, { method: 'POST' });
      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to cancel event:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this event?')) return;
    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage events for Walla Walla Events
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/events/new')}
          className="px-4 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors"
        >
          Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events..."
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          aria-label="Search events"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="cancelled">Cancelled</option>
          <option value="past">Past</option>
        </select>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideInstances}
            onChange={(e) => setHideInstances(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Hide instances</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ) : events && events.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Views</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.data
                  .filter((event) => !hideInstances || !event.parent_event_id)
                  .map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {event.title}
                          {event.is_recurring && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                              Recurring
                            </span>
                          )}
                        </p>
                        {event.venue_name && (
                          <p className="text-xs text-gray-600 mt-0.5">{event.venue_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDate(event.start_date)}
                    </td>
                    <td className="px-4 py-3">
                      {event.category_name ? (
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          {event.category_icon && <span className="text-xs">{event.category_icon}</span>}
                          {event.category_name}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[event.status]}`}
                      >
                        {event.status.replace('_', ' ')}
                      </span>
                      {event.is_featured && (
                        <span className="ml-1 text-xs text-amber-600" title="Featured">
                          ★
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {event.view_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                          className="px-2.5 py-1.5 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        {event.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(event.id)}
                            className="px-2.5 py-1.5 rounded text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        {event.status === 'published' && (
                          <button
                            onClick={() => handleCancel(event.id)}
                            className="px-2.5 py-1.5 rounded text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {event.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="px-2.5 py-1.5 rounded text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first event to get started.
            </p>
            <button
              onClick={() => router.push('/admin/events/new')}
              className="px-4 py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#1E3A5F]/90 transition-colors"
            >
              Create Event
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {events && events.total > 0 && (
        <p className="text-sm text-gray-600 mt-4">
          Showing {events.data.length} of {events.total} events
        </p>
      )}
    </div>
  );
}
