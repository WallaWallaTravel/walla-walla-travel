'use client';

/**
 * Bookings Management Page
 *
 * View, filter, and manage all bookings
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  status: string;
  total_price: number;
  brand_name: string | null;
  driver_name: string | null;
  created_at: string;
}

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(statusFilter);

  useEffect(() => {
    setActiveFilter(statusFilter);
    loadBookings(statusFilter);
  }, [statusFilter]);

  const loadBookings = async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', status);
      }
      const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        setBookings(result.data?.bookings || []);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (status: string) => {
    setActiveFilter(status);
    if (status === 'all') {
      router.push('/admin/bookings');
    } else {
      router.push(`/admin/bookings?status=${status}`);
    }
  };

  const handleRowClick = (bookingId: number) => {
    router.push(`/admin/bookings/${bookingId}`);
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy-700 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeFilter === 'all'
              ? 'All Bookings'
              : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Bookings`}
          </h1>
          <p className="text-slate-500 mt-1">Manage all tour bookings and reservations</p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="bg-[#1E3A5F] hover:bg-[#1A3354] text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          + New Booking
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              activeFilter === status
                ? status === 'pending'
                  ? 'bg-[#A5632B] text-white'
                  : status === 'confirmed'
                    ? 'bg-emerald-600 text-white'
                    : status === 'completed'
                      ? 'bg-[#1E3A5F] text-white'
                      : status === 'cancelled'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2 opacity-75">
                ({bookings.filter(b => status === 'all' || b.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-[#A5632B] mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-[#334E68] mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Booking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tour Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Party
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No bookings yet. Create your first booking to get started.
                  </td>
                </tr>
              ) : (
                bookings.map(booking => (
                  <tr
                    key={booking.id}
                    onClick={() => handleRowClick(booking.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#1E3A5F]">
                        #{booking.booking_number}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {booking.customer_name}
                      </div>
                      <div className="text-xs text-slate-400">{booking.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {new Date(booking.tour_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400">{booking.start_time}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {booking.party_size}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {booking.brand_name || 'WWT'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {booking.driver_name ? (
                        <span className="text-slate-900">{booking.driver_name}</span>
                      ) : (
                        <span className="text-[#A5632B] font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs font-medium rounded ${
                          booking.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : booking.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : booking.status === 'completed'
                                ? 'bg-[#D9E2EC] text-[#1E3A5F]'
                                : booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                      ${parseFloat(String(booking.total_price) || '0').toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading bookings...</div>}>
      <BookingsPageContent />
    </Suspense>
  );
}
