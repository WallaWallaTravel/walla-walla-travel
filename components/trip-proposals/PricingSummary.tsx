'use client';

import type { FormData, Totals } from './types';
import { formatCurrency } from './utils';

interface PricingSummaryProps {
  formData: FormData;
  totals: Totals;
  saving: boolean;
  onSaveDraft: () => void;
}

export default function PricingSummary({
  formData,
  totals,
  saving,
  onSaveDraft,
}: PricingSummaryProps) {
  return (
    <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 border-2 border-brand">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Pricing Summary</h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-700">
          <span>Services</span>
          <span className="font-bold">{formatCurrency(totals.servicesTotal)}</span>
        </div>

        <div className="border-t pt-3 flex justify-between text-gray-900">
          <span className="font-bold">Subtotal</span>
          <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
        </div>

        {totals.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-bold">-{formatCurrency(totals.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-700">
          <span>Tax ({formData.tax_rate}%)</span>
          <span className="font-bold">{formatCurrency(totals.taxes)}</span>
        </div>

        {totals.gratuity > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Gratuity ({formData.gratuity_percentage}%)</span>
            <span className="font-bold">{formatCurrency(totals.gratuity)}</span>
          </div>
        )}

        <div className="border-t-2 border-brand pt-3 flex justify-between">
          <span className="text-xl font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-brand">
            {formatCurrency(totals.total)}
          </span>
        </div>

        <div className="bg-brand-light rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">
              Deposit ({formData.deposit_percentage}%)
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(totals.deposit)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Balance Due</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(totals.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500">Days:</span>{' '}
            <span className="font-bold">{formData.days.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Guests:</span>{' '}
            <span className="font-bold">{formData.party_size}</span>
          </div>
          <div>
            <span className="text-gray-500">Stops:</span>{' '}
            <span className="font-bold">
              {formData.days.reduce((sum, day) => sum + day.stops.length, 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Trip Type:</span>{' '}
            <span className="font-bold capitalize">{formData.trip_type.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="submit"
          disabled={saving || !formData.customer_name}
          className="flex-1 px-6 py-4 bg-brand hover:bg-brand-hover disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          {saving ? 'Creating...' : 'Create Trip Proposal'}
        </button>
      </div>

      {!formData.customer_name && (
        <p className="text-sm text-center text-gray-600 mt-3">
          Enter a customer name to continue
        </p>
      )}
    </div>
  );
}
