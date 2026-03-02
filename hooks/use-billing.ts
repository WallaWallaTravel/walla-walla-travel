/**
 * useBilling Hook
 *
 * Extracts all billing-tab inline fetch calls into proper functions.
 * Replaces prompt() calls with functions that accept params directly.
 * Replaces document.getElementById() with param-based API.
 * Each operation has its own loading key.
 */

import { useState, useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';
import type { ReminderRecord, ToastFn } from '@/lib/types/proposal-detail';

interface UseBillingReturn {
  billingLoading: Record<string, boolean>;
  updateInclusionTaxable: (inclusionId: number, taxable: boolean) => Promise<void>;
  updateInclusionTaxIncluded: (inclusionId: number, taxIncluded: boolean) => Promise<void>;
  recalculateBilling: () => Promise<void>;
  verifyBilling: () => Promise<void>;
  updateGuestSponsored: (guestId: number, sponsored: boolean) => Promise<void>;
  updateGuestOverride: (guestId: number, overrideAmount: number | null) => Promise<void>;
  recordPayment: (guestId: number, amount: number) => Promise<void>;
  createPaymentGroup: (name: string, guestIds: number[]) => Promise<void>;
  pauseResumeReminders: (paused: boolean) => Promise<void>;
  generateReminderSchedule: () => Promise<void>;
  cancelReminder: (reminderId: number) => Promise<void>;
  addCustomReminder: (
    date: string,
    urgency: string,
    customMessage?: string
  ) => Promise<void>;
}

export function useBilling(
  proposalId: string,
  refetchProposal: () => Promise<void>,
  loadReminderHistory: () => Promise<void>,
  setReminderHistory: React.Dispatch<React.SetStateAction<ReminderRecord[]>>,
  toast: ToastFn
): UseBillingReturn {
  const [billingLoading, setBillingLoading] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setBillingLoading((prev) => ({ ...prev, [key]: loading }));
  }, []);

  // --- Inclusion tax toggles ---
  const updateInclusionTaxable = useCallback(
    async (inclusionId: number, taxable: boolean) => {
      setLoading(`taxable_${inclusionId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/inclusions/${inclusionId}`,
          { is_taxable: taxable }
        );
        if (result.success) {
          await refetchProposal();
        }
      } catch (error) {
        logger.error('Failed to update inclusion taxable', { error });
      } finally {
        setLoading(`taxable_${inclusionId}`, false);
      }
    },
    [proposalId, refetchProposal, setLoading]
  );

  const updateInclusionTaxIncluded = useCallback(
    async (inclusionId: number, taxIncluded: boolean) => {
      setLoading(`taxIncl_${inclusionId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/inclusions/${inclusionId}`,
          { tax_included_in_price: taxIncluded }
        );
        if (result.success) {
          await refetchProposal();
        }
      } catch (error) {
        logger.error('Failed to update inclusion tax included', { error });
      } finally {
        setLoading(`taxIncl_${inclusionId}`, false);
      }
    },
    [proposalId, refetchProposal, setLoading]
  );

  // --- Recalculate billing ---
  const recalculateBilling = useCallback(async () => {
    setLoading('recalculateBilling', true);
    try {
      const result = await apiPost(
        `/api/admin/trip-proposals/${proposalId}/billing/calculate`,
        {}
      );
      if (result.success) {
        toast('Guest amounts calculated!', 'success');
        await refetchProposal();
      } else {
        const errMsg =
          (result.error as string) || 'Failed to calculate';
        toast(errMsg, 'error');
      }
    } catch {
      toast('Failed to calculate', 'error');
    } finally {
      setLoading('recalculateBilling', false);
    }
  }, [proposalId, refetchProposal, toast, setLoading]);

  // --- Verify billing ---
  const verifyBilling = useCallback(async () => {
    setLoading('verifyBilling', true);
    try {
      const result = await apiPost<{ valid: boolean }>(
        `/api/admin/trip-proposals/${proposalId}/billing/calculate`,
        {}
      );
      if (result.success && result.data?.valid) {
        toast('Billing verified — no discrepancies!', 'success');
      } else if (result.success) {
        toast('Warning: billing may have discrepancies', 'error');
      }
    } catch {
      toast('Failed to verify', 'error');
    } finally {
      setLoading('verifyBilling', false);
    }
  }, [proposalId, toast, setLoading]);

  // --- Guest billing: sponsored toggle ---
  const updateGuestSponsored = useCallback(
    async (guestId: number, sponsored: boolean) => {
      setLoading(`sponsored_${guestId}`, true);
      try {
        const result = await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}/billing`,
          { is_sponsored: sponsored }
        );
        if (result.success) {
          await refetchProposal();
        }
      } catch (error) {
        logger.error('Failed to update guest sponsored', { error });
      } finally {
        setLoading(`sponsored_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, setLoading]
  );

  // --- Guest billing: override amount ---
  const updateGuestOverride = useCallback(
    async (guestId: number, overrideAmount: number | null) => {
      setLoading(`override_${guestId}`, true);
      try {
        await apiPatch(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}/billing`,
          { amount_owed_override: overrideAmount }
        );
        await refetchProposal();
      } catch (error) {
        logger.error('Failed to update guest override', { error });
      } finally {
        setLoading(`override_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, setLoading]
  );

  // --- Record manual payment (accepts amount as param — no prompt()) ---
  const recordPayment = useCallback(
    async (guestId: number, amount: number) => {
      if (isNaN(amount) || amount <= 0) {
        toast('Invalid amount', 'error');
        return;
      }
      setLoading(`payment_${guestId}`, true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/guests/${guestId}/record-payment`,
          { amount }
        );
        if (result.success) {
          toast('Payment recorded!', 'success');
          await refetchProposal();
        }
      } catch {
        toast('Failed to record payment', 'error');
      } finally {
        setLoading(`payment_${guestId}`, false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Create payment group (accepts params — no prompt()) ---
  const createPaymentGroup = useCallback(
    async (name: string, guestIds: number[]) => {
      if (guestIds.length < 1) {
        toast('Need at least 1 guest ID', 'error');
        return;
      }
      setLoading('createPaymentGroup', true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/payment-groups`,
          { guest_ids: guestIds, name }
        );
        if (result.success) {
          toast('Payment group created!', 'success');
          await refetchProposal();
        } else {
          toast(result.error || 'Failed to create group', 'error');
        }
      } catch {
        toast('Failed to create group', 'error');
      } finally {
        setLoading('createPaymentGroup', false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Pause / Resume reminders ---
  const pauseResumeReminders = useCallback(
    async (currentlyPaused: boolean) => {
      setLoading('pauseResumeReminders', true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/reminders`,
          { action: currentlyPaused ? 'resume_proposal' : 'pause_proposal' }
        );
        if (result.success) {
          toast(
            currentlyPaused ? 'Reminders resumed' : 'Reminders paused',
            'success'
          );
          await refetchProposal();
        }
      } catch {
        toast('Failed to update', 'error');
      } finally {
        setLoading('pauseResumeReminders', false);
      }
    },
    [proposalId, refetchProposal, toast, setLoading]
  );

  // --- Generate reminder schedule ---
  const generateReminderSchedule = useCallback(async () => {
    setLoading('generateReminderSchedule', true);
    try {
      const result = await apiPost<{ created: number }>(
        `/api/admin/trip-proposals/${proposalId}/reminders`,
        { action: 'generate_schedule' }
      );
      if (result.success && result.data) {
        toast(`Generated ${result.data.created} reminders`, 'success');
        setReminderHistory([]);
        await loadReminderHistory();
      } else {
        const errMsg = (result.error as string) || 'Failed to generate';
        toast(errMsg, 'error');
      }
    } catch {
      toast('Failed to generate schedule', 'error');
    } finally {
      setLoading('generateReminderSchedule', false);
    }
  }, [proposalId, loadReminderHistory, setReminderHistory, toast, setLoading]);

  // --- Cancel a reminder ---
  const cancelReminder = useCallback(
    async (reminderId: number) => {
      setLoading(`cancelReminder_${reminderId}`, true);
      try {
        await apiPost(`/api/admin/trip-proposals/${proposalId}/reminders`, {
          action: 'cancel',
          reminder_id: reminderId,
        });
        toast('Reminder cancelled', 'success');
        await loadReminderHistory();
      } catch {
        toast('Failed', 'error');
      } finally {
        setLoading(`cancelReminder_${reminderId}`, false);
      }
    },
    [proposalId, loadReminderHistory, toast, setLoading]
  );

  // --- Add custom reminder (accepts params — no document.getElementById()) ---
  const addCustomReminder = useCallback(
    async (date: string, urgency: string, customMessage?: string) => {
      if (!date) {
        toast('Pick a date', 'error');
        return;
      }
      setLoading('addCustomReminder', true);
      try {
        const result = await apiPost(
          `/api/admin/trip-proposals/${proposalId}/reminders`,
          {
            action: 'add_manual',
            scheduled_date: date,
            urgency,
            custom_message: customMessage || undefined,
          }
        );
        if (result.success) {
          toast('Custom reminder added', 'success');
          await loadReminderHistory();
        }
      } catch {
        toast('Failed to add reminder', 'error');
      } finally {
        setLoading('addCustomReminder', false);
      }
    },
    [proposalId, loadReminderHistory, toast, setLoading]
  );

  return {
    billingLoading,
    updateInclusionTaxable,
    updateInclusionTaxIncluded,
    recalculateBilling,
    verifyBilling,
    updateGuestSponsored,
    updateGuestOverride,
    recordPayment,
    createPaymentGroup,
    pauseResumeReminders,
    generateReminderSchedule,
    cancelReminder,
    addCustomReminder,
  };
}
