'use client';

/**
 * Trips Page — Consolidated view of accepted proposals + legacy bookings
 *
 * Tabs: All | Planning | Upcoming | Completed | Cancelled
 */

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

// ============================================================================
// Types
// ============================================================================

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  status: string;
  total_price: number;
  brand_name: string | null;
  driver_name: string | null;
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
  created_at: string;
  accepted_at: string | null;
  planning_phase?: string;
  days_count?: number;
  archived_at: string | null;
  // Payment tracking fields
  skip_deposit_on_accept?: boolean;
  individual_billing_enabled?: boolean;
  deposit_paid?: boolean;
  balance_paid?: boolean;
  // Guest payment summary (from subqueries)
  billable_guest_count?: number;
  paid_guest_count?: number;
}

// Payment status categories
type PaymentStatus =
  | 'deferred_deposit'
  | 'deposit_secured'
  | 'collecting_deposits'
  | 'all_deposits_collected'
  | 'balance_due'
  | null; // Legacy bookings or no applicable status

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  deferred_deposit: { label: 'Deferred Deposit', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: '⏳' },
  deposit_secured: { label: 'Deposit Secured', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: '✓' },
  collecting_deposits: { label: 'Collecting Deposits', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: '💳' },
  all_deposits_collected: { label: 'All Deposits Collected', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: '✓' },
  balance_due: { label: 'Balance Due', color: 'bg-red-50 text-red-700 border border-red-200', icon: '⚠' },
};

// Unified trip item
interface TripItem {
  id: number;
  source: 'proposal' | 'booking';
  number: string;
  customerName: string;
  customerEmail: string | null;
  partySize: number;
  startDate: string;
  endDate: string | null;
  total: number;
  status: string;
  stageBadge: { label: string; color: string };
  paymentStatus: PaymentStatus;
  editUrl: string;
  createdAt: string;
  driverName?: string | null;
  archivedAt: string | null;
}

type PaymentFilterKey = 'all' | 'deferred_deposit' | 'deposit_secured' | 'collecting_deposits' | 'all_deposits_collected' | 'balance_due';

type TabKey = 'all' | 'planning' | 'upcoming' | 'completed' | 'cancelled';

// ============================================================================
// Helpers
// ============================================================================

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

function isFutureDate(dateString: string): boolean {
  const d = new Date(dateString + 'T23:59:59');
  return d >= new Date();
}

function isPastDate(dateString: string): boolean {
  const d = new Date(dateString + 'T00:00:00');
  return d < new Date();
}

function getStageBadge(source: 'proposal' | 'booking', status: string, planningPhase?: string, startDate?: string): { label: string; color: string } {
  if (source === 'proposal') {
    if (status === 'declined') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
    if (status === 'booked') {
      if (startDate && isPastDate(startDate)) return { label: 'Completed', color: 'bg-slate-100 text-slate-700' };
      return { label: 'Booked', color: 'bg-purple-100 text-purple-700' };
    }
    // accepted
    if (planningPhase === 'finalized') {
      if (startDate && isPastDate(startDate)) return { label: 'Completed', color: 'bg-slate-100 text-slate-700' };
      return { label: 'Ready', color: 'bg-emerald-100 text-emerald-700' };
    }
    if (planningPhase === 'active_planning') return { label: 'Planning', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Planning', color: 'bg-blue-100 text-blue-700' };
  }

  // Legacy booking
  if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  if (status === 'completed') return { label: 'Completed', color: 'bg-slate-100 text-slate-700' };
  if (status === 'confirmed') {
    if (startDate && isPastDate(startDate)) return { label: 'Completed', color: 'bg-slate-100 text-slate-700' };
    return { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' };
  }
  if (status === 'pending') return { label: 'Pending', color: 'bg-amber-100 text-amber-700' };
  return { label: status, color: 'bg-gray-100 text-gray-700' };
}

function derivePaymentStatus(prop: TripProposal): PaymentStatus {
  // Cancelled/declined trips don't get a payment badge
  if (prop.status === 'declined') return null;

  const tourCompleted = isPastDate(prop.start_date);

  // Balance Due: Tour is done but final balance not collected
  if (tourCompleted && !prop.balance_paid) {
    // For individual billing, check if all guests have paid before flagging
    if (prop.individual_billing_enabled) {
      const billable = prop.billable_guest_count ?? 0;
      const paid = prop.paid_guest_count ?? 0;
      if (billable === 0 || paid < billable) return 'balance_due';
      // All guests paid — no balance due badge needed
    } else {
      return 'balance_due';
    }
  }

  // Individual billing trips
  if (prop.individual_billing_enabled) {
    const billable = prop.billable_guest_count ?? 0;
    const paid = prop.paid_guest_count ?? 0;
    if (billable > 0 && paid >= billable) return 'all_deposits_collected';
    // Zero guests or some unpaid — show collecting status
    return 'collecting_deposits';
  }

  // Deferred deposit: verbally confirmed, deposit not yet collected (single-payer only)
  if (prop.skip_deposit_on_accept && !prop.deposit_paid) {
    return 'deferred_deposit';
  }

  // Standard single-payer deposit secured
  if (prop.deposit_paid) {
    return 'deposit_secured';
  }

  return null;
}

function normalizeProposal(prop: TripProposal): TripItem {
  const badge = getStageBadge('proposal', prop.status, prop.planning_phase, prop.start_date);
  return {
    id: prop.id,
    source: 'proposal',
    number: prop.proposal_number,
    customerName: prop.customer_name,
    customerEmail: prop.customer_email,
    partySize: prop.party_size,
    startDate: prop.start_date,
    endDate: prop.end_date,
    total: typeof prop.total === 'string' ? parseFloat(prop.total) : prop.total,
    status: prop.status,
    stageBadge: badge,
    paymentStatus: derivePaymentStatus(prop),
    editUrl: `/admin/trip-proposals/${prop.id}`,
    createdAt: prop.created_at,
    archivedAt: prop.archived_at,
  };
}

function normalizeBooking(booking: Booking): TripItem {
  const badge = getStageBadge('booking', booking.status, undefined, booking.tour_date);
  return {
    id: booking.id,
    source: 'booking',
    number: booking.booking_number,
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    partySize: booking.party_size,
    startDate: booking.tour_date,
    endDate: null,
    total: typeof booking.total_price === 'string' ? parseFloat(booking.total_price) : booking.total_price,
    status: booking.status,
    stageBadge: badge,
    paymentStatus: null, // Legacy bookings don't use new payment tracking
    editUrl: `/admin/bookings/${booking.id}`,
    createdAt: booking.created_at,
    driverName: booking.driver_name,
    archivedAt: null,
  };
}

// ============================================================================
// Component
// ============================================================================

function TripsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;

  const [activeTab, setActiveTab] = useState<TabKey>(urlTab || 'all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { toasts, toast, dismissToast } = useToast();

  // Data
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  // Fetch accepted/booked/declined proposals
  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    try {
      // Fetch all proposals (including archived) and filter client-side for accepted/booked/declined
      const response = await fetch('/api/admin/trip-proposals?limit=200&offset=0&include_archived=true');
      const result = await response.json();

      if (result.success) {
        const filtered = (result.data.proposals || []).filter(
          (p: TripProposal) => ['accepted', 'booked', 'declined'].includes(p.status)
        );
        setProposals(filtered);
      }
    } catch (error) {
      logger.error('Failed to load trip proposals for trips page', { error });
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  // Fetch legacy bookings
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const response = await fetch('/api/admin/bookings', { credentials: 'include' });
      if (response.ok) {
        const result = await response.json();
        setBookings(result.data?.bookings || []);
      }
    } catch (error) {
      logger.error('Failed to load bookings for trips page', { error });
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
    loadBookings();
  }, [loadProposals, loadBookings]);

  // Close three-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const archiveTrip = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/archive`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast('Trip archived', 'success');
        loadProposals();
      } else {
        toast(result.error || 'Failed to archive', 'error');
      }
    } catch (error) {
      logger.error('Failed to archive trip', { error });
      toast('Failed to archive trip', 'error');
    }
    setOpenMenuId(null);
  };

  const unarchiveTrip = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/archive`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast('Trip unarchived', 'success');
        loadProposals();
      } else {
        toast(result.error || 'Failed to unarchive', 'error');
      }
    } catch (error) {
      logger.error('Failed to unarchive trip', { error });
      toast('Failed to unarchive trip', 'error');
    }
    setOpenMenuId(null);
  };

  // Build unified items
  const allItems: TripItem[] = [
    ...proposals.map(normalizeProposal),
    ...bookings.map(normalizeBooking),
  ];

  // Count archived items before filtering
  const archivedCount = allItems.filter((item) => item.archivedAt).length;

  // Filter archived items unless toggle is on
  let filtered = showArchived ? allItems : allItems.filter((item) => !item.archivedAt);

  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.customerName.toLowerCase().includes(term) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(term)) ||
        item.number.toLowerCase().includes(term)
    );
  }

  // Categorize for tabs
  const planningItems = filtered.filter((item) => {
    if (item.source === 'proposal') {
      const prop = proposals.find((p) => p.id === item.id);
      return (
        item.status === 'accepted' &&
        (prop?.planning_phase === 'active_planning' || prop?.planning_phase === 'proposal')
      );
    }
    return item.status === 'pending';
  });

  const upcomingItems = filtered.filter((item) => {
    if (item.source === 'proposal') {
      const isBooked = item.status === 'booked';
      const isFinalized =
        item.status === 'accepted' &&
        proposals.find((p) => p.id === item.id)?.planning_phase === 'finalized';
      return (isBooked || isFinalized) && isFutureDate(item.startDate);
    }
    return item.status === 'confirmed' && isFutureDate(item.startDate);
  });

  const completedItems = filtered.filter((item) => {
    if (item.source === 'proposal') {
      return (
        (item.status === 'booked' || item.status === 'accepted') &&
        isPastDate(item.startDate)
      );
    }
    return item.status === 'completed' || (item.status === 'confirmed' && isPastDate(item.startDate));
  });

  const cancelledItems = filtered.filter((item) => {
    if (item.source === 'proposal') return item.status === 'declined';
    return item.status === 'cancelled';
  });

  // Get items for current tab
  const getTabItems = (): TripItem[] => {
    switch (activeTab) {
      case 'planning': return planningItems;
      case 'upcoming': return upcomingItems;
      case 'completed': return completedItems;
      case 'cancelled': return cancelledItems;
      default: return filtered;
    }
  };

  // Apply payment filter on top of tab filter
  const applyPaymentFilter = (items: TripItem[]): TripItem[] => {
    if (paymentFilter === 'all') return items;
    return items.filter((item) => item.paymentStatus === paymentFilter);
  };

  // Payment filter counts (based on current tab's items)
  const tabBaseItems = getTabItems();
  const paymentFilterCounts: Record<PaymentFilterKey, number> = {
    all: tabBaseItems.length,
    deferred_deposit: tabBaseItems.filter((i) => i.paymentStatus === 'deferred_deposit').length,
    deposit_secured: tabBaseItems.filter((i) => i.paymentStatus === 'deposit_secured').length,
    collecting_deposits: tabBaseItems.filter((i) => i.paymentStatus === 'collecting_deposits').length,
    all_deposits_collected: tabBaseItems.filter((i) => i.paymentStatus === 'all_deposits_collected').length,
    balance_due: tabBaseItems.filter((i) => i.paymentStatus === 'balance_due').length,
  };

  // Only show payment filters that have items
  const activePaymentFilters = (Object.entries(paymentFilterCounts) as [PaymentFilterKey, number][])
    .filter(([key, count]) => key === 'all' || count > 0);

  const tabItems = applyPaymentFilter(tabBaseItems).sort(
    (a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime()
  );

  // For upcoming, sort ascending (nearest trip first)
  if (activeTab === 'upcoming') {
    tabItems.sort(
      (a, b) => new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime()
    );
  }

  const loading = loadingProposals || loadingBookings;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: filtered.length },
    { key: 'planning', label: 'Planning', count: planningItems.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingItems.length },
    { key: 'completed', label: 'Completed', count: completedItems.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledItems.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Trips</h1>
          <p className="text-slate-500 mt-1">
            Confirmed trips — from accepted proposals to completed tours
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-slate-200 p-1 w-fit flex-wrap">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setPaymentFilter('all'); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${activeTab === key ? 'text-white/70' : 'text-slate-500'}`}>
                ({count})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Customer name, email, or trip number..."
            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 outline-none"
          />
        </div>

        {/* Payment status filter chips */}
        {activePaymentFilters.length > 1 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">Payment:</span>
            {activePaymentFilters.map(([key, count]) => {
              const isActive = paymentFilter === key;
              const config = key !== 'all' ? PAYMENT_STATUS_CONFIG[key] : null;
              return (
                <button
                  key={key}
                  onClick={() => setPaymentFilter(key)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {config && <span>{config.icon}</span>}
                  {key === 'all' ? 'All' : config?.label}
                  <span className={isActive ? 'text-white/70' : 'text-slate-500'}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">Planning</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{planningItems.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">Upcoming</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{upcomingItems.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{completedItems.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">Cancelled</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{cancelledItems.length}</p>
          </div>
        </div>

        {/* Archived toggle + Results count */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-500">
            {tabItems.length} {tabItems.length === 1 ? 'trip' : 'trips'}
          </div>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showArchived
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
              <span className={showArchived ? 'text-amber-600' : 'text-slate-400'}>({archivedCount})</span>
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 bg-slate-200 rounded-full w-20" />
                    <div className="h-5 bg-slate-200 rounded-full w-16" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-40" />
                  <div className="h-4 bg-slate-200 rounded w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : tabItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No trips found
            </h3>
            <p className="text-slate-500">
              {searchTerm
                ? 'Try adjusting your search'
                : paymentFilter !== 'all'
                  ? 'No trips match this payment status filter'
                  : activeTab === 'all'
                    ? 'Trips appear here when proposals are accepted'
                    : `No ${activeTab} trips right now`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabItems.map((item) => {
              const menuId = `${item.source}-${item.id}`;
              return (
                <div
                  key={menuId}
                  className={`bg-white rounded-xl border hover:shadow-sm transition-all cursor-pointer ${
                    item.archivedAt
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => router.push(item.editUrl)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.stageBadge.color}`}>
                            {item.stageBadge.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.source === 'proposal'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {item.source === 'proposal' ? '🗺️ Proposal' : '📅 Booking'}
                          </span>
                          {item.archivedAt && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              ARCHIVED
                            </span>
                          )}
                          <span className="text-xs font-mono text-slate-400">
                            {item.source === 'proposal' ? item.number : `#${item.number}`}
                          </span>
                          {item.paymentStatus && PAYMENT_STATUS_CONFIG[item.paymentStatus] && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_CONFIG[item.paymentStatus].color}`}>
                              <span>{PAYMENT_STATUS_CONFIG[item.paymentStatus].icon}</span>
                              {PAYMENT_STATUS_CONFIG[item.paymentStatus].label}
                            </span>
                          )}
                        </div>

                        {/* Customer */}
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.customerName}
                        </h3>

                        {/* Details */}
                        <div className="text-sm text-slate-500 mt-0.5">
                          {formatDate(item.startDate)}
                          {item.endDate && item.endDate !== item.startDate && (
                            <> – {formatDate(item.endDate)}</>
                          )}
                          {' · '}
                          {item.partySize} guest{item.partySize !== 1 ? 's' : ''}
                          {item.driverName && (
                            <> · Driver: {item.driverName}</>
                          )}
                        </div>
                      </div>

                      {/* Amount + three-dot menu */}
                      <div className="flex items-start gap-2 shrink-0 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">
                            {formatCurrency(item.total)}
                          </div>
                        </div>

                        {/* Three-dot menu — proposal-sourced items only */}
                        {item.source === 'proposal' && (
                          <div className="relative" ref={openMenuId === menuId ? menuRef : undefined} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="More actions"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {openMenuId === menuId && (
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                                {item.archivedAt ? (
                                  <button
                                    onClick={() => unarchiveTrip(item.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    📤 Unarchive
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => archiveTrip(item.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    📦 Archive
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1E3A5F] border-t-transparent mx-auto" />
            <p className="mt-4 text-slate-500">Loading trips...</p>
          </div>
        </div>
      }
    >
      <TripsPageContent />
    </Suspense>
  );
}
