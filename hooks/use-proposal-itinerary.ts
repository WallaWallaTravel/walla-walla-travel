/**
 * useProposalItinerary Hook
 *
 * Day/stop CRUD for the trip proposal detail page.
 * Named use-proposal-itinerary to avoid conflict with the existing
 * use-itinerary.ts (which is for booking itineraries).
 *
 * Vendor field updates have proper error handling (not fire-and-forget).
 * Text field updates on stops are debounced.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import { debounce } from '@/lib/utils/debounce';
import { getApiErrorMessage } from '@/lib/utils/error-messages';
import type { ProposalDetail, ToastFn } from '@/lib/types/proposal-detail';

interface UseProposalItineraryReturn {
  itineraryLoading: Record<string, boolean>;
  addDay: () => Promise<void>;
  addStop: (dayId: number, stopType: string) => Promise<void>;
  updateStop: (dayId: number, stopId: number, updates: Record<string, unknown>) => Promise<void>;
  updateStopDebounced: (dayId: number, stopId: number, updates: Record<string, unknown>) => void;
  deleteStop: (dayId: number, stopId: number) => Promise<void>;
  updateVendorField: (stopId: number, field: string, value: string | number | null) => Promise<void>;
  logVendorInteraction: (stopId: number, note: string) => Promise<void>;
}

export function useProposalItinerary(
  proposalId: string,
  proposal: ProposalDetail | null,
  setProposal: (p: ProposalDetail | null | ((prev: ProposalDetail | null) => ProposalDetail | null)) => void,
  refetchProposal: () => Promise<void>,
  toast: ToastFn
): UseProposalItineraryReturn {
  const [itineraryLoading, setItineraryLoading] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setItineraryLoading((prev) => ({ ...prev, [key]: loading }));
  }, []);

  // --- Add day ---
  const addDay = useCallback(async () => {
    if (!proposal) return;

    const lastDay = proposal.days?.[proposal.days.length - 1];
    const nextDate = lastDay
      ? new Date(new Date(lastDay.date).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : proposal.start_date;

    setLoading('addDay', true);
    try {
      const result = await apiPost(
        `/api/admin/trip-proposals/${proposalId}/days`,
        {
          date: nextDate,
          title: `Day ${(proposal.days?.length || 0) + 1}`,
        }
      );
      if (result.success) {
        await refetchProposal();
      } else {
        toast(result.error || 'Failed to add day', 'error');
      }
    } catch (error) {
      logger.error('Failed to add day', { error });
      toast(getApiErrorMessage(error, 'Failed to add day'), 'error');
    } finally {
      setLoading('addDay', false);
    }
  }, [proposal, proposalId, refetchProposal, toast, setLoading]);

  // --- Add stop ---
  const addStop = useCallback(
    async (dayId: number, stopType: string) => {
      setLoading(`addStop_${dayId}`, true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops`,
          {
            stop_type: stopType,
            scheduled_time: '10:00',
            duration_minutes: 60,
            per_person_cost: 0,
            flat_cost: 0,
            reservation_status: 'pending',
          }
        );
        if (result.success) {
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to add stop', 'error');
        }
      } catch (error) {
        logger.error('Failed to add stop', { error });
        toast(getApiErrorMessage(error, 'Failed to add stop'), 'error');
      } finally {
        setLoading(`addStop_${dayId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Update stop (immediate — for selects, checkboxes) ---
  const updateStop = useCallback(
    async (dayId: number, stopId: number, updates: Record<string, unknown>) => {
      setLoading(`updateStop_${stopId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops/${stopId}`,
          updates
        );
        if (result.success) {
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to update stop', 'error');
        }
      } catch (error) {
        logger.error('Failed to update stop', { error });
      } finally {
        setLoading(`updateStop_${stopId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Debounced stop update (for text fields like cost_note) ---
  const pendingStopUpdates = useRef<
    Map<string, { dayId: number; stopId: number; updates: Record<string, unknown> }>
  >(new Map());

  const flushStopUpdates = useMemo(
    () =>
      debounce(async () => {
        const entries = new Map(pendingStopUpdates.current);
        pendingStopUpdates.current.clear();

        for (const [, { dayId, stopId, updates }] of entries) {
          try {
            const result = await apiPatch(
              `/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops/${stopId}`,
              updates
            );
            if (!result.success) {
              toast(result.error || 'Failed to update stop', 'error');
            }
          } catch (error) {
            logger.error('Failed to update stop (debounced)', { error });
          }
        }
        // Refetch once after all updates
        if (entries.size > 0) {
          await refetchProposal();
        }
      }, 500),
    [proposalId, refetchProposal, toast]
  );

  const updateStopDebounced = useCallback(
    (dayId: number, stopId: number, updates: Record<string, unknown>) => {
      // Optimistic local update
      setProposal((prev: ProposalDetail | null) => {
        if (!prev?.days) return prev;
        const newDays = prev.days.map((d) =>
          d.id === dayId
            ? {
                ...d,
                stops: d.stops.map((s) =>
                  s.id === stopId ? { ...s, ...updates } : s
                ),
              }
            : d
        );
        return { ...prev, days: newDays };
      });

      // Queue for debounced API call
      const key = `${dayId}_${stopId}`;
      const existing = pendingStopUpdates.current.get(key);
      pendingStopUpdates.current.set(key, {
        dayId,
        stopId,
        updates: { ...(existing?.updates || {}), ...updates },
      });
      flushStopUpdates();
    },
    [setProposal, flushStopUpdates]
  );

  useEffect(() => {
    return () => flushStopUpdates.cancel();
  }, [flushStopUpdates]);

  // --- Delete stop ---
  const deleteStop = useCallback(
    async (dayId: number, stopId: number) => {
      setLoading(`deleteStop_${stopId}`, true);
      try {
        const result = await apiDelete(
          `/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops/${stopId}`
        );
        if (result.success) {
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to delete stop', 'error');
        }
      } catch (error) {
        logger.error('Failed to delete stop', { error });
      } finally {
        setLoading(`deleteStop_${stopId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Update vendor field (proper error handling, not fire-and-forget) ---
  const updateVendorField = useCallback(
    async (stopId: number, field: string, value: string | number | null) => {
      setLoading(`vendor_${stopId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/stops/${stopId}/vendor`,
          { [field]: value }
        );
        if (!result.success) {
          toast(result.error || `Failed to update vendor ${field}`, 'error');
        }
      } catch (error) {
        logger.error(`Failed to update vendor ${field}`, { error });
        toast(getApiErrorMessage(error, `Failed to update vendor ${field}`), 'error');
      } finally {
        setLoading(`vendor_${stopId}`, false);
      }
    },
    [proposalId, toast, setLoading]
  );

  // --- Log vendor interaction ---
  const logVendorInteraction = useCallback(
    async (stopId: number, note: string) => {
      if (!note.trim()) return;
      setLoading(`vendorLog_${stopId}`, true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/stops/${stopId}/vendor-log`,
          { interaction_type: 'note', content: note }
        );
        if (result.success) {
          toast('Interaction logged', 'success');
        } else {
          toast(result.error || 'Failed to log interaction', 'error');
        }
      } catch (error) {
        logger.error('Failed to log vendor interaction', { error });
        toast(getApiErrorMessage(error, 'Failed to log interaction'), 'error');
      } finally {
        setLoading(`vendorLog_${stopId}`, false);
      }
    },
    [proposalId, toast, setLoading]
  );

  return {
    itineraryLoading,
    addDay,
    addStop,
    updateStop,
    updateStopDebounced,
    deleteStop,
    updateVendorField,
    logVendorInteraction,
  };
}
