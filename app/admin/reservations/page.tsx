"use client";

/**
 * Admin Reservations Dashboard
 * Manage Reserve & Refine bookings
 */

import { useState, useEffect } from 'react';

interface Reservation {
  id: number;
  reservation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  preferred_date: string;
  alternate_date?: string;
  event_type: string;
  special_requests?: string;
  deposit_amount: number;
  deposit_paid: boolean;
  payment_method: string;
  status: string;
  consultation_deadline: string;
  contacted_at?: string;
  created_at: string;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'confirmed'>('all');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const response = await fetch('/api/admin/reservations');
      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations);
      }
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsContacted = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reservations/${id}/contact`, {
        method: 'POST'
      });
      
      if (response.ok) {
        loadReservations();
      }
    } catch (error) {
      console.error('Failed to mark as contacted:', error);
    }
  };

  const filtered = reservations.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (deadline: string, contacted: boolean) => {
    if (contacted) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reserve & Refine Bookings</h1>
              <p className="text-gray-600 mt-1">Manage customer reservations waiting for consultation</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{reservations.length}</div>
              <div className="text-sm text-gray-600">Total Reservations</div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-4">
            {[
              { key: 'all', label: 'All', count: reservations.length },
              { key: 'pending', label: 'Pending Contact', count: reservations.filter(r => r.status === 'pending').length },
              { key: 'contacted', label: 'Contacted', count: reservations.filter(r => r.status === 'contacted').length },
              { key: 'confirmed', label: 'Confirmed', count: reservations.filter(r => r.status === 'confirmed').length }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Reservations</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No reservations yet. When customers use Reserve & Refine, they\'ll appear here.'
                : `No ${filter} reservations.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reservation => {
              const overdue = isOverdue(reservation.consultation_deadline, !!reservation.contacted_at);
              
              return (
                <div
                  key={reservation.id}
                  className={`bg-white rounded-lg shadow-md p-6 ${
                    overdue ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {reservation.reservation_number}
                      </h3>
                      <p className="text-gray-600">{reservation.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {overdue && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          ⚠️ OVERDUE
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(reservation.status)}`}>
                        {reservation.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Contact</div>
                      <div className="text-sm">
                        <div>{reservation.customer_email}</div>
                        <div>{reservation.customer_phone}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Tour Details</div>
                      <div className="text-sm">
                        <div><strong>{reservation.party_size} guests</strong></div>
                        <div>{new Date(reservation.preferred_date).toLocaleDateString()}</div>
                        <div className="capitalize">{reservation.event_type.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Deposit</div>
                      <div className="text-sm">
                        <div><strong>${reservation.deposit_amount}</strong> via {reservation.payment_method}</div>
                        <div className={reservation.deposit_paid ? 'text-green-600' : 'text-yellow-600'}>
                          {reservation.deposit_paid ? '✓ Paid' : '⏳ Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {reservation.special_requests && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="text-sm font-semibold text-gray-900 mb-1">Customer Notes:</div>
                      <div className="text-sm text-gray-700">{reservation.special_requests}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <div>Created: {new Date(reservation.created_at).toLocaleString()}</div>
                      <div>
                        Call deadline: <strong>{new Date(reservation.consultation_deadline).toLocaleString()}</strong>
                      </div>
                      {reservation.contacted_at && (
                        <div className="text-green-600">
                          ✓ Contacted: {new Date(reservation.contacted_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`mailto:${reservation.customer_email}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        📧 Email
                      </a>
                      <a
                        href={`tel:${reservation.customer_phone}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        📞 Call
                      </a>
                      {reservation.status === 'pending' && (
                        <button
                          onClick={() => markAsContacted(reservation.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          ✓ Mark Contacted
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


