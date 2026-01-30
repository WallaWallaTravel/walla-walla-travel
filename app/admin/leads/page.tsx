'use client';

/**
 * Unified Leads Page
 * Consolidates Consultations + Corporate Requests into a single inbox
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// Types for consultations
interface Consultation {
  id: number;
  type: 'consultation';
  share_code: string;
  title: string;
  trip_type: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  dates_flexible: boolean;
  expected_guests: number;
  status: string;
  handoff_requested_at: string;
  handoff_notes: string | null;
  assigned_staff_id: number | null;
  assigned_staff_name: string | null;
  converted_to_booking_id: number | null;
  created_at: string;
  preferences: {
    transportation?: string;
    pace?: string;
    budget?: string;
  } | null;
  winery_count: string;
  total_stops: string;
}

// Types for corporate requests
interface CorporateRequest {
  id: number;
  type: 'corporate';
  request_number: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  party_size: number;
  event_type: string;
  description: string;
  special_requirements: string;
  budget_range: string;
  preferred_dates: string[];
  status: string;
  created_at: string;
  ai_confidence_score: number;
}

type Lead = (Consultation & { type: 'consultation' }) | (CorporateRequest & { type: 'corporate' });
type TabType = 'all' | 'consultations' | 'corporate';

interface Counts {
  consultations: { pending: number; in_progress: number; completed: number; total: number };
  corporate: { pending: number; responded: number; converted: number; total: number };
}

export default function UnifiedLeadsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [corporateRequests, setCorporateRequests] = useState<CorporateRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({
    consultations: { pending: 0, in_progress: 0, completed: 0, total: 0 },
    corporate: { pending: 0, responded: 0, converted: 0, total: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchAllLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch both in parallel
      const [consultationsRes, corporateRes] = await Promise.all([
        fetch('/api/admin/consultations?status=all'),
        fetch('/api/corporate-request'),
      ]);

      if (consultationsRes.ok) {
        const data = await consultationsRes.json();
        const items = (data.consultations || []).map((c: Consultation) => ({ ...c, type: 'consultation' as const }));
        setConsultations(items);
        setCounts(prev => ({
          ...prev,
          consultations: data.counts || { pending: 0, in_progress: 0, completed: 0, total: 0 },
        }));
      }

      if (corporateRes.ok) {
        const data = await corporateRes.json();
        const items = (data.requests || []).map((r: CorporateRequest) => ({ ...r, type: 'corporate' as const }));
        setCorporateRequests(items);
        // Count corporate requests by status
        const pending = items.filter((r: CorporateRequest) => r.status === 'pending').length;
        const responded = items.filter((r: CorporateRequest) => r.status === 'responded').length;
        const converted = items.filter((r: CorporateRequest) => r.status === 'converted').length;
        setCounts(prev => ({
          ...prev,
          corporate: { pending, responded, converted, total: items.length },
        }));
      }
    } catch (error) {
      logger.error('Failed to fetch leads', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLeads();
    const interval = setInterval(fetchAllLeads, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchAllLeads]);

  // Combine and sort all leads by date
  const getAllLeads = (): Lead[] => {
    const all: Lead[] = [
      ...consultations.map(c => ({ ...c, type: 'consultation' as const })),
      ...corporateRequests.map(r => ({ ...r, type: 'corporate' as const })),
    ];
    return all.sort((a, b) => {
      const dateA = a.type === 'consultation' ? a.handoff_requested_at : a.created_at;
      const dateB = b.type === 'consultation' ? b.handoff_requested_at : b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  };

  const getDisplayLeads = (): Lead[] => {
    switch (activeTab) {
      case 'consultations':
        return consultations.map(c => ({ ...c, type: 'consultation' as const }));
      case 'corporate':
        return corporateRequests.map(r => ({ ...r, type: 'corporate' as const }));
      default:
        return getAllLeads();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Flexible';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getLeadName = (lead: Lead): string => {
    if (lead.type === 'consultation') {
      return lead.owner_name || 'Anonymous';
    }
    return lead.company_name || lead.contact_name;
  };

  const getLeadEmail = (lead: Lead): string | null => {
    if (lead.type === 'consultation') {
      return lead.owner_email;
    }
    return lead.contact_email;
  };

  const getLeadPhone = (lead: Lead): string | null => {
    if (lead.type === 'consultation') {
      return lead.owner_phone;
    }
    return lead.contact_phone;
  };

  const getLeadDate = (lead: Lead): string => {
    if (lead.type === 'consultation') {
      return lead.handoff_requested_at;
    }
    return lead.created_at;
  };

  const getLeadGuestCount = (lead: Lead): number => {
    if (lead.type === 'consultation') {
      return lead.expected_guests;
    }
    return lead.party_size;
  };

  const getStatusBadge = (lead: Lead) => {
    if (lead.type === 'consultation') {
      if (lead.converted_to_booking_id) {
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Booked</span>;
      }
      if (lead.status === 'handed_off' && lead.assigned_staff_id) {
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">In Progress</span>;
      }
      if (lead.status === 'handed_off') {
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">New</span>;
      }
      return <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-full">{lead.status}</span>;
    } else {
      const colors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-800',
        responded: 'bg-blue-100 text-blue-800',
        converted: 'bg-green-100 text-green-800',
        declined: 'bg-slate-100 text-slate-800',
      };
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[lead.status] || 'bg-slate-100 text-slate-800'}`}>
          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
        </span>
      );
    }
  };

  const getTypeBadge = (lead: Lead) => {
    if (lead.type === 'consultation') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Trip Request</span>;
    }
    return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">Corporate</span>;
  };

  const totalPending = counts.consultations.pending + counts.corporate.pending;
  const totalLeads = counts.consultations.total + counts.corporate.total;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All Leads', count: totalLeads },
    { key: 'consultations', label: 'Trip Requests', count: counts.consultations.total },
    { key: 'corporate', label: 'Corporate', count: counts.corporate.total },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-slate-600 mt-1">
          All incoming inquiries from trip requests and corporate events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-900">{totalPending}</div>
          <div className="text-sm text-amber-700">New Leads</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-900">{counts.consultations.total}</div>
          <div className="text-sm text-purple-700">Trip Requests</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-indigo-900">{counts.corporate.total}</div>
          <div className="text-sm text-indigo-700">Corporate</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-900">
            {counts.consultations.completed + counts.corporate.converted}
          </div>
          <div className="text-sm text-green-600">Converted</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#1E3A5F] rounded-full mx-auto" />
          <p className="text-slate-500 mt-4">Loading leads...</p>
        </div>
      ) : getDisplayLeads().length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No leads found</h3>
          <p className="text-slate-600">
            {activeTab === 'all'
              ? "No leads yet. They'll appear here when customers submit requests."
              : `No ${activeTab === 'consultations' ? 'trip requests' : 'corporate inquiries'} found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {getDisplayLeads().map(lead => (
            <div
              key={`${lead.type}-${lead.id}`}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getTypeBadge(lead)}
                      {getStatusBadge(lead)}
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(getLeadDate(lead))}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                      {getLeadName(lead)}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                      {getLeadEmail(lead) && (
                        <a
                          href={`mailto:${getLeadEmail(lead)}`}
                          className="flex items-center gap-1 text-[#1E3A5F] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <span>✉️</span>
                          {getLeadEmail(lead)}
                        </a>
                      )}
                      {getLeadPhone(lead) && (
                        <a
                          href={`tel:${getLeadPhone(lead)}`}
                          className="flex items-center gap-1 text-[#1E3A5F] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <span>📞</span>
                          {getLeadPhone(lead)}
                        </a>
                      )}
                      <span className="flex items-center gap-1">
                        <span>👥</span>
                        {getLeadGuestCount(lead)} guest{getLeadGuestCount(lead) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lead.type === 'consultation' && (
                      <>
                        <Link
                          href={`/my-trips/${lead.share_code}`}
                          target="_blank"
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          View Trip
                        </Link>
                        <Link
                          href={`/admin/trip-proposals/new?consultationId=${lead.id}`}
                          className="px-3 py-2 bg-[#1E3A5F] hover:bg-[#152a45] text-white text-sm font-medium rounded-lg transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          Create Proposal
                        </Link>
                      </>
                    )}
                    {lead.type === 'corporate' && (
                      <>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          Details
                        </button>
                        <Link
                          href={`/admin/trip-proposals/new?corporateId=${lead.id}`}
                          className="px-3 py-2 bg-[#1E3A5F] hover:bg-[#152a45] text-white text-sm font-medium rounded-lg transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          Create Proposal
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Extra details based on type */}
                {lead.type === 'consultation' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500">Type</div>
                      <div className="text-sm font-medium text-slate-900">
                        {lead.trip_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Dates</div>
                      <div className="text-sm font-medium text-slate-900">
                        {lead.dates_flexible ? 'Flexible' : formatDate(lead.start_date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Wineries</div>
                      <div className="text-sm font-medium text-slate-900">{lead.winery_count || 0} saved</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Assigned</div>
                      <div className="text-sm font-medium text-slate-900">{lead.assigned_staff_name || '—'}</div>
                    </div>
                  </div>
                )}

                {lead.type === 'corporate' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500">Event Type</div>
                      <div className="text-sm font-medium text-slate-900 capitalize">
                        {lead.event_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Budget</div>
                      <div className="text-sm font-medium text-slate-900">{lead.budget_range || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Request #</div>
                      <div className="text-sm font-medium text-slate-900">{lead.request_number}</div>
                    </div>
                    {lead.ai_confidence_score > 0 && (
                      <div>
                        <div className="text-xs text-slate-500">AI Confidence</div>
                        <div className="text-sm font-medium text-slate-900">
                          {(lead.ai_confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes preview for consultations */}
                {lead.type === 'consultation' && lead.handoff_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Customer Notes</div>
                    <p className="text-sm text-slate-700 line-clamp-2">{lead.handoff_notes}</p>
                  </div>
                )}

                {/* Description preview for corporate */}
                {lead.type === 'corporate' && lead.description && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Description</div>
                    <p className="text-sm text-slate-700 line-clamp-2">{lead.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Corporate Detail Modal */}
      {selectedLead && selectedLead.type === 'corporate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedLead(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Corporate Request Details</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Company</div>
                    <div className="font-medium">{selectedLead.company_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Contact</div>
                    <div className="font-medium">{selectedLead.contact_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Email</div>
                    <a href={`mailto:${selectedLead.contact_email}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {selectedLead.contact_email}
                    </a>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Phone</div>
                    <a href={`tel:${selectedLead.contact_phone}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {selectedLead.contact_phone || '—'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Event Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Event Type</div>
                    <div className="font-medium capitalize">{selectedLead.event_type.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Party Size</div>
                    <div className="font-medium">{selectedLead.party_size} guests</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Budget Range</div>
                    <div className="font-medium">{selectedLead.budget_range || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Request #</div>
                    <div className="font-medium">{selectedLead.request_number}</div>
                  </div>
                </div>
              </div>

              {/* Preferred Dates */}
              {selectedLead.preferred_dates && selectedLead.preferred_dates.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Preferred Dates</h4>
                  <div className="text-slate-700">
                    {typeof selectedLead.preferred_dates === 'string'
                      ? selectedLead.preferred_dates
                      : selectedLead.preferred_dates.join(', ')}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedLead.description && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedLead.description}</p>
                  </div>
                </div>
              )}

              {/* Special Requirements */}
              {selectedLead.special_requirements && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Special Requirements</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedLead.special_requirements}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <a
                  href={`mailto:${selectedLead.contact_email}`}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-center font-medium rounded-lg transition-colors"
                >
                  Email Customer
                </a>
                <Link
                  href={`/admin/trip-proposals/new?corporateId=${selectedLead.id}`}
                  className="flex-1 px-4 py-3 bg-[#1E3A5F] hover:bg-[#152a45] text-white text-center font-medium rounded-lg transition-colors"
                >
                  Create Proposal
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
