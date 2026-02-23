'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { LunchMenuItem, GuestOrderItem, GuestOrder } from '@/lib/types/lunch-supplier';

interface IndividualLunchOrderFormProps {
  guestId: number;
  guestName: string;
  menuItems: LunchMenuItem[];
  cutoffAt: string | null;
  orderId: number;
  accessToken: string;
  existingOrder?: GuestOrder | null;
  dietaryRestrictions?: string | null;
}

// Dietary tag styling (reused from LunchOrderForm)
const DIETARY_TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  vegetarian: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Vegetarian' },
  vegan: { bg: 'bg-green-50', text: 'text-green-700', label: 'Vegan' },
  gf: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'GF' },
  df: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'DF' },
  nut_free: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Nut Free' },
  halal: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Halal' },
  kosher: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Kosher' },
};

// Cutoff countdown
function useCutoffCountdown(cutoffAt: string | null) {
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
    return { timeLeft: `${days}d ${remainingHours}h remaining`, isExpired: false, isUrgent: false };
  }
  if (hours > 0) {
    return { timeLeft: `${hours}h ${minutes}m remaining`, isExpired: false, isUrgent };
  }
  return { timeLeft: `${minutes}m ${seconds}s remaining`, isExpired: false, isUrgent: true };
}

export default function IndividualLunchOrderForm({
  guestId,
  guestName,
  menuItems,
  cutoffAt,
  orderId,
  accessToken,
  existingOrder,
  dietaryRestrictions,
}: IndividualLunchOrderFormProps) {
  const { timeLeft, isExpired, isUrgent } = useCutoffCountdown(cutoffAt);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(existingOrder?.notes || '');

  // Initialize items from existing order
  const [itemQtys, setItemQtys] = useState<Map<number, number>>(() => {
    const map = new Map<number, number>();
    if (existingOrder) {
      for (const item of existingOrder.items) {
        map.set(item.item_id, item.qty);
      }
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

  // Price map
  const priceMap = useMemo(() => {
    return new Map(menuItems.map((item) => [item.id, item.price]));
  }, [menuItems]);

  // Live total
  const liveTotal = useMemo(() => {
    let total = 0;
    for (const [itemId, qty] of itemQtys) {
      const price = priceMap.get(itemId) ?? 0;
      total += price * qty;
    }
    return total;
  }, [itemQtys, priceMap]);

  const setItemQty = useCallback((itemId: number, qty: number) => {
    setItemQtys((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(itemId);
      } else {
        next.set(itemId, Math.min(qty, 10));
      }
      return next;
    });
  }, []);

  const hasSelections = itemQtys.size > 0;

  const handleSubmit = async () => {
    if (isExpired || !hasSelections) return;
    setSubmitting(true);
    setError(null);

    try {
      const items: GuestOrderItem[] = [];
      for (const [itemId, qty] of itemQtys) {
        const menuItem = menuItems.find((mi) => mi.id === itemId);
        items.push({
          item_id: itemId,
          name: menuItem?.name || `Item #${itemId}`,
          qty,
        });
      }

      const res = await fetch(`/api/my-trip/${accessToken}/lunch/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          guest_id: guestId,
          items,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || json.error || 'Failed to submit order');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Show confirmation after submission
  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-emerald-600"
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
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Order Submitted
        </h3>
        <p className="text-sm text-gray-600">
          Your lunch order has been saved, {guestName}. You can update it anytime before the deadline.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Edit my order
        </button>
      </div>
    );
  }

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
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span>
          {isExpired
            ? 'Ordering deadline has passed'
            : `Order by: ${cutoffAt ? new Date(cutoffAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline'}`}
        </span>
        <span className="ml-auto font-semibold">{timeLeft}</span>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Guest header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-slate-50">
          <h3 className="text-base font-semibold text-gray-900">
            {guestName}&apos;s Order
          </h3>
          {dietaryRestrictions && (
            <p className="text-sm text-gray-600 mt-0.5">
              Dietary: {dietaryRestrictions}
            </p>
          )}
        </div>

        {/* Menu items grouped by category */}
        <div className="divide-y divide-gray-100">
          {Array.from(categorizedItems.entries()).map(([category, items]) => (
            <div key={category} className="px-5 py-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                {category}
              </h4>
              <div className="space-y-3">
                {items.map((item) => {
                  const currentQty = itemQtys.get(item.id) || 0;
                  const tags = Array.isArray(item.dietary_tags) ? item.dietary_tags : [];

                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {item.name}
                          </span>
                          {tags.map((tag) => {
                            const style = DIETARY_TAG_STYLES[tag] || {
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
                      {!isExpired ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setItemQty(item.id, currentQty - 1)}
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
                            onClick={() => setItemQty(item.id, currentQty + 1)}
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
          ))}
        </div>

        {/* Notes */}
        {!isExpired && (
          <div className="px-5 py-4 border-t border-gray-100">
            <label
              htmlFor="individual-notes"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Notes
            </label>
            <input
              id="individual-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, special requests..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Total and submit */}
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
          Tax will be calculated at checkout.
        </p>

        {!isExpired && (
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
            {submitting ? 'Submitting...' : 'Submit My Order'}
          </button>
        )}
      </div>
    </div>
  );
}
