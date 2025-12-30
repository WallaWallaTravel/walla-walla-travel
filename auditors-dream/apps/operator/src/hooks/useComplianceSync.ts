import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

/**
 * Real-time sync hook for compliance data
 *
 * Subscribes to Supabase Realtime for:
 * - compliance_status changes (updates to driver/vehicle compliance)
 * - compliance_audit_log changes (new blocks or overrides)
 *
 * Automatically invalidates relevant queries when changes occur.
 */
export function useComplianceSync() {
  const { operator } = useAuthStore();
  const queryClient = useQueryClient();

  const handleComplianceChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      console.log('[ComplianceSync] Change detected:', payload.eventType);

      // Invalidate all compliance-related queries
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-compliance'] });

      // If it's a specific entity update, invalidate those queries too
      const newRecord = payload.new as { entity_type?: string; entity_id?: number };
      if (newRecord.entity_type === 'driver') {
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
      } else if (newRecord.entity_type === 'vehicle') {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
    },
    [queryClient]
  );

  const handleAuditLogChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown> }) => {
      console.log('[ComplianceSync] Audit event:', payload.eventType);

      // Invalidate audit events query
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });

      // If it was a blocked operation, show a notification (could use toast library)
      const newRecord = payload.new as { was_blocked?: boolean; block_reason?: string };
      if (newRecord.was_blocked) {
        console.warn('[ComplianceSync] Operation blocked:', newRecord.block_reason);
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!operator?.id) return;

    // Subscribe to compliance_status changes
    const complianceChannel = supabase
      .channel('compliance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compliance_status',
          filter: `operator_id=eq.${operator.id}`,
        },
        handleComplianceChange
      )
      .subscribe((status) => {
        console.log('[ComplianceSync] Subscription status:', status);
      });

    // Subscribe to audit log changes
    const auditChannel = supabase
      .channel('audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'compliance_audit_log',
          filter: `operator_id=eq.${operator.id}`,
        },
        handleAuditLogChange
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      complianceChannel.unsubscribe();
      auditChannel.unsubscribe();
    };
  }, [operator?.id, handleComplianceChange, handleAuditLogChange]);
}

/**
 * Hook to use in the app root to enable real-time sync
 */
export function useRealtimeSync() {
  const { isAuthenticated, operator } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !operator?.id) return;

    // Enable real-time for all tables we care about
    const channels = [
      // Compliance status changes
      supabase.channel('realtime:compliance_status'),
      // Audit log entries
      supabase.channel('realtime:compliance_audit_log'),
    ];

    // Subscribe all channels
    channels.forEach((channel) => channel.subscribe());

    return () => {
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, [isAuthenticated, operator?.id]);
}
