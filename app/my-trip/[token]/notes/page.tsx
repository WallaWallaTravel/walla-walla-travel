'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProposal } from '@/lib/contexts/proposal-context';
import NoteThread from '@/components/my-trip/NoteThread';
import type { ProposalNote } from '@/lib/types/proposal-notes';

export default function MyTripNotesPage() {
  const { proposal, planningPhase, accessToken } = useProposal();
  const [notes, setNotes] = useState<ProposalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/my-trip/${accessToken}/notes`);
      if (!res.ok) {
        throw new Error('Failed to load notes');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setNotes(json.data.notes);
        setError(null);
      }
    } catch {
      setError('Unable to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Poll every 5 seconds for new notes
  useEffect(() => {
    pollIntervalRef.current = setInterval(fetchNotes, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchNotes]);

  const handleSendNote = useCallback(
    async (content: string) => {
      const res = await fetch(`/api/my-trip/${accessToken}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: proposal.customer_name || 'Guest',
          content,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      // Immediately refetch to show the new note
      await fetchNotes();
    },
    [accessToken, proposal.customer_name, fetchNotes]
  );

  const isReadOnly = planningPhase === 'finalized';

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-start">
                <div className="w-2/3">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && notes.length === 0) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
        <svg
          className="w-10 h-10 text-red-600 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <p className="text-red-600 font-medium mb-1">Could not load messages</p>
        <p className="text-gray-700 text-sm">{error}</p>
        <button
          onClick={fetchNotes}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <p className="text-sm text-gray-600 mt-1">
          {isReadOnly
            ? 'Your trip has been finalized. Messages are read-only.'
            : 'Send a message to your travel planner.'}
        </p>
      </div>

      {/* Note thread */}
      <NoteThread
        notes={notes}
        onSendNote={handleSendNote}
        isReadOnly={isReadOnly}
        authorName={proposal.customer_name || 'Guest'}
      />
    </div>
  );
}
