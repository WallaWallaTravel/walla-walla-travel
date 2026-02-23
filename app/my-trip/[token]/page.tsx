'use client';

import { useState } from 'react';
import { useProposal } from '@/lib/contexts/proposal-context';
import { LiveItinerary } from '@/components/my-trip/LiveItinerary';

export default function MyTripPage() {
  const { proposal, planningPhase, accessToken } = useProposal();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [responded, setResponded] = useState(false);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);

    try {
      const res = await fetch(`/api/my-trip/${accessToken}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setResponded(true);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);

    try {
      const res = await fetch(`/api/my-trip/${accessToken}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setResponded(true);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div>
      <LiveItinerary proposal={proposal} planningPhase={planningPhase} />

      {/* Accept/Decline buttons for proposal phase */}
      {planningPhase === 'proposal' && !responded && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to move forward?
          </h3>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Accept this proposal to begin planning your trip, or let us know if
            you have questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Accepting...
                </span>
              ) : (
                'Accept Proposal'
              )}
            </button>
            <button
              onClick={handleDecline}
              disabled={accepting || declining}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {declining ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation after responding */}
      {responded && (
        <div className="mt-8 bg-emerald-50 rounded-xl border border-emerald-200 p-6 text-center">
          <svg
            className="w-10 h-10 text-emerald-600 mx-auto mb-3"
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Response received
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Thank you for your response. We will be in touch shortly.
          </p>
        </div>
      )}
    </div>
  );
}
