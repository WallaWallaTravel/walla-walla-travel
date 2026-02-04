'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Admin Shared Tours Management Page
 *
 * Manage shared tour schedule:
 * - View all upcoming tours with availability
 * - Create new tour dates
 * - View tickets and guest manifest
 * - Cancel tours
 */

interface SharedTour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  description: string | null;
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

interface VehicleInfo {
  id: number;
  name: string;
  capacity: number;
  available: boolean;
}

interface CreateTourForm {
  tour_date: string;
  start_time: string;
  duration_hours: number;
  max_guests: number;
  min_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  title: string;
  description: string;
  is_published: boolean;
  notes: string;
  vehicle_id: number | null;
}

export default function AdminSharedToursPage() {
  const [tours, setTours] = useState<SharedTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_selectedTour, _setSelectedTour] = useState<SharedTour | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [availableVehicles, setAvailableVehicles] = useState<VehicleInfo[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleMap, setVehicleMap] = useState<Record<number, string>>({});

  const [createForm, setCreateForm] = useState<CreateTourForm>({
    tour_date: '',
    start_time: '10:00',
    duration_hours: 6,
    max_guests: 14,
    min_guests: 2,
    base_price_per_person: 95,
    lunch_price_per_person: 115,
    title: 'Walla Walla Wine Tour Experience',
    description: '',
    is_published: true,
    notes: '',
    vehicle_id: null,
  });

  useEffect(() => {
    fetchTours();
    fetchVehicleMap();
  }, []);

  // Fetch available vehicles when date/time/duration changes
  useEffect(() => {
    if (createForm.tour_date && createForm.start_time) {
      fetchAvailableVehicles();
    }
  }, [createForm.tour_date, createForm.start_time, createForm.duration_hours]);

  const fetchVehicleMap = async () => {
    try {
      // Fetch all vehicles once to build a lookup map
      const response = await fetch('/api/admin/shared-tours/available-vehicles?date=' + new Date().toISOString().split('T')[0]);
      const data = await response.json();
      if (data.success) {
        const map: Record<number, string> = {};
        data.data.forEach((v: VehicleInfo) => {
          map[v.id] = v.name;
        });
        setVehicleMap(map);
      }
    } catch {
      // Ignore - vehicle names will just show IDs
    }
  };

  const fetchAvailableVehicles = async () => {
    if (!createForm.tour_date) return;

    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams({
        date: createForm.tour_date,
        start_time: createForm.start_time + ':00',
        duration_hours: String(createForm.duration_hours),
      });
      const response = await fetch(`/api/admin/shared-tours/available-vehicles?${params}`);
      const data = await response.json();
      if (data.success) {
        setAvailableVehicles(data.data);
        // Auto-select the largest available vehicle if none selected
        if (!createForm.vehicle_id) {
          const available = data.data.filter((v: VehicleInfo) => v.available);
          if (available.length > 0) {
            // Sort by capacity descending, pick largest
            const best = available.sort((a: VehicleInfo, b: VehicleInfo) => b.capacity - a.capacity)[0];
            setCreateForm(prev => ({
              ...prev,
              vehicle_id: best.id,
              max_guests: best.capacity,
            }));
          }
        }
      }
    } catch {
      setAvailableVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/admin/shared-tours');
      const data = await response.json();
      if (data.success) {
        setTours(data.data);
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to load tours');
        setError(errorMessage);
      }
    } catch (_err) {
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTour = async () => {
    try {
      const response = await fetch('/api/admin/shared-tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          vehicle_id: createForm.vehicle_id || undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        fetchTours();
        setCreateForm({
          tour_date: '',
          start_time: '10:00',
          duration_hours: 6,
          max_guests: 14,
          min_guests: 2,
          base_price_per_person: 95,
          lunch_price_per_person: 115,
          title: 'Walla Walla Wine Tour Experience',
          description: '',
          is_published: true,
          notes: '',
          vehicle_id: null,
        });
        setAvailableVehicles([]);
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to create tour');
        setError(errorMessage);
      }
    } catch (_err) {
      setError('Failed to create tour');
    }
  };

  const handleCancelTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to cancel this tour? Customers will need to be notified.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/shared-tours/${tourId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        fetchTours();
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to cancel tour');
        setError(errorMessage);
      }
    } catch (_err) {
      setError('Failed to cancel tour');
    }
  };

  const handleTogglePublish = async (tour: SharedTour) => {
    try {
      const response = await fetch(`/api/admin/shared-tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !tour.is_published }),
      });
      const data = await response.json();

      if (data.success) {
        fetchTours();
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to update tour');
        setError(errorMessage);
      }
    } catch (_err) {
      setError('Failed to update tour');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredTours = tours.filter(tour => {
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'upcoming') return tour.tour_date >= today;
    if (filter === 'past') return tour.tour_date < today;
    return true;
  });

  // Calculate stats
  const upcomingTours = tours.filter(t => t.tour_date >= new Date().toISOString().split('T')[0]);
  const totalTicketsSold = upcomingTours.reduce((sum, t) => sum + t.tickets_sold, 0);
  const totalRevenue = upcomingTours.reduce((sum, t) => sum + t.revenue, 0);
  const confirmedTours = upcomingTours.filter(t => t.minimum_met).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading shared tours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Shared Tours</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tour Date
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 flex items-center justify-between">
            {typeof error === 'object' ? (error as { message?: string })?.message || 'An error occurred' : error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Upcoming Tours</div>
            <div className="text-2xl font-bold text-slate-900">{upcomingTours.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Tickets Sold</div>
            <div className="text-2xl font-bold text-slate-900">{totalTicketsSold}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Confirmed Tours</div>
            <div className="text-2xl font-bold text-green-600">{confirmedTours}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Revenue</div>
            <div className="text-2xl font-bold text-slate-900">${totalRevenue.toFixed(0)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['upcoming', 'all', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#E07A5F] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tours Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Vehicle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Tickets</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Revenue</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Published</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTours.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No tours found
                  </td>
                </tr>
              ) : (
                filteredTours.map(tour => (
                  <tr key={tour.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatDate(tour.tour_date)}</div>
                      <div className="text-sm text-slate-500">{tour.title}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatTime(tour.start_time)}
                    </td>
                    <td className="px-4 py-3">
                      {tour.vehicle_id ? (
                        <span className="text-sm text-slate-700">
                          {vehicleMap[parseInt(tour.vehicle_id)] || `Vehicle ${tour.vehicle_id}`}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tour.status)}`}>
                        {tour.status}
                      </span>
                      {tour.minimum_met && tour.status === 'open' && (
                        <span className="ml-2 text-xs text-green-600">Min met</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-slate-900">{tour.tickets_sold}</span>
                      <span className="text-slate-500">/{tour.max_guests}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium">
                      ${tour.revenue.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTogglePublish(tour)}
                        className={`w-8 h-5 rounded-full transition-colors ${
                          tour.is_published ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            tour.is_published ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/shared-tours/${tour.id}`}
                          className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                        >
                          View
                        </Link>
                        {tour.status !== 'cancelled' && tour.status !== 'completed' && (
                          <button
                            onClick={() => handleCancelTour(tour.id)}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Tour Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Tour Date</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tour Date *
                </label>
                <input
                  type="date"
                  value={createForm.tour_date}
                  onChange={e => setCreateForm(prev => ({ ...prev, tour_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                />
                <p className="text-xs text-slate-500 mt-1">Sun-Wed only</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={createForm.start_time}
                    onChange={e => setCreateForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (hours)
                  </label>
                  <select
                    value={createForm.duration_hours}
                    onChange={e => setCreateForm(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  >
                    {[4, 5, 6, 7, 8].map(h => (
                      <option key={h} value={h}>{h} hours</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle *
                </label>
                {vehiclesLoading ? (
                  <div className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500">
                    Loading vehicles...
                  </div>
                ) : !createForm.tour_date ? (
                  <div className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500">
                    Select a date first to see available vehicles
                  </div>
                ) : availableVehicles.filter(v => v.available).length === 0 ? (
                  <div className="w-full px-4 py-3 border border-red-200 rounded-lg bg-red-50 text-red-700">
                    <p className="font-medium">No vehicles available</p>
                    <p className="text-sm mt-1">All vehicles are already assigned to other tours on this date/time. Please select a different date or time.</p>
                  </div>
                ) : (
                  <select
                    value={createForm.vehicle_id || ''}
                    onChange={e => {
                      const vehicleId = e.target.value ? parseInt(e.target.value) : null;
                      const vehicle = availableVehicles.find(v => v.id === vehicleId);
                      setCreateForm(prev => ({
                        ...prev,
                        vehicle_id: vehicleId,
                        // Auto-update max_guests to vehicle capacity
                        max_guests: vehicle ? vehicle.capacity : prev.max_guests,
                      }));
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  >
                    <option value="">Auto-assign best vehicle</option>
                    {availableVehicles.map(v => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={!v.available}
                      >
                        {v.name} ({v.capacity} guests){!v.available ? ' - Unavailable' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Max guests will be set to vehicle capacity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Guests
                  </label>
                  <input
                    type="number"
                    value={createForm.max_guests}
                    onChange={e => {
                      const newMax = parseInt(e.target.value);
                      const selectedVehicle = availableVehicles.find(v => v.id === createForm.vehicle_id);
                      // Cap to vehicle capacity if vehicle selected
                      const cappedMax = selectedVehicle ? Math.min(newMax, selectedVehicle.capacity) : newMax;
                      setCreateForm(prev => ({ ...prev, max_guests: cappedMax }));
                    }}
                    min={2}
                    max={createForm.vehicle_id ? availableVehicles.find(v => v.id === createForm.vehicle_id)?.capacity || 14 : 14}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  />
                  {createForm.vehicle_id && (
                    <p className="text-xs text-slate-500 mt-1">
                      Limited to vehicle capacity ({availableVehicles.find(v => v.id === createForm.vehicle_id)?.capacity || '?'})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Min Guests
                  </label>
                  <input
                    type="number"
                    value={createForm.min_guests}
                    onChange={e => setCreateForm(prev => ({ ...prev, min_guests: parseInt(e.target.value) }))}
                    min={1}
                    max={14}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Base Price ($/person)
                  </label>
                  <input
                    type="number"
                    value={createForm.base_price_per_person}
                    onChange={e => setCreateForm(prev => ({ ...prev, base_price_per_person: parseFloat(e.target.value) }))}
                    min={0}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    With Lunch ($/person)
                  </label>
                  <input
                    type="number"
                    value={createForm.lunch_price_per_person}
                    onChange={e => setCreateForm(prev => ({ ...prev, lunch_price_per_person: parseFloat(e.target.value) }))}
                    min={0}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
                  placeholder="Internal notes..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={createForm.is_published}
                  onChange={e => setCreateForm(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-[#E07A5F] rounded focus:ring-[#E07A5F]"
                />
                <label htmlFor="is_published" className="text-sm text-slate-700">
                  Publish immediately (visible to customers)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-700 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTour}
                disabled={!createForm.tour_date || (availableVehicles.length > 0 && availableVehicles.filter(v => v.available).length === 0)}
                className="px-6 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Create Tour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
