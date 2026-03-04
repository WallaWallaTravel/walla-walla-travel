'use client';

import React from 'react';
import Link from 'next/link';
import { getStatusColor } from '@/lib/utils/formatters';
import type { ProposalDetail } from '@/lib/types/proposal-detail';

interface ProposalHeaderProps {
  proposal: ProposalDetail;
  saving: boolean;
  showMoreMenu: boolean;
  setShowMoreMenu: (v: boolean) => void;
  onSendClick: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDeleteClick: () => void;
  onGenerateItinerary: () => void;
  onConvertToBooking: () => void;
}

export const ProposalHeader = React.memo(function ProposalHeader({
  proposal,
  saving,
  showMoreMenu,
  setShowMoreMenu,
  onSendClick,
  onArchive,
  onUnarchive,
  onDeleteClick,
  onGenerateItinerary,
  onConvertToBooking,
}: ProposalHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href="/admin/trip-proposals"
        className="inline-flex items-center text-brand hover:text-brand-hover font-bold mb-4"
      >
        ← Back to Trip Proposals
      </Link>

      {(proposal as ProposalDetail & { archived_at?: string }).archived_at && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            This proposal is archived. It won&apos;t appear in the proposals list.
          </p>
          <button
            onClick={onUnarchive}
            disabled={saving}
            className="text-sm font-bold text-amber-700 hover:text-amber-900 disabled:opacity-50"
          >
            Unarchive
          </button>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {proposal.proposal_number}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(proposal.status)}`}>
              {proposal.status.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-600">
            {proposal.customer_name} • {proposal.party_size} guests •{' '}
            {proposal.days?.length || 0} day{(proposal.days?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['draft', 'viewed'].includes(proposal.status) && (
            <button
              onClick={onSendClick}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors shadow-sm"
            >
              Send Proposal
            </button>
          )}

          <Link
            href={`/my-trip/${proposal.access_token}`}
            target="_blank"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-bold text-sm"
          >
            Preview
          </Link>

          {proposal.status === 'accepted' && (
            <>
              <button
                onClick={onGenerateItinerary}
                disabled={saving}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                🚗 Generate Itinerary
              </button>
              <button
                onClick={onConvertToBooking}
                disabled={saving}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                🎉 Convert to Booking
              </button>
            </>
          )}

          {/* More Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="More actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {(proposal as ProposalDetail & { archived_at?: string }).archived_at ? (
                    <button
                      onClick={onUnarchive}
                      disabled={saving}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Unarchive Proposal
                    </button>
                  ) : (
                    <button
                      onClick={onArchive}
                      disabled={saving}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Archive Proposal
                    </button>
                  )}
                  {proposal.status === 'draft' && (
                    <button
                      onClick={onDeleteClick}
                      disabled={saving}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete Proposal
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
