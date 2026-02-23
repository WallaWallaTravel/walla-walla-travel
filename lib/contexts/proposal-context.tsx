'use client';

import { createContext, useContext } from 'react';
import type { TripProposalFull, PlanningPhase } from '@/lib/types/trip-proposal';

interface ProposalContextValue {
  proposal: TripProposalFull;
  planningPhase: PlanningPhase;
  accessToken: string;
  refreshProposal: () => void;
}

const ProposalContext = createContext<ProposalContextValue | null>(null);

export function ProposalProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ProposalContextValue;
}) {
  return (
    <ProposalContext.Provider value={value}>{children}</ProposalContext.Provider>
  );
}

export function useProposal() {
  const ctx = useContext(ProposalContext);
  if (!ctx) {
    throw new Error('useProposal must be used within ProposalProvider');
  }
  return ctx;
}
