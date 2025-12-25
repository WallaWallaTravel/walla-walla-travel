'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

/**
 * Admin Shared Tour Detail Page
 *
 * View and manage a specific shared tour:
 * - Tour details and status
 * - Guest manifest
 * - Ticket management
 * - Check-in functionality
 */

interface Tour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  description: string | null;
  meeting_location: string | null;
  wineries_preview: string[] | null;
  max_guests: number;
  min_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  status: string;
  is_published: boolean;
  tickets_sold: number;
  spots_available: number;
  revenue: number;
  minimum_met: boolean;
  accepting_bookings: boolean;
  driver_id: string | null;
  vehicle_id: string | null;
  notes: string | null;
}

interface Ticket {
  id: string;
  ticket_number: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  guest_names: string[] | null;
  includes_lunch: boolean;
  price_per_person: number;
  total_amount: number;
  payment_status: string;
  status: string;
  check_in_at: string | null;
  dietary_restrictions: string | null;
  special_requests: string | null;
  created_at: string;
}

export default function AdminTourDetailPage({ params }: { params: Promise<{ tour_id: string }> }) {
  const { tour_id } = use(params);

  const [tour, setTour] = useState<Tour | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'manifest' | 'details'>('tickets');

  useEffect(() => {
    fetchTourDetails();
  }, [tour_id]);

  const fetchTourDetails = async () => {
    try {
      const response = await fetch(`/api/admin/shared-tours/${tour_id}`);
      const data = await response.json();
      if (data.success) {
        setTour(data.data.tour);
        setTickets(data.data.tickets);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load tour details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/admin/shared-tours/tickets/${ticketId}/check-in`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchTourDetails();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to check in ticket');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'full':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-slate-100 text-slate-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'attended':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Build manifest from tickets
  const buildManifest = () => {
    const manifest: { name: string; ticket: Ticket; isMain: boolean }[] = [];

    tickets
      .filter(t => t.status === 'confirmed' && t.payment_status === 'paid')
      .forEach(ticket => {
        // Add main customer
        manifest.push({ name: ticket.customer_name, ticket, isMain: true });

        // Add additional guests
        if (ticket.guest_names) {
          ticket.guest_names.forEach(name => {
            if (name.trim()) {
              manifest.push({ name, ticket, isMain: false });
            }
          });
        }
      });

    return manifest;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tour details...</p>
        </div>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/admin/shared-tours"
            className="text-[#E07A5F] hover:underline"
          >
            Back to Tours
          </Link>
        </div>
      </div>
    );
  }

  if (!tour) return null;

  const manifest = buildManifest();
  const lunchCount = tickets
    .filter(t => t.status === 'confirmed' && t.payment_status === 'paid' && t.includes_lunch)
    .reduce((sum, t) => sum + t.ticket_count, 0);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin/shared-tours" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shared Tours
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{tour.title}</h1>
              <p className="text-slate-600">{formatDate(tour.tour_date)} at {formatTime(tour.start_time)}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(tour.status)}`}>
              {tour.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Tickets Sold</div>
            <div className="text-2xl font-bold text-slate-900">
              {tour.tickets_sold}<span className="text-base font-normal text-slate-500">/{tour.max_guests}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Spots Left</div>
            <div className="text-2xl font-bold text-slate-900">{tour.spots_available}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Revenue</div>
            <div className="text-2xl font-bold text-green-600">${tour.revenue.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">With Lunch</div>
            <div className="text-2xl font-bold text-slate-900">{lunchCount}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Minimum Met</div>
            <div className={`text-2xl font-bold ${tour.minimum_met ? 'text-green-600' : 'text-amber-600'}`}>
              {tour.minimum_met ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              {(['tickets', 'manifest', 'details'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#E07A5F] text-[#E07A5F]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'tickets' && ` (${tickets.length})`}
                  {tab === 'manifest' && ` (${manifest.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="p-6">
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No tickets purchased yet
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900">{ticket.ticket_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.payment_status)}`}>
                              {ticket.payment_status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-lg font-medium text-slate-900">{ticket.customer_name}</p>
                          <p className="text-sm text-slate-600">{ticket.customer_email}</p>
                          {ticket.customer_phone && (
                            <p className="text-sm text-slate-600">{ticket.customer_phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {ticket.ticket_count} ticket{ticket.ticket_count > 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-slate-600">
                            ${ticket.total_amount.toFixed(2)}
                          </p>
                          {ticket.includes_lunch && (
                            <span className="text-xs text-green-600">Lunch included</span>
                          )}
                        </div>
                      </div>

                      {ticket.guest_names && ticket.guest_names.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-slate-500 mb-1">Other guests:</p>
                          <div className="flex flex-wrap gap-2">
                            {ticket.guest_names.filter(n => n.trim()).map((name, idx) => (
                              <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(ticket.dietary_restrictions || ticket.special_requests) && (
                        <div className="bg-amber-50 rounded p-3 mb-3">
                          {ticket.dietary_restrictions && (
                            <p className="text-sm">
                              <span className="font-medium text-amber-800">Dietary:</span>{' '}
                              <span className="text-amber-700">{ticket.dietary_restrictions}</span>
                            </p>
                          )}
                          {ticket.special_requests && (
                            <p className="text-sm">
                              <span className="font-medium text-amber-800">Requests:</span>{' '}
                              <span className="text-amber-700">{ticket.special_requests}</span>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Booked {formatDateTime(ticket.created_at)}
                        </span>
                        {ticket.status === 'confirmed' && ticket.payment_status === 'paid' && !ticket.check_in_at && (
                          <button
                            onClick={() => handleCheckIn(ticket.id)}
                            className="px-4 py-1.5 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                          >
                            Check In
                          </button>
                        )}
                        {ticket.check_in_at && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Checked in {formatDateTime(ticket.check_in_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manifest Tab */}
          {activeTab === 'manifest' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {manifest.length} guest{manifest.length !== 1 ? 's' : ''} • {lunchCount} with lunch
                </p>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Manifest
                </button>
              </div>

              {manifest.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No confirmed guests yet
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Guest Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Ticket</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Lunch</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Dietary</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Checked In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifest.map((guest, idx) => (
                      <tr key={`${guest.ticket.id}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{guest.name}</span>
                          {guest.isMain && (
                            <span className="ml-2 text-xs text-[#E07A5F]">Primary</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{guest.ticket.ticket_number}</td>
                        <td className="px-4 py-3 text-center">
                          {guest.ticket.includes_lunch ? (
                            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {guest.isMain && guest.ticket.dietary_restrictions || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {guest.ticket.check_in_at ? (
                            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Tour Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-slate-500">Date</dt>
                      <dd className="font-medium text-slate-900">{formatDate(tour.tour_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500">Time</dt>
                      <dd className="font-medium text-slate-900">{formatTime(tour.start_time)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500">Duration</dt>
                      <dd className="font-medium text-slate-900">{tour.duration_hours} hours</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500">Capacity</dt>
                      <dd className="font-medium text-slate-900">{tour.min_guests} - {tour.max_guests} guests</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500">Meeting Location</dt>
                      <dd className="font-medium text-slate-900">{tour.meeting_location || 'Not specified'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Pricing</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-slate-500">Base Price</dt>
                      <dd className="font-medium text-slate-900">${tour.base_price_per_person}/person</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-slate-500">With Lunch</dt>
                      <dd className="font-medium text-slate-900">${tour.lunch_price_per_person}/person</dd>
                    </div>
                  </dl>

                  {tour.wineries_preview && tour.wineries_preview.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-slate-900 mb-2">Wineries</h3>
                      <div className="flex flex-wrap gap-2">
                        {tour.wineries_preview.map((winery, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700">
                            {winery}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {tour.notes && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-slate-900 mb-2">Admin Notes</h3>
                      <p className="text-slate-600 bg-slate-50 rounded p-3">{tour.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
