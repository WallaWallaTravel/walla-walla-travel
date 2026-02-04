'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Partner Portal - My Bookings
 *
 * Shows all bookings made by the hotel partner
 */

interface Booking {
  id: string;
  ticket_number: string;
  tour_date: string;
  tour_title: string;
  customer_name: string;
  customer_email: string;
  ticket_count: number;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
}

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const hotelData = localStorage.getItem('hotelPartner');
        if (!hotelData) {
          setError('Please log in to view bookings');
          setLoading(false);
          return;
        }

        const hotel = JSON.parse(hotelData);
        const params = new URLSearchParams();
        if (filter === 'pending') params.set('payment_status', 'pending');
        if (filter === 'paid') params.set('payment_status', 'paid');

        const response = await fetch(`/api/partner/shared-tours/bookings?${params}`, {
          headers: { 'x-hotel-id': hotel.id },
        });
        const data = await response.json();

        if (data.success) {
          setBookings(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [filter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (paymentStatus: string, status: string) => {
    if (status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">Cancelled</span>;
    }
    if (paymentStatus === 'paid') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Paid</span>;
    }
    if (paymentStatus === 'pending') {
      return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Awaiting Payment</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">{paymentStatus}</span>;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">My Bookings</h1>
          <p className="text-slate-600">Track bookings made for your guests</p>
        </div>
        <Link
          href="/partner-portal/shared-tours"
          className="px-4 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors text-center"
        >
          Book New Guest
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#E07A5F] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Awaiting Payment' : 'Paid'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600 mb-2">No bookings found.</p>
          <p className="text-sm text-slate-500">
            {filter !== 'all' ? 'Try changing the filter or ' : ''}
            <Link href="/partner-portal/shared-tours" className="text-[#E07A5F] hover:underline">
              book a guest
            </Link>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Guest</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Tour</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Tickets</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Amount</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Booked</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{booking.customer_name}</p>
                        <p className="text-xs text-slate-500">{booking.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-900">{booking.tour_title}</p>
                        <p className="text-xs text-slate-500">{formatDate(booking.tour_date)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{booking.ticket_count}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      ${booking.total_amount?.toFixed(2) || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(booking.payment_status, booking.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(booking.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
