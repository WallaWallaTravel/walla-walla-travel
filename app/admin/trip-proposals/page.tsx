'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface TripProposal {
  id: number;
  proposal_number: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string | null;
  total: string;
  deposit_amount: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  view_count: number;
  days_count?: number;
}

function TripProposalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status');

  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const { toasts, toast, dismissToast } = useToast();

  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStatus]);

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchTerm, pagination.offset]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      const response = await fetch(`/api/admin/trip-proposals?${params}`);
      const result = await response.json();

      if (result.success) {
        setProposals(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      logger.error('Failed to load trip proposals', { error });
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async (id: number) => {
    if (
      !confirm(
        'Are you sure you want to delete this trip proposal? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast('Trip proposal deleted successfully', 'success');
        loadProposals();
      } else {
        toast(result.error || 'Failed to delete trip proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to delete trip proposal', { error });
      toast('Failed to delete trip proposal', 'error');
    }
  };

  const duplicateProposal = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/duplicate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast(`Trip proposal duplicated! New proposal: ${result.data.proposal_number}`, 'success');
        loadProposals();
      } else {
        toast(result.error || 'Failed to duplicate trip proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to duplicate trip proposal', { error });
      toast('Failed to duplicate trip proposal', 'error');
    }
  };

  const convertToBooking = async (proposal: TripProposal) => {
    if (
      !confirm(
        `Convert trip proposal ${proposal.proposal_number} for ${proposal.customer_name} to a booking?\n\nThis will create a new confirmed booking.`
      )
    ) {
      return;
    }

    setConverting(proposal.id);
    try {
      const response = await fetch(
        `/api/admin/trip-proposals/${proposal.id}/convert`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      if (result.success) {
        toast(`Booking ${result.data.booking_number} created!`, 'success');
        router.push(`/admin/bookings/${result.data.booking_id}`);
      } else {
        toast(result.error || 'Failed to convert trip proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to convert trip proposal', { error });
      toast('Failed to convert trip proposal to booking', 'error');
    } finally {
      setConverting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      converted: 'bg-purple-100 text-purple-800',
    };

    const icons: Record<string, string> = {
      draft: '📝',
      sent: '📧',
      viewed: '👁️',
      accepted: '✅',
      declined: '❌',
      expired: '⏰',
      converted: '🎉',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badges[status] || 'bg-gray-100 text-gray-800'}`}
      >
        <span>{icons[status] || '📋'}</span>
        <span>{status.toUpperCase()}</span>
      </span>
    );
  };

  const getTripTypeBadge = (tripType: string) => {
    const types: Record<string, { icon: string; label: string; color: string }> = {
      wine_tour: { icon: '🍷', label: 'Wine Tour', color: 'bg-purple-100 text-purple-800' },
      celebration: { icon: '🎉', label: 'Celebration', color: 'bg-pink-100 text-pink-800' },
      corporate: { icon: '🏢', label: 'Corporate', color: 'bg-blue-100 text-blue-800' },
      family: { icon: '👨‍👩‍👧‍👦', label: 'Family', color: 'bg-green-100 text-green-800' },
      romantic: { icon: '💕', label: 'Romantic', color: 'bg-red-100 text-red-800' },
      birthday: { icon: '🎂', label: 'Birthday', color: 'bg-yellow-100 text-yellow-800' },
      anniversary: { icon: '💍', label: 'Anniversary', color: 'bg-amber-100 text-amber-800' },
      other: { icon: '✨', label: 'Other', color: 'bg-gray-100 text-gray-800' },
    };

    const type = types[tripType] || types.other;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${type.color}`}>
        <span>{type.icon}</span>
        <span>{type.label}</span>
      </span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDayCount = (startDate: string, endDate: string | null) => {
    if (!endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">🗺️ Trip Proposals</h1>
            <Link
              href="/admin/trip-proposals/new"
              className="px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-lg font-bold transition-colors shadow-lg"
            >
              + New Trip Proposal
            </Link>
          </div>
          <p className="text-gray-600">
            Manage comprehensive multi-day trip proposals with hotels, restaurants, and activities
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
              >
                <option value="all">All Proposals</option>
                <option value="draft">Drafts</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination((prev) => ({ ...prev, offset: 0 }));
                }}
                placeholder="Customer name or email..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {proposals.length} of {pagination.total} trip proposals
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading trip proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Trip Proposals Found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first multi-day trip proposal to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                href="/admin/trip-proposals/new"
                className="inline-block px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-lg font-bold transition-colors"
              >
                + Create First Trip Proposal
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {getStatusBadge(proposal.status)}
                        {getTripTypeBadge(proposal.trip_type)}
                        <span className="text-sm font-mono text-gray-600">
                          {proposal.proposal_number}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {proposal.customer_name}
                      </h3>
                      <p className="text-gray-600">
                        {getDayCount(proposal.start_date, proposal.end_date)}-day trip •{' '}
                        {proposal.party_size} guest{proposal.party_size !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-brand">
                        {formatCurrency(proposal.total)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Deposit: {formatCurrency(proposal.deposit_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-500 font-semibold">Trip Dates</div>
                      <div className="text-gray-900">
                        {formatDate(proposal.start_date)}
                        {proposal.end_date && proposal.end_date !== proposal.start_date && (
                          <> - {formatDate(proposal.end_date)}</>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 font-semibold">Created</div>
                      <div className="text-gray-900">{formatDate(proposal.created_at)}</div>
                    </div>

                    {proposal.sent_at && (
                      <div>
                        <div className="text-gray-500 font-semibold">Sent</div>
                        <div className="text-gray-900">{formatDate(proposal.sent_at)}</div>
                      </div>
                    )}

                    {proposal.valid_until && (
                      <div>
                        <div className="text-gray-500 font-semibold">Valid Until</div>
                        <div
                          className={`font-bold ${new Date(proposal.valid_until) < new Date() ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {formatDate(proposal.valid_until)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  {(proposal.customer_email || proposal.customer_phone) && (
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 mb-4 text-sm">
                      <div className="flex flex-wrap gap-4">
                        {proposal.customer_email && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">📧</span>
                            <a
                              href={`mailto:${proposal.customer_email}`}
                              className="text-brand hover:underline"
                            >
                              {proposal.customer_email}
                            </a>
                          </div>
                        )}
                        {proposal.customer_phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">📱</span>
                            <a
                              href={`tel:${proposal.customer_phone}`}
                              className="text-brand hover:underline"
                            >
                              {proposal.customer_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/trip-proposals/${proposal.proposal_number}`}
                      target="_blank"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      👁️ Preview
                    </Link>

                    <Link
                      href={`/admin/trip-proposals/${proposal.id}`}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      ✏️ Edit
                    </Link>

                    <button
                      onClick={() => duplicateProposal(proposal.id)}
                      className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      📋 Duplicate
                    </button>

                    {proposal.status === 'draft' && (
                      <button
                        onClick={() => deleteProposal(proposal.id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-sm font-bold transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    )}

                    {proposal.status === 'accepted' && (
                      <>
                        <button
                          onClick={() => convertToBooking(proposal)}
                          disabled={converting === proposal.id}
                          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {converting === proposal.id
                            ? '⏳ Converting...'
                            : '🎉 Convert to Booking'}
                        </button>
                        <Link
                          href={`/admin/trip-proposals/${proposal.id}/itinerary`}
                          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg text-sm font-bold transition-colors"
                        >
                          🚗 Driver Itinerary
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: Math.max(0, prev.offset - prev.limit),
                }))
              }
              disabled={pagination.offset === 0}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-600">
              Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
              {Math.ceil(pagination.total / pagination.limit)}
            </div>

            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
              }
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          Loading trip proposals...
        </div>
      }
    >
      <TripProposalsPageContent />
    </Suspense>
  );
}
