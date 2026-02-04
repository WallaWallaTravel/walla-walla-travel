'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HotelPartner {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  invite_sent_at: string | null;
  registered_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface HotelStats {
  id: string;
  name: string;
  total_bookings: number;
  total_guests: number;
  total_revenue: number;
  pending_payments: number;
}

export default function AdminHotelPartnersPage() {
  const [hotels, setHotels] = useState<HotelPartner[]>([]);
  const [stats, setStats] = useState<HotelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  const [newHotel, setNewHotel] = useState({
    name: '',
    email: '',
    contact_name: '',
    phone: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [hotelsRes, statsRes] = await Promise.all([
        fetch('/api/admin/hotel-partners'),
        fetch('/api/admin/hotel-partners/stats'),
      ]);

      const hotelsData = await hotelsRes.json();
      if (hotelsData.success) {
        setHotels(hotelsData.data);
      }

      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data.hotels || []);
      }
    } catch {
      setError('Failed to load hotel partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/admin/hotel-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHotel),
      });

      const data = await response.json();
      if (data.success) {
        setHotels([...hotels, data.data]);
        setShowCreateModal(false);
        setNewHotel({ name: '', email: '', contact_name: '', phone: '', notes: '' });
      } else {
        setError(data.error || 'Failed to create hotel');
      }
    } catch {
      setError('Failed to create hotel');
    }
  };

  const handleSendInvite = async (hotelId: string) => {
    setSendingInvite(hotelId);
    try {
      const response = await fetch(`/api/admin/hotel-partners/${hotelId}/invite`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        // Refresh to update invite status
        fetchData();
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch {
      setError('Failed to send invite');
    } finally {
      setSendingInvite(null);
    }
  };

  const handleToggleActive = async (hotelId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/hotel-partners/${hotelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      const data = await response.json();
      if (data.success) {
        setHotels(hotels.map(h => h.id === hotelId ? { ...h, is_active: !isActive } : h));
      }
    } catch {
      setError('Failed to update hotel');
    }
  };

  const getStatus = (hotel: HotelPartner) => {
    if (!hotel.is_active) return { label: 'Inactive', color: 'bg-slate-100 text-slate-600' };
    if (hotel.registered_at) return { label: 'Active', color: 'bg-green-100 text-green-700' };
    if (hotel.invite_sent_at) return { label: 'Invited', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Pending', color: 'bg-blue-100 text-blue-700' };
  };

  const getHotelStats = (hotelId: string) => {
    return stats.find(s => s.id === hotelId);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#8B1538] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotel Partners</h1>
          <p className="text-slate-600">Manage hotels that can book shared tours for their guests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Hotel
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/admin" className="text-[#8B1538] hover:underline">
          ← Back to Admin
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-800 underline">Dismiss</button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Hotels</p>
          <p className="text-2xl font-bold text-slate-900">{hotels.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Active Partners</p>
          <p className="text-2xl font-bold text-green-600">
            {hotels.filter(h => h.is_active && h.registered_at).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Bookings</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.reduce((sum, s) => sum + s.total_bookings, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">
            ${stats.reduce((sum, s) => sum + s.total_revenue, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Hotel</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Contact</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Bookings</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Revenue</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {hotels.map((hotel) => {
              const status = getStatus(hotel);
              const hotelStats = getHotelStats(hotel.id);

              return (
                <tr key={hotel.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{hotel.name}</p>
                    <p className="text-sm text-slate-500">{hotel.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{hotel.contact_name || '—'}</p>
                    <p className="text-sm text-slate-500">{hotel.phone || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {hotel.registered_at && (
                      <p className="text-xs text-slate-500 mt-1">Since {formatDate(hotel.registered_at)}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{hotelStats?.total_bookings || 0}</p>
                    <p className="text-sm text-slate-500">{hotelStats?.total_guests || 0} guests</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      ${(hotelStats?.total_revenue || 0).toLocaleString()}
                    </p>
                    {(hotelStats?.pending_payments || 0) > 0 && (
                      <p className="text-sm text-amber-600">{hotelStats?.pending_payments} pending</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!hotel.registered_at && hotel.is_active && (
                        <button
                          onClick={() => handleSendInvite(hotel.id)}
                          disabled={sendingInvite === hotel.id}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
                        >
                          {sendingInvite === hotel.id ? 'Sending...' : hotel.invite_sent_at ? 'Resend Invite' : 'Send Invite'}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(hotel.id, hotel.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          hotel.is_active
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {hotel.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {hotels.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No hotel partners yet. Click "Add Hotel" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Hotel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Hotel Partner</h2>

            <form onSubmit={handleCreateHotel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  value={newHotel.name}
                  onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                  placeholder="The Marcus Whitman Hotel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newHotel.email}
                  onChange={(e) => setNewHotel({ ...newHotel, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                  placeholder="concierge@hotel.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={newHotel.contact_name}
                  onChange={(e) => setNewHotel({ ...newHotel, contact_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newHotel.phone}
                  onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                  placeholder="(509) 555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newHotel.notes}
                  onChange={(e) => setNewHotel({ ...newHotel, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
                  rows={3}
                  placeholder="Internal notes about this partner..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37]"
                >
                  Add Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
