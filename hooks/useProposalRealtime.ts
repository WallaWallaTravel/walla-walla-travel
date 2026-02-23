'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseProposalRealtimeOptions {
  proposalId: number;
  onUpdate: () => void;
  enabled?: boolean;
}

/**
 * Subscribes to Supabase Realtime changes on trip proposal tables.
 * Calls `onUpdate` whenever any related row changes, so the consumer
 * can refetch data.
 */
export function useProposalRealtime({
  proposalId,
  onUpdate,
  enabled = true,
}: UseProposalRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep a stable reference to onUpdate so the effect doesn't re-run
  // every time the callback identity changes.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const handleChange = useCallback(() => {
    onUpdateRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !proposalId) return;

    const supabase = createClient();

    // Create a single channel that listens to all relevant tables.
    // We filter by trip_proposal_id where the column exists on the table.
    const channel = supabase
      .channel(`proposal-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_proposals',
          filter: `id=eq.${proposalId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_proposal_days',
          filter: `trip_proposal_id=eq.${proposalId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_proposal_stops',
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_notes',
          filter: `trip_proposal_id=eq.${proposalId}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_lunch_orders',
          filter: `trip_proposal_id=eq.${proposalId}`,
        },
        handleChange
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [proposalId, enabled, handleChange]);
}
