'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import type { ProposalDetail } from '@/lib/types/proposal-detail';

interface PricingTabProps {
  proposal: ProposalDetail;
  updateProposal: (updates: Partial<ProposalDetail>) => Promise<void>;
  updateProposalDebounced: (updates: Partial<ProposalDetail>) => void;
  recalculatePricing: () => Promise<void>;
  updateInclusionTaxable: (inclusionId: number, taxable: boolean) => Promise<void>;
  updateInclusionTaxIncluded: (inclusionId: number, taxIncluded: boolean) => Promise<void>;
  saving: boolean;
}

export const PricingTab = React.memo(function PricingTab({
  proposal,
  updateProposal,
  updateProposalDebounced,
  recalculatePricing,
  updateInclusionTaxable,
  updateInclusionTaxIncluded,
  saving,
}: PricingTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Tax Rate %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={parseFloat(proposal.tax_rate) || 0}
            onChange={(e) =>
              updateProposal({ tax_rate: e.target.value })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Gratuity %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={proposal.gratuity_percentage || 0}
            onChange={(e) =>
              updateProposal({ gratuity_percentage: parseInt(e.target.value) || 0 })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Deposit %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={proposal.deposit_percentage || 50}
            onChange={(e) =>
              updateProposal({ deposit_percentage: parseInt(e.target.value) || 50 })
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Discount Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={parseFloat(proposal.discount_amount) || 0}
              onChange={(e) =>
                updateProposal({ discount_amount: e.target.value })
              }
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Discount Reason
          </label>
          <input
            type="text"
            value={proposal.discount_reason || ''}
            onChange={(e) =>
              updateProposalDebounced({ discount_reason: e.target.value })
            }
            placeholder="e.g., Repeat customer"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>

      {/* Planning Fee Mode */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Planning Fee Mode
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="planning_fee_mode"
              checked={(proposal.planning_fee_mode || 'flat') === 'flat'}
              onChange={() => updateProposal({ planning_fee_mode: 'flat' })}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <span className="text-sm text-gray-700">Flat (manual)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="planning_fee_mode"
              checked={proposal.planning_fee_mode === 'percentage'}
              onChange={() => updateProposal({ planning_fee_mode: 'percentage' })}
              className="h-4 w-4 text-indigo-600 border-gray-300"
            />
            <span className="text-sm text-gray-700">Percentage of services</span>
          </label>
          {proposal.planning_fee_mode === 'percentage' && (
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={proposal.planning_fee_percentage || 0}
              onChange={(e) =>
                updateProposal({ planning_fee_percentage: parseFloat(e.target.value) || 0 })
              }
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="%"
            />
          )}
        </div>
      </div>

      {/* Per-Inclusion Tax Settings */}
      {proposal.inclusions && proposal.inclusions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Service Line Items — Tax Settings
          </label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-700 font-semibold">Description</th>
                  <th className="text-right py-2 px-2 text-gray-700 font-semibold">Amount</th>
                  <th className="text-center py-2 px-2 text-gray-700 font-semibold">Taxable</th>
                  <th className="text-center py-2 px-2 text-gray-700 font-semibold">Tax Incl.</th>
                </tr>
              </thead>
              <tbody>
                {proposal.inclusions.map((inc) => (
                  <tr key={inc.id} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-gray-900">{inc.description}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(inc.total_price || inc.unit_price)}</td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={inc.is_taxable !== false}
                        onChange={() => updateInclusionTaxable(inc.id, inc.is_taxable === false)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={inc.tax_included_in_price === true}
                        disabled={inc.is_taxable === false}
                        onChange={() => updateInclusionTaxIncluded(inc.id, !inc.tax_included_in_price)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={recalculatePricing}
        disabled={saving}
        className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        🔄 Recalculate Pricing
      </button>
    </div>
  );
});
