'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  primary_color: string | null;
}

interface Winery {
  id: number;
  name: string;
  city: string;
}

interface Restaurant {
  id: number;
  name: string;
  city: string;
  cuisine_type: string | null;
}

interface Hotel {
  id: number;
  name: string;
  city: string;
}

interface StopData {
  id: number;
  stop_order: number;
  stop_type: string;
  winery_id?: number;
  restaurant_id?: number;
  hotel_id?: number;
  winery?: { id: number; name: string };
  restaurant?: { id: number; name: string };
  hotel?: { id: number; name: string };
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost: string;
  flat_cost: string;
  cost_note?: string;
  reservation_status: string;
  client_notes?: string;
  internal_notes?: string;
  driver_notes?: string;
}

interface DayData {
  id: number;
  day_number: number;
  date: string;
  title: string;
  notes?: string;
  stops: StopData[];
}

interface GuestData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  room_assignment?: string;
  is_primary: boolean;
}

interface InclusionData {
  id: number;
  inclusion_type: string;
  description: string;
  pricing_type: 'flat' | 'per_person' | 'per_day';
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface TripProposal {
  id: number;
  proposal_number: string;
  status: string;
  brand_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string | null;
  introduction: string | null;
  internal_notes: string | null;
  valid_until: string | null;
  deposit_percentage: number;
  gratuity_percentage: number;
  tax_rate: string;
  discount_amount: string;
  discount_reason: string | null;
  subtotal: string;
  taxes: string;
  total: string;
  deposit_amount: string;
  created_at: string;
  updated_at: string;
  days?: DayData[];
  guests?: GuestData[];
  inclusions?: InclusionData[];
}

const TRIP_TYPES = [
  { value: 'wine_tour', label: 'Wine Tour', icon: '🍷' },
  { value: 'celebration', label: 'Celebration', icon: '🎉' },
  { value: 'corporate', label: 'Corporate', icon: '🏢' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'romantic', label: 'Romantic', icon: '💕' },
  { value: 'birthday', label: 'Birthday', icon: '🎂' },
  { value: 'anniversary', label: 'Anniversary', icon: '💍' },
  { value: 'other', label: 'Other', icon: '✨' },
];

const STOP_TYPES = [
  { value: 'pickup', label: 'Pickup', icon: '🚗' },
  { value: 'dropoff', label: 'Dropoff', icon: '🏁' },
  { value: 'winery', label: 'Winery', icon: '🍷' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'activity', label: 'Activity', icon: '🎈' },
  { value: 'custom', label: 'Custom', icon: '📍' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', icon: '📝' },
  { value: 'sent', label: 'Sent', icon: '📧' },
  { value: 'viewed', label: 'Viewed', icon: '👁️' },
  { value: 'accepted', label: 'Accepted', icon: '✅' },
  { value: 'declined', label: 'Declined', icon: '❌' },
  { value: 'expired', label: 'Expired', icon: '⏰' },
  { value: 'converted', label: 'Converted', icon: '🎉' },
];

export default function EditTripProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'guests' | 'pricing'>('overview');

  useEffect(() => {
    loadProposal();
    loadBrands();
    loadWineries();
    loadRestaurants();
    loadHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProposal = async () => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`);
      const result = await response.json();
      if (result.success) {
        setProposal(result.data);
      } else {
        alert(result.error || 'Failed to load trip proposal');
        router.push('/admin/trip-proposals');
      }
    } catch (error) {
      logger.error('Failed to load trip proposal', { error });
      router.push('/admin/trip-proposals');
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      const result = await response.json();
      if (result.success) setBrands(result.data || []);
    } catch (error) {
      logger.error('Failed to load brands', { error });
    }
  };

  const loadWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      const result = await response.json();
      if (result.success) setWineries(result.data || []);
    } catch (error) {
      logger.error('Failed to load wineries', { error });
    }
  };

  const loadRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const result = await response.json();
      if (result.success) setRestaurants(result.data || []);
    } catch (error) {
      logger.error('Failed to load restaurants', { error });
    }
  };

  const loadHotels = async () => {
    try {
      const response = await fetch('/api/hotels');
      const result = await response.json();
      if (result.success) setHotels(result.data || []);
    } catch (error) {
      logger.error('Failed to load hotels', { error });
    }
  };

  const updateProposal = async (updates: Partial<TripProposal>) => {
    if (!proposal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        setProposal({ ...proposal, ...result.data });
      } else {
        alert(result.error || 'Failed to update proposal');
      }
    } catch (error) {
      logger.error('Failed to update proposal', { error });
      alert('Failed to update proposal');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        setProposal({ ...proposal!, status: newStatus });
        alert(`Status updated to ${newStatus}`);
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      logger.error('Failed to update status', { error });
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const recalculatePricing = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/pricing`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        await loadProposal();
        alert('Pricing recalculated!');
      } else {
        alert(result.error || 'Failed to recalculate pricing');
      }
    } catch (error) {
      logger.error('Failed to recalculate pricing', { error });
      alert('Failed to recalculate pricing');
    } finally {
      setSaving(false);
    }
  };

  const convertToBooking = async () => {
    if (!confirm('Convert this trip proposal to a booking?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/convert`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        alert(`Booking ${result.data.booking_number} created!`);
        router.push(`/admin/bookings/${result.data.booking_id}`);
      } else {
        alert(result.error || 'Failed to convert to booking');
      }
    } catch (error) {
      logger.error('Failed to convert to booking', { error });
      alert('Failed to convert to booking');
    } finally {
      setSaving(false);
    }
  };

  const generateItinerary = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/itinerary`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        alert(`Driver itinerary generated! Itinerary ID: ${result.data.itinerary_id}`);
      } else {
        alert(result.error || 'Failed to generate itinerary');
      }
    } catch (error) {
      logger.error('Failed to generate itinerary', { error });
      alert('Failed to generate itinerary');
    } finally {
      setSaving(false);
    }
  };

  const addDay = async () => {
    if (!proposal) return;

    const lastDay = proposal.days?.[proposal.days.length - 1];
    const nextDate = lastDay
      ? new Date(new Date(lastDay.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : proposal.start_date;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: nextDate,
          title: `Day ${(proposal.days?.length || 0) + 1}`,
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadProposal(); // Reload to get updated data
      } else {
        alert(result.error || 'Failed to add day');
      }
    } catch (error) {
      logger.error('Failed to add day', { error });
      alert('Failed to add day');
    } finally {
      setSaving(false);
    }
  };

  const addStop = async (dayId: number, stopType: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/days/${dayId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_type: stopType,
          scheduled_time: '10:00',
          duration_minutes: 60,
          per_person_cost: 0,
          flat_cost: 0,
          reservation_status: 'pending',
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadProposal();
      } else {
        alert(result.error || 'Failed to add stop');
      }
    } catch (error) {
      logger.error('Failed to add stop', { error });
      alert('Failed to add stop');
    } finally {
      setSaving(false);
    }
  };

  const updateStop = async (dayId: number, stopId: number, updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/days/${dayId}/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        loadProposal();
      } else {
        alert(result.error || 'Failed to update stop');
      }
    } catch (error) {
      logger.error('Failed to update stop', { error });
    } finally {
      setSaving(false);
    }
  };

  const deleteStop = async (dayId: number, stopId: number) => {
    if (!confirm('Delete this stop?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/days/${dayId}/stops/${stopId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        loadProposal();
      } else {
        alert(result.error || 'Failed to delete stop');
      }
    } catch (error) {
      logger.error('Failed to delete stop', { error });
    } finally {
      setSaving(false);
    }
  };

  const addGuest = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Guest',
          is_primary: !proposal?.guests?.length,
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadProposal();
      } else {
        alert(result.error || 'Failed to add guest');
      }
    } catch (error) {
      logger.error('Failed to add guest', { error });
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = async (guestId: number) => {
    if (!confirm('Remove this guest?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/guests/${guestId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        loadProposal();
      } else {
        alert(result.error || 'Failed to remove guest');
      }
    } catch (error) {
      logger.error('Failed to remove guest', { error });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading trip proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Trip proposal not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      converted: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/trip-proposals"
            className="inline-flex items-center text-[#8B1538] hover:text-[#7A1230] font-bold mb-4"
          >
            ← Back to Trip Proposals
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {proposal.proposal_number}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(proposal.status)}`}>
                  {proposal.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600">
                {proposal.customer_name} • {proposal.party_size} guests •{' '}
                {proposal.days?.length || 0} day{(proposal.days?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/trip-proposals/${proposal.proposal_number}`}
                target="_blank"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-bold text-sm"
              >
                👁️ Preview
              </Link>

              {proposal.status === 'accepted' && (
                <>
                  <button
                    onClick={generateItinerary}
                    disabled={saving}
                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg font-bold text-sm disabled:opacity-50"
                  >
                    🚗 Generate Itinerary
                  </button>
                  <button
                    onClick={convertToBooking}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold text-sm disabled:opacity-50"
                  >
                    🎉 Convert to Booking
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md">
              <div className="flex border-b border-gray-200">
                {[
                  { key: 'overview', label: '📋 Overview' },
                  { key: 'days', label: '📅 Days & Stops' },
                  { key: 'guests', label: '👥 Guests' },
                  { key: 'pricing', label: '💰 Pricing' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                      activeTab === tab.key
                        ? 'text-[#8B1538] border-b-2 border-[#8B1538] bg-[#FDF2F4]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Status Management */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Status
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status.value}
                            onClick={() => updateStatus(status.value)}
                            disabled={saving || proposal.status === status.value}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              proposal.status === status.value
                                ? 'bg-[#8B1538] text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            } disabled:opacity-50`}
                          >
                            {status.icon} {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Customer Name
                        </label>
                        <input
                          type="text"
                          value={proposal.customer_name}
                          onChange={(e) => updateProposal({ customer_name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={proposal.customer_email || ''}
                          onChange={(e) => updateProposal({ customer_email: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={proposal.customer_phone || ''}
                          onChange={(e) => updateProposal({ customer_phone: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Party Size
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={proposal.party_size}
                          onChange={(e) => updateProposal({ party_size: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                    </div>

                    {/* Trip Type */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Trip Type
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TRIP_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => updateProposal({ trip_type: type.value })}
                            disabled={saving}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              proposal.trip_type === type.value
                                ? 'bg-[#8B1538] text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            } disabled:opacity-50`}
                          >
                            {type.icon} {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={proposal.start_date}
                          onChange={(e) => updateProposal({ start_date: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={proposal.end_date || proposal.start_date}
                          onChange={(e) => updateProposal({ end_date: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Valid Until
                        </label>
                        <input
                          type="date"
                          value={proposal.valid_until || ''}
                          onChange={(e) => updateProposal({ valid_until: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Introduction (shown to client)
                      </label>
                      <textarea
                        value={proposal.introduction || ''}
                        onChange={(e) => updateProposal({ introduction: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Internal Notes
                      </label>
                      <textarea
                        value={proposal.internal_notes || ''}
                        onChange={(e) => updateProposal({ internal_notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                      />
                    </div>
                  </div>
                )}

                {/* Days Tab */}
                {activeTab === 'days' && (
                  <div className="space-y-6">
                    {proposal.days?.map((day) => (
                      <div key={day.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-[#FDF2F4] p-4 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900">{day.title}</div>
                            <div className="text-sm text-gray-600">{formatDate(day.date)}</div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          {day.stops.map((stop) => {
                            const stopType = STOP_TYPES.find((t) => t.value === stop.stop_type);
                            const venueName = stop.winery?.name || stop.restaurant?.name || stop.hotel?.name || stop.custom_name || 'Unknown';

                            return (
                              <div key={stop.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{stopType?.icon || '📍'}</span>
                                    <div>
                                      <div className="font-bold text-sm">{venueName}</div>
                                      <div className="text-xs text-gray-500">
                                        {stop.scheduled_time} • {stop.duration_minutes || 0} min
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => deleteStop(day.id, stop.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {stop.stop_type === 'winery' && (
                                    <div className="col-span-2">
                                      <select
                                        value={stop.winery_id || ''}
                                        onChange={(e) =>
                                          updateStop(day.id, stop.id, {
                                            winery_id: parseInt(e.target.value) || null,
                                          })
                                        }
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="">Select winery...</option>
                                        {wineries.map((w) => (
                                          <option key={w.id} value={w.id}>
                                            {w.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {stop.stop_type === 'restaurant' && (
                                    <div className="col-span-2">
                                      <select
                                        value={stop.restaurant_id || ''}
                                        onChange={(e) =>
                                          updateStop(day.id, stop.id, {
                                            restaurant_id: parseInt(e.target.value) || null,
                                          })
                                        }
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="">Select restaurant...</option>
                                        {restaurants.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {stop.stop_type === 'hotel' && (
                                    <div className="col-span-2">
                                      <select
                                        value={stop.hotel_id || ''}
                                        onChange={(e) =>
                                          updateStop(day.id, stop.id, {
                                            hotel_id: parseInt(e.target.value) || null,
                                          })
                                        }
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="">Select hotel...</option>
                                        {hotels.map((h) => (
                                          <option key={h.id} value={h.id}>
                                            {h.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  <input
                                    type="time"
                                    value={stop.scheduled_time || ''}
                                    onChange={(e) =>
                                      updateStop(day.id, stop.id, { scheduled_time: e.target.value })
                                    }
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />

                                  <input
                                    type="number"
                                    min="0"
                                    value={stop.duration_minutes || ''}
                                    onChange={(e) =>
                                      updateStop(day.id, stop.id, { duration_minutes: parseInt(e.target.value) || null })
                                    }
                                    placeholder="Min"
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>

                                {/* Cost Note (informational) */}
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    value={stop.cost_note || ''}
                                    onChange={(e) =>
                                      updateStop(day.id, stop.id, { cost_note: e.target.value })
                                    }
                                    placeholder="e.g., Tasting fee ~$25/pp, paid at winery"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 italic"
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* Add Stop Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                            {STOP_TYPES.map((type) => (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => addStop(day.id, type.value)}
                                disabled={saving}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {type.icon} {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addDay}
                      disabled={saving}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-[#8B1538] text-gray-600 hover:text-[#8B1538] rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      + Add Another Day
                    </button>
                  </div>
                )}

                {/* Guests Tab */}
                {activeTab === 'guests' && (
                  <div className="space-y-4">
                    {proposal.guests?.map((guest) => (
                      <div key={guest.id} className="border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">👤</span>
                            <span className="font-bold">
                              {guest.name}
                              {guest.is_primary && (
                                <span className="ml-2 px-2 py-0.5 bg-[#8B1538] text-white text-xs rounded">
                                  Primary
                                </span>
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteGuest(guest.id)}
                            className="text-red-600 hover:text-red-800 font-bold text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {guest.email && (
                            <div>
                              <span className="text-gray-500">Email:</span> {guest.email}
                            </div>
                          )}
                          {guest.phone && (
                            <div>
                              <span className="text-gray-500">Phone:</span> {guest.phone}
                            </div>
                          )}
                          {guest.dietary_restrictions && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Dietary:</span> {guest.dietary_restrictions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addGuest}
                      disabled={saving}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-[#8B1538] text-gray-600 hover:text-[#8B1538] rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      + Add Guest
                    </button>
                  </div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Tax Rate %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={parseFloat(proposal.tax_rate) || 0}
                          onChange={(e) =>
                            updateProposal({ tax_rate: e.target.value })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Gratuity %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={proposal.gratuity_percentage || 0}
                          onChange={(e) =>
                            updateProposal({ gratuity_percentage: parseInt(e.target.value) || 0 })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Deposit %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={proposal.deposit_percentage || 50}
                          onChange={(e) =>
                            updateProposal({ deposit_percentage: parseInt(e.target.value) || 50 })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Discount Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={parseFloat(proposal.discount_amount) || 0}
                            onChange={(e) =>
                              updateProposal({ discount_amount: e.target.value })
                            }
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Discount Reason
                        </label>
                        <input
                          type="text"
                          value={proposal.discount_reason || ''}
                          onChange={(e) =>
                            updateProposal({ discount_reason: e.target.value })
                          }
                          placeholder="e.g., Repeat customer"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                        />
                      </div>
                    </div>

                    <button
                      onClick={recalculatePricing}
                      disabled={saving}
                      className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      🔄 Recalculate Pricing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 border-2 border-[#8B1538]">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Pricing</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatCurrency(proposal.subtotal)}</span>
                </div>

                {parseFloat(proposal.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-bold">-{formatCurrency(proposal.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-700">
                  <span>Taxes ({parseFloat(proposal.tax_rate)}%)</span>
                  <span className="font-bold">{formatCurrency(proposal.taxes)}</span>
                </div>

                <div className="border-t-2 border-[#8B1538] pt-3 flex justify-between">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-[#8B1538]">
                    {formatCurrency(proposal.total)}
                  </span>
                </div>

                <div className="bg-[#FDF2F4] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      Deposit ({proposal.deposit_percentage}%)
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(proposal.deposit_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Balance Due</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(parseFloat(proposal.total) - parseFloat(proposal.deposit_amount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <div className="font-bold">{formatDate(proposal.created_at)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <div className="font-bold">{formatDate(proposal.updated_at)}</div>
                  </div>
                </div>
              </div>

              {saving && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  ⏳ Saving changes...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
