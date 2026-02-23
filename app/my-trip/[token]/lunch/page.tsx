'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProposal } from '@/lib/contexts/proposal-context';
import { apiGet, apiPost } from '@/lib/utils/fetch-utils';
import LunchOrderForm from '@/components/my-trip/LunchOrderForm';
import IndividualLunchOrderForm from '@/components/my-trip/IndividualLunchOrderForm';
import type {
  ProposalLunchOrder,
  LunchMenuItem,
  LunchOrderStatus,
  SubmitLunchOrderInput,
  GuestOrder,
} from '@/lib/types/lunch-supplier';

// ============================================================================
// Types
// ============================================================================

interface LunchOrderWithMenu extends ProposalLunchOrder {
  menu_items: LunchMenuItem[] | null;
  ordering_open: boolean;
  ordering_reason?: string;
}

interface LunchApiResponse {
  orders: LunchOrderWithMenu[];
  planning_phase: string;
}

// ============================================================================
// Status Badge
// ============================================================================

const STATUS_STYLES: Record<
  LunchOrderStatus,
  { bg: string; text: string; label: string }
> = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Draft',
  },
  submitted: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    label: 'Submitted',
  },
  sent_to_supplier: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Sent to Restaurant',
  },
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Confirmed',
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    label: 'Cancelled',
  },
};

function StatusBadge({ status }: { status: LunchOrderStatus }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function LunchPage() {
  const { proposal, planningPhase, accessToken, guestId, guestName } = useProposal();

  const [orders, setOrders] = useState<LunchOrderWithMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchLunchData = useCallback(async () => {
    try {
      const result = await apiGet<LunchApiResponse>(
        `/api/my-trip/${accessToken}/lunch`
      );
      if (result.success && result.data) {
        setOrders(result.data.orders);
        setError(null);
      } else {
        setError(result.error || 'Unable to load lunch orders');
      }
    } catch {
      setError('Unable to load lunch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchLunchData();
  }, [fetchLunchData]);

  // Clear success message after 4 seconds
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleSubmitOrder = useCallback(
    async (orderId: number, data: SubmitLunchOrderInput) => {
      const result = await apiPost(`/api/my-trip/${accessToken}/lunch`, {
        order_id: orderId,
        ...data,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit order');
      }

      setSuccessMessage('Your lunch order has been submitted.');
      await fetchLunchData();
    },
    [accessToken, fetchLunchData]
  );

  const isReadOnly = planningPhase === 'finalized';

  // Prepare guests from proposal
  const guests = (proposal.guests || []).map((g) => ({
    name: g.name,
    dietary_restrictions: g.dietary_restrictions,
  }));

  // Find this guest's dietary restrictions
  const currentGuestDietary = guestId
    ? (proposal.guests || []).find((g) => g.id === guestId)?.dietary_restrictions
    : null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-10 bg-gray-50 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-red-800 mb-1">
          Unable to Load Lunch Orders
        </h2>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchLunchData}
          className="mt-4 rounded-lg px-4 py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          No Lunch Orders Yet
        </h2>
        <p className="text-sm text-gray-600">
          Lunch arrangements will appear here once your trip planner sets them
          up. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success notification */}
      {successMessage && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
          <svg
            className="w-5 h-5 text-emerald-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="text-emerald-800 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Each lunch order */}
      {orders.map((order) => {
        const dayLabel = order.day
          ? `Day ${order.day.day_number}${order.day.title ? ` - ${order.day.title}` : ''} (${new Date(order.day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`
          : 'Lunch';

        const supplierName =
          order.supplier?.name || 'Restaurant';

        const canEdit =
          !isReadOnly &&
          order.ordering_open &&
          (order.status === 'draft' || order.status === 'submitted');

        // After submission, show a summary instead of the form
        const showSummary =
          isReadOnly ||
          order.status === 'sent_to_supplier' ||
          order.status === 'confirmed' ||
          order.status === 'cancelled';

        // Individual ordering mode
        const isIndividual = order.ordering_mode === 'individual';

        // Find this guest's existing order within the JSONB
        const existingGuestOrder: GuestOrder | null =
          guestId && guestName
            ? (Array.isArray(order.guest_orders)
                ? order.guest_orders.find((go) => go.guest_name === guestName)
                : null) ?? null
            : null;

        return (
          <section key={order.id}>
            {/* Order header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {dayLabel}
                </h2>
                <p className="text-sm text-gray-600">
                  {supplierName}
                  {isIndividual && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">
                      Individual ordering
                    </span>
                  )}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {showSummary ? (
              <OrderSummary order={order} />
            ) : isIndividual && guestId && guestName ? (
              // Individual mode + identified guest: show single-guest form
              <IndividualLunchOrderForm
                guestId={guestId}
                guestName={guestName}
                menuItems={order.menu_items || []}
                cutoffAt={order.cutoff_at}
                orderId={order.id}
                accessToken={accessToken}
                existingOrder={existingGuestOrder}
                dietaryRestrictions={currentGuestDietary}
              />
            ) : isIndividual && !guestId ? (
              // Individual mode + coordinator view: show read-only summary of submissions so far
              <OrderSummary order={order} />
            ) : (
              // Coordinator mode: show full form
              <LunchOrderForm
                order={order}
                menuItems={order.menu_items || []}
                guests={guests}
                cutoffAt={order.cutoff_at}
                onSubmit={(data) => handleSubmitOrder(order.id, data)}
                isReadOnly={!canEdit}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

// ============================================================================
// Order Summary (Read-Only)
// ============================================================================

function OrderSummary({ order }: { order: LunchOrderWithMenu }) {
  const guestOrders = Array.isArray(order.guest_orders)
    ? order.guest_orders
    : [];

  if (guestOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <p className="text-sm text-gray-600">No items ordered.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {guestOrders.map((guest, idx) => (
        <div
          key={idx}
          className={`px-5 py-4 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {guest.guest_name}
          </h4>
          <ul className="space-y-1">
            {guest.items.map((item, itemIdx) => (
              <li
                key={itemIdx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {item.name} x{item.qty}
                </span>
                {item.price !== undefined && (
                  <span className="font-medium text-gray-900">
                    ${(item.price * item.qty).toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {guest.notes && (
            <p className="text-sm text-gray-600 mt-1 italic">
              {guest.notes}
            </p>
          )}
        </div>
      ))}

      {/* Totals */}
      <div className="px-5 py-4 border-t border-gray-200 bg-slate-50">
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          <span>Subtotal</span>
          <span className="font-medium text-gray-900">
            ${order.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Tax</span>
          <span>${order.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Special requests */}
      {order.special_requests && (
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Special requests:</span>{' '}
            {order.special_requests}
          </p>
        </div>
      )}

      {/* Confirmation details */}
      {order.status === 'confirmed' && order.supplier_reference && (
        <div className="px-5 py-3 border-t border-gray-100 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            <span className="font-medium">Confirmation #:</span>{' '}
            {order.supplier_reference}
          </p>
        </div>
      )}
    </div>
  );
}
