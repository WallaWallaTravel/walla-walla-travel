'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

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
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  quote_status?: string;
  quoted_amount?: number;
  quote_notes?: string;
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
  guest_access_token?: string;
}

interface InclusionData {
  id: number;
  inclusion_type: string;
  description: string;
  pricing_type: 'flat' | 'per_person' | 'per_day';
  quantity: number;
  unit_price: string;
  total_price: string;
  is_taxable: boolean;
  tax_included_in_price: boolean;
}

interface TripProposal {
  id: number;
  proposal_number: string;
  status: string;
  access_token: string;
  planning_phase: string;
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
  skip_deposit_on_accept?: boolean;
  planning_fee_mode?: 'flat' | 'percentage';
  planning_fee_percentage?: number;
  individual_billing_enabled?: boolean;
  payment_deadline?: string | null;
  reminders_paused?: boolean;
  created_at: string;
  updated_at: string;
  days?: DayData[];
  guests?: GuestData[];
  inclusions?: InclusionData[];
}

interface ReminderRecord {
  id: number;
  guest_name?: string;
  scheduled_date: string;
  urgency: string;
  status: string;
  paused: boolean;
  skip_reason: string | null;
  sent_at: string | null;
  custom_message: string | null;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'days' | 'guests' | 'pricing' | 'billing' | 'notes'>('overview');
  const [notes, setNotes] = useState<Array<{ id: number; author_type: string; author_name: string; content: string; context_type: string | null; context_id: number | null; is_read: boolean; created_at: string }>>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [lunchOrders, setLunchOrders] = useState<Array<{ id: number; ordering_mode: string; day?: { day_number: number; title: string | null }; supplier?: { name: string } }>>([]);
  const [reminderHistory, setReminderHistory] = useState<ReminderRecord[]>([]);
  const { toasts, toast, dismissToast } = useToast();

  useEffect(() => {
    loadProposal();
    loadBrands();
    loadWineries();
    loadRestaurants();
    loadHotels();
    loadLunchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === 'notes' && proposal) {
      loadNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, proposal?.id]);

  const loadProposal = async () => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`);
      const result = await response.json();
      if (result.success) {
        setProposal(result.data);
      } else {
        toast(result.error || 'Failed to load trip proposal', 'error');
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
        toast(result.error || 'Failed to update proposal', 'error');
      }
    } catch (error) {
      logger.error('Failed to update proposal', { error });
      toast('Failed to update proposal', 'error');
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
        toast(`Status updated to ${newStatus}`, 'success');
      } else {
        toast(result.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      logger.error('Failed to update status', { error });
      toast('Failed to update status', 'error');
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
        toast('Pricing recalculated!', 'success');
      } else {
        toast(result.error || 'Failed to recalculate pricing', 'error');
      }
    } catch (error) {
      logger.error('Failed to recalculate pricing', { error });
      toast('Failed to recalculate pricing', 'error');
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
        toast(`Booking ${result.data.booking_number} created!`, 'success');
        router.push(`/admin/bookings/${result.data.booking_id}`);
      } else {
        toast(result.error || 'Failed to convert to booking', 'error');
      }
    } catch (error) {
      logger.error('Failed to convert to booking', { error });
      toast('Failed to convert to booking', 'error');
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
        toast('Driver itinerary generated!', 'success');
      } else {
        toast(result.error || 'Failed to generate itinerary', 'error');
      }
    } catch (error) {
      logger.error('Failed to generate itinerary', { error });
      toast('Failed to generate itinerary', 'error');
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
        toast(result.error || 'Failed to add day', 'error');
      }
    } catch (error) {
      logger.error('Failed to add day', { error });
      toast('Failed to add day', 'error');
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
        toast(result.error || 'Failed to add stop', 'error');
      }
    } catch (error) {
      logger.error('Failed to add stop', { error });
      toast('Failed to add stop', 'error');
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
        toast(result.error || 'Failed to update stop', 'error');
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
        toast(result.error || 'Failed to delete stop', 'error');
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
        toast(result.error || 'Failed to add guest', 'error');
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
        toast(result.error || 'Failed to remove guest', 'error');
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

  const loadReminderHistory = async () => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/reminders`);
      const result = await response.json();
      if (result.success) {
        setReminderHistory(result.data || []);
      }
    } catch {
      // non-critical
    }
  };

  const loadNotes = async () => {
    if (!proposal) return;
    setNotesLoading(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/notes`);
      const result = await response.json();
      if (result.success) {
        setNotes(result.data?.notes || []);
      }
    } catch (error) {
      logger.error('Failed to load notes', { error });
    } finally {
      setNotesLoading(false);
    }
  };

  const sendNote = async () => {
    if (!newNote.trim() || !proposal) return;
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: 'Staff',
          content: newNote.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewNote('');
        loadNotes();
      } else {
        toast(result.error || 'Failed to send note', 'error');
      }
    } catch (error) {
      logger.error('Failed to send note', { error });
      toast('Failed to send note', 'error');
    }
  };

  const updatePlanningPhase = async (phase: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning_phase: phase }),
      });
      const result = await response.json();
      if (result.success) {
        setProposal({ ...proposal!, ...result.data });
      } else {
        toast(result.error?.message || result.error || 'Failed to update planning phase', 'error');
      }
    } catch (error) {
      logger.error('Failed to update planning phase', { error });
      toast('Failed to update planning phase', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadLunchOrders = async () => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}/lunch`);
      const result = await response.json();
      if (result.success && result.data?.orders) {
        setLunchOrders(result.data.orders.map((o: Record<string, unknown>) => ({
          id: o.id,
          ordering_mode: (o as Record<string, string>).ordering_mode || 'coordinator',
          day: o.day as { day_number: number; title: string | null } | undefined,
          supplier: o.supplier as { name: string } | undefined,
        })));
      }
    } catch (error) {
      logger.error('Failed to load lunch orders', { error });
    }
  };

  const updateLunchOrderingMode = async (orderId: number, mode: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/lunch-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordering_mode: mode }),
      });
      const result = await response.json();
      if (result.success) {
        setLunchOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ordering_mode: mode } : o))
        );
      } else {
        toast(result.error || 'Failed to update ordering mode', 'error');
      }
    } catch (error) {
      logger.error('Failed to update lunch ordering mode', { error });
      toast('Failed to update ordering mode', 'error');
    } finally {
      setSaving(false);
    }
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/trip-proposals"
            className="inline-flex items-center text-brand hover:text-brand-hover font-bold mb-4"
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
                  { key: 'billing', label: '💳 Billing' },
                  { key: 'notes', label: '💬 Notes' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                      activeTab === tab.key
                        ? 'text-brand border-b-2 border-brand bg-brand-light'
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
                                ? 'bg-brand text-white'
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                                ? 'bg-brand text-white'
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
                      />
                    </div>
                  </div>
                )}

                {/* Days Tab */}
                {activeTab === 'days' && (
                  <div className="space-y-6">
                    {proposal.days?.map((day) => (
                      <div key={day.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-brand-light p-4 flex items-center justify-between">
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

                                {/* Vendor Tracking (collapsible) */}
                                <details className="mt-2 border-t border-gray-200 pt-2">
                                  <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-1">
                                    Vendor
                                    {stop.quote_status && stop.quote_status !== 'none' && (
                                      <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                        stop.quote_status === 'paid' ? 'bg-green-100 text-green-800' :
                                        stop.quote_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                        stop.quote_status === 'accepted' ? 'bg-indigo-100 text-indigo-800' :
                                        stop.quote_status === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
                                        stop.quote_status === 'requested' ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>{stop.quote_status}</span>
                                    )}
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        value={stop.vendor_name || ''}
                                        onBlur={(e) => {
                                          fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ vendor_name: e.target.value }),
                                          });
                                        }}
                                        onChange={(e) => {
                                          const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_name: e.target.value } : s);
                                          const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                                          setProposal({ ...proposal, days: newDays });
                                        }}
                                        placeholder="Contact name"
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      />
                                      <div className="flex gap-1">
                                        <input
                                          type="email"
                                          value={stop.vendor_email || ''}
                                          onBlur={(e) => {
                                            fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ vendor_email: e.target.value }),
                                            });
                                          }}
                                          onChange={(e) => {
                                            const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_email: e.target.value } : s);
                                            const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                                            setProposal({ ...proposal, days: newDays });
                                          }}
                                          placeholder="Email"
                                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        {stop.vendor_email && (
                                          <a
                                            href={`mailto:${stop.vendor_email}`}
                                            className="px-1.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                                            title="Send email"
                                          >
                                            @
                                          </a>
                                        )}
                                      </div>
                                      <input
                                        type="tel"
                                        value={stop.vendor_phone || ''}
                                        onBlur={(e) => {
                                          fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ vendor_phone: e.target.value }),
                                          });
                                        }}
                                        onChange={(e) => {
                                          const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_phone: e.target.value } : s);
                                          const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                                          setProposal({ ...proposal, days: newDays });
                                        }}
                                        placeholder="Phone"
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <select
                                        value={stop.quote_status || 'none'}
                                        onChange={(e) => {
                                          fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ quote_status: e.target.value }),
                                          }).then(() => loadProposal());
                                        }}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      >
                                        <option value="none">No Quote</option>
                                        <option value="requested">Requested</option>
                                        <option value="quoted">Quoted</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="paid">Paid</option>
                                      </select>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={stop.quoted_amount ?? ''}
                                        onBlur={(e) => {
                                          fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ quoted_amount: e.target.value ? parseFloat(e.target.value) : null }),
                                          });
                                        }}
                                        onChange={(e) => {
                                          const newStops = day.stops.map(s => s.id === stop.id ? { ...s, quoted_amount: e.target.value ? parseFloat(e.target.value) : undefined } : s);
                                          const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                                          setProposal({ ...proposal, days: newDays });
                                        }}
                                        placeholder="Quoted $"
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      />
                                      <button
                                        onClick={() => {
                                          const content = prompt('Log vendor interaction:');
                                          if (!content) return;
                                          fetch(`/api/admin/trip-proposals/${id}/stops/${stop.id}/vendor-log`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ interaction_type: 'note', content }),
                                          }).then(() => toast('Interaction logged', 'success'));
                                        }}
                                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
                                      >
                                        + Log
                                      </button>
                                    </div>
                                  </div>
                                </details>
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
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-brand text-gray-600 hover:text-brand rounded-lg font-bold transition-colors disabled:opacity-50"
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
                                <span className="ml-2 px-2 py-0.5 bg-brand text-white text-xs rounded">
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

                        {/* Per-guest link */}
                        {guest.guest_access_token && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`}
                                className="flex-1 text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 truncate"
                              />
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`;
                                  navigator.clipboard.writeText(url);
                                  toast('Guest link copied!', 'info');
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium shrink-0 transition-colors"
                              >
                                Copy Link
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={addGuest}
                      disabled={saving}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-brand text-gray-600 hover:text-brand rounded-lg font-bold transition-colors disabled:opacity-50"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
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
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
                        />
                      </div>
                    </div>

                    {/* Planning Fee Mode */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Planning Fee Mode
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="planning_fee_mode"
                            checked={(proposal.planning_fee_mode || 'flat') === 'flat'}
                            onChange={() => updateProposal({ planning_fee_mode: 'flat' })}
                            className="h-4 w-4 text-indigo-600 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Flat (manual)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="planning_fee_mode"
                            checked={proposal.planning_fee_mode === 'percentage'}
                            onChange={() => updateProposal({ planning_fee_mode: 'percentage' })}
                            className="h-4 w-4 text-indigo-600 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Percentage of services</span>
                        </label>
                        {proposal.planning_fee_mode === 'percentage' && (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={proposal.planning_fee_percentage || 0}
                            onChange={(e) =>
                              updateProposal({ planning_fee_percentage: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="%"
                          />
                        )}
                      </div>
                    </div>

                    {/* Per-Inclusion Tax Settings */}
                    {proposal.inclusions && proposal.inclusions.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-bold text-gray-900 mb-3">
                          Service Line Items — Tax Settings
                        </label>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-2 text-gray-700 font-semibold">Description</th>
                                <th className="text-right py-2 px-2 text-gray-700 font-semibold">Amount</th>
                                <th className="text-center py-2 px-2 text-gray-700 font-semibold">Taxable</th>
                                <th className="text-center py-2 px-2 text-gray-700 font-semibold">Tax Incl.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {proposal.inclusions.map((inc) => (
                                <tr key={inc.id} className="border-b border-gray-100">
                                  <td className="py-2 px-2 text-gray-900">{inc.description}</td>
                                  <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(inc.total_price || inc.unit_price)}</td>
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={inc.is_taxable !== false}
                                      onChange={async () => {
                                        try {
                                          const res = await fetch(`/api/admin/trip-proposals/${id}/inclusions/${inc.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ is_taxable: inc.is_taxable === false }),
                                          });
                                          if ((await res.json()).success) loadProposal();
                                        } catch { /* ignore */ }
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={inc.tax_included_in_price === true}
                                      disabled={inc.is_taxable === false}
                                      onChange={async () => {
                                        try {
                                          const res = await fetch(`/api/admin/trip-proposals/${id}/inclusions/${inc.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ tax_included_in_price: !inc.tax_included_in_price }),
                                          });
                                          if ((await res.json()).success) loadProposal();
                                        } catch { /* ignore */ }
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={recalculatePricing}
                      disabled={saving}
                      className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      🔄 Recalculate Pricing
                    </button>
                  </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    {/* Enable Individual Billing Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Individual Guest Billing</h3>
                        <p className="text-xs text-gray-600 mt-0.5">Split the total among individual guests with separate payment links</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={proposal.individual_billing_enabled || false}
                          onChange={() => updateProposal({ individual_billing_enabled: !proposal.individual_billing_enabled } as Partial<TripProposal>)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {proposal.individual_billing_enabled && (
                      <>
                        {/* Payment Deadline */}
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">Payment Deadline</label>
                          <input
                            type="date"
                            value={proposal.payment_deadline || ''}
                            onChange={(e) => updateProposal({ payment_deadline: e.target.value || null } as Partial<TripProposal>)}
                            className="w-full max-w-xs px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
                          />
                        </div>

                        {/* Guest Billing Table */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900">Guest Amounts</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    const res = await fetch(`/api/admin/trip-proposals/${id}/billing/calculate`, { method: 'POST' });
                                    const result = await res.json();
                                    if (result.success) {
                                      toast('Guest amounts calculated!', 'success');
                                      loadProposal();
                                    } else {
                                      toast(result.error?.message || result.error || 'Failed to calculate', 'error');
                                    }
                                  } catch { toast('Failed to calculate', 'error'); }
                                  finally { setSaving(false); }
                                }}
                                disabled={saving}
                                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                🔄 Recalculate All
                              </button>
                              <button
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    const res = await fetch(`/api/admin/trip-proposals/${id}/billing/calculate`, { method: 'POST' });
                                    const result = await res.json();
                                    if (result.success && result.data.valid) {
                                      toast('Billing verified — no discrepancies!', 'success');
                                    } else if (result.success) {
                                      toast('Warning: billing may have discrepancies', 'error');
                                    }
                                  } catch { toast('Failed to verify', 'error'); }
                                  finally { setSaving(false); }
                                }}
                                disabled={saving}
                                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                Verify Billing
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="text-left py-2 px-2 text-gray-700 font-semibold">Guest</th>
                                  <th className="text-center py-2 px-2 text-gray-700 font-semibold">Sponsored</th>
                                  <th className="text-right py-2 px-2 text-gray-700 font-semibold">Amount</th>
                                  <th className="text-right py-2 px-2 text-gray-700 font-semibold">Override</th>
                                  <th className="text-right py-2 px-2 text-gray-700 font-semibold">Paid</th>
                                  <th className="text-center py-2 px-2 text-gray-700 font-semibold">Status</th>
                                  <th className="text-right py-2 px-2 text-gray-700 font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(proposal.guests || []).map((guest) => {
                                  const guestData = guest as GuestData & {
                                    is_sponsored?: boolean;
                                    amount_owed?: number;
                                    amount_owed_override?: number | null;
                                    amount_paid?: number;
                                    payment_status?: string;
                                  };
                                  return (
                                    <tr key={guest.id} className="border-b border-gray-100">
                                      <td className="py-2 px-2 text-gray-900 font-medium">
                                        {guest.name}
                                        {guest.is_primary && <span className="ml-1 text-xs text-indigo-600">(Primary)</span>}
                                      </td>
                                      <td className="py-2 px-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={guestData.is_sponsored || false}
                                          onChange={async () => {
                                            try {
                                              const res = await fetch(`/api/admin/trip-proposals/${id}/guests/${guest.id}/billing`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ is_sponsored: !guestData.is_sponsored }),
                                              });
                                              if ((await res.json()).success) loadProposal();
                                            } catch { /* ignore */ }
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                        />
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-700">
                                        {formatCurrency(guestData.amount_owed || 0)}
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={guestData.amount_owed_override ?? ''}
                                          placeholder="Auto"
                                          onChange={async (e) => {
                                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                            try {
                                              await fetch(`/api/admin/trip-proposals/${id}/guests/${guest.id}/billing`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ amount_owed_override: val }),
                                              });
                                              loadProposal();
                                            } catch { /* ignore */ }
                                          }}
                                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                        />
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-700">
                                        {formatCurrency(guestData.amount_paid || 0)}
                                      </td>
                                      <td className="py-2 px-2 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                          guestData.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                          guestData.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                          guestData.payment_status === 'refunded' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {(guestData.payment_status || 'unpaid').toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <button
                                          onClick={async () => {
                                            const amountStr = prompt(`Record manual payment for ${guest.name}. Amount ($):`);
                                            if (!amountStr) return;
                                            const amount = parseFloat(amountStr);
                                            if (isNaN(amount) || amount <= 0) { toast('Invalid amount', 'error'); return; }
                                            try {
                                              const res = await fetch(`/api/admin/trip-proposals/${id}/guests/${guest.id}/record-payment`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ amount }),
                                              });
                                              if ((await res.json()).success) {
                                                toast('Payment recorded!', 'success');
                                                loadProposal();
                                              }
                                            } catch { toast('Failed to record payment', 'error'); }
                                          }}
                                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                        >
                                          Record Pay
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-gray-300">
                                  <td className="py-2 px-2 font-bold text-gray-900" colSpan={2}>Total</td>
                                  <td className="py-2 px-2 text-right font-bold text-gray-900">
                                    {formatCurrency(
                                      (proposal.guests || []).reduce((sum, g) => sum + (parseFloat(String((g as unknown as Record<string, unknown>).amount_owed)) || 0), 0)
                                    )}
                                  </td>
                                  <td></td>
                                  <td className="py-2 px-2 text-right font-bold text-gray-900">
                                    {formatCurrency(
                                      (proposal.guests || []).reduce((sum, g) => sum + (parseFloat(String((g as unknown as Record<string, unknown>).amount_paid)) || 0), 0)
                                    )}
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Proposal total comparison */}
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Proposal Total:</span>
                              <span className="font-bold text-gray-900">{formatCurrency(proposal.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Group Creation */}
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-sm font-bold text-gray-900 mb-2">Payment Groups (Couples)</h3>
                          <p className="text-xs text-gray-600 mb-3">Group guests to share a single payment link</p>
                          <button
                            onClick={async () => {
                              const name = prompt('Group name (e.g., "The Smiths"):');
                              if (!name) return;
                              const guestIdStr = prompt('Enter guest IDs to group (comma-separated):');
                              if (!guestIdStr) return;
                              const guestIds = guestIdStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                              if (guestIds.length < 1) { toast('Need at least 1 guest ID', 'error'); return; }
                              try {
                                const res = await fetch(`/api/admin/trip-proposals/${id}/payment-groups`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ guest_ids: guestIds, name }),
                                });
                                const result = await res.json();
                                if (result.success) {
                                  toast('Payment group created!', 'success');
                                  loadProposal();
                                } else {
                                  toast(result.error || 'Failed to create group', 'error');
                                }
                              } catch { toast('Failed to create group', 'error'); }
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                          >
                            + Create Payment Group
                          </button>
                        </div>

                        {/* Payment Reminders */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">Payment Reminders</h3>
                              <p className="text-xs text-gray-600 mt-0.5">Automated escalating reminders for unpaid guests</p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/trip-proposals/${id}/reminders`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: proposal.reminders_paused ? 'resume_proposal' : 'pause_proposal' }),
                                    });
                                    if ((await res.json()).success) {
                                      toast(proposal.reminders_paused ? 'Reminders resumed' : 'Reminders paused', 'success');
                                      loadProposal();
                                    }
                                  } catch { toast('Failed to update', 'error'); }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  proposal.reminders_paused
                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {proposal.reminders_paused ? 'Resume All' : 'Pause All'}
                              </button>
                              <button
                                onClick={async () => {
                                  if (!proposal.payment_deadline) {
                                    toast('Set a payment deadline first', 'error');
                                    return;
                                  }
                                  setSaving(true);
                                  try {
                                    const res = await fetch(`/api/admin/trip-proposals/${id}/reminders`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'generate_schedule' }),
                                    });
                                    const result = await res.json();
                                    if (result.success) {
                                      toast(`Generated ${result.data.created} reminders`, 'success');
                                      setReminderHistory([]);
                                      loadReminderHistory();
                                    } else {
                                      toast(result.error?.message || result.error || 'Failed to generate', 'error');
                                    }
                                  } catch { toast('Failed to generate schedule', 'error'); }
                                  finally { setSaving(false); }
                                }}
                                disabled={saving}
                                className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-medium disabled:opacity-50"
                              >
                                Generate Schedule
                              </button>
                            </div>
                          </div>

                          {proposal.reminders_paused && (
                            <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium">
                              All reminders for this proposal are currently paused.
                            </div>
                          )}

                          {/* Reminder History Table */}
                          <div className="mb-3">
                            <button
                              onClick={loadReminderHistory}
                              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              {reminderHistory.length > 0 ? 'Refresh Reminder History' : 'Load Reminder History'}
                            </button>
                          </div>

                          {reminderHistory.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b-2 border-gray-200">
                                    <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Guest</th>
                                    <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Date</th>
                                    <th className="text-center py-1.5 px-2 text-gray-700 font-semibold">Urgency</th>
                                    <th className="text-center py-1.5 px-2 text-gray-700 font-semibold">Status</th>
                                    <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Reason</th>
                                    <th className="text-right py-1.5 px-2 text-gray-700 font-semibold">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reminderHistory.map((r: ReminderRecord) => (
                                    <tr key={r.id} className="border-b border-gray-100">
                                      <td className="py-1.5 px-2 text-gray-900">{r.guest_name || 'All'}</td>
                                      <td className="py-1.5 px-2 text-gray-700">{r.scheduled_date}</td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                          r.urgency === 'final' ? 'bg-red-100 text-red-800' :
                                          r.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                          r.urgency === 'firm' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-blue-100 text-blue-800'
                                        }`}>
                                          {r.urgency}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                          r.status === 'sent' ? 'bg-green-100 text-green-800' :
                                          r.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                                          r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                          r.paused ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-blue-50 text-blue-700'
                                        }`}>
                                          {r.paused && r.status === 'pending' ? 'paused' : r.status}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2 text-gray-600 max-w-[150px] truncate" title={r.skip_reason || ''}>
                                        {r.skip_reason || '—'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right">
                                        {r.status === 'pending' && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await fetch(`/api/admin/trip-proposals/${id}/reminders`, {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ action: 'cancel', reminder_id: r.id }),
                                                });
                                                toast('Reminder cancelled', 'success');
                                                loadReminderHistory();
                                              } catch { toast('Failed', 'error'); }
                                            }}
                                            className="text-red-600 hover:text-red-800 font-medium"
                                          >
                                            Cancel
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Add Custom Reminder */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">Add Custom Reminder</h4>
                            <div className="flex gap-2 items-end flex-wrap">
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Date</label>
                                <input
                                  type="date"
                                  id="custom-reminder-date"
                                  className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Urgency</label>
                                <select
                                  id="custom-reminder-urgency"
                                  className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                                >
                                  <option value="friendly">Friendly</option>
                                  <option value="firm">Firm</option>
                                  <option value="urgent">Urgent</option>
                                  <option value="final">Final</option>
                                </select>
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-gray-700 mb-1">Custom Message (optional)</label>
                                <input
                                  type="text"
                                  id="custom-reminder-message"
                                  placeholder="Personal note to include in the email..."
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                />
                              </div>
                              <button
                                onClick={async () => {
                                  const dateEl = document.getElementById('custom-reminder-date') as HTMLInputElement;
                                  const urgencyEl = document.getElementById('custom-reminder-urgency') as HTMLSelectElement;
                                  const msgEl = document.getElementById('custom-reminder-message') as HTMLInputElement;
                                  if (!dateEl.value) { toast('Pick a date', 'error'); return; }
                                  try {
                                    const res = await fetch(`/api/admin/trip-proposals/${id}/reminders`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'add_manual',
                                        scheduled_date: dateEl.value,
                                        urgency: urgencyEl.value,
                                        custom_message: msgEl.value || undefined,
                                      }),
                                    });
                                    if ((await res.json()).success) {
                                      toast('Custom reminder added', 'success');
                                      dateEl.value = '';
                                      msgEl.value = '';
                                      loadReminderHistory();
                                    }
                                  } catch { toast('Failed to add reminder', 'error'); }
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    {!notes.length && !notesLoading && (
                      <button
                        onClick={loadNotes}
                        className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Load Notes
                      </button>
                    )}

                    {notesLoading && (
                      <div className="text-center py-8 text-gray-600">Loading notes...</div>
                    )}

                    {/* Notes thread */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {notes.length === 0 && !notesLoading && (
                        <div className="text-center py-8">
                          <p className="text-gray-600">No notes yet. Start the conversation.</p>
                        </div>
                      )}
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3 rounded-xl ${
                            note.author_type === 'staff'
                              ? 'bg-indigo-50 border border-indigo-100'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {note.author_name}
                              {note.context_type && (
                                <span className="ml-2 text-xs font-normal text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                                  {note.context_type} #{note.context_id}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-600">
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                          {!note.is_read && note.author_type === 'client' && (
                            <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              New
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Send note */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendNote()}
                        placeholder="Type a note..."
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        onClick={sendNote}
                        disabled={!newNote.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Client Link + Planning Phase */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Client Link</h3>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${proposal.access_token || '...'}`}
                  className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 truncate"
                />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/my-trip/${proposal.access_token || ''}`;
                    navigator.clipboard.writeText(url);
                    toast('Link copied!', 'info');
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium shrink-0"
                >
                  Copy
                </button>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-2">Planning Phase</h3>
              <div className="flex gap-1">
                {[
                  { value: 'proposal', label: 'Proposal' },
                  { value: 'active_planning', label: 'Active' },
                  { value: 'finalized', label: 'Final' },
                ].map((phase) => (
                  <button
                    key={phase.value}
                    onClick={() => updatePlanningPhase(phase.value)}
                    disabled={saving || (proposal.planning_phase || 'proposal') === phase.value}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (proposal.planning_phase || 'proposal') === phase.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:cursor-default`}
                  >
                    {phase.label}
                  </button>
                ))}
              </div>

              {/* Accept Behavior Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">On Accept Behavior</h3>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proposal.skip_deposit_on_accept || false}
                    onChange={() =>
                      updateProposal({
                        skip_deposit_on_accept: !proposal.skip_deposit_on_accept,
                      })
                    }
                    disabled={saving}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Skip deposit — grant immediate planning access
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Default: deposit required. Check for large custom trips.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Lunch Ordering Mode */}
            {lunchOrders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Lunch Ordering Mode</h3>
                <div className="space-y-3">
                  {lunchOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {order.day ? `Day ${order.day.day_number}${order.day.title ? ` - ${order.day.title}` : ''}` : 'Lunch'}
                        {order.supplier && ` (${order.supplier.name})`}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateLunchOrderingMode(order.id, 'coordinator')}
                          disabled={saving || order.ordering_mode === 'coordinator'}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            order.ordering_mode === 'coordinator'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          } disabled:cursor-default`}
                        >
                          Coordinator
                        </button>
                        <button
                          onClick={() => updateLunchOrderingMode(order.id, 'individual')}
                          disabled={saving || order.ordering_mode === 'individual'}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            order.ordering_mode === 'individual'
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          } disabled:cursor-default`}
                        >
                          Individual
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 border-2 border-brand">
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

                <div className="border-t-2 border-brand pt-3 flex justify-between">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-brand">
                    {formatCurrency(proposal.total)}
                  </span>
                </div>

                <div className="bg-brand-light rounded-lg p-3 space-y-2">
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
