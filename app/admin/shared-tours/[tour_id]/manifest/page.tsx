'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

/**
 * Printable Manifest Page
 *
 * Clean, print-friendly manifest for shared tours with:
 * - Guest list with check-in checkboxes
 * - Lunch order summary for venue
 * - Dietary restrictions highlighted
 */

interface Tour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  meeting_location: string | null;
  max_guests: number;
  driver_id: string | null;
  vehicle_id: string | null;
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
  lunch_selection: string | null;
  guest_lunch_selections: Array<{ guest_name: string; selection: string }> | null;
  payment_status: string;
  status: string;
  check_in_at: string | null;
  dietary_restrictions: string | null;
  special_requests: string | null;
  booked_by_hotel: boolean;
}

interface ManifestGuest {
  name: string;
  ticket: Ticket;
  isMain: boolean;
  lunchSelection: string | null;
}

interface LunchSummary {
  selection: string;
  count: number;
}

export default function ManifestPrintPage({ params }: { params: Promise<{ tour_id: string }> }) {
  const { tour_id } = use(params);

  const [tour, setTour] = useState<Tour | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTourDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/shared-tours/${tour_id}`);
      const data = await response.json();
      if (data.success) {
        setTour(data.data.tour);
        setTickets(data.data.tickets);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to load tour details');
    } finally {
      setLoading(false);
    }
  }, [tour_id]);

  useEffect(() => {
    fetchTourDetails();
  }, [fetchTourDetails]);

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

  // Build manifest from tickets
  const buildManifest = (): ManifestGuest[] => {
    const manifest: ManifestGuest[] = [];

    tickets
      .filter(t => t.status === 'confirmed' && t.payment_status === 'paid')
      .forEach(ticket => {
        manifest.push({
          name: ticket.customer_name,
          ticket,
          isMain: true,
          lunchSelection: ticket.lunch_selection,
        });

        if (ticket.guest_names) {
          ticket.guest_names.forEach(name => {
            if (name.trim()) {
              const guestSelection = ticket.guest_lunch_selections?.find(
                g => g.guest_name === name
              )?.selection || ticket.lunch_selection;

              manifest.push({
                name,
                ticket,
                isMain: false,
                lunchSelection: guestSelection,
              });
            }
          });
        }
      });

    return manifest;
  };

  // Build lunch order summary
  const buildLunchSummary = (): LunchSummary[] => {
    const summary: Record<string, number> = {};

    tickets
      .filter(t => t.status === 'confirmed' && t.payment_status === 'paid' && t.includes_lunch)
      .forEach(ticket => {
        const mainSelection = ticket.lunch_selection || 'No preference';
        summary[mainSelection] = (summary[mainSelection] || 0) + 1;

        if (ticket.guest_lunch_selections) {
          ticket.guest_lunch_selections.forEach(gs => {
            const selection = gs.selection || 'No preference';
            summary[selection] = (summary[selection] || 0) + 1;
          });
        } else if (ticket.guest_names) {
          const additionalGuests = ticket.guest_names.filter(n => n.trim()).length;
          if (additionalGuests > 0) {
            summary[mainSelection] = (summary[mainSelection] || 0) + additionalGuests;
          }
        }
      });

    return Object.entries(summary)
      .map(([selection, count]) => ({ selection, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Get all dietary restrictions
  const getDietaryRestrictions = (): { name: string; restriction: string }[] => {
    const restrictions: { name: string; restriction: string }[] = [];

    tickets
      .filter(t => t.status === 'confirmed' && t.payment_status === 'paid' && t.dietary_restrictions)
      .forEach(ticket => {
        restrictions.push({
          name: ticket.customer_name,
          restriction: ticket.dietary_restrictions!,
        });
      });

    return restrictions;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading manifest...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'Tour not found'}</p>
      </div>
    );
  }

  const manifest = buildManifest();
  const lunchSummary = buildLunchSummary();
  const dietaryRestrictions = getDietaryRestrictions();
  const lunchCount = manifest.filter(g => g.ticket.includes_lunch).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only header */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/admin/shared-tours/${tour_id}`}
            className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tour
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Manifest
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tour Manifest</h1>
              <p className="text-lg font-medium text-slate-700">{tour.title}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">{formatDate(tour.tour_date)}</p>
              <p className="text-slate-600">{formatTime(tour.start_time)} ({tour.duration_hours} hours)</p>
            </div>
          </div>
          {tour.meeting_location && (
            <p className="text-sm text-slate-600 mt-2">
              <span className="font-medium">Meeting:</span> {tour.meeting_location}
            </p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-center">
          <div className="border border-slate-300 rounded p-3">
            <p className="text-2xl font-bold text-slate-900">{manifest.length}</p>
            <p className="text-sm text-slate-600">Total Guests</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-2xl font-bold text-slate-900">{lunchCount}</p>
            <p className="text-sm text-slate-600">With Lunch</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-2xl font-bold text-slate-900">{dietaryRestrictions.length}</p>
            <p className="text-sm text-slate-600">Dietary Notes</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-2xl font-bold text-slate-900">{tickets.filter(t => t.booked_by_hotel).length}</p>
            <p className="text-sm text-slate-600">Hotel Bookings</p>
          </div>
        </div>

        {/* Lunch Order Summary - For Restaurant */}
        {lunchCount > 0 && (
          <div className="mb-6 border-2 border-amber-400 rounded-lg p-4 bg-amber-50 print:bg-white">
            <h2 className="font-bold text-lg text-amber-800 mb-3 flex items-center gap-2">
              🍽️ Lunch Order Summary (for venue)
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {lunchSummary.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-200">
                  <span className="text-slate-700">{item.selection}</span>
                  <span className="font-bold text-lg text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-700 mt-2 font-medium">Total lunches: {lunchCount}</p>
          </div>
        )}

        {/* Dietary Restrictions - Important! */}
        {dietaryRestrictions.length > 0 && (
          <div className="mb-6 border-2 border-red-400 rounded-lg p-4 bg-red-50 print:bg-white">
            <h2 className="font-bold text-lg text-red-800 mb-3">⚠️ Dietary Restrictions</h2>
            <ul className="space-y-1">
              {dietaryRestrictions.map((item, idx) => (
                <li key={idx} className="text-slate-700">
                  <span className="font-medium">{item.name}:</span> {item.restriction}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guest List */}
        <div className="mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-3">Guest List</h2>
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-2 text-left w-8">✓</th>
                <th className="border border-slate-300 px-3 py-2 text-left">#</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Guest Name</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Lunch</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {manifest.map((guest, idx) => (
                <tr key={`${guest.ticket.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    <div className="w-5 h-5 border-2 border-slate-400 rounded"></div>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-300 px-3 py-2">
                    <span className="font-medium text-slate-900">{guest.name}</span>
                    {guest.isMain && (
                      <span className="ml-2 text-xs text-slate-500">(Primary)</span>
                    )}
                    {guest.ticket.booked_by_hotel && guest.isMain && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Hotel</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-sm">
                    {guest.ticket.includes_lunch ? (
                      <span>{guest.lunchSelection || 'Yes'}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-sm text-slate-600">
                    {guest.isMain && guest.ticket.dietary_restrictions}
                    {guest.isMain && guest.ticket.special_requests && (
                      <span className="block text-xs text-slate-500">{guest.ticket.special_requests}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contact Info for Primary Guests */}
        <div className="mb-6 print:break-before-page">
          <h2 className="font-bold text-lg text-slate-900 mb-3">Contact Information</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left">Primary Guest</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Email</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Phone</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Ticket #</th>
                <th className="border border-slate-300 px-3 py-2 text-center">Party Size</th>
              </tr>
            </thead>
            <tbody>
              {tickets
                .filter(t => t.status === 'confirmed' && t.payment_status === 'paid')
                .map((ticket, idx) => (
                  <tr key={ticket.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-3 py-2 font-medium">{ticket.customer_name}</td>
                    <td className="border border-slate-300 px-3 py-2">{ticket.customer_email}</td>
                    <td className="border border-slate-300 px-3 py-2">{ticket.customer_phone || '—'}</td>
                    <td className="border border-slate-300 px-3 py-2">{ticket.ticket_number}</td>
                    <td className="border border-slate-300 px-3 py-2 text-center">{ticket.ticket_count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 pt-4 mt-8 text-sm text-slate-500">
          <p>Printed on {new Date().toLocaleString()}</p>
          <p>Walla Walla Travel • info@wallawalla.travel • (509) 200-8000</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
