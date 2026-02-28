'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Organizer {
  id: string;
  organization_name: string;
  contact_name: string;
  email: string;
  status: 'pending' | 'active' | 'suspended';
  trust_level: 'standard' | 'trusted';
  events_count: number;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended';

export default function OrganizersListPage() {
  const router = useRouter();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchOrganizers();
  }, []);

  async function fetchOrganizers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/organizers');
      if (!res.ok) throw new Error('Failed to load organizers');
      const data = await res.json();
      const items = data.data ?? data.organizers ?? data;
      setOrganizers(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizers');
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = {
    all: organizers.length,
    pending: organizers.filter((o) => o.status === 'pending').length,
    active: organizers.filter((o) => o.status === 'active').length,
    suspended: organizers.filter((o) => o.status === 'suspended').length,
  };

  const filteredOrganizers =
    statusFilter === 'all'
      ? organizers
      : organizers.filter((o) => o.status === statusFilter);

  function getStatusBadge(status: Organizer['status']) {
    const styles: Record<Organizer['status'], string> = {
      pending: 'bg-amber-50 text-amber-800',
      active: 'bg-emerald-50 text-emerald-800',
      suspended: 'bg-red-50 text-red-800',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function getTrustBadge(trustLevel: Organizer['trust_level']) {
    if (trustLevel === 'trusted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
          <svg
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Trusted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Standard
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl bg-white border border-gray-200">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-800 font-medium">Error loading organizers</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={fetchOrganizers}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Organizers</h1>
          <p className="text-gray-600 mt-1">
            Manage organizer accounts and permissions
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/organizers/invite')}
          className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 rounded-lg px-4 py-2.5 font-medium transition-colors"
        >
          Invite Organizer
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'active', label: 'Active' },
            { key: 'suspended', label: 'Suspended' },
          ] as { key: StatusFilter; label: string }[]
        ).map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === filter.key
                ? 'bg-[#1E3A5F] text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter.label}
            <span
              className={`ml-1.5 ${
                statusFilter === filter.key ? 'text-white/80' : 'text-gray-600'
              }`}
            >
              ({statusCounts[filter.key]})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredOrganizers.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {statusFilter === 'all'
              ? 'No organizers yet'
              : `No ${statusFilter} organizers`}
          </h3>
          <p className="mt-1 text-gray-600">
            {statusFilter === 'all'
              ? 'Get started by inviting your first event organizer.'
              : `There are no organizers with "${statusFilter}" status.`}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => router.push('/admin/organizers/invite')}
              className="mt-4 bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 rounded-lg px-4 py-2.5 font-medium transition-colors"
            >
              Invite Organizer
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Trust Level
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrganizers.map((organizer) => (
                  <tr
                    key={organizer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {organizer.organization_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {organizer.contact_name}
                        </p>
                        <p className="text-sm text-gray-600">{organizer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(organizer.status)}</td>
                    <td className="px-6 py-4">
                      {getTrustBadge(organizer.trust_level)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {organizer.events_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {formatDate(organizer.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          router.push(`/admin/organizers/${organizer.id}`)
                        }
                        className="text-sm font-medium text-[#1E3A5F] hover:text-[#1E3A5F]/80 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
