'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface TripEstimate {
  id: number;
  estimate_number: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  trip_title: string | null;
  party_size: number;
  start_date: string | null;
  end_date: string | null;
  subtotal: string | number;
  deposit_amount: string | number;
  deposit_paid: boolean;
  valid_until: string | null;
  trip_proposal_id: number | null;
  created_at: string;
}

export default function TripEstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<TripEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const loadEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const response = await fetch(`/api/admin/trip-estimates?${params}`);
      const result = await response.json();

      if (result.success) {
        setEstimates(result.data.estimates);
        setTotal(result.data.total);
      }
    } catch (error) {
      logger.error('Failed to load trip estimates', { error });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, offset]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  const deleteEstimate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this estimate? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trip-estimates/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        loadEstimates();
      } else {
        alert(result.error?.message || result.error || 'Failed to delete estimate');
      }
    } catch (error) {
      logger.error('Failed to delete trip estimate', { error });
      alert('Failed to delete estimate');
    }
  };

  const convertToProposal = async (estimate: TripEstimate) => {
    if (!confirm(`Convert estimate ${estimate.estimate_number} to a full trip proposal?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trip-estimates/${estimate.id}/convert`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        alert(`Proposal ${result.data.proposal_number} created! Redirecting...`);
        router.push(`/admin/trip-proposals/${result.data.proposal_id}`);
      } else {
        alert(result.error?.message || result.error || 'Failed to convert estimate');
      }
    } catch (error) {
      logger.error('Failed to convert trip estimate', { error });
      alert('Failed to convert estimate');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      deposit_paid: 'bg-green-100 text-green-800',
      proposal_created: 'bg-purple-100 text-purple-800',
    };

    const icons: Record<string, string> = {
      draft: '📝',
      sent: '📧',
      viewed: '👁️',
      deposit_paid: '💰',
      proposal_created: '🎉',
    };

    const labels: Record<string, string> = {
      draft: 'DRAFT',
      sent: 'SENT',
      viewed: 'VIEWED',
      deposit_paid: 'DEPOSIT PAID',
      proposal_created: 'PROPOSAL CREATED',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badges[status] || 'bg-gray-100 text-gray-800'}`}
      >
        <span>{icons[status] || '📋'}</span>
        <span>{labels[status] || status.toUpperCase()}</span>
      </span>
    );
  };

  const getTripTypeBadge = (tripType: string) => {
    const types: Record<string, { icon: string; label: string; color: string }> = {
      wine_tour: { icon: '🍷', label: 'Wine Tour', color: 'bg-purple-100 text-purple-800' },
      wine_group: { icon: '🍇', label: 'Wine Group', color: 'bg-violet-100 text-violet-800' },
      celebration: { icon: '🎉', label: 'Celebration', color: 'bg-pink-100 text-pink-800' },
      corporate: { icon: '🏢', label: 'Corporate', color: 'bg-blue-100 text-blue-800' },
      wedding: { icon: '💒', label: 'Wedding', color: 'bg-rose-100 text-rose-800' },
      anniversary: { icon: '💍', label: 'Anniversary', color: 'bg-amber-100 text-amber-800' },
      family: { icon: '👨‍👩‍👧‍👦', label: 'Family', color: 'bg-green-100 text-green-800' },
      romantic: { icon: '💕', label: 'Romantic', color: 'bg-red-100 text-red-800' },
      custom: { icon: '✨', label: 'Custom', color: 'bg-gray-100 text-gray-800' },
    };

    const type = types[tripType] || types.custom;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${type!.color}`}>
        <span>{type!.icon}</span>
        <span>{type!.label}</span>
      </span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">💰 Trip Estimates</h1>
            <Link
              href="/admin/trip-estimates/new"
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg"
            >
              + New Estimate
            </Link>
          </div>
          <p className="text-gray-600">
            Quick cost estimates and deposit requests — collect payment before building full proposals
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">📝 Draft</option>
                <option value="sent">📧 Sent</option>
                <option value="viewed">👁️ Viewed</option>
                <option value="deposit_paid">💰 Deposit Paid</option>
                <option value="proposal_created">🎉 Proposal Created</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOffset(0);
                }}
                placeholder="Search by customer, email, or estimate number..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : estimates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No estimates yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first Quick Tally to estimate trip costs and collect deposits.
            </p>
            <Link
              href="/admin/trip-estimates/new"
              className="inline-block px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors"
            >
              Create First Estimate
            </Link>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Estimate #
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Trip
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Deposit
                      </th>
                      <th className="text-center px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estimates.map((estimate) => (
                      <tr
                        key={estimate.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/trip-estimates/${estimate.id}`)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-[#8B1538]">
                            {estimate.estimate_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">{estimate.customer_name}</div>
                            {estimate.customer_email && (
                              <div className="text-sm text-gray-600">{estimate.customer_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getTripTypeBadge(estimate.trip_type)}
                            {estimate.trip_title && (
                              <div className="text-sm text-gray-700 truncate max-w-[200px]">
                                {estimate.trip_title}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {estimate.start_date ? (
                            <div>
                              <div>{formatDate(estimate.start_date)}</div>
                              {estimate.end_date && estimate.end_date !== estimate.start_date && (
                                <div className="text-gray-500">to {formatDate(estimate.end_date)}</div>
                              )}
                              <div className="text-gray-500">{estimate.party_size} guests</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">TBD</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(estimate.subtotal)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${estimate.deposit_paid ? 'text-green-700' : 'text-gray-900'}`}>
                            {formatCurrency(estimate.deposit_amount)}
                          </span>
                          {estimate.deposit_paid && (
                            <div className="text-xs text-green-600 font-medium">Paid</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(estimate.status)}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {/* Preview (client link) */}
                            {['sent', 'viewed', 'deposit_paid'].includes(estimate.status) && (
                              <Link
                                href={`/trip-estimates/${estimate.estimate_number}`}
                                target="_blank"
                                className="p-2 text-gray-600 hover:text-[#8B1538] hover:bg-gray-100 rounded-lg transition-colors"
                                title="Preview client page"
                              >
                                👁️
                              </Link>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => router.push(`/admin/trip-estimates/${estimate.id}`)}
                              className="p-2 text-gray-600 hover:text-[#8B1538] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>

                            {/* Convert to Proposal */}
                            {estimate.status === 'deposit_paid' && !estimate.trip_proposal_id && (
                              <button
                                onClick={() => convertToProposal(estimate)}
                                className="p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                title="Convert to Proposal"
                              >
                                🗺️
                              </button>
                            )}

                            {/* View linked proposal */}
                            {estimate.trip_proposal_id && (
                              <Link
                                href={`/admin/trip-proposals/${estimate.trip_proposal_id}`}
                                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                                title="View Proposal"
                              >
                                🔗
                              </Link>
                            )}

                            {/* Delete (drafts only) */}
                            {estimate.status === 'draft' && (
                              <button
                                onClick={() => deleteEstimate(estimate.id)}
                                className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {offset + 1}–{Math.min(offset + limit, total)} of {total} estimates
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
