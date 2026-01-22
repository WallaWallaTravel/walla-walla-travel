'use client';

import { useMemo } from 'react';

interface ServiceItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  unit?: string;
  category?: string;
}

interface ProposalPricingSummaryProps {
  serviceItems: ServiceItem[];
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  discountReason?: string;
  total: number;
  depositRequired?: number;
  depositPercentage?: number;
  gratuityEnabled?: boolean;
  gratuitySuggestedPercentage?: number;
  validUntil?: string;
  className?: string;
}

export function ProposalPricingSummary({
  serviceItems,
  subtotal,
  discountPercentage,
  discountAmount,
  discountReason,
  total,
  depositRequired,
  depositPercentage,
  gratuityEnabled,
  gratuitySuggestedPercentage,
  validUntil,
  className = '',
}: ProposalPricingSummaryProps) {
  // Group service items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ServiceItem[]> = {};
    serviceItems.forEach((item) => {
      const category = item.category || 'Services';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    return grouped;
  }, [serviceItems]);

  const categories = Object.keys(itemsByCategory);

  // Calculate suggested gratuity
  const suggestedGratuity = gratuityEnabled && gratuitySuggestedPercentage
    ? total * (gratuitySuggestedPercentage / 100)
    : 0;

  // Calculate deposit
  const deposit = depositRequired || (depositPercentage ? total * (depositPercentage / 100) : 0);
  const balance = total - deposit;

  // Check if proposal is expiring soon
  const isExpiringSoon = validUntil
    ? new Date(validUntil) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    : false;

  const isExpired = validUntil ? new Date(validUntil) < new Date() : false;

  return (
    <div className={`bg-white rounded-xl border border-stone-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
          <span className="text-lg">💰</span>
          Pricing Summary
        </h3>
      </div>

      {/* Service Items by Category */}
      <div className="divide-y divide-stone-100">
        {categories.map((category) => (
          <div key={category} className="p-4">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              {category}
            </h4>
            <div className="space-y-2">
              {itemsByCategory[category].map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-stone-700">{item.name}</span>
                    {item.quantity && item.quantity > 1 && (
                      <span className="text-stone-400 ml-1">× {item.quantity}</span>
                    )}
                    {item.unit && (
                      <span className="text-stone-400 ml-1">({item.unit})</span>
                    )}
                  </div>
                  <span className="text-stone-900 font-medium">
                    ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-stone-200 bg-stone-50">
        <div className="p-4 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Subtotal</span>
            <span className="text-stone-900">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Discount */}
          {(discountAmount && discountAmount > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Discount
                {discountPercentage && ` (${discountPercentage}%)`}
              </span>
              <span className="text-green-600 font-medium">
                -${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {discountReason && (
            <p className="text-xs text-green-600 pl-5">{discountReason}</p>
          )}

          {/* Total */}
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-stone-200">
            <span className="text-stone-900">Total</span>
            <span className="text-[#8B1538]">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Deposit/Balance */}
        {deposit > 0 && (
          <div className="px-4 pb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                Deposit Required
                {depositPercentage && ` (${depositPercentage}%)`}
              </span>
              <span className="text-stone-900 font-medium">
                ${deposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Balance Due Later</span>
              <span className="text-stone-700">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Gratuity Note */}
        {gratuityEnabled && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700">
                <strong>Gratuity:</strong> A {gratuitySuggestedPercentage}% gratuity
                (~${suggestedGratuity.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                is suggested for exceptional service but not required.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Valid Until */}
      {validUntil && (
        <div className={`px-4 py-3 border-t ${
          isExpired
            ? 'bg-red-50 border-red-200'
            : isExpiringSoon
            ? 'bg-amber-50 border-amber-200'
            : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {isExpired ? (
              <>
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium">This proposal has expired</span>
              </>
            ) : isExpiringSoon ? (
              <>
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-amber-700">
                  <strong>Expires soon:</strong>{' '}
                  {new Date(validUntil).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-stone-600">
                  Valid until{' '}
                  {new Date(validUntil).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
