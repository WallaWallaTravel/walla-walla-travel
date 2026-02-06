'use client';

/**
 * PricingCalculator Component
 *
 * Displays pricing breakdown with:
 * - Line item display
 * - Staff discount override field
 * - Total and deposit display
 */

import { PricingCalculatorProps } from './types';

export default function PricingCalculator({
  pricing,
  isLoading,
  customDiscount,
  onCustomDiscountChange,
}: PricingCalculatorProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-purple-600 border-t-transparent mb-2"></div>
        <p className="text-gray-600 font-semibold text-sm">Calculating pricing...</p>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
        <div className="text-3xl mb-2">💰</div>
        <p className="text-gray-600 font-semibold text-sm">
          Enter tour details to see pricing
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Filter out totals from breakdown for display
  const lineItems = pricing.breakdown.filter(
    item => !['subtotal', 'tax'].includes(item.key || '')
  );

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>💰</span> Pricing
      </h4>

      {/* Line Items */}
      <div className="space-y-2 mb-4">
        {lineItems.map((item, index) => (
          <div
            key={item.key || index}
            className={`flex justify-between items-center ${
              item.amount < 0 ? 'text-green-600' : 'text-gray-700'
            }`}
          >
            <span className="text-sm">{item.label}</span>
            <span className="font-semibold">
              {item.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.amount))}
            </span>
          </div>
        ))}
      </div>

      {/* Staff Discount */}
      <div className="border-t border-green-300 pt-3 mb-3">
        <div className="flex items-center gap-3">
          <label htmlFor="staff_discount" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Staff Discount:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              id="staff_discount"
              value={customDiscount}
              onChange={(e) => onCustomDiscountChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              min={0}
              max={100}
              className="w-16 px-2 py-1 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
            />
            <span className="text-gray-600">%</span>
          </div>
          {customDiscount > 0 && (
            <span className="text-sm text-green-600 font-semibold">
              -{formatCurrency(pricing.subtotal * customDiscount / 100)}
            </span>
          )}
        </div>
      </div>

      {/* Subtotal */}
      <div className="border-t border-green-300 pt-3 space-y-2">
        <div className="flex justify-between items-center text-gray-700">
          <span className="text-sm">Subtotal</span>
          <span className="font-semibold">{formatCurrency(pricing.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center text-gray-700">
          <span className="text-sm">WA State Tax (8.9%)</span>
          <span className="font-semibold">{formatCurrency(pricing.taxes)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t-2 border-green-400 pt-3 mt-3">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-green-600">
            {formatCurrency(pricing.total)}
          </span>
        </div>
      </div>

      {/* Deposit Info */}
      <div className="bg-white rounded-lg p-3 mt-4 border border-green-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">50% Deposit Due</span>
          <span className="text-lg font-bold text-purple-600">
            {formatCurrency(pricing.deposit)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">Balance Due (48h after tour)</span>
          <span className="text-sm font-semibold text-gray-700">
            {formatCurrency(pricing.total - pricing.deposit)}
          </span>
        </div>
      </div>
    </div>
  );
}
