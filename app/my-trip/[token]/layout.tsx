'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ProposalProvider } from '@/lib/contexts/proposal-context';
import { useProposalRealtime } from '@/hooks/useProposalRealtime';
import { useGuestIdentity } from '@/hooks/useGuestIdentity';
import { apiGet } from '@/lib/utils/fetch-utils';
import NoteThread from '@/components/my-trip/NoteThread';
import GuestRegistrationGate from '@/components/my-trip/GuestRegistrationGate';
import type { TripProposalFull, PlanningPhase } from '@/lib/types/trip-proposal';
import type { ProposalNote } from '@/lib/types/proposal-notes';

/** Tab definition for the trip navigation */
interface Tab {
  label: string;
  href: string;
  /** Which planning phases make this tab visible */
  phases: PlanningPhase[];
}

function MyTripLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ token: string }>();
  const pathname = usePathname();
  const token = params.token;

  const [proposal, setProposal] = useState<TripProposalFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest identity
  const {
    guestId,
    guestToken,
    guest,
    isRegistered,
    loading: guestLoading,
    registerGuest,
  } = useGuestIdentity(token);

  // Notes panel state: 'closed' | 'minimized' | 'open'
  const [notesState, setNotesState] = useState<'closed' | 'minimized' | 'open'>('closed');
  const [notes, setNotes] = useState<ProposalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notesLoadedRef = useRef(false);

  const fetchProposal = useCallback(async () => {
    if (!token) return;

    try {
      const result = await apiGet<TripProposalFull>(`/api/my-trip/${token}`);
      if (result.success && result.data) {
        setProposal(result.data);
        setError(null);
      } else {
        const errMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as unknown as { message?: string })?.message || 'Trip not found';
        setError(errMsg);
      }
    } catch {
      setError('Unable to load your trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Notes fetching
  const fetchNotes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/my-trip/${token}/notes`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setNotes(json.data.notes);
        // Only show unread badge when panel is not fully open
        if (notesState !== 'open') {
          setUnreadCount(json.data.unread_count || 0);
        } else {
          setUnreadCount(0);
        }
      }
    } catch {
      // Silently fail on poll
    } finally {
      setNotesLoading(false);
    }
  }, [token, notesState]);

  // Initial fetch
  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  // Realtime subscription - refetch when data changes
  useProposalRealtime({
    proposalId: proposal?.id ?? 0,
    onUpdate: fetchProposal,
    enabled: !!proposal?.id,
  });

  const notesVisible = notesState === 'open' || notesState === 'minimized';

  // Load notes on first open/minimize, then poll
  useEffect(() => {
    if (notesVisible && !notesLoadedRef.current) {
      setNotesLoading(true);
      notesLoadedRef.current = true;
      fetchNotes();
    }
  }, [notesVisible, fetchNotes]);

  // Poll notes every 5s when panel is open, 15s when minimized
  useEffect(() => {
    if (notesState === 'open') {
      notesPollRef.current = setInterval(fetchNotes, 5000);
      setUnreadCount(0);
    } else if (notesState === 'minimized') {
      notesPollRef.current = setInterval(fetchNotes, 10000);
    } else {
      if (notesPollRef.current) {
        clearInterval(notesPollRef.current);
        notesPollRef.current = null;
      }
    }
    return () => {
      if (notesPollRef.current) {
        clearInterval(notesPollRef.current);
      }
    };
  }, [notesState, fetchNotes]);

  // Poll for unread count when fully closed (every 15s)
  useEffect(() => {
    if (notesState === 'closed' && proposal) {
      const interval = setInterval(fetchNotes, 15000);
      fetchNotes();
      return () => clearInterval(interval);
    }
  }, [notesState, proposal, fetchNotes]);

  const handleSendNote = useCallback(
    async (content: string) => {
      if (!token || !proposal) return;
      const authorName = guest?.name || proposal.customer_name || 'Guest';
      const res = await fetch(`/api/my-trip/${token}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          content,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      await fetchNotes();
    },
    [token, proposal, guest, fetchNotes]
  );

  const planningPhase: PlanningPhase = proposal?.planning_phase ?? 'proposal';
  const isReadOnly = planningPhase === 'finalized';

  const basePath = `/my-trip/${token}`;

  const tabs: Tab[] = useMemo(
    () => [
      {
        label: 'Itinerary',
        href: basePath,
        phases: ['proposal', 'active_planning', 'finalized'],
      },
      {
        label: 'Lunch',
        href: `${basePath}/lunch`,
        phases: ['active_planning', 'finalized'],
      },
      {
        label: 'Guests',
        href: `${basePath}/guests`,
        phases: ['active_planning', 'finalized'],
      },
    ],
    [basePath]
  );

  const visibleTabs = tabs.filter((tab) => tab.phases.includes(planningPhase));

  // Payment pages render their own full-page chrome — skip the trip layout
  const isPaymentPage = pathname.startsWith(`/my-trip/${token}/pay`);
  if (isPaymentPage) {
    return <>{children}</>;
  }

  // Loading state - skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="mt-2 h-4 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-0">
            <div className="flex gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 w-20 bg-gray-100 rounded-t animate-pulse"
                />
              ))}
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
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
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Trip Not Found
            </h1>
            <p className="text-gray-700 leading-relaxed">
              {error ||
                'We could not find this trip. The link may have expired or the trip is no longer available.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tripTitle =
    proposal.trip_title || `Trip for ${proposal.customer_name}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tripTitle}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {proposal.proposal_number}
                {planningPhase === 'finalized' && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Finalized
                  </span>
                )}
                {planningPhase === 'active_planning' && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Planning
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-0 mt-4 -mb-px" aria-label="Trip sections">
            {visibleTabs.map((tab) => {
              const isActive =
                tab.href === basePath
                  ? pathname === basePath
                  : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                    ${
                      isActive
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProposalProvider
          value={{
            proposal,
            planningPhase,
            accessToken: token,
            refreshProposal: fetchProposal,
            guestId,
            guestToken,
            guestName: guest?.name ?? null,
          }}
        >
          <GuestRegistrationGate
            guestToken={guestToken}
            isRegistered={isRegistered}
            guestName={guest?.name ?? null}
            loading={guestLoading}
            onRegister={registerGuest}
          >
            {children}
          </GuestRegistrationGate>
        </ProposalProvider>
      </main>

      {/* Floating Notes Button — visible when panel is fully closed */}
      {notesState === 'closed' && (
        <button
          onClick={() => setNotesState('open')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-white shadow-lg hover:bg-indigo-700 transition-all hover:shadow-xl"
          aria-label="Open messages"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <span className="text-sm font-medium">Messages</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Notes Panel — visible when open or minimized */}
      {notesState !== 'closed' && (
        <>
          {/* Backdrop (mobile only, open state only) */}
          {notesState === 'open' && (
            <div
              className="fixed inset-0 bg-black/20 z-40 sm:hidden"
              onClick={() => setNotesState('closed')}
            />
          )}

          <div
            className={`fixed z-50 right-0 sm:right-6 transition-all duration-200 ease-in-out ${
              notesState === 'minimized'
                ? 'bottom-0 sm:bottom-6 w-full sm:w-[320px]'
                : 'bottom-0 sm:bottom-6 w-full sm:w-[400px]'
            }`}
          >
            <div
              className={`flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 ${
                notesState === 'minimized' ? '' : ''
              }`}
              style={{
                height: notesState === 'open'
                  ? 'min(600px, calc(100vh - 120px))'
                  : 'auto',
              }}
            >
              {/* Panel Header — always visible, clickable when minimized */}
              <div
                className={`flex items-center justify-between px-4 py-3 bg-white ${
                  notesState === 'open' ? 'border-b border-gray-200' : ''
                } ${notesState === 'minimized' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={notesState === 'minimized' ? () => setNotesState('open') : undefined}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
                  {notesState === 'minimized' && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Minimize / Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotesState(notesState === 'open' ? 'minimized' : 'open');
                    }}
                    className="rounded-lg p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={notesState === 'open' ? 'Minimize messages' : 'Expand messages'}
                  >
                    {notesState === 'open' ? (
                      /* Minimize icon — line at bottom */
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 13H5" />
                      </svg>
                    ) : (
                      /* Expand icon — chevron up */
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                    )}
                  </button>
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotesState('closed');
                    }}
                    className="rounded-lg p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Close messages"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notes Content — only visible when open */}
              {notesState === 'open' && (
                <div className="flex-1 overflow-hidden">
                  {notesLoading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-start">
                          <div className="w-2/3">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <NoteThread
                        notes={notes}
                        onSendNote={handleSendNote}
                        isReadOnly={isReadOnly}
                        authorName={guest?.name || proposal.customer_name || 'Guest'}
                        compact
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MyTripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="mt-2 h-4 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    }>
      <MyTripLayoutInner>{children}</MyTripLayoutInner>
    </Suspense>
  );
}
