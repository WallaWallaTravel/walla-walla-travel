'use client';

/**
 * Invoice Line Items Component
 * Displays and manages line-item based invoice pricing
 * Supports per-person, per-hour, and fixed rate items
 */

import { useMemo } from 'react';
import {
  InvoiceLineItem,
  LineItemCategory,
  calculatePriceBreakdown,
  formatLineItemDescription
} from '@/lib/types/invoice-line-items';

interface InvoiceLineItemsProps {
  lineItems: InvoiceLineItem[];
  editable?: boolean;
  onItemsChange?: (items: InvoiceLineItem[]) => void;
  showTax?: boolean;
  taxRate?: number;
}

const categoryLabels: Record<LineItemCategory, string> = {
  base_tour: 'Base Tour',
  additional_guest: 'Additional Guests',
  add_on: 'Add-Ons',
  discount: 'Discounts',
  processing_fee: 'Processing Fee',
  tip: 'Gratuity',
};

const categoryIcons: Record<LineItemCategory, string> = {
  base_tour: '🚐',
  additional_guest: '👥',
  add_on: '➕',
  discount: '🏷️',
  processing_fee: '💳',
  tip: '💵',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function InvoiceLineItems({
  lineItems,
  editable = false,
  onItemsChange,
  showTax = true,
  taxRate = 0.089,
}: InvoiceLineItemsProps) {
  const breakdown = useMemo(() => calculatePriceBreakdown(lineItems), [lineItems]);

  // Group items by category for organized display
  const groupedItems = useMemo(() => {
    const groups: Record<string, InvoiceLineItem[]> = {};
    lineItems
      .filter((item) => item.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((item) => {
        if (!groups[item.category]) {
          groups[item.category] = [];
        }
        groups[item.category].push(item);
      });
    return groups;
  }, [lineItems]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (!editable || !onItemsChange) return;

    const updatedItems = lineItems.map((item) => {
      if (item.id !== itemId) return item;

      let newLineTotal: number;
      if (item.rateType === 'per_person') {
        const additionalGuests = Math.max(0, newQuantity - item.includedInBase);
        newLineTotal = item.unitPrice * additionalGuests;
      } else if (item.rateType === 'per_hour' || item.rateType === 'per_day') {
        newLineTotal = item.unitPrice * newQuantity;
      } else {
        newLineTotal = item.unitPrice;
      }

      const newTaxAmount = item.isTaxable ? newLineTotal * item.taxRate : 0;

      return {
        ...item,
        quantity: newQuantity,
        lineTotal: newLineTotal,
        taxAmount: Math.round(newTaxAmount * 100) / 100,
      };
    });

    onItemsChange(updatedItems);
  };

  const _hasDiscounts = breakdown.discountTotal < 0;
  const _hasAddOns = breakdown.addOnTotal > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Line Items List */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{categoryIcons[category as LineItemCategory]}</span>
              <span className="font-medium text-gray-700">
                {categoryLabels[category as LineItemCategory]}
              </span>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between py-2 ${
                  item.category === 'discount' ? 'text-green-700' : 'text-gray-800'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm">{formatLineItemDescription(item)}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Editable quantity for per_person/per_hour items */}
                  {editable && (item.rateType === 'per_person' || item.rateType === 'per_hour') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <span className="text-sm font-medium tabular-nums w-20 text-right">
                    {item.lineTotal < 0 ? '−' : ''}
                    {formatCurrency(Math.abs(item.lineTotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Totals Section */}
      <div className="bg-gray-50 px-4 py-4 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatCurrency(breakdown.subtotal)}</span>
        </div>

        {/* Tax */}
        {showTax && breakdown.taxTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="font-medium">{formatCurrency(breakdown.taxTotal)}</span>
          </div>
        )}

        {/* Processing Fee (if applicable) */}
        {breakdown.processingFeeTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Processing Fee</span>
            <span className="font-medium">{formatCurrency(breakdown.processingFeeTotal)}</span>
          </div>
        )}

        {/* Tip (if applicable) */}
        {breakdown.tipTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Gratuity</span>
            <span className="font-medium">{formatCurrency(breakdown.tipTotal)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
          <span>Total</span>
          <span>{formatCurrency(breakdown.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for invoice summaries
 */
interface InvoiceLineItemsSummaryProps {
  lineItems: InvoiceLineItem[];
  guestCount?: number;
  durationHours?: number;
}

export function InvoiceLineItemsSummary({
  lineItems,
  guestCount,
  durationHours,
}: InvoiceLineItemsSummaryProps) {
  const breakdown = useMemo(() => calculatePriceBreakdown(lineItems), [lineItems]);

  return (
    <div className="space-y-1 text-sm">
      {/* Tour info */}
      {(guestCount || durationHours) && (
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          {guestCount && (
            <span className="inline-flex items-center gap-1">
              <span>👥</span>
              {guestCount} guests
            </span>
          )}
          {durationHours && (
            <span className="inline-flex items-center gap-1">
              <span>🕐</span>
              {durationHours} hours
            </span>
          )}
        </div>
      )}

      {/* Quick breakdown */}
      <div className="flex justify-between text-gray-700">
        <span>Base Tour</span>
        <span>{formatCurrency(breakdown.baseTourTotal)}</span>
      </div>

      {breakdown.additionalGuestTotal > 0 && (
        <div className="flex justify-between text-gray-700">
          <span>Additional Guests</span>
          <span>{formatCurrency(breakdown.additionalGuestTotal)}</span>
        </div>
      )}

      {breakdown.addOnTotal > 0 && (
        <div className="flex justify-between text-gray-700">
          <span>Add-Ons</span>
          <span>{formatCurrency(breakdown.addOnTotal)}</span>
        </div>
      )}

      {breakdown.discountTotal < 0 && (
        <div className="flex justify-between text-green-700">
          <span>Discount</span>
          <span>−{formatCurrency(Math.abs(breakdown.discountTotal))}</span>
        </div>
      )}

      <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
        <span>Total</span>
        <span>{formatCurrency(breakdown.grandTotal)}</span>
      </div>
    </div>
  );
}

/**
 * Per-person rate display for booking forms
 */
interface PerPersonRateDisplayProps {
  basePrice: number;
  baseGuestsIncluded: number;
  perPersonRate: number;
  currentGuestCount: number;
  durationHours: number;
}

export function PerPersonRateDisplay({
  basePrice,
  baseGuestsIncluded,
  perPersonRate,
  currentGuestCount,
  durationHours,
}: PerPersonRateDisplayProps) {
  const additionalGuests = Math.max(0, currentGuestCount - baseGuestsIncluded);
  const additionalGuestCost = additionalGuests * perPersonRate;
  const subtotal = basePrice + additionalGuestCost;

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
      <h4 className="font-semibold text-blue-900 mb-3">Price Breakdown</h4>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-blue-800">
            {durationHours}-Hour Tour (up to {baseGuestsIncluded} guests)
          </span>
          <span className="font-medium text-blue-900">{formatCurrency(basePrice)}</span>
        </div>

        {additionalGuests > 0 && (
          <div className="flex justify-between">
            <span className="text-blue-800">
              Additional Guests ({additionalGuests} × {formatCurrency(perPersonRate)})
            </span>
            <span className="font-medium text-blue-900">{formatCurrency(additionalGuestCost)}</span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-blue-200">
          <span className="font-semibold text-blue-900">Estimated Total</span>
          <span className="font-bold text-blue-900">{formatCurrency(subtotal)}</span>
        </div>

        {additionalGuests === 0 && currentGuestCount < baseGuestsIncluded && (
          <p className="text-xs text-blue-600 mt-2">
            Base price includes up to {baseGuestsIncluded} guests.
            Additional guests are {formatCurrency(perPersonRate)}/person.
          </p>
        )}
      </div>
    </div>
  );
}
