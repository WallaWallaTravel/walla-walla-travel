'use client';

import { useState } from 'react';
import { useProposal } from '@/lib/contexts/proposal-context';
import { LiveItinerary } from '@/components/my-trip/LiveItinerary';

export default function MyTripPage() {
  const { proposal, planningPhase, accessToken, refreshProposal } = useProposal();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [responded, setResponded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/my-trip/${accessToken}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();

        if (data.action === 'deposit_required') {
          // Redirect to deposit payment page
          window.location.href = `/my-trip/${accessToken}/pay`;
          return;
        }

        if (data.action === 'planning_unlocked') {
          // Skip deposit — refresh to show unlocked tabs (Lunch, Guests)
          refreshProposal();
          return;
        }

        // Fallback for unexpected action
        setResponded(true);
      } else {
        setError('Unable to accept the proposal. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);
    setError(null);

    try {
      const res = await fetch(`/api/my-trip/${accessToken}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setResponded(true);
      } else {
        setError('Unable to submit your response. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div>
      <LiveItinerary proposal={proposal} planningPhase={planningPhase} />

      {/* Invite link — visible during planning/finalized phases */}
      {(planningPhase === 'active_planning' || planningPhase === 'finalized') && (
        <div className="mt-6 bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Invite Your Group</h3>
              <p className="text-xs text-gray-700 mb-3">
                Share this link with your guests so they can register for the trip.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${accessToken}/join`}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-indigo-200 rounded-lg text-gray-700 truncate"
                />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/my-trip/${accessToken}/join`;
                    navigator.clipboard.writeText(url);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                >
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-6 bg-red-50 rounded-xl border border-red-200 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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

      {/* Confirmation after responding (decline only) */}
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
