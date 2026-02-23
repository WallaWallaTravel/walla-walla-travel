'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ProposalProvider } from '@/lib/contexts/proposal-context';
import { useProposalRealtime } from '@/hooks/useProposalRealtime';
import { apiGet } from '@/lib/utils/fetch-utils';
import type { TripProposalFull, PlanningPhase } from '@/lib/types/trip-proposal';

/** Tab definition for the trip navigation */
interface Tab {
  label: string;
  href: string;
  /** Which planning phases make this tab visible */
  phases: PlanningPhase[];
}

export default function MyTripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ token: string }>();
  const pathname = usePathname();
  const token = params.token;

  const [proposal, setProposal] = useState<TripProposalFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposal = useCallback(async () => {
    if (!token) return;

    try {
      const result = await apiGet<TripProposalFull>(`/api/my-trip/${token}`);
      if (result.success && result.data) {
        setProposal(result.data);
        setError(null);
      } else {
        setError(result.error || 'Trip not found');
      }
    } catch {
      setError('Unable to load your trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  const planningPhase: PlanningPhase = proposal?.planning_phase ?? 'proposal';

  const basePath = `/my-trip/${token}`;

  const tabs: Tab[] = useMemo(
    () => [
      {
        label: 'Itinerary',
        href: basePath,
        phases: ['proposal', 'active_planning', 'finalized'],
      },
      {
        label: 'Notes',
        href: `${basePath}/notes`,
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
          }}
        >
          {children}
        </ProposalProvider>
      </main>
    </div>
  );
}
