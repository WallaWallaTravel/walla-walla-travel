/**
 * useProposalData Hook
 *
 * Data-fetching layer for the proposal detail page.
 * Uses useDataFetch for caching reference data (wineries, restaurants, hotels).
 * Proposal itself is fetched without cache (changes frequently).
 */

import { useState, useCallback } from 'react';
import { useDataFetch } from './use-data-fetch';
import { apiGet } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import type {
  ProposalDetail,
  Winery,
  Restaurant,
  Hotel,
  NoteData,
  LunchOrderData,
  ReminderRecord,
} from '@/lib/types/proposal-detail';

interface SavedMenuOption {
  id: number;
  name: string;
}

interface UseProposalDataReturn {
  proposal: ProposalDetail | null;
  setProposal: (p: ProposalDetail | null | ((prev: ProposalDetail | null) => ProposalDetail | null)) => void;
  wineries: Winery[];
  restaurants: Restaurant[];
  hotels: Hotel[];
  savedMenus: SavedMenuOption[];
  notes: NoteData[];
  notesLoading: boolean;
  lunchOrders: LunchOrderData[];
  reminderHistory: ReminderRecord[];
  loading: boolean;
  refetchProposal: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadReminderHistory: () => Promise<void>;
  setReminderHistory: React.Dispatch<React.SetStateAction<ReminderRecord[]>>;
}

export function useProposalData(
  id: string,
  activeTab: string
): UseProposalDataReturn {
  // --- Proposal (no cache — changes frequently) ---
  const {
    data: proposal,
    loading: proposalLoading,
    refetch: refetchProposal,
    mutate: mutateProposal,
  } = useDataFetch<ProposalDetail>(
    `/api/admin/trip-proposals/${id}`,
    { cache: false, retry: 1 }
  );

  // Wrapper so callers can use setProposal like useState
  const setProposal = useCallback(
    (
      updater:
        | ProposalDetail
        | null
        | ((prev: ProposalDetail | null) => ProposalDetail | null)
    ) => {
      if (typeof updater === 'function') {
        mutateProposal(updater as (prev: ProposalDetail | null) => ProposalDetail);
      } else {
        mutateProposal(updater as ProposalDetail);
      }
    },
    [mutateProposal]
  );

  // --- Reference data (cached 5 min — rarely changes) ---
  const { data: wineriesData } = useDataFetch<Winery[]>('/api/wineries', {
    cache: true,
    cacheDuration: 5 * 60 * 1000,
  });

  const { data: restaurantsData } = useDataFetch<Restaurant[]>(
    '/api/restaurants',
    { cache: true, cacheDuration: 5 * 60 * 1000 }
  );

  const { data: hotelsData } = useDataFetch<Hotel[]>('/api/hotels', {
    cache: true,
    cacheDuration: 5 * 60 * 1000,
  });

  // --- Saved Menus (cached 5 min) ---
  const { data: menusRaw } = useDataFetch<Array<{ id: number; name: string }>>(
    '/api/admin/menus',
    { cache: true, cacheDuration: 5 * 60 * 1000 }
  );
  const savedMenus: SavedMenuOption[] = (menusRaw || []).map((m) => ({ id: m.id, name: m.name }));

  // --- Notes (lazy-load when notes tab is active) ---
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!id) return;
    setNotesLoading(true);
    try {
      const result = await apiGet<{ notes: NoteData[] }>(
        `/api/admin/trip-proposals/${id}/notes`
      );
      if (result.success && result.data) {
        setNotes(result.data.notes || []);
      }
    } catch (error) {
      logger.error('Failed to load notes', { error });
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  // Auto-load notes when tab switches to 'notes'
  // (handled in page.tsx via useEffect — keeping lazy load explicit)

  // --- Lunch Orders (loaded on mount via useDataFetch) ---
  const { data: lunchRaw } = useDataFetch<{ orders: Array<Record<string, unknown>> }>(
    `/api/admin/trip-proposals/${id}/lunch`,
    { cache: false }
  );

  const lunchOrders: LunchOrderData[] = (lunchRaw?.orders || []).map(
    (o: Record<string, unknown>) => ({
      id: o.id as number,
      ordering_mode: (o.ordering_mode as string) || 'coordinator',
      day: o.day as LunchOrderData['day'],
      supplier: o.supplier as LunchOrderData['supplier'],
    })
  );

  // --- Reminder History (on-demand) ---
  const [reminderHistory, setReminderHistory] = useState<ReminderRecord[]>([]);

  const loadReminderHistory = useCallback(async () => {
    try {
      const result = await apiGet<ReminderRecord[]>(
        `/api/admin/trip-proposals/${id}/reminders`
      );
      if (result.success && result.data) {
        setReminderHistory(result.data);
      }
    } catch {
      // non-critical
    }
  }, [id]);

  return {
    proposal,
    setProposal,
    wineries: wineriesData || [],
    restaurants: restaurantsData || [],
    hotels: hotelsData || [],
    savedMenus,
    notes,
    notesLoading,
    lunchOrders,
    reminderHistory,
    loading: proposalLoading,
    refetchProposal,
    loadNotes,
    loadReminderHistory,
    setReminderHistory,
  };
}
