'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  total_events: number;
  published: number;
  pending_review: number;
  total_views: number;
}

interface DashboardProfile {
  name: string;
  organization_name?: string;
}

interface EventItem {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  venue_name?: string;
  category_name?: string;
  status: string;
  views?: number;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
      ))}
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse ml-auto" />
        </div>
      ))}
    </div>
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

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [dashRes, eventsRes] = await Promise.all([
          fetch('/api/organizer/dashboard'),
          fetch('/api/organizer/events?status=published'),
        ]);

        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setProfile(dashData.profile);
          setStats(dashData.stats);
        } else {
          setError('Failed to load dashboard data.');
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const events: EventItem[] = eventsData.events || eventsData || [];
          const today = new Date().toISOString().split('T')[0];
          const upcoming = events
            .filter((e: EventItem) => e.start_date >= today)
            .sort((a: EventItem, b: EventItem) => a.start_date.localeCompare(b.start_date))
            .slice(0, 5);
          setUpcomingEvents(upcoming);
        }
      } catch {
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <StatsSkeleton />
        <EventsListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 font-medium">Something went wrong</p>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-red-800 underline hover:no-underline"
        >
          Reload page
        </button>
      </div>
    );
  }

  const displayName = profile?.organization_name || profile?.name || 'Organizer';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}!</h1>
          <p className="text-gray-600 mt-1">Here is an overview of your events.</p>
        </div>
        <Link
          href="/organizer-portal/events/new"
          className="inline-flex items-center gap-2 bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12m6-6H4" />
          </svg>
          Create New Event
        </Link>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Events" value={stats.total_events} />
          <StatCard label="Published" value={stats.published} />
          <StatCard label="Pending Review" value={stats.pending_review} />
          <StatCard label="Total Views" value={stats.total_views} />
        </div>
      )}

      {/* Upcoming events */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          <Link
            href="/organizer-portal/events"
            className="text-sm font-medium text-[#8B1538] hover:underline"
          >
            View all
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-gray-700 font-medium">No upcoming events</p>
            <p className="text-gray-600 text-sm mt-1">Create and publish your first event to see it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/organizer-portal/events/${event.id}/edit`}
                    className="text-sm font-medium text-gray-900 hover:text-[#8B1538] transition-colors truncate block"
                  >
                    {event.title}
                  </Link>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatEventDate(event.start_date)}
                    {event.venue_name && ` \u00B7 ${event.venue_name}`}
                  </p>
                </div>
                <span className="text-xs text-gray-600 ml-4 whitespace-nowrap">
                  {event.views ?? 0} views
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
