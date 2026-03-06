/**
 * useProposalActions Hook
 *
 * Proposal-level CRUD operations: update fields, change status,
 * recalculate pricing, send, archive, delete, convert to booking.
 *
 * Each action has its own loading key (not a shared boolean).
 * Text field updates are debounced to avoid per-keystroke API calls.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch, apiPost, apiDelete } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import { debounce } from '@/lib/utils/debounce';
import { getApiErrorMessage } from '@/lib/utils/error-messages';
import type { ProposalDetail, ToastFn } from '@/lib/types/proposal-detail';

interface UseProposalActionsReturn {
  actionLoading: Record<string, boolean>;
  updateProposal: (updates: Partial<ProposalDetail>) => Promise<void>;
  updateProposalDebounced: (updates: Partial<ProposalDetail>) => void;
  updateStatus: (status: string) => Promise<void>;
  recalculatePricing: () => Promise<void>;
  convertToBooking: () => Promise<void>;
  generateItinerary: () => Promise<void>;
  sendProposal: (customMessage: string) => Promise<void>;
  announceGuests: (subject: string, message: string) => Promise<void>;
  archiveProposal: () => Promise<void>;
  unarchiveProposal: () => Promise<void>;
  deleteProposal: () => Promise<void>;
  updatePlanningPhase: (phase: string) => Promise<void>;
  updateLunchOrderingMode: (orderId: number, mode: string) => Promise<boolean>;
}

export function useProposalActions(
  proposalId: string,
  proposal: ProposalDetail | null,
  setProposal: (p: ProposalDetail | null | ((prev: ProposalDetail | null) => ProposalDetail | null)) => void,
  refetchProposal: () => Promise<void>,
  toast: ToastFn
): UseProposalActionsReturn {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setActionLoading((prev) => ({ ...prev, [key]: loading }));
  }, []);

  // --- Update proposal fields (immediate — for selects, checkboxes) ---
  const updateProposal = useCallback(
    async (updates: Partial<ProposalDetail>) => {
      if (!proposal) return;
      setLoading('updateProposal', true);
      try {
        const result = await apiPatch<ProposalDetail>(
          `/api/admin/trip-proposals/${proposalId}`,
          updates
        );
        if (result.success && result.data) {
          setProposal((prev: ProposalDetail | null) =>
            prev ? { ...prev, ...result.data } : prev
          );
        } else {
          toast(result.error || 'Failed to update proposal', 'error');
        }
      } catch (error) {
        logger.error('Failed to update proposal', { error });
        toast(getApiErrorMessage(error, 'Failed to update proposal'), 'error');
      } finally {
        setLoading('updateProposal', false);
      }
    },
    [proposal, proposalId, setProposal, toast, setLoading]
  );

  // --- Debounced version for text inputs (500ms) ---
  // We accumulate pending updates and flush them as one PATCH
  const pendingUpdates = useRef<Partial<ProposalDetail>>({});

  const flushDebounced = useMemo(
    () =>
      debounce(async () => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {};
        if (Object.keys(updates).length === 0) return;

        try {
          const result = await apiPatch<ProposalDetail>(
            `/api/admin/trip-proposals/${proposalId}`,
            updates
          );
          if (result.success && result.data) {
            setProposal((prev: ProposalDetail | null) =>
              prev ? { ...prev, ...result.data } : prev
            );
          } else {
            toast(result.error || 'Failed to update proposal', 'error');
          }
        } catch (error) {
          logger.error('Failed to update proposal (debounced)', { error });
          toast(getApiErrorMessage(error, 'Failed to update proposal'), 'error');
        }
      }, 500),
    [proposalId, setProposal, toast]
  );

  const updateProposalDebounced = useCallback(
    (updates: Partial<ProposalDetail>) => {
      // Optimistic local update immediately
      setProposal((prev: ProposalDetail | null) =>
        prev ? { ...prev, ...updates } : prev
      );
      // Queue for debounced API call
      pendingUpdates.current = { ...pendingUpdates.current, ...updates };
      flushDebounced();
    },
    [setProposal, flushDebounced]
  );

  // Cancel debounce on unmount
  useEffect(() => {
    return () => flushDebounced.cancel();
  }, [flushDebounced]);

  // --- Update status ---
  const updateStatus = useCallback(
    async (newStatus: string) => {
      setLoading('updateStatus', true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/status`,
          { status: newStatus }
        );
        if (result.success) {
          setProposal((prev: ProposalDetail | null) =>
            prev ? { ...prev, status: newStatus } : prev
          );
          toast(`Status updated to ${newStatus}`, 'success');
        } else {
          toast(result.error || 'Failed to update status', 'error');
        }
      } catch (error) {
        logger.error('Failed to update status', { error });
        toast(getApiErrorMessage(error, 'Failed to update status'), 'error');
      } finally {
        setLoading('updateStatus', false);
      }
    },
    [proposalId, setProposal, toast, setLoading]
  );

  // --- Recalculate pricing ---
  const recalculatePricing = useCallback(async () => {
    setLoading('recalculatePricing', true);
    try {
      const result = await apiPost(`/api/admin/trip-proposals/${proposalId}/pricing`, {});
      if (result.success) {
        await refetchProposal();
        toast('Pricing recalculated!', 'success');
      } else {
        toast(result.error || 'Failed to recalculate pricing', 'error');
      }
    } catch (error) {
      logger.error('Failed to recalculate pricing', { error });
      toast(getApiErrorMessage(error, 'Failed to recalculate pricing'), 'error');
    } finally {
      setLoading('recalculatePricing', false);
    }
  }, [proposalId, refetchProposal, toast, setLoading]);

  // --- Convert to booking ---
  const convertToBooking = useCallback(async () => {
    setLoading('convertToBooking', true);
    try {
      const result = await apiPost<{ booking_id: number; booking_number: string }>(
        `/api/admin/trip-proposals/${proposalId}/convert`,
        {}
      );
      if (result.success && result.data) {
        toast(`Booking ${result.data.booking_number} created!`, 'success');
        router.push(`/admin/bookings/${result.data.booking_id}`);
      } else {
        toast(result.error || 'Failed to convert to booking', 'error');
      }
    } catch (error) {
      logger.error('Failed to convert to booking', { error });
      toast(getApiErrorMessage(error, 'Failed to convert to booking'), 'error');
    } finally {
      setLoading('convertToBooking', false);
    }
  }, [proposalId, router, toast, setLoading]);

  // --- Generate itinerary ---
  const generateItinerary = useCallback(async () => {
    setLoading('generateItinerary', true);
    try {
      const result = await apiPost(`/api/admin/trip-proposals/${proposalId}/itinerary`, {});
      if (result.success) {
        toast('Driver itinerary generated!', 'success');
      } else {
        toast(result.error || 'Failed to generate itinerary', 'error');
      }
    } catch (error) {
      logger.error('Failed to generate itinerary', { error });
      toast(getApiErrorMessage(error, 'Failed to generate itinerary'), 'error');
    } finally {
      setLoading('generateItinerary', false);
    }
  }, [proposalId, toast, setLoading]);

  // --- Send proposal ---
  const sendProposal = useCallback(
    async (customMessage: string) => {
      if (!proposal) return;
      setLoading('sendProposal', true);
      try {
        const result = await apiPost<{ email_to: string }>(
          `/api/admin/trip-proposals/${proposalId}/send`,
          { custom_message: customMessage.trim() || undefined }
        );
        if (result.success && result.data) {
          setProposal((prev: ProposalDetail | null) =>
            prev ? { ...prev, status: 'sent' } : prev
          );
          toast(`Proposal sent to ${result.data.email_to}`, 'success');
        } else {
          toast(result.error || 'Failed to send proposal', 'error');
        }
      } catch (error) {
        logger.error('Failed to send proposal', { error });
        toast(getApiErrorMessage(error, 'Failed to send proposal'), 'error');
      } finally {
        setLoading('sendProposal', false);
      }
    },
    [proposal, proposalId, setProposal, toast, setLoading]
  );

  // --- Announce to guests ---
  const announceGuests = useCallback(
    async (subject: string, message: string) => {
      setLoading('announceGuests', true);
      try {
        const result = await apiPost<{ recipients: number }>(
          `/api/admin/trip-proposals/${proposalId}/announce`,
          { subject: subject.trim() || undefined, message }
        );
        if (result.success && result.data) {
          toast(`Update sent to ${result.data.recipients} guest${result.data.recipients !== 1 ? 's' : ''}`, 'success');
        } else {
          toast(result.error || 'Failed to send announcement', 'error');
        }
      } catch (error) {
        logger.error('Failed to send announcement', { error });
        toast(getApiErrorMessage(error, 'Failed to send announcement'), 'error');
      } finally {
        setLoading('announceGuests', false);
      }
    },
    [proposalId, toast, setLoading]
  );

  // --- Archive ---
  const archiveProposal = useCallback(async () => {
    setLoading('archiveProposal', true);
    try {
      const result = await apiPost(`/api/admin/trip-proposals/${proposalId}/archive`, {});
      if (result.success) {
        toast('Proposal archived', 'success');
        router.push('/admin/trip-proposals');
      } else {
        toast(result.error || 'Failed to archive proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to archive proposal', { error });
      toast(getApiErrorMessage(error, 'Failed to archive proposal'), 'error');
    } finally {
      setLoading('archiveProposal', false);
    }
  }, [proposalId, router, toast, setLoading]);

  // --- Unarchive ---
  const unarchiveProposal = useCallback(async () => {
    setLoading('unarchiveProposal', true);
    try {
      const result = await apiDelete(`/api/admin/trip-proposals/${proposalId}/archive`);
      if (result.success) {
        setProposal((prev: ProposalDetail | null) =>
          prev ? { ...prev, archived_at: undefined } : prev
        );
        toast('Proposal unarchived', 'success');
      } else {
        toast(result.error || 'Failed to unarchive proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to unarchive proposal', { error });
      toast(getApiErrorMessage(error, 'Failed to unarchive proposal'), 'error');
    } finally {
      setLoading('unarchiveProposal', false);
    }
  }, [proposalId, setProposal, toast, setLoading]);

  // --- Delete ---
  const deleteProposal = useCallback(async () => {
    setLoading('deleteProposal', true);
    try {
      const result = await apiDelete(`/api/admin/trip-proposals/${proposalId}`);
      if (result.success) {
        toast('Proposal deleted permanently', 'success');
        router.push('/admin/trip-proposals');
      } else {
        toast(result.error || 'Failed to delete proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to delete proposal', { error });
      toast(getApiErrorMessage(error, 'Failed to delete proposal'), 'error');
    } finally {
      setLoading('deleteProposal', false);
    }
  }, [proposalId, router, toast, setLoading]);

  // --- Update planning phase ---
  const updatePlanningPhase = useCallback(
    async (phase: string) => {
      setLoading('updatePlanningPhase', true);
      try {
        const result = await apiPatch<ProposalDetail>(
          `/api/admin/trip-proposals/${proposalId}`,
          { planning_phase: phase }
        );
        if (result.success && result.data) {
          setProposal((prev: ProposalDetail | null) =>
            prev ? { ...prev, ...result.data } : prev
          );
        } else {
          toast(
            (result.error as string) || 'Failed to update planning phase',
            'error'
          );
        }
      } catch (error) {
        logger.error('Failed to update planning phase', { error });
        toast(getApiErrorMessage(error, 'Failed to update planning phase'), 'error');
      } finally {
        setLoading('updatePlanningPhase', false);
      }
    },
    [proposalId, setProposal, toast, setLoading]
  );

  // --- Update lunch ordering mode ---
  const updateLunchOrderingMode = useCallback(
    async (orderId: number, mode: string): Promise<boolean> => {
      setLoading('updateLunchOrderingMode', true);
      try {
        const result = await apiPatch(`/api/admin/lunch-orders/${orderId}`, {
          ordering_mode: mode,
        });
        if (result.success) {
          return true;
        } else {
          toast(result.error || 'Failed to update ordering mode', 'error');
          return false;
        }
      } catch (error) {
        logger.error('Failed to update lunch ordering mode', { error });
        toast(getApiErrorMessage(error, 'Failed to update ordering mode'), 'error');
        return false;
      } finally {
        setLoading('updateLunchOrderingMode', false);
      }
    },
    [toast, setLoading]
  );

  return {
    actionLoading,
    updateProposal,
    updateProposalDebounced,
    updateStatus,
    recalculatePricing,
    convertToBooking,
    generateItinerary,
    sendProposal,
    announceGuests,
    archiveProposal,
    unarchiveProposal,
    deleteProposal,
    updatePlanningPhase,
    updateLunchOrderingMode,
  };
}
