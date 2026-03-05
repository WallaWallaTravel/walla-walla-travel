'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface InboundEmail {
  id: number;
  from_address: string;
  to_address: string;
  subject: string | null;
  body_text: string | null;
  routed_to_stop_id: number | null;
  routing_method: string | null;
  routed_at: string | null;
  created_at: string;
}

interface ProposalOption {
  id: number;
  proposal_number: string;
  customer_name: string;
}

interface StopOption {
  id: number;
  venue_name: string;
  stop_type: string;
  day_title: string;
}

export default function InboundEmailsPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);

  // Route modal state
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [stops, setStops] = useState<StopOption[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/inbound-emails?status=${showAll ? 'all' : 'unmatched'}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.data || []);
      }
    } catch (err) {
      logger.error('Failed to fetch inbound emails', { error: err });
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Fetch proposals for routing modal
  const fetchProposals = async () => {
    try {
      const res = await fetch('/api/admin/trip-proposals?limit=50&sort=updated_at');
      if (res.ok) {
        const data = await res.json();
        setProposals(
          (data.data || []).map((p: { id: number; proposal_number: string; customer_name: string }) => ({
            id: p.id,
            proposal_number: p.proposal_number,
            customer_name: p.customer_name,
          }))
        );
      }
    } catch (err) {
      logger.error('Failed to fetch proposals', { error: err });
    }
  };

  // Fetch stops for a proposal
  const fetchStops = async (proposalId: number) => {
    try {
      const res = await fetch(`/api/admin/trip-proposals/${proposalId}`);
      if (res.ok) {
        const data = await res.json();
        const proposal = data.data || data;
        const stopOptions: StopOption[] = [];
        for (const day of proposal.days || []) {
          for (const stop of day.stops || []) {
            stopOptions.push({
              id: stop.id,
              venue_name: stop.winery?.name || stop.restaurant?.name || stop.hotel?.name || stop.custom_name || 'Stop',
              stop_type: stop.stop_type,
              day_title: day.title || `Day ${day.day_number}`,
            });
          }
        }
        setStops(stopOptions);
      }
    } catch (err) {
      logger.error('Failed to fetch stops', { error: err });
    }
  };

  const openRouteModal = (email: InboundEmail) => {
    setSelectedEmail(email);
    setSelectedProposalId(null);
    setSelectedStopId(null);
    setStops([]);
    setRouteError(null);
    fetchProposals();
  };

  const handleProposalChange = (proposalId: number) => {
    setSelectedProposalId(proposalId);
    setSelectedStopId(null);
    if (proposalId) {
      fetchStops(proposalId);
    } else {
      setStops([]);
    }
  };

  const handleRoute = async () => {
    if (!selectedEmail || !selectedProposalId || !selectedStopId) return;

    setRouting(true);
    setRouteError(null);

    try {
      const csrfRes = await fetch('/api/auth/csrf');
      const csrfData = await csrfRes.json();

      const res = await fetch(`/api/admin/inbound-emails/${selectedEmail.id}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfData.token,
        },
        body: JSON.stringify({
          stop_id: selectedStopId,
          proposal_id: selectedProposalId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setRouteError(data.error || 'Failed to route email');
        return;
      }

      setSelectedEmail(null);
      fetchEmails();
    } catch {
      setRouteError('Network error — please try again');
    } finally {
      setRouting(false);
    }
  };

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbound Emails</h1>
          <p className="text-sm text-gray-600 mt-1">
            Emails received at @in.wallawalla.travel that need routing
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => { setShowAll(e.target.checked); setLoading(true); }}
            className="rounded border-gray-300"
          />
          Show routed emails
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">
            {showAll ? '📧' : '✅'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {showAll ? 'No inbound emails yet' : 'All caught up!'}
          </h3>
          <p className="text-sm text-gray-600">
            {showAll
              ? 'Emails sent to @in.wallawalla.travel will appear here.'
              : 'No unrouted emails waiting for review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {email.from_address}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(email.created_at)}
                    </span>
                    {email.routing_method === 'auto_address' && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Auto-routed
                      </span>
                    )}
                    {email.routing_method === 'manual_link' && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Manually routed
                      </span>
                    )}
                    {(!email.routing_method || email.routing_method === 'unmatched') && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Unmatched
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 font-medium truncate">
                    {email.subject || '(no subject)'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    To: {email.to_address}
                  </div>
                  {email.body_text && (
                    <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {email.body_text.slice(0, 200)}
                    </div>
                  )}
                </div>
                {(!email.routing_method || email.routing_method === 'unmatched') && (
                  <button
                    onClick={() => openRouteModal(email)}
                    className="shrink-0 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Link to Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Route Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Route Email to Stop</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                From: {selectedEmail.from_address}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {routeError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {routeError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Trip Proposal
                </label>
                <select
                  value={selectedProposalId || ''}
                  onChange={(e) => handleProposalChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select proposal...</option>
                  {proposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.proposal_number} — {p.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProposalId && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Stop
                  </label>
                  <select
                    value={selectedStopId || ''}
                    onChange={(e) => setSelectedStopId(parseInt(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select stop...</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.day_title} — {s.venue_name} ({s.stop_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedEmail(null)}
                disabled={routing}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoute}
                disabled={routing || !selectedProposalId || !selectedStopId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {routing ? 'Routing...' : 'Route to Stop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
