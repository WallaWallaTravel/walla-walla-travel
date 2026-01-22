'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Consultation {
  id: number;
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

interface Counts {
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, in_progress: 0, completed: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const fetchConsultations = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/consultations?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
        setCounts(data.counts || { pending: 0, in_progress: 0, completed: 0, total: 0 });
      }
    } catch (error) {
      logger.error('Failed to fetch consultations', { error });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchConsultations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchConsultations, 30000);
    return () => clearInterval(interval);
  }, [fetchConsultations]);

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

  const getTripTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wine_tour: 'Wine Tour',
      bachelorette: 'Bachelorette',
      bachelor: 'Bachelor Party',
      corporate: 'Corporate',
      anniversary: 'Anniversary',
      birthday: 'Birthday',
      other: 'Other',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (consultation: Consultation) => {
    if (consultation.converted_to_booking_id) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Booked</span>;
    }
    if (consultation.status === 'handed_off' && consultation.assigned_staff_id) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">In Progress</span>;
    }
    if (consultation.status === 'handed_off') {
      return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">New</span>;
    }
    return <span className="px-2 py-1 bg-stone-100 text-stone-800 text-xs font-medium rounded-full">{consultation.status}</span>;
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'pending', label: 'New Requests', count: counts.pending },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'all', label: 'All', count: counts.total },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Consultation Requests</h1>
        <p className="text-slate-600 mt-1">
          Manage trip planning requests from customers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-900">{counts.pending}</div>
          <div className="text-sm text-amber-700">New Requests</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-900">{counts.in_progress}</div>
          <div className="text-sm text-blue-700">In Progress</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-900">{counts.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900">{counts.total}</div>
          <div className="text-sm text-slate-600">Total All Time</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setIsLoading(true);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-[#8B1538] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                filter === tab.key ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#8B1538] rounded-full mx-auto" />
          <p className="text-slate-500 mt-4">Loading consultations...</p>
        </div>
      ) : consultations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No consultations found</h3>
          <p className="text-slate-600">
            {filter === 'pending'
              ? "No new consultation requests. They'll appear here when customers request help."
              : `No consultations with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map(consultation => (
            <div
              key={consultation.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(consultation)}
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(consultation.handoff_requested_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                      {consultation.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <span>👤</span>
                        {consultation.owner_name || 'Anonymous'}
                      </span>
                      {consultation.owner_email && (
                        <a
                          href={`mailto:${consultation.owner_email}`}
                          className="flex items-center gap-1 text-[#8B1538] hover:underline"
                        >
                          <span>✉️</span>
                          {consultation.owner_email}
                        </a>
                      )}
                      {consultation.owner_phone && (
                        <a
                          href={`tel:${consultation.owner_phone}`}
                          className="flex items-center gap-1 text-[#8B1538] hover:underline"
                        >
                          <span>📞</span>
                          {consultation.owner_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/my-trips/${consultation.share_code}`}
                      target="_blank"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      View Trip
                    </Link>
                    <button
                      onClick={() => setSelectedConsultation(consultation)}
                      className="px-3 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>

                {/* Trip Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500">Type</div>
                    <div className="text-sm font-medium text-slate-900">
                      {getTripTypeLabel(consultation.trip_type)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Dates</div>
                    <div className="text-sm font-medium text-slate-900">
                      {consultation.dates_flexible
                        ? 'Flexible'
                        : consultation.start_date === consultation.end_date || !consultation.end_date
                          ? formatDate(consultation.start_date)
                          : `${formatDate(consultation.start_date)} - ${formatDate(consultation.end_date)}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Guests</div>
                    <div className="text-sm font-medium text-slate-900">
                      {consultation.expected_guests} guest{consultation.expected_guests !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Wineries</div>
                    <div className="text-sm font-medium text-slate-900">
                      {consultation.winery_count || 0} saved
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Assigned To</div>
                    <div className="text-sm font-medium text-slate-900">
                      {consultation.assigned_staff_name || '—'}
                    </div>
                  </div>
                </div>

                {/* Notes Preview */}
                {consultation.handoff_notes && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Customer Notes</div>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {consultation.handoff_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedConsultation(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Consultation Details
              </h2>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Trip Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {selectedConsultation.title}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Trip Type</div>
                    <div className="font-medium">{getTripTypeLabel(selectedConsultation.trip_type)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Expected Guests</div>
                    <div className="font-medium">{selectedConsultation.expected_guests}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Dates</div>
                    <div className="font-medium">
                      {selectedConsultation.dates_flexible
                        ? 'Flexible'
                        : `${formatDate(selectedConsultation.start_date)}${selectedConsultation.end_date && selectedConsultation.end_date !== selectedConsultation.start_date ? ` - ${formatDate(selectedConsultation.end_date)}` : ''}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Wineries Saved</div>
                    <div className="font-medium">{selectedConsultation.winery_count || 0}</div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Customer Contact</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">👤</span>
                    <span>{selectedConsultation.owner_name || 'Not provided'}</span>
                  </div>
                  {selectedConsultation.owner_email && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">✉️</span>
                      <a href={`mailto:${selectedConsultation.owner_email}`} className="text-[#8B1538] hover:underline">
                        {selectedConsultation.owner_email}
                      </a>
                    </div>
                  )}
                  {selectedConsultation.owner_phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">📞</span>
                      <a href={`tel:${selectedConsultation.owner_phone}`} className="text-[#8B1538] hover:underline">
                        {selectedConsultation.owner_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferences */}
              {selectedConsultation.preferences && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Preferences</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedConsultation.preferences.transportation && (
                      <div>
                        <div className="text-sm text-slate-500">Transportation</div>
                        <div className="font-medium capitalize">{selectedConsultation.preferences.transportation}</div>
                      </div>
                    )}
                    {selectedConsultation.preferences.pace && (
                      <div>
                        <div className="text-sm text-slate-500">Pace</div>
                        <div className="font-medium capitalize">{selectedConsultation.preferences.pace}</div>
                      </div>
                    )}
                    {selectedConsultation.preferences.budget && (
                      <div>
                        <div className="text-sm text-slate-500">Budget</div>
                        <div className="font-medium capitalize">{selectedConsultation.preferences.budget}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedConsultation.handoff_notes && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Customer Notes</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedConsultation.handoff_notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Link
                  href={`/my-trips/${selectedConsultation.share_code}`}
                  target="_blank"
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-center font-medium rounded-lg transition-colors"
                >
                  View Full Trip
                </Link>
                <Link
                  href={`/admin/proposals/new?tripId=${selectedConsultation.id}`}
                  className="flex-1 px-4 py-3 bg-[#8B1538] hover:bg-[#722F37] text-white text-center font-medium rounded-lg transition-colors"
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
