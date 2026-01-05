'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SendProposalModal } from '@/components/proposals/SendProposalModal';

interface Proposal {
  id: number;
  proposal_number: string;
  uuid: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string | null;
  proposal_title: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'converted';
  total: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  view_count: number;
  service_items: Array<{ service_type: string; name: string; calculated_price: number }>;
}

function ProposalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status');
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendModalProposal, setSendModalProposal] = useState<Proposal | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Update filter when URL changes
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
        offset: pagination.offset.toString()
      });

      const response = await fetch(`/api/proposals?${params}`);
      const result = await response.json();

      if (result.success) {
        setProposals(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProposal = async (proposalNumber: string) => {
    if (!confirm('Are you sure you want to delete this proposal? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/proposals/${proposalNumber}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('Proposal deleted successfully');
        loadProposals();
      } else {
        alert(result.error || 'Failed to delete proposal');
      }
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      alert('Failed to delete proposal');
    }
  };

  const convertToBooking = async (proposal: Proposal) => {
    if (!confirm(`Convert proposal ${proposal.proposal_number} for ${proposal.client_name} to a booking?\n\nThis will create a new confirmed booking.`)) {
      return;
    }

    setConverting(proposal.id);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/convert`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Success!\n\nBooking ${result.data.booking_number} created.\n\nRedirecting to booking details...`);
        router.push(`/admin/bookings/${result.data.booking_id}`);
      } else {
        alert(result.error || 'Failed to convert proposal');
      }
    } catch (error) {
      console.error('Failed to convert proposal:', error);
      alert('Failed to convert proposal to booking');
    } finally {
      setConverting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      converted: 'bg-purple-100 text-purple-800'
    };

    const icons = {
      draft: '📝',
      sent: '📧',
      viewed: '👁️',
      accepted: '✅',
      declined: '❌',
      expired: '⏰',
      converted: '🎉'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        <span>{icons[status as keyof typeof icons]}</span>
        <span>{status.toUpperCase()}</span>
      </span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const _formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">📝 Proposals</h1>
            <Link
              href="/admin/proposals/new"
              className="px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg"
            >
              + New Proposal
            </Link>
          </div>
          <p className="text-gray-600">Manage and track all client proposals</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
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
              <label className="block text-sm font-bold text-gray-900 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                placeholder="Client name or email..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {proposals.length} of {pagination.total} proposals
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Proposals Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first proposal to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                href="/admin/proposals/new"
                className="inline-block px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors"
              >
                + Create First Proposal
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
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(proposal.status)}
                        <span className="text-sm font-mono text-gray-600">
                          {proposal.proposal_number}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {proposal.client_name}
                        {proposal.client_company && (
                          <span className="text-gray-600 font-normal"> • {proposal.client_company}</span>
                        )}
                      </h3>
                      <p className="text-gray-600">{proposal.proposal_title}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#8B1538]">
                        {formatCurrency(proposal.total)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {proposal.service_items.length} service{proposal.service_items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
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

                    {proposal.viewed_at && (
                      <div>
                        <div className="text-gray-500 font-semibold">Last Viewed</div>
                        <div className="text-gray-900">
                          {formatDate(proposal.viewed_at)}
                          {proposal.view_count > 1 && (
                            <span className="text-xs text-gray-500"> ({proposal.view_count} views)</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-gray-500 font-semibold">Valid Until</div>
                      <div className={`font-bold ${new Date(proposal.valid_until) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDate(proposal.valid_until)}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 mb-4 text-sm">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📧</span>
                        <a href={`mailto:${proposal.client_email}`} className="text-[#8B1538] hover:underline">
                          {proposal.client_email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📱</span>
                        <a href={`tel:${proposal.client_phone}`} className="text-[#8B1538] hover:underline">
                          {proposal.client_phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/proposals/${proposal.uuid}`}
                      target="_blank"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      👁️ Preview
                    </Link>

                    <Link
                      href={`/admin/proposals/${proposal.id}/edit`}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-bold transition-colors"
                    >
                      ✏️ Edit
                    </Link>

                    {proposal.status === 'draft' && (
                      <>
                        <button
                          onClick={() => setSendModalProposal(proposal)}
                          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg text-sm font-bold transition-colors"
                        >
                          📧 Send
                        </button>

                        <button
                          onClick={() => deleteProposal(proposal.proposal_number)}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-sm font-bold transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}

                    {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                      <button
                        onClick={() => setSendModalProposal(proposal)}
                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-lg text-sm font-bold transition-colors"
                      >
                        🔄 Resend
                      </button>
                    )}

                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => convertToBooking(proposal)}
                        disabled={converting === proposal.id}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {converting === proposal.id ? '⏳ Converting...' : '🎉 Convert to Booking'}
                      </button>
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
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pagination.offset === 0}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-600">
              Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
            </div>

            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* Send Proposal Modal */}
        {sendModalProposal && (
          <SendProposalModal
            proposalNumber={sendModalProposal.proposal_number}
            clientName={sendModalProposal.client_name}
            clientEmail={sendModalProposal.client_email}
            clientPhone={sendModalProposal.client_phone}
            onClose={() => setSendModalProposal(null)}
            onSuccess={() => {
              setSendModalProposal(null);
              loadProposals();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading proposals...</div>}>
      <ProposalsPageContent />
    </Suspense>
  );
}
