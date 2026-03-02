'use client';

import React from 'react';
import PhoneInput from '@/components/ui/PhoneInput';
import { TRIP_TYPE_OPTIONS } from '@/lib/types/trip-proposal';
import type { ProposalDetail } from '@/lib/types/proposal-detail';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', icon: '📝' },
  { value: 'sent', label: 'Sent', icon: '📧' },
  { value: 'viewed', label: 'Viewed', icon: '👁️' },
  { value: 'accepted', label: 'Accepted', icon: '✅' },
  { value: 'declined', label: 'Declined', icon: '❌' },
  { value: 'expired', label: 'Expired', icon: '⏰' },
  { value: 'booked', label: 'Booked', icon: '🎉' },
];

interface OverviewTabProps {
  proposal: ProposalDetail;
  updateProposal: (updates: Partial<ProposalDetail>) => Promise<void>;
  updateProposalDebounced: (updates: Partial<ProposalDetail>) => void;
  updateStatus: (status: string) => Promise<void>;
  saving: boolean;
}

export const OverviewTab = React.memo(function OverviewTab({
  proposal,
  updateProposal,
  updateProposalDebounced,
  updateStatus,
  saving,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Status Management */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status.value}
              onClick={() => updateStatus(status.value)}
              disabled={saving || proposal.status === status.value}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                proposal.status === status.value
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {status.icon} {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Customer Name
          </label>
          <input
            type="text"
            value={proposal.customer_name}
            onChange={(e) => updateProposalDebounced({ customer_name: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Email
          </label>
          <input
            type="email"
            value={proposal.customer_email || ''}
            onChange={(e) => updateProposalDebounced({ customer_email: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Phone
          </label>
          <PhoneInput
            value={proposal.customer_phone || ''}
            onChange={(value) => updateProposalDebounced({ customer_phone: value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Party Size
          </label>
          <input
            type="number"
            min="1"
            value={proposal.party_size}
            onChange={(e) => updateProposal({ party_size: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>

      {/* Trip Type */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Trip Type
        </label>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              onClick={() => updateProposal({ trip_type: type.value })}
              disabled={saving}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                proposal.trip_type === type.value
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={proposal.start_date}
            onChange={(e) => updateProposal({ start_date: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={proposal.end_date || proposal.start_date}
            onChange={(e) => updateProposal({ end_date: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Valid Until
          </label>
          <input
            type="date"
            value={proposal.valid_until || ''}
            onChange={(e) => updateProposal({ valid_until: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Introduction (shown to client)
        </label>
        <textarea
          value={proposal.introduction || ''}
          onChange={(e) => updateProposalDebounced({ introduction: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Internal Notes
        </label>
        <textarea
          value={proposal.internal_notes || ''}
          onChange={(e) => updateProposalDebounced({ internal_notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
        />
      </div>
    </div>
  );
});
