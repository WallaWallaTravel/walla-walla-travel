'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { TRIP_TYPE_OPTIONS } from '@/lib/types/trip-proposal';

// ============================================================================
// Types
// ============================================================================

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
  planning_phase?: string;
}

// Unified item type for display
interface UnifiedItem {
  id: number;
  type: 'quick_quote' | 'full_proposal';
  number: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  tripType: string;
  partySize: number;
  startDate: string | null;
  endDate: string | null;
  total: number;
  depositAmount: number;
  validUntil: string | null;
  createdAt: string;
  editUrl: string;
  previewUrl: string | null;
}

type TabKey = 'all' | 'quick_quotes' | 'full_proposals';

// ============================================================================
// Helpers
// ============================================================================

function normalizeEstimate(est: TripEstimate): UnifiedItem {
  return {
    id: est.id,
    type: 'quick_quote',
    number: est.estimate_number,
    status: est.status,
    customerName: est.customer_name,
    customerEmail: est.customer_email,
    customerPhone: est.customer_phone,
    tripType: est.trip_type,
    partySize: est.party_size,
    startDate: est.start_date,
    endDate: est.end_date,
    total: typeof est.subtotal === 'string' ? parseFloat(est.subtotal) : est.subtotal,
    depositAmount: typeof est.deposit_amount === 'string' ? parseFloat(est.deposit_amount) : est.deposit_amount,
    validUntil: est.valid_until,
    createdAt: est.created_at,
    editUrl: `/admin/trip-estimates/${est.id}`,
    previewUrl: ['sent', 'viewed', 'deposit_paid'].includes(est.status)
      ? `/trip-estimates/${est.estimate_number}`
      : null,
  };
}

function normalizeProposal(prop: TripProposal): UnifiedItem {
  return {
    id: prop.id,
    type: 'full_proposal',
    number: prop.proposal_number,
    status: prop.status,
    customerName: prop.customer_name,
    customerEmail: prop.customer_email,
    customerPhone: prop.customer_phone,
    tripType: prop.trip_type,
    partySize: prop.party_size,
    startDate: prop.start_date,
    endDate: prop.end_date,
    total: typeof prop.total === 'string' ? parseFloat(prop.total) : prop.total,
    depositAmount: typeof prop.deposit_amount === 'string' ? parseFloat(prop.deposit_amount) : prop.deposit_amount,
    validUntil: prop.valid_until,
    createdAt: prop.created_at,
    editUrl: `/admin/trip-proposals/${prop.id}`,
    previewUrl: `/trip-proposals/${prop.proposal_number}`,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Component
// ============================================================================

function ProposalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const urlStatus = searchParams.get('status');

  const [activeTab, setActiveTab] = useState<TabKey>(urlTab || 'all');
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [estimates, setEstimates] = useState<TripEstimate[]>([]);
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);

  // New button dropdown
  const [showNewMenu, setShowNewMenu] = useState(false);

  const { toasts, toast, dismissToast } = useToast();

  // Sync URL params
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
    if (urlStatus && urlStatus !== statusFilter) setStatusFilter(urlStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab, urlStatus]);

  // Fetch estimates (non-converted only)
  const loadEstimates = useCallback(async () => {
    setLoadingEstimates(true);
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' });
      if (searchTerm) params.set('search', searchTerm);
      // We'll filter status client-side to keep logic simple

      const response = await fetch(`/api/admin/trip-estimates?${params}`);
      const result = await response.json();

      if (result.success) {
        // Hide converted estimates (status=proposal_created)
        const filtered = (result.data.estimates || []).filter(
          (est: TripEstimate) => est.status !== 'proposal_created'
        );
        setEstimates(filtered);
      }
    } catch (error) {
      logger.error('Failed to load trip estimates', { error });
    } finally {
      setLoadingEstimates(false);
    }
  }, [searchTerm]);

  // Fetch proposals (pre-acceptance only for this view)
  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' });
      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/admin/trip-proposals?${params}`);
      const result = await response.json();

      if (result.success) {
        // Hide accepted/booked/declined proposals — those show in Trips
        const filtered = (result.data.proposals || []).filter(
          (prop: TripProposal) => ['draft', 'sent', 'viewed', 'expired'].includes(prop.status)
        );
        setProposals(filtered);
      }
    } catch (error) {
      logger.error('Failed to load trip proposals', { error });
    } finally {
      setLoadingProposals(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadEstimates();
    loadProposals();
  }, [loadEstimates, loadProposals]);

  // Build unified items based on active tab
  const allQuickQuotes = estimates.map(normalizeEstimate);
  const allFullProposals = proposals.map(normalizeProposal);

  let items: UnifiedItem[] = [];
  if (activeTab === 'quick_quotes') {
    items = allQuickQuotes;
  } else if (activeTab === 'full_proposals') {
    items = allFullProposals;
  } else {
    items = [...allQuickQuotes, ...allFullProposals];
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    items = items.filter((item) => item.status === statusFilter);
  }

  // Sort by most recent
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Get available statuses for the current tab
  const getStatusOptions = (): { value: string; label: string }[] => {
    if (activeTab === 'quick_quotes') {
      return [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'viewed', label: 'Viewed' },
        { value: 'deposit_paid', label: 'Deposit Paid' },
      ];
    }
    if (activeTab === 'full_proposals') {
      return [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'viewed', label: 'Viewed' },
        { value: 'expired', label: 'Expired' },
      ];
    }
    // All tab — combined statuses
    return [
      { value: 'all', label: 'All Statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'viewed', label: 'Viewed' },
      { value: 'deposit_paid', label: 'Deposit Paid' },
      { value: 'expired', label: 'Expired' },
    ];
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setStatusFilter('all');
  };

  const deleteEstimate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this estimate? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/trip-estimates/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast('Estimate deleted', 'success');
        loadEstimates();
      } else {
        toast(result.error?.message || 'Failed to delete', 'error');
      }
    } catch (error) {
      logger.error('Failed to delete estimate', { error });
      toast('Failed to delete estimate', 'error');
    }
  };

  const deleteProposal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this proposal? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast('Proposal deleted', 'success');
        loadProposals();
      } else {
        toast(result.error || 'Failed to delete', 'error');
      }
    } catch (error) {
      logger.error('Failed to delete proposal', { error });
      toast('Failed to delete proposal', 'error');
    }
  };

  const convertToProposal = async (estimate: TripEstimate) => {
    if (!confirm(`Convert estimate ${estimate.estimate_number} to a full trip proposal?`)) return;
    try {
      const response = await fetch(`/api/admin/trip-estimates/${estimate.id}/convert`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        toast(`Proposal ${result.data.proposal_number} created!`, 'success');
        router.push(`/admin/trip-proposals/${result.data.proposal_id}`);
      } else {
        toast(result.error?.message || 'Failed to convert', 'error');
      }
    } catch (error) {
      logger.error('Failed to convert estimate', { error });
      toast('Failed to convert estimate', 'error');
    }
  };

  const loading = loadingEstimates || loadingProposals;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      deposit_paid: 'bg-green-100 text-green-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-orange-100 text-orange-800',
    };

    const icons: Record<string, string> = {
      draft: '📝',
      sent: '📧',
      viewed: '👁️',
      deposit_paid: '💰',
      accepted: '✅',
      expired: '⏰',
    };

    const labels: Record<string, string> = {
      draft: 'DRAFT',
      sent: 'SENT',
      viewed: 'VIEWED',
      deposit_paid: 'DEPOSIT PAID',
      accepted: 'ACCEPTED',
      expired: 'EXPIRED',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badges[status] || 'bg-gray-100 text-gray-800'}`}
      >
        <span>{icons[status] || '📋'}</span>
        <span>{labels[status] || status.toUpperCase()}</span>
      </span>
    );
  };

  const getTypeBadge = (itemType: 'quick_quote' | 'full_proposal') => {
    if (itemType === 'quick_quote') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          ⚡ Quick Quote
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
        🗺️ Full Proposal
      </span>
    );
  };

  const getTripTypeBadge = (tripType: string) => {
    const typeOption = TRIP_TYPE_OPTIONS.find(t => t.value === tripType);
    const icon = typeOption?.icon || '✨';
    const label = typeOption?.label || tripType;
    const color = typeOption?.badgeColor || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Proposals</h1>
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-lg font-medium transition-colors"
              >
                + New
              </button>
              {showNewMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNewMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                    <Link
                      href="/admin/trip-estimates/new"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowNewMenu(false)}
                    >
                      <span className="text-lg">⚡</span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Quick Quote</div>
                        <div className="text-xs text-slate-500">Fast estimate with deposit</div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/trip-proposals/new"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-100"
                      onClick={() => setShowNewMenu(false)}
                    >
                      <span className="text-lg">🗺️</span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Full Proposal</div>
                        <div className="text-xs text-slate-500">Multi-day with itinerary</div>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-500">
            Quick quotes and full trip proposals — everything being sold
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {([
            { key: 'all' as TabKey, label: 'All', count: allQuickQuotes.length + allFullProposals.length },
            { key: 'quick_quotes' as TabKey, label: 'Quick Quotes', count: allQuickQuotes.length },
            { key: 'full_proposals' as TabKey, label: 'Full Proposals', count: allFullProposals.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs ${activeTab === key ? 'text-white/70' : 'text-slate-400'}`}>
                ({count})
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 outline-none"
              >
                {getStatusOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Customer name or email..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-slate-500">
          {items.length} {items.length === 1 ? 'proposal' : 'proposals'}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 bg-slate-200 rounded-full w-24" />
                    <div className="h-5 bg-slate-200 rounded-full w-28" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-48" />
                  <div className="h-4 bg-slate-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No proposals found
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first quick quote or full proposal to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => router.push(item.editUrl)}
              >
                <div className="p-5">
                  {/* Top row: badges + amount */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                      {getTripTypeBadge(item.tripType)}
                      <span className="text-xs font-mono text-slate-400">{item.number}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-lg font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Deposit: {formatCurrency(item.depositAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Customer + details */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {item.customerName}
                      </h3>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {item.startDate ? formatDate(item.startDate) : 'Date TBD'}
                        {item.endDate && item.endDate !== item.startDate && (
                          <> – {formatDate(item.endDate)}</>
                        )}
                        {' · '}
                        {item.partySize} guest{item.partySize !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {item.previewUrl && (
                        <Link
                          href={item.previewUrl}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Preview client page"
                        >
                          👁️
                        </Link>
                      )}
                      <Link
                        href={item.editUrl}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </Link>
                      {item.type === 'quick_quote' && item.status === 'deposit_paid' && (
                        <button
                          onClick={() => {
                            const est = estimates.find((e) => e.id === item.id);
                            if (est && !est.trip_proposal_id) convertToProposal(est);
                          }}
                          className="p-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Convert to Full Proposal"
                        >
                          🗺️
                        </button>
                      )}
                      {item.status === 'draft' && (
                        <button
                          onClick={() => {
                            if (item.type === 'quick_quote') deleteEstimate(item.id);
                            else deleteProposal(item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1E3A5F] border-t-transparent mx-auto" />
            <p className="mt-4 text-slate-500">Loading proposals...</p>
          </div>
        </div>
      }
    >
      <ProposalsPageContent />
    </Suspense>
  );
}
