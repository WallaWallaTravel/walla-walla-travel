'use client';

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { ProposalDetail, ToastFn } from '@/lib/types/proposal-detail';

interface LunchOrder {
  id: number;
  ordering_mode: string;
  day?: { day_number: number; title: string | null };
  supplier?: { name: string };
}

interface ProposalSidebarProps {
  proposal: ProposalDetail;
  saving: boolean;
  localLunchOrders: LunchOrder[];
  updateProposal: (updates: Partial<ProposalDetail>) => Promise<void>;
  updatePlanningPhase: (phase: string) => Promise<void>;
  onUpdateLunchOrderingMode: (orderId: number, mode: string) => void;
  toast: ToastFn;
}

export const ProposalSidebar = React.memo(function ProposalSidebar({
  proposal,
  saving,
  localLunchOrders,
  updateProposal,
  updatePlanningPhase,
  onUpdateLunchOrderingMode,
  toast,
}: ProposalSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Client Link + Planning Phase */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Client Link</h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${proposal.access_token || '...'}`}
            className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 truncate"
          />
          <button
            onClick={() => {
              const url = `${window.location.origin}/my-trip/${proposal.access_token || ''}`;
              navigator.clipboard.writeText(url);
              toast('Link copied!', 'info');
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium shrink-0"
          >
            Copy
          </button>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-2">Planning Phase</h3>
        <div className="flex gap-1">
          {[
            { value: 'proposal', label: 'Proposal' },
            { value: 'active_planning', label: 'Active' },
            { value: 'finalized', label: 'Final' },
          ].map((phase) => (
            <button
              key={phase.value}
              onClick={() => updatePlanningPhase(phase.value)}
              disabled={saving || (proposal.planning_phase || 'proposal') === phase.value}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (proposal.planning_phase || 'proposal') === phase.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:cursor-default`}
            >
              {phase.label}
            </button>
          ))}
        </div>

        {/* Accept Behavior Toggle */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">On Accept Behavior</h3>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={proposal.skip_deposit_on_accept || false}
              onChange={() =>
                updateProposal({
                  skip_deposit_on_accept: !proposal.skip_deposit_on_accept,
                })
              }
              disabled={saving}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Skip deposit — grant immediate planning access
              </span>
              <p className="text-xs text-gray-600 mt-0.5">
                Default: deposit required. Check for large custom trips.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Lunch Ordering Mode */}
      {localLunchOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Lunch Ordering Mode</h3>
          <div className="space-y-3">
            {localLunchOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  {order.day ? `Day ${order.day.day_number}${order.day.title ? ` - ${order.day.title}` : ''}` : 'Lunch'}
                  {order.supplier && ` (${order.supplier.name})`}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdateLunchOrderingMode(order.id, 'coordinator')}
                    disabled={saving || order.ordering_mode === 'coordinator'}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      order.ordering_mode === 'coordinator'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:cursor-default`}
                  >
                    Coordinator
                  </button>
                  <button
                    onClick={() => onUpdateLunchOrderingMode(order.id, 'individual')}
                    disabled={saving || order.ordering_mode === 'individual'}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      order.ordering_mode === 'individual'
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:cursor-default`}
                  >
                    Individual
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 border-2 border-brand">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Pricing</h2>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span className="font-bold">{formatCurrency(proposal.subtotal)}</span>
          </div>

          {parseFloat(proposal.discount_amount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span className="font-bold">-{formatCurrency(proposal.discount_amount)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-700">
            <span>Taxes ({parseFloat(proposal.tax_rate)}%)</span>
            <span className="font-bold">{formatCurrency(proposal.taxes)}</span>
          </div>

          <div className="border-t-2 border-brand pt-3 flex justify-between">
            <span className="text-xl font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-brand">
              {formatCurrency(proposal.total)}
            </span>
          </div>

          <div className="bg-brand-light rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">
                Deposit ({proposal.deposit_percentage}%)
              </span>
              <span className="font-bold text-gray-900">
                {formatCurrency(proposal.deposit_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Balance Due</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(parseFloat(proposal.total) - parseFloat(proposal.deposit_amount))}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Created:</span>
              <div className="font-bold">{formatDate(proposal.created_at)}</div>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <div className="font-bold">{formatDate(proposal.updated_at)}</div>
            </div>
          </div>
        </div>

        {saving && (
          <div className="mt-4 text-center text-sm text-gray-600">
            ⏳ Saving changes...
          </div>
        )}
      </div>
    </div>
  );
});
