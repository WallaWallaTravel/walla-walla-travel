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
    let cancelled = false;

    // trip_proposal_stops links through trip_proposal_days (no direct
    // trip_proposal_id column), so we fetch the day IDs first to build
    // an `in` filter.  If days are added/removed later, the
    // trip_proposal_days subscription fires onUpdate → consumer refetches.
    async function subscribe() {
      const { data: days } = await supabase
        .from('trip_proposal_days')
        .select('id')
        .eq('trip_proposal_id', proposalId);

      if (cancelled) return;

      const dayIds = (days as { id: number }[] || []).map(d => d.id);

      // Build the channel with filters on every table.
      let builder = supabase
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
        );

      // Only subscribe to stops if there are days (otherwise no stops exist)
      if (dayIds.length > 0) {
        builder = builder.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_proposal_stops',
            filter: `trip_proposal_day_id=in.(${dayIds.join(',')})`,
          },
          handleChange
        );
      }

      builder = builder
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
        );

      const channel = builder.subscribe();
      channelRef.current = channel;
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [proposalId, enabled, handleChange]);
}
