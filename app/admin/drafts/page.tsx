'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface DraftProposal {
  id: number;
  proposal_number: string;
  customer_name: string;
  customer_email: string | null;
  trip_type: string;
  party_size: number;
  created_at: string;
  draft_reminders_enabled: boolean;
}

interface DraftSummary {
  total: number;
  recent: number;
  aging: number;
  stale: number;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  wine_tour: 'Wine Tour',
  wine_group: 'Wine Group',
  multi_day_wine: 'Multi-Day Wine',
  celebration: 'Celebration',
  corporate: 'Corporate',
  wedding: 'Wedding',
  anniversary: 'Anniversary',
  family: 'Family',
  romantic: 'Romantic',
  birthday: 'Birthday',
  custom: 'Custom',
  other: 'Other',
};

function getAgeBadge(createdAt: string): { label: string; className: string } {
  const daysOld = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysOld > 30) return { label: `${daysOld}d — Stale`, className: 'bg-amber-100 text-amber-800' };
  if (daysOld > 7) return { label: `${daysOld}d — Aging`, className: 'bg-yellow-100 text-yellow-800' };
  return { label: `${daysOld}d`, className: 'bg-green-100 text-green-800' };
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftProposal[]>([]);
  const [summary, setSummary] = useState<DraftSummary>({ total: 0, recent: 0, aging: 0, stale: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [draftsRes, summaryRes] = await Promise.all([
        fetch('/api/admin/trip-proposals?status=draft&limit=500'),
        fetch('/api/admin/drafts/summary'),
      ]);

      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setDrafts(draftsData.data?.proposals || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.data || { total: 0, recent: 0, aging: 0, stale: 0 });
      }
    } catch (err) {
      logger.error('Failed to fetch drafts', { error: err });
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear success message after 3s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const toggleReminders = async (draft: DraftProposal) => {
    setActionLoading(draft.id);
    try {
      const res = await fetch(`/api/admin/trip-proposals/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_reminders_enabled: !draft.draft_reminders_enabled }),
      });
      if (res.ok) {
        setDrafts(prev => prev.map(d =>
          d.id === draft.id ? { ...d, draft_reminders_enabled: !d.draft_reminders_enabled } : d
        ));
        setSuccessMessage(`Reminders ${!draft.draft_reminders_enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      logger.error('Failed to toggle reminders', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteDraft = async (draft: DraftProposal) => {
    if (!confirm(`Delete draft "${draft.customer_name}"? This cannot be undone.`)) return;
    setActionLoading(draft.id);
    try {
      const res = await fetch(`/api/admin/trip-proposals/${draft.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        setSummary(prev => ({ ...prev, total: prev.total - 1 }));
        setSuccessMessage('Draft deleted');
      }
    } catch (err) {
      logger.error('Failed to delete draft', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const sendDraft = async (draft: DraftProposal) => {
    if (!draft.customer_email) return;
    setActionLoading(draft.id);
    try {
      const res = await fetch(`/api/admin/trip-proposals/${draft.id}/send`, { method: 'POST' });
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        setSummary(prev => ({ ...prev, total: prev.total - 1 }));
        setSuccessMessage(`Proposal sent to ${draft.customer_email}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send');
      }
    } catch (err) {
      logger.error('Failed to send draft', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-slate-700">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-700">Pending &amp; Drafts</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pending &amp; Drafts</h1>
          <p className="text-sm text-slate-600 mt-1">Manage draft proposals before they&apos;re sent to customers</p>
        </div>
        <button
          onClick={() => router.push('/admin/trip-proposals/new')}
          className="px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#2a4d7a] transition-colors"
        >
          + New Draft
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Drafts', value: summary.total, color: 'text-slate-900' },
          { label: 'Recent (<7d)', value: summary.recent, color: 'text-green-700' },
          { label: 'Aging (7-30d)', value: summary.aging, color: 'text-yellow-700' },
          { label: 'Stale (30d+)', value: summary.stale, color: 'text-amber-700' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Draft List */}
      {drafts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No drafts yet</h3>
          <p className="text-sm text-slate-600 mb-4">Draft proposals will appear here before they&apos;re sent to customers.</p>
          <button
            onClick={() => router.push('/admin/trip-proposals/new')}
            className="px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#2a4d7a] transition-colors"
          >
            Create Your First Draft
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {drafts.map(draft => {
              const ageBadge = getAgeBadge(draft.created_at);
              const isUntitled = draft.customer_name === 'Untitled Draft' || !draft.customer_name;

              return (
                <div key={draft.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-medium truncate ${isUntitled ? 'italic text-slate-500' : 'text-slate-900'}`}>
                        {draft.customer_name || 'Untitled Draft'}
                      </p>
                      <span className="text-xs text-slate-500">{draft.proposal_number}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ageBadge.className}`}>
                        {ageBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{TRIP_TYPE_LABELS[draft.trip_type] || draft.trip_type}</span>
                      <span className="text-xs text-slate-500">{draft.party_size} guest{draft.party_size !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-slate-500">
                        Created {new Date(draft.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {/* Reminder status */}
                      <button
                        onClick={() => toggleReminders(draft)}
                        disabled={actionLoading === draft.id}
                        className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          draft.draft_reminders_enabled
                            ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                            : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                        } transition-colors`}
                        title={draft.draft_reminders_enabled ? 'Reminders active — click to disable' : 'Reminders paused — click to enable'}
                      >
                        {draft.draft_reminders_enabled ? '🔔' : '🔕'}
                        <span>{draft.draft_reminders_enabled ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/admin/trip-proposals/${draft.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                    {draft.customer_email && (
                      <button
                        onClick={() => sendDraft(draft)}
                        disabled={actionLoading === draft.id}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#2a4d7a] disabled:opacity-50 transition-colors"
                      >
                        Send
                      </button>
                    )}
                    <button
                      onClick={() => deleteDraft(draft)}
                      disabled={actionLoading === draft.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
