'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  ProposalLunchOrder,
  LunchMenuItem,
  SubmitLunchOrderInput,
  GuestOrder,
  GuestOrderItem,
} from '@/lib/types/lunch-supplier';

// ============================================================================
// Types
// ============================================================================

interface LunchOrderFormProps {
  order: ProposalLunchOrder;
  menuItems: LunchMenuItem[];
  guests: Array<{ name: string; dietary_restrictions?: string | null }>;
  cutoffAt: string | null;
  onSubmit: (data: SubmitLunchOrderInput) => Promise<void>;
  isReadOnly?: boolean;
}

// ============================================================================
// Dietary Tag Styling
// ============================================================================

const DIETARY_TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  vegetarian: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Vegetarian' },
  vegan: { bg: 'bg-green-50', text: 'text-green-700', label: 'Vegan' },
  gf: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'GF' },
  df: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'DF' },
  nut_free: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Nut Free' },
  halal: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Halal' },
  kosher: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Kosher' },
};

// ============================================================================
// Cutoff Countdown Hook
// ============================================================================

function useCutoffCountdown(cutoffAt: string | null): {
  timeLeft: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!cutoffAt) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [cutoffAt]);

  if (!cutoffAt) {
    return { timeLeft: 'No deadline', isExpired: false, isUrgent: false };
  }

  const cutoff = new Date(cutoffAt);
  const diff = cutoff.getTime() - now.getTime();

  if (diff <= 0) {
    return { timeLeft: 'Deadline passed', isExpired: true, isUrgent: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const isUrgent = hours < 4;

  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return {
      timeLeft: `${days}d ${remainingHours}h remaining`,
      isExpired: false,
      isUrgent: false,
    };
  }

  if (hours > 0) {
    return {
      timeLeft: `${hours}h ${minutes}m remaining`,
      isExpired: false,
      isUrgent,
    };
  }

  return {
    timeLeft: `${minutes}m ${seconds}s remaining`,
    isExpired: false,
    isUrgent: true,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function LunchOrderForm({
  order,
  menuItems,
  guests,
  cutoffAt,
  onSubmit,
  isReadOnly = false,
}: LunchOrderFormProps) {
  const { timeLeft, isExpired, isUrgent } = useCutoffCountdown(cutoffAt);
  const [submitting, setSubmitting] = useState(false);
  const [specialRequests, setSpecialRequests] = useState(
    order.special_requests || ''
  );

  // Initialize guest orders from existing order data or empty
  const [guestOrders, setGuestOrders] = useState<
    Map<string, { items: Map<number, number>; notes: string }>
  >(() => {
    const map = new Map<string, { items: Map<number, number>; notes: string }>();
    const existingOrders: GuestOrder[] = Array.isArray(order.guest_orders)
      ? order.guest_orders
      : [];

    for (const guest of guests) {
      const existing = existingOrders.find(
        (go) => go.guest_name === guest.name
      );
      const items = new Map<number, number>();
      if (existing) {
        for (const item of existing.items) {
          items.set(item.item_id, item.qty);
        }
      }
      map.set(guest.name, { items, notes: existing?.notes || '' });
    }
    return map;
  });

  // Group menu items by category
  const categorizedItems = useMemo(() => {
    const groups = new Map<string, LunchMenuItem[]>();
    for (const item of menuItems) {
      const existing = groups.get(item.category) || [];
      existing.push(item);
      groups.set(item.category, existing);
    }
    return groups;
  }, [menuItems]);

  // Calculate live total
  const priceMap = useMemo(() => {
    return new Map(menuItems.map((item) => [item.id, item.price]));
  }, [menuItems]);

  const liveTotal = useMemo(() => {
    let total = 0;
    for (const [, guestData] of guestOrders) {
      for (const [itemId, qty] of guestData.items) {
        const price = priceMap.get(itemId) ?? 0;
        total += price * qty;
      }
    }
    return total;
  }, [guestOrders, priceMap]);

  // Update quantity for a guest's item
  const setItemQty = useCallback(
    (guestName: string, itemId: number, qty: number) => {
      setGuestOrders((prev) => {
        const next = new Map(prev);
        const guestData = next.get(guestName);
        if (!guestData) return prev;
        const newItems = new Map(guestData.items);
        if (qty <= 0) {
          newItems.delete(itemId);
        } else {
          newItems.set(itemId, Math.min(qty, 10));
        }
        next.set(guestName, { ...guestData, items: newItems });
        return next;
      });
    },
    []
  );

  // Update guest notes
  const setGuestNotes = useCallback(
    (guestName: string, notes: string) => {
      setGuestOrders((prev) => {
        const next = new Map(prev);
        const guestData = next.get(guestName);
        if (!guestData) return prev;
        next.set(guestName, { ...guestData, notes });
        return next;
      });
    },
    []
  );

  // Check if any items are selected
  const hasSelections = useMemo(() => {
    for (const [, guestData] of guestOrders) {
      if (guestData.items.size > 0) return true;
    }
    return false;
  }, [guestOrders]);

  // Handle form submission
  const handleSubmit = async () => {
    if (isReadOnly || isExpired || !hasSelections) return;
    setSubmitting(true);

    try {
      const guestOrdersList: GuestOrder[] = [];

      for (const [guestName, guestData] of guestOrders) {
        if (guestData.items.size === 0) continue;

        const items: GuestOrderItem[] = [];
        for (const [itemId, qty] of guestData.items) {
          const menuItem = menuItems.find((mi) => mi.id === itemId);
          items.push({
            item_id: itemId,
            name: menuItem?.name || `Item #${itemId}`,
            qty,
          });
        }

        guestOrdersList.push({
          guest_name: guestName,
          items,
          notes: guestData.notes || undefined,
        });
      }

      await onSubmit({
        guest_orders: guestOrdersList,
        special_requests: specialRequests || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cutoff countdown */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
          isExpired
            ? 'bg-red-50 border-red-200 text-red-700'
            : isUrgent
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        <ClockIcon />
        <span>
          {isExpired
            ? 'Ordering deadline has passed'
            : `Order by: ${cutoffAt ? new Date(cutoffAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline'}`}
        </span>
        <span className="ml-auto font-semibold">{timeLeft}</span>
      </div>

      {/* Guest order sections */}
      {guests.map((guest) => {
        const guestData = guestOrders.get(guest.name);
        if (!guestData) return null;

        return (
          <div
            key={guest.name}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Guest header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-slate-50">
              <h3 className="text-base font-semibold text-gray-900">
                {guest.name}
              </h3>
              {guest.dietary_restrictions && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Dietary: {guest.dietary_restrictions}
                </p>
              )}
            </div>

            {/* Menu items grouped by category */}
            <div className="divide-y divide-gray-100">
              {Array.from(categorizedItems.entries()).map(
                ([category, items]) => (
                  <div key={category} className="px-5 py-4">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                      {category}
                    </h4>
                    <div className="space-y-3">
                      {items.map((item) => {
                        const currentQty = guestData.items.get(item.id) || 0;
                        const tags = Array.isArray(item.dietary_tags)
                          ? item.dietary_tags
                          : [];

                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {item.name}
                                </span>
                                {tags.map((tag) => {
                                  const style =
                                    DIETARY_TAG_STYLES[tag] || {
                                      bg: 'bg-gray-50',
                                      text: 'text-gray-600',
                                      label: tag,
                                    };
                                  return (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
                                    >
                                      {style.label}
                                    </span>
                                  );
                                })}
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                              ${item.price.toFixed(2)}
                            </span>
                            {!isReadOnly && !isExpired ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemQty(
                                      guest.name,
                                      item.id,
                                      currentQty - 1
                                    )
                                  }
                                  disabled={currentQty === 0}
                                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                  aria-label={`Decrease ${item.name} quantity`}
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-sm font-medium text-gray-900">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemQty(
                                      guest.name,
                                      item.id,
                                      currentQty + 1
                                    )
                                  }
                                  disabled={currentQty >= 10}
                                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                  aria-label={`Increase ${item.name} quantity`}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              currentQty > 0 && (
                                <span className="text-sm text-gray-700 font-medium">
                                  x{currentQty}
                                </span>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Guest notes */}
            {!isReadOnly && !isExpired && (
              <div className="px-5 py-4 border-t border-gray-100">
                <label
                  htmlFor={`notes-${guest.name}`}
                  className="block text-sm font-medium text-gray-900 mb-1"
                >
                  Notes for {guest.name}
                </label>
                <input
                  id={`notes-${guest.name}`}
                  type="text"
                  value={guestData.notes}
                  onChange={(e) =>
                    setGuestNotes(guest.name, e.target.value)
                  }
                  placeholder="Allergies, special requests..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Special requests */}
      {!isReadOnly && !isExpired && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label
            htmlFor="special-requests"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            Special Requests for the Group
          </label>
          <textarea
            id="special-requests"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any additional notes for the restaurant..."
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>
      )}

      {/* Order total and submit */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-semibold text-gray-900">
            Estimated Subtotal
          </span>
          <span className="text-lg font-bold text-gray-900">
            ${liveTotal.toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Tax will be calculated at checkout. Final total may vary.
        </p>

        {!isReadOnly && !isExpired && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !hasSelections}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              submitting || !hasSelections
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Submitting...
              </span>
            ) : order.status === 'submitted' ? (
              'Update Order'
            ) : (
              'Submit Order'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function ClockIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
