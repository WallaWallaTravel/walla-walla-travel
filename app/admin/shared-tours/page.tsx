'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/**
 * Admin Shared Tours Management Page
 *
 * Manage shared tour schedule:
 * - View all upcoming tours with availability
 * - Create new tour dates (single or multiple)
 * - Load presets for quick tour creation
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

interface SharedTourPreset {
  id: number;
  name: string;
  start_time: string;
  duration_hours: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  title: string | null;
  description: string | null;
  max_guests: number;
  min_guests: number;
  is_default: boolean;
  sort_order: number;
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

type DateSelectionMode = 'single' | 'multiple';
type DatePickMode = 'individual' | 'range';

interface BatchCreationResult {
  total: number;
  created: number;
  skipped: { date: string; reason: string }[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
];

export default function AdminSharedToursPage() {
  const [tours, setTours] = useState<SharedTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [availableVehicles, setAvailableVehicles] = useState<VehicleInfo[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleMap, setVehicleMap] = useState<Record<number, string>>({});

  // Presets state
  const [presets, setPresets] = useState<SharedTourPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [showManagePresets, setShowManagePresets] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Multi-date state
  const [dateSelectionMode, setDateSelectionMode] = useState<DateSelectionMode>('single');
  const [datePickMode, setDatePickMode] = useState<DatePickMode>('range');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([0, 1, 2, 3]); // Sun-Wed

  // Batch creation state
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<BatchCreationResult | null>(null);

  const defaultFormValues: CreateTourForm = {
    tour_date: '',
    start_time: '11:00',
    duration_hours: 6,
    max_guests: 14,
    min_guests: 2,
    base_price_per_person: 95,
    lunch_price_per_person: 115,
    title: 'Shared Wine Tour Experience',
    description: 'This is a great way to experience the valley and meet new people in the process. We\'ve arranged 3 wonderful wineries (and a lunch midday) for you!',
    is_published: true,
    notes: '',
    vehicle_id: null,
  };

  const [createForm, setCreateForm] = useState<CreateTourForm>(defaultFormValues);

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
    fetchTours();
    fetchVehicleMap();
  }, []);

  // Auto-load default preset when presets are fetched
  useEffect(() => {
    if (presets.length > 0 && !selectedPresetId) {
      const defaultPreset = presets.find(p => p.is_default);
      if (defaultPreset) {
        loadPreset(defaultPreset);
      }
    }
  }, [presets, selectedPresetId]);

  // Fetch available vehicles when date/time/duration changes (for single date mode)
  useEffect(() => {
    if (dateSelectionMode === 'single' && createForm.tour_date && createForm.start_time) {
      fetchAvailableVehicles(createForm.tour_date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.tour_date, createForm.start_time, createForm.duration_hours, dateSelectionMode]);

  // Generate dates when range settings change
  useEffect(() => {
    if (dateSelectionMode === 'multiple' && datePickMode === 'range' && rangeStartDate && rangeEndDate) {
      generateDatesFromRange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStartDate, rangeEndDate, selectedDaysOfWeek, dateSelectionMode, datePickMode]);

  const fetchPresets = async () => {
    setPresetsLoading(true);
    try {
      const response = await fetch('/api/admin/shared-tours/presets');
      const data = await response.json();
      if (data.success) {
        setPresets(data.data);
      }
    } catch {
      // Presets are optional, don't show error
    } finally {
      setPresetsLoading(false);
    }
  };

  const loadPreset = (preset: SharedTourPreset) => {
    setSelectedPresetId(preset.id);
    setCreateForm(prev => ({
      ...prev,
      start_time: preset.start_time?.substring(0, 5) || '11:00',
      duration_hours: preset.duration_hours,
      max_guests: preset.max_guests,
      min_guests: preset.min_guests,
      base_price_per_person: preset.base_price_per_person,
      lunch_price_per_person: preset.lunch_price_per_person,
      title: preset.title || prev.title,
      description: preset.description || prev.description,
    }));
  };

  const handleSaveAsPreset = async () => {
    if (!newPresetName.trim()) {
      setError('Please enter a preset name');
      return;
    }

    try {
      const response = await fetch('/api/admin/shared-tours/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName,
          start_time: createForm.start_time,
          duration_hours: createForm.duration_hours,
          max_guests: createForm.max_guests,
          min_guests: createForm.min_guests,
          base_price_per_person: createForm.base_price_per_person,
          lunch_price_per_person: createForm.lunch_price_per_person,
          title: createForm.title,
          description: createForm.description,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchPresets();
        setShowSavePresetModal(false);
        setNewPresetName('');
        setSelectedPresetId(data.data.id);
      } else {
        setError(data.error || 'Failed to save preset');
      }
    } catch {
      setError('Failed to save preset');
    }
  };

  const handleDeletePreset = async (presetId: number) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const response = await fetch(`/api/admin/shared-tours/presets/${presetId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await fetchPresets();
        if (selectedPresetId === presetId) {
          setSelectedPresetId(null);
        }
      } else {
        setError(data.error || 'Failed to delete preset');
      }
    } catch {
      setError('Failed to delete preset');
    }
  };

  const handleSetDefaultPreset = async (presetId: number) => {
    try {
      const response = await fetch(`/api/admin/shared-tours/presets/${presetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchPresets();
      } else {
        setError(data.error || 'Failed to set default preset');
      }
    } catch {
      setError('Failed to set default preset');
    }
  };

  const fetchVehicleMap = async () => {
    try {
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

  const fetchAvailableVehicles = useCallback(async (date: string) => {
    if (!date) return;

    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams({
        date: date,
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
  }, [createForm.start_time, createForm.duration_hours, createForm.vehicle_id]);

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
    } catch {
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const generateDatesFromRange = () => {
    if (!rangeStartDate || !rangeEndDate) return;

    const start = new Date(rangeStartDate + 'T00:00:00');
    const end = new Date(rangeEndDate + 'T00:00:00');
    const dates: string[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (selectedDaysOfWeek.includes(dayOfWeek)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    setSelectedDates(dates);
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setSelectedDates(prev => prev.filter(d => d !== dateToRemove));
  };

  const handleAddIndividualDate = (date: string) => {
    if (!date) return;
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    if (dayOfWeek > 3) {
      setError('Shared tours can only be scheduled on Sunday through Wednesday');
      return;
    }
    if (!selectedDates.includes(date)) {
      setSelectedDates(prev => [...prev, date].sort());
    }
  };

  const handleCreateTour = async () => {
    if (dateSelectionMode === 'multiple' && selectedDates.length > 1) {
      await handleBatchCreateTours();
    } else {
      await handleSingleCreateTour();
    }
  };

  const handleSingleCreateTour = async () => {
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
        handleCloseModal();
        fetchTours();
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to create tour');
        setError(errorMessage);
      }
    } catch {
      setError('Failed to create tour');
    }
  };

  const handleBatchCreateTours = async () => {
    setIsCreatingBatch(true);
    setBatchProgress(0);
    setBatchResult(null);

    const result: BatchCreationResult = {
      total: selectedDates.length,
      created: 0,
      skipped: [],
    };

    for (let i = 0; i < selectedDates.length; i++) {
      const date = selectedDates[i];
      setBatchProgress(Math.round(((i + 1) / selectedDates.length) * 100));

      try {
        const response = await fetch('/api/admin/shared-tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...createForm,
            tour_date: date,
            vehicle_id: undefined, // Let auto-assign for each date
          }),
        });
        const data = await response.json();

        if (data.success) {
          result.created++;
        } else {
          result.skipped.push({
            date,
            reason: data.error || 'Unknown error',
          });
        }
      } catch {
        result.skipped.push({
          date,
          reason: 'Network error',
        });
      }
    }

    setBatchResult(result);
    setIsCreatingBatch(false);
    fetchTours();
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateForm(defaultFormValues);
    setAvailableVehicles([]);
    setDateSelectionMode('single');
    setSelectedDates([]);
    setRangeStartDate('');
    setRangeEndDate('');
    setBatchResult(null);
    setBatchProgress(0);
    // Re-load default preset for next time
    const defaultPreset = presets.find(p => p.is_default);
    if (defaultPreset) {
      loadPreset(defaultPreset);
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
    } catch {
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
    } catch {
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

  // Check if form is valid for submission
  const canSubmit = dateSelectionMode === 'single'
    ? createForm.tour_date && (availableVehicles.length === 0 || availableVehicles.some(v => v.available))
    : selectedDates.length > 0;

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
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Tour Date</h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Batch Result */}
              {batchResult && (
                <div className={`p-4 rounded-lg ${batchResult.skipped.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                  <h3 className={`font-semibold ${batchResult.skipped.length > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                    Batch Creation Complete
                  </h3>
                  <p className="text-sm mt-1">
                    Created {batchResult.created} of {batchResult.total} tours
                  </p>
                  {batchResult.skipped.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-amber-800">Skipped dates:</p>
                      <ul className="text-sm text-amber-700 mt-1 space-y-1">
                        {batchResult.skipped.map((s, i) => (
                          <li key={i}>{formatDate(s.date)}: {s.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={handleCloseModal}
                    className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Show form only if not showing batch result */}
              {!batchResult && (
                <>
                  {/* Preset Dropdown */}
                  <div className="bg-slate-50 rounded-lg p-4 -mt-2">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        Load Preset:
                      </label>
                      <select
                        value={selectedPresetId || ''}
                        onChange={e => {
                          const id = e.target.value ? parseInt(e.target.value) : null;
                          if (id) {
                            const preset = presets.find(p => p.id === id);
                            if (preset) loadPreset(preset);
                          }
                        }}
                        disabled={presetsLoading}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                      >
                        <option value="">Select a preset...</option>
                        {presets.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.is_default ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowSavePresetModal(true)}
                        className="px-3 py-2 text-sm text-[#E07A5F] hover:text-[#d06a4f] font-medium whitespace-nowrap"
                      >
                        + Save Current
                      </button>
                      <button
                        onClick={() => setShowManagePresets(true)}
                        className="p-2 text-slate-500 hover:text-slate-700"
                        title="Manage Presets"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Date Selection Mode Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date Selection
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDateSelectionMode('single');
                          setSelectedDates([]);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dateSelectionMode === 'single'
                            ? 'bg-[#E07A5F] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Single Date
                      </button>
                      <button
                        onClick={() => setDateSelectionMode('multiple')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dateSelectionMode === 'multiple'
                            ? 'bg-[#E07A5F] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Multiple Dates
                      </button>
                    </div>
                  </div>

                  {/* Single Date Selection */}
                  {dateSelectionMode === 'single' && (
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
                  )}

                  {/* Multiple Date Selection */}
                  {dateSelectionMode === 'multiple' && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                      {/* Date Pick Mode */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDatePickMode('range')}
                          className={`px-3 py-1.5 rounded text-sm font-medium ${
                            datePickMode === 'range'
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          Generate from Range
                        </button>
                        <button
                          onClick={() => setDatePickMode('individual')}
                          className={`px-3 py-1.5 rounded text-sm font-medium ${
                            datePickMode === 'individual'
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          Pick Individual Dates
                        </button>
                      </div>

                      {/* Range Selection */}
                      {datePickMode === 'range' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={rangeStartDate}
                                onChange={e => setRangeStartDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                              <input
                                type="date"
                                value={rangeEndDate}
                                onChange={e => setRangeEndDate(e.target.value)}
                                min={rangeStartDate || new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-2">Days of Week</label>
                            <div className="flex gap-2">
                              {DAYS_OF_WEEK.map(day => (
                                <label
                                  key={day.value}
                                  className={`flex items-center justify-center w-12 h-8 rounded cursor-pointer text-sm font-medium transition-colors ${
                                    selectedDaysOfWeek.includes(day.value)
                                      ? 'bg-[#E07A5F] text-white'
                                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedDaysOfWeek.includes(day.value)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedDaysOfWeek(prev => [...prev, day.value].sort());
                                      } else {
                                        setSelectedDaysOfWeek(prev => prev.filter(d => d !== day.value));
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  {day.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Date Picker */}
                      {datePickMode === 'individual' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Add Date</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                              onChange={e => handleAddIndividualDate(e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Sun-Wed only</p>
                        </div>
                      )}

                      {/* Selected Dates Preview */}
                      {selectedDates.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-600">
                              Selected Dates ({selectedDates.length})
                            </label>
                            <button
                              onClick={() => setSelectedDates([])}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {selectedDates.map(date => (
                              <span
                                key={date}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-slate-200 text-sm"
                              >
                                {formatDate(date)}
                                <button
                                  onClick={() => handleRemoveDate(date)}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Time and Duration */}
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

                  {/* Vehicle Selection - Only show for single date */}
                  {dateSelectionMode === 'single' && (
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
                  )}

                  {/* Multi-date vehicle note */}
                  {dateSelectionMode === 'multiple' && (
                    <div className="text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <strong>Note:</strong> Vehicles will be auto-assigned for each date based on availability.
                    </div>
                  )}

                  {/* Guest Limits */}
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
                          const cappedMax = selectedVehicle ? Math.min(newMax, selectedVehicle.capacity) : newMax;
                          setCreateForm(prev => ({ ...prev, max_guests: cappedMax }));
                        }}
                        min={2}
                        max={createForm.vehicle_id ? availableVehicles.find(v => v.id === createForm.vehicle_id)?.capacity || 14 : 14}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                      />
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

                  {/* Pricing */}
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

                  {/* Title and Description */}
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
                </>
              )}
            </div>

            {/* Footer - only show if not showing batch result */}
            {!batchResult && (
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-700 hover:text-slate-900"
                  disabled={isCreatingBatch}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTour}
                  disabled={!canSubmit || isCreatingBatch}
                  className="px-6 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingBatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating... {batchProgress}%
                    </>
                  ) : dateSelectionMode === 'multiple' && selectedDates.length > 1 ? (
                    `Create ${selectedDates.length} Tours`
                  ) : (
                    'Create Tour'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Save as Preset</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preset Name *
              </label>
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="e.g., Afternoon Tour"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
              />
              <p className="text-xs text-slate-500 mt-2">
                This will save the current time, duration, pricing, and capacity settings.
              </p>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSavePresetModal(false);
                  setNewPresetName('');
                }}
                className="px-4 py-2 text-slate-700 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsPreset}
                disabled={!newPresetName.trim()}
                className="px-6 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Presets Modal */}
      {showManagePresets && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Manage Presets</h3>
              <button
                onClick={() => setShowManagePresets(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {presets.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No presets yet. Create one from the tour form.</p>
              ) : (
                <div className="space-y-3">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-lg border ${preset.is_default ? 'border-[#E07A5F] bg-orange-50' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{preset.name}</h4>
                            {preset.is_default && (
                              <span className="text-xs px-2 py-0.5 bg-[#E07A5F] text-white rounded">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {formatTime(preset.start_time)} • {preset.duration_hours}hrs • ${preset.base_price_per_person}/${ preset.lunch_price_per_person}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {preset.max_guests} max guests • {preset.min_guests} min required
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!preset.is_default && (
                            <button
                              onClick={() => handleSetDefaultPreset(preset.id)}
                              className="text-xs text-[#E07A5F] hover:text-[#d06a4f]"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowManagePresets(false)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
