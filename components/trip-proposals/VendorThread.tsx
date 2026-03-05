'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversationEntry, ConversationThreadResponse } from '@/lib/types/partner-request';

interface VendorThreadProps {
  proposalId: number;
  stopId: number;
}

const ENTRY_ICONS: Record<string, string> = {
  request_sent: '📤',
  partner_response: '📥',
  email_received: '📧',
  email_sent: '✉️',
  phone_call: '📞',
  note: '📝',
  quote_received: '💰',
  status_change: '🔄',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  confirm: { label: 'Confirmed', color: 'text-green-700 bg-green-50' },
  modify: { label: 'Suggested Changes', color: 'text-amber-700 bg-amber-50' },
  decline: { label: 'Declined', color: 'text-red-700 bg-red-50' },
  message: { label: 'Message', color: 'text-blue-700 bg-blue-50' },
};

export default function VendorThread({ proposalId, stopId }: VendorThreadProps) {
  const [thread, setThread] = useState<ConversationThreadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/trip-proposals/${proposalId}/stops/${stopId}/thread`
      );
      if (res.ok) {
        const data = await res.json();
        setThread(data.data);
      } else {
        setError('Failed to load thread');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [proposalId, stopId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="w-5 h-5 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-1" />
              <div className="h-2 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-600 py-1">{error}</p>;
  }

  if (!thread || thread.entries.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2 italic">
        No communication history yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {/* Active requests indicator */}
      {thread.active_requests > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium">
          {thread.active_requests} active request{thread.active_requests !== 1 ? 's' : ''} awaiting response
        </div>
      )}

      {/* Thread entries */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {thread.entries.map((entry) => (
          <ThreadEntry key={`${entry.entry_type}-${entry.id}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ThreadEntry({ entry }: { entry: ConversationEntry }) {
  const icon = ENTRY_ICONS[entry.interaction_type] || '📋';
  const actionConfig = entry.response_action
    ? ACTION_LABELS[entry.response_action]
    : null;

  const timeStr = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const authorLabel = entry.author_type === 'partner'
    ? `${entry.author_name || 'Partner'} (partner)`
    : entry.author_type === 'system'
    ? 'System'
    : entry.author_name || 'Staff';

  return (
    <div className="flex gap-2 text-xs">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-gray-800">{authorLabel}</span>
          {actionConfig && (
            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${actionConfig.color}`}>
              {actionConfig.label}
            </span>
          )}
          <span className="text-gray-500">{timeStr}</span>
        </div>
        <p className="text-gray-700 mt-0.5 line-clamp-2 whitespace-pre-line">
          {entry.content}
        </p>
        {entry.confirmation_code && (
          <span className="text-green-700 font-medium">
            Code: {entry.confirmation_code}
          </span>
        )}
        {entry.quoted_amount != null && (
          <span className="text-gray-700 font-medium ml-2">
            ${Number(entry.quoted_amount).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
