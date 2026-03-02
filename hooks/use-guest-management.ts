/**
 * useGuestManagement Hook
 *
 * Guest CRUD operations: add, update fields inline, approve/reject,
 * delete, update guest settings (proposal-level guest config).
 * Each operation has its own loading key.
 */

import { useState, useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import type { ProposalDetail, ToastFn } from '@/lib/types/proposal-detail';

interface AddGuestData {
  name: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

interface UseGuestManagementReturn {
  guestLoading: Record<string, boolean>;
  addGuest: (data: AddGuestData) => Promise<boolean>;
  updateGuestField: (guestId: number, field: string, value: string) => Promise<void>;
  updateGuestSettings: (updates: Record<string, unknown>) => Promise<void>;
  approveGuest: (guestId: number) => Promise<void>;
  rejectGuest: (guestId: number) => Promise<void>;
  deleteGuest: (guestId: number) => Promise<void>;
}

export function useGuestManagement(
  proposalId: string,
  proposal: ProposalDetail | null,
  setProposal: (p: ProposalDetail | null | ((prev: ProposalDetail | null) => ProposalDetail | null)) => void,
  refetchProposal: () => Promise<void>,
  toast: ToastFn
): UseGuestManagementReturn {
  const [guestLoading, setGuestLoading] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setGuestLoading((prev) => ({ ...prev, [key]: loading }));
  }, []);

  // --- Add guest ---
  const addGuest = useCallback(
    async (data: AddGuestData): Promise<boolean> => {
      if (!data.name.trim()) {
        toast('Guest name is required', 'error');
        return false;
      }
      setLoading('addGuest', true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/guests`,
          {
            name: data.name.trim(),
            email: data.email.trim() || undefined,
            phone: data.phone.trim() || undefined,
            is_primary: data.is_primary || !proposal?.guests?.length,
          }
        );
        if (result.success) {
          await refetchProposal();
          toast('Guest added', 'success');
          return true;
        } else {
          toast(result.error || 'Failed to add guest', 'error');
          return false;
        }
      } catch (error) {
        logger.error('Failed to add guest', { error });
        toast('Failed to add guest', 'error');
        return false;
      } finally {
        setLoading('addGuest', false);
      }
    },
    [proposalId, proposal, refetchProposal, toast, setLoading]
  );

  // --- Update a single guest field (inline editing) ---
  const updateGuestField = useCallback(
    async (guestId: number, field: string, value: string) => {
      setLoading(`updateGuest_${guestId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}`,
          { [field]: value.trim() || null }
        );
        if (result.success) {
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to update guest', 'error');
        }
      } catch (error) {
        logger.error('Failed to update guest', { error });
      } finally {
        setLoading(`updateGuest_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Update proposal-level guest settings ---
  const updateGuestSettings = useCallback(
    async (updates: Record<string, unknown>) => {
      setLoading('updateGuestSettings', true);
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
          toast(result.error || 'Failed to update settings', 'error');
        }
      } catch (error) {
        logger.error('Failed to update guest settings', { error });
        toast('Failed to update settings', 'error');
      } finally {
        setLoading('updateGuestSettings', false);
      }
    },
    [proposalId, setProposal, toast, setLoading]
  );

  // --- Approve guest ---
  const approveGuest = useCallback(
    async (guestId: number) => {
      setLoading(`approveGuest_${guestId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}`,
          { rsvp_status: 'confirmed' }
        );
        if (result.success) {
          await refetchProposal();
          toast('Guest approved', 'success');
        }
      } catch {
        toast('Failed to approve', 'error');
      } finally {
        setLoading(`approveGuest_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Reject guest ---
  const rejectGuest = useCallback(
    async (guestId: number) => {
      setLoading(`rejectGuest_${guestId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}`,
          { rsvp_status: 'declined' }
        );
        if (result.success) {
          await refetchProposal();
          toast('Guest rejected', 'success');
        }
      } catch {
        toast('Failed to reject', 'error');
      } finally {
        setLoading(`rejectGuest_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Delete guest ---
  const deleteGuest = useCallback(
    async (guestId: number) => {
      setLoading(`deleteGuest_${guestId}`, true);
      try {
        const result = await apiDelete(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}`
        );
        if (result.success) {
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to remove guest', 'error');
        }
      } catch (error) {
        logger.error('Failed to remove guest', { error });
      } finally {
        setLoading(`deleteGuest_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  return {
    guestLoading,
    addGuest,
    updateGuestField,
    updateGuestSettings,
    approveGuest,
    rejectGuest,
    deleteGuest,
  };
}
