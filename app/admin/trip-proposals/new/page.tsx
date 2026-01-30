'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  display_name: string;
  primary_color: string | null;
  default_brand: boolean | null;
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
  id: string;
  stop_order: number;
  stop_type: string;
  winery_id?: number;
  restaurant_id?: number;
  hotel_id?: number;
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost: number;
  flat_cost: number;
  cost_notes?: string;
  reservation_status: string;
  client_notes?: string;
  internal_notes?: string;
  driver_notes?: string;
}

interface DayData {
  id: string;
  day_number: number;
  date: string;
  title: string;
  notes?: string;
  stops: StopData[];
}

interface GuestData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  room_assignment?: string;
  is_primary: boolean;
}

interface InclusionData {
  id: string;
  inclusion_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface FormData {
  brand_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string;
  introduction: string;
  internal_notes: string;
  valid_until: string;
  deposit_percentage: number;
  gratuity_percentage: number;
  tax_rate: number;
  discount_amount: number;
  discount_reason: string;
  days: DayData[];
  guests: GuestData[];
  inclusions: InclusionData[];
}

const TRIP_TYPES = [
  { value: 'wine_tour', label: 'Wine Tour', icon: '🍷' },
  { value: 'bachelorette', label: 'Bachelorette', icon: '💒' },
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

const INCLUSION_TYPES = [
  { value: 'transportation', label: 'Transportation' },
  { value: 'chauffeur', label: 'Professional Chauffeur' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'custom', label: 'Custom' },
];

export default function NewTripProposalPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'days' | 'guests' | 'pricing'>('details');

  const today = new Date().toISOString().split('T')[0];
  const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    brand_id: null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    trip_type: 'wine_tour',
    party_size: 4,
    start_date: today,
    end_date: today,
    introduction: 'Thank you for your interest in Walla Walla wine country! We are excited to create a memorable experience for you and your guests.',
    internal_notes: '',
    valid_until: defaultValidUntil,
    deposit_percentage: 50,
    gratuity_percentage: 0,
    tax_rate: 8.9,
    discount_amount: 0,
    discount_reason: '',
    days: [],
    guests: [],
    inclusions: [
      {
        id: `incl-${Date.now()}`,
        inclusion_type: 'transportation',
        description: 'Luxury transportation',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
      {
        id: `incl-${Date.now() + 1}`,
        inclusion_type: 'chauffeur',
        description: 'Professional chauffeur',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
    ],
  });

  useEffect(() => {
    loadBrands();
    loadWineries();
    loadRestaurants();
    loadHotels();
  }, []);

  // Auto-create days when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (formData.days.length !== dayCount) {
        const newDays: DayData[] = [];
        for (let i = 0; i < dayCount; i++) {
          const dayDate = new Date(start);
          dayDate.setDate(dayDate.getDate() + i);
          const existingDay = formData.days[i];
          newDays.push({
            id: existingDay?.id || `day-${Date.now()}-${i}`,
            day_number: i + 1,
            date: dayDate.toISOString().split('T')[0],
            title: existingDay?.title || `Day ${i + 1}`,
            notes: existingDay?.notes || '',
            stops: existingDay?.stops || [],
          });
        }
        setFormData(prev => ({ ...prev, days: newDays }));
      }
    }
  }, [formData.start_date, formData.end_date, formData.days.length]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      const result = await response.json();
      if (result.success) {
        setBrands(result.data || []);
        const defaultBrand = result.data?.find((b: Brand) => b.default_brand);
        if (defaultBrand) {
          setFormData(prev => ({ ...prev, brand_id: defaultBrand.id }));
        }
      }
    } catch (error) {
      logger.error('Failed to load brands', { error });
    }
  };

  const loadWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      const result = await response.json();
      if (result.success) {
        setWineries(result.data || []);
      }
    } catch (error) {
      logger.error('Failed to load wineries', { error });
    }
  };

  const loadRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const result = await response.json();
      if (result.success) {
        setRestaurants(result.data || []);
      }
    } catch (error) {
      logger.error('Failed to load restaurants', { error });
    }
  };

  const loadHotels = async () => {
    try {
      const response = await fetch('/api/hotels');
      const result = await response.json();
      if (result.success) {
        setHotels(result.data || []);
      }
    } catch (error) {
      logger.error('Failed to load hotels', { error });
    }
  };

  const addStop = (dayIndex: number, stopType: string) => {
    const newStop: StopData = {
      id: `stop-${Date.now()}`,
      stop_order: formData.days[dayIndex].stops.length + 1,
      stop_type: stopType,
      scheduled_time: '10:00',
      duration_minutes: 60,
      per_person_cost: 0,
      flat_cost: 0,
      reservation_status: 'pending',
    };

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, idx) =>
        idx === dayIndex
          ? { ...day, stops: [...day.stops, newStop] }
          : day
      ),
    }));
  };

  const updateStop = (dayIndex: number, stopIndex: number, updates: Partial<StopData>) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, dIdx) =>
        dIdx === dayIndex
          ? {
              ...day,
              stops: day.stops.map((stop, sIdx) =>
                sIdx === stopIndex ? { ...stop, ...updates } : stop
              ),
            }
          : day
      ),
    }));
  };

  const removeStop = (dayIndex: number, stopIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((day, dIdx) =>
        dIdx === dayIndex
          ? { ...day, stops: day.stops.filter((_, sIdx) => sIdx !== stopIndex) }
          : day
      ),
    }));
  };

  const addGuest = () => {
    const newGuest: GuestData = {
      id: `guest-${Date.now()}`,
      name: '',
      is_primary: formData.guests.length === 0,
    };
    setFormData(prev => ({ ...prev, guests: [...prev.guests, newGuest] }));
  };

  const updateGuest = (index: number, updates: Partial<GuestData>) => {
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.map((guest, idx) =>
        idx === index ? { ...guest, ...updates } : guest
      ),
    }));
  };

  const removeGuest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.filter((_, idx) => idx !== index),
    }));
  };

  const addInclusion = () => {
    const newInclusion: InclusionData = {
      id: `incl-${Date.now()}`,
      inclusion_type: 'custom',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion] }));
  };

  const updateInclusion = (index: number, updates: Partial<InclusionData>) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.map((incl, idx) => {
        if (idx !== index) return incl;
        const updated = { ...incl, ...updates };
        updated.total_price = updated.quantity * updated.unit_price;
        return updated;
      }),
    }));
  };

  const removeInclusion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, idx) => idx !== index),
    }));
  };

  const calculateTotals = () => {
    // Calculate stops total
    let stopsTotal = 0;
    formData.days.forEach(day => {
      day.stops.forEach(stop => {
        stopsTotal += stop.flat_cost + (stop.per_person_cost * formData.party_size);
      });
    });

    // Calculate inclusions total
    const inclusionsTotal = formData.inclusions.reduce(
      (sum, incl) => sum + incl.total_price,
      0
    );

    const subtotal = stopsTotal + inclusionsTotal;
    const afterDiscount = subtotal - formData.discount_amount;
    const taxes = afterDiscount * (formData.tax_rate / 100);
    const gratuity = afterDiscount * (formData.gratuity_percentage / 100);
    const total = afterDiscount + taxes + gratuity;
    const deposit = total * (formData.deposit_percentage / 100);

    return {
      stopsTotal,
      inclusionsTotal,
      subtotal,
      discount: formData.discount_amount,
      afterDiscount,
      taxes,
      gratuity,
      total,
      deposit,
      balance: total - deposit,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name) {
      alert('Please enter a customer name');
      return;
    }

    if (formData.days.length === 0) {
      alert('Please add at least one day');
      return;
    }

    setSaving(true);

    try {
      // Create the proposal
      const response = await fetch('/api/admin/trip-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: formData.brand_id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || null,
          customer_phone: formData.customer_phone || null,
          trip_type: formData.trip_type,
          party_size: formData.party_size,
          start_date: formData.start_date,
          end_date: formData.end_date !== formData.start_date ? formData.end_date : null,
          introduction: formData.introduction || null,
          internal_notes: formData.internal_notes || null,
          valid_until: formData.valid_until || null,
          deposit_percentage: formData.deposit_percentage,
          gratuity_percentage: formData.gratuity_percentage,
          tax_rate: formData.tax_rate,
          discount_amount: formData.discount_amount,
          discount_reason: formData.discount_reason || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create trip proposal');
      }

      const proposalId = result.data.id;

      // Add days with stops
      for (const day of formData.days) {
        const dayResponse = await fetch(`/api/admin/trip-proposals/${proposalId}/days`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: day.date,
            title: day.title || null,
            notes: day.notes || null,
          }),
        });

        const dayResult = await dayResponse.json();
        if (!dayResult.success) {
          throw new Error(`Failed to add day ${day.day_number}`);
        }

        const dayId = dayResult.data.id;

        // Add stops to this day
        for (const stop of day.stops) {
          await fetch(`/api/admin/trip-proposals/${proposalId}/days/${dayId}/stops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stop_type: stop.stop_type,
              winery_id: stop.winery_id || null,
              restaurant_id: stop.restaurant_id || null,
              hotel_id: stop.hotel_id || null,
              custom_name: stop.custom_name || null,
              custom_address: stop.custom_address || null,
              scheduled_time: stop.scheduled_time || null,
              duration_minutes: stop.duration_minutes || null,
              per_person_cost: stop.per_person_cost,
              flat_cost: stop.flat_cost,
              cost_notes: stop.cost_notes || null,
              reservation_status: stop.reservation_status,
              client_notes: stop.client_notes || null,
              internal_notes: stop.internal_notes || null,
              driver_notes: stop.driver_notes || null,
            }),
          });
        }
      }

      // Add guests
      for (const guest of formData.guests) {
        await fetch(`/api/admin/trip-proposals/${proposalId}/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: guest.name,
            email: guest.email || null,
            phone: guest.phone || null,
            dietary_restrictions: guest.dietary_restrictions || null,
            room_assignment: guest.room_assignment || null,
            is_primary: guest.is_primary,
          }),
        });
      }

      // Add inclusions
      for (const inclusion of formData.inclusions) {
        await fetch(`/api/admin/trip-proposals/${proposalId}/inclusions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inclusion_type: inclusion.inclusion_type,
            description: inclusion.description,
            quantity: inclusion.quantity,
            unit_price: inclusion.unit_price,
          }),
        });
      }

      // Calculate pricing
      await fetch(`/api/admin/trip-proposals/${proposalId}/pricing`, {
        method: 'POST',
      });

      alert(`Trip proposal created successfully! Proposal #${result.data.proposal_number}`);
      router.push('/admin/trip-proposals');
    } catch (error) {
      logger.error('Failed to create trip proposal', { error });
      alert(error instanceof Error ? error.message : 'Failed to create trip proposal');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/trip-proposals"
            className="inline-flex items-center text-[#8B1538] hover:text-[#7A1230] font-bold mb-4"
          >
            ← Back to Trip Proposals
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🗺️ Create Trip Proposal</h1>
          <p className="text-gray-600">Build a comprehensive multi-day trip experience</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-md">
                <div className="flex border-b border-gray-200">
                  {[
                    { key: 'details', label: '👤 Details', icon: '' },
                    { key: 'days', label: '📅 Days & Stops', icon: '' },
                    { key: 'guests', label: '👥 Guests', icon: '' },
                    { key: 'pricing', label: '💰 Pricing', icon: '' },
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
                  {/* Details Tab */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Brand Selection */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Send As (Brand)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {brands.map((brand) => (
                            <button
                              key={brand.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, brand_id: brand.id })}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                formData.brand_id === brand.id
                                  ? 'border-[#8B1538] bg-[#FDF2F4]'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: brand.primary_color || '#8B1538' }}
                                />
                                <span className="font-bold text-sm">{brand.display_name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Customer Name *
                          </label>
                          <input
                            type="text"
                            value={formData.customer_name}
                            onChange={(e) =>
                              setFormData({ ...formData, customer_name: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.customer_email}
                            onChange={(e) =>
                              setFormData({ ...formData, customer_email: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={formData.customer_phone}
                            onChange={(e) =>
                              setFormData({ ...formData, customer_phone: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Party Size *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.party_size}
                            onChange={(e) =>
                              setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                            required
                          />
                        </div>
                      </div>

                      {/* Trip Type */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Trip Type
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {TRIP_TYPES.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, trip_type: type.value })}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                formData.trip_type === type.value
                                  ? 'border-[#8B1538] bg-[#FDF2F4]'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-2xl mb-1">{type.icon}</div>
                              <div className="text-sm font-bold">{type.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) =>
                              setFormData({ ...formData, start_date: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={formData.end_date}
                            min={formData.start_date}
                            onChange={(e) =>
                              setFormData({ ...formData, end_date: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={formData.valid_until}
                            onChange={(e) =>
                              setFormData({ ...formData, valid_until: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                          />
                        </div>
                      </div>

                      {/* Introduction */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Introduction (shown to client)
                        </label>
                        <textarea
                          value={formData.introduction}
                          onChange={(e) =>
                            setFormData({ ...formData, introduction: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                      </div>

                      {/* Internal Notes */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Internal Notes (staff only)
                        </label>
                        <textarea
                          value={formData.internal_notes}
                          onChange={(e) =>
                            setFormData({ ...formData, internal_notes: e.target.value })
                          }
                          rows={2}
                          placeholder="Notes for staff reference..."
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Days Tab */}
                  {activeTab === 'days' && (
                    <div className="space-y-6">
                      {formData.days.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="text-4xl mb-2">📅</div>
                          <p className="text-gray-600 font-bold mb-2">No days configured</p>
                          <p className="text-sm text-gray-500">
                            Set start and end dates in the Details tab to create days
                          </p>
                        </div>
                      ) : (
                        formData.days.map((day, dayIndex) => (
                          <div
                            key={day.id}
                            className="border-2 border-gray-200 rounded-lg overflow-hidden"
                          >
                            <div className="bg-[#FDF2F4] p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">📅</span>
                                <div>
                                  <input
                                    type="text"
                                    value={day.title}
                                    onChange={(e) => {
                                      const newDays = [...formData.days];
                                      newDays[dayIndex].title = e.target.value;
                                      setFormData({ ...formData, days: newDays });
                                    }}
                                    className="font-bold text-gray-900 bg-transparent border-0 focus:ring-0 p-0"
                                  />
                                  <div className="text-sm text-gray-600">{day.date}</div>
                                </div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* Stops */}
                              {day.stops.map((stop, stopIndex) => (
                                <StopCard
                                  key={stop.id}
                                  stop={stop}
                                  partySize={formData.party_size}
                                  wineries={wineries}
                                  restaurants={restaurants}
                                  hotels={hotels}
                                  onUpdate={(updates) => updateStop(dayIndex, stopIndex, updates)}
                                  onRemove={() => removeStop(dayIndex, stopIndex)}
                                />
                              ))}

                              {/* Add Stop Buttons */}
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                                {STOP_TYPES.map((type) => (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => addStop(dayIndex, type.value)}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    {type.icon} {type.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Guests Tab */}
                  {activeTab === 'guests' && (
                    <div className="space-y-4">
                      {formData.guests.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="text-4xl mb-2">👥</div>
                          <p className="text-gray-600 font-bold mb-4">No guests added yet</p>
                          <button
                            type="button"
                            onClick={addGuest}
                            className="px-4 py-2 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors"
                          >
                            + Add Guest
                          </button>
                        </div>
                      ) : (
                        <>
                          {formData.guests.map((guest, index) => (
                            <div
                              key={guest.id}
                              className="border-2 border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">👤</span>
                                  <span className="font-bold">
                                    Guest {index + 1}
                                    {guest.is_primary && (
                                      <span className="ml-2 px-2 py-0.5 bg-[#8B1538] text-white text-xs rounded">
                                        Primary
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeGuest(index)}
                                  className="text-red-600 hover:text-red-800 font-bold text-sm"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={guest.name}
                                  onChange={(e) => updateGuest(index, { name: e.target.value })}
                                  placeholder="Name"
                                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                                />
                                <input
                                  type="email"
                                  value={guest.email || ''}
                                  onChange={(e) => updateGuest(index, { email: e.target.value })}
                                  placeholder="Email"
                                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                                />
                                <input
                                  type="tel"
                                  value={guest.phone || ''}
                                  onChange={(e) => updateGuest(index, { phone: e.target.value })}
                                  placeholder="Phone"
                                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                                />
                                <input
                                  type="text"
                                  value={guest.dietary_restrictions || ''}
                                  onChange={(e) =>
                                    updateGuest(index, { dietary_restrictions: e.target.value })
                                  }
                                  placeholder="Dietary restrictions"
                                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                                />
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addGuest}
                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-[#8B1538] text-gray-600 hover:text-[#8B1538] rounded-lg font-bold transition-colors"
                          >
                            + Add Another Guest
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Pricing Tab */}
                  {activeTab === 'pricing' && (
                    <div className="space-y-6">
                      {/* Inclusions */}
                      <div>
                        <h3 className="font-bold text-gray-900 mb-3">Included Services</h3>
                        <div className="space-y-3">
                          {formData.inclusions.map((inclusion, index) => (
                            <div
                              key={inclusion.id}
                              className="border-2 border-gray-200 rounded-lg p-3"
                            >
                              <div className="grid grid-cols-12 gap-3 items-center">
                                <div className="col-span-3">
                                  <select
                                    value={inclusion.inclusion_type}
                                    onChange={(e) =>
                                      updateInclusion(index, { inclusion_type: e.target.value })
                                    }
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    {INCLUSION_TYPES.map((type) => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    value={inclusion.description}
                                    onChange={(e) =>
                                      updateInclusion(index, { description: e.target.value })
                                    }
                                    placeholder="Description"
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={inclusion.quantity}
                                    onChange={(e) =>
                                      updateInclusion(index, {
                                        quantity: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={inclusion.unit_price}
                                      onChange={(e) =>
                                        updateInclusion(index, {
                                          unit_price: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-1 text-right font-bold text-sm">
                                  {formatCurrency(inclusion.total_price)}
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeInclusion(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addInclusion}
                            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 hover:border-[#8B1538] text-gray-600 hover:text-[#8B1538] rounded-lg font-medium text-sm transition-colors"
                          >
                            + Add Inclusion
                          </button>
                        </div>
                      </div>

                      {/* Discount */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Discount Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.discount_amount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  discount_amount: parseFloat(e.target.value) || 0,
                                })
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
                            value={formData.discount_reason}
                            onChange={(e) =>
                              setFormData({ ...formData, discount_reason: e.target.value })
                            }
                            placeholder="e.g., Repeat customer"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                          />
                        </div>
                      </div>

                      {/* Rates */}
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
                            value={formData.tax_rate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                tax_rate: parseFloat(e.target.value) || 0,
                              })
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
                            value={formData.gratuity_percentage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gratuity_percentage: parseInt(e.target.value) || 0,
                              })
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
                            value={formData.deposit_percentage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                deposit_percentage: parseInt(e.target.value) || 50,
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Pricing Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 border-2 border-[#8B1538]">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Pricing Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Stops & Venues</span>
                    <span className="font-bold">{formatCurrency(totals.stopsTotal)}</span>
                  </div>

                  <div className="flex justify-between text-gray-700">
                    <span>Inclusions</span>
                    <span className="font-bold">{formatCurrency(totals.inclusionsTotal)}</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between text-gray-900">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
                  </div>

                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-bold">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700">
                    <span>Tax ({formData.tax_rate}%)</span>
                    <span className="font-bold">{formatCurrency(totals.taxes)}</span>
                  </div>

                  {totals.gratuity > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Gratuity ({formData.gratuity_percentage}%)</span>
                      <span className="font-bold">{formatCurrency(totals.gratuity)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-[#8B1538] pt-3 flex justify-between">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#8B1538]">
                      {formatCurrency(totals.total)}
                    </span>
                  </div>

                  <div className="bg-[#FDF2F4] rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        Deposit ({formData.deposit_percentage}%)
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(totals.deposit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Balance Due</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(totals.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Days:</span>{' '}
                      <span className="font-bold">{formData.days.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Guests:</span>{' '}
                      <span className="font-bold">{formData.party_size}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Stops:</span>{' '}
                      <span className="font-bold">
                        {formData.days.reduce((sum, day) => sum + day.stops.length, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Trip Type:</span>{' '}
                      <span className="font-bold capitalize">{formData.trip_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !formData.customer_name}
                  className="w-full px-6 py-4 bg-[#8B1538] hover:bg-[#7A1230] disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
                >
                  {saving ? '⏳ Creating...' : '📝 Create Trip Proposal'}
                </button>

                {!formData.customer_name && (
                  <p className="text-sm text-center text-gray-600 mt-3">
                    Enter a customer name to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Stop Card Component
interface StopCardProps {
  stop: StopData;
  partySize: number;
  wineries: Winery[];
  restaurants: Restaurant[];
  hotels: Hotel[];
  onUpdate: (updates: Partial<StopData>) => void;
  onRemove: () => void;
}

function StopCard({
  stop,
  partySize,
  wineries,
  restaurants,
  hotels,
  onUpdate,
  onRemove,
}: StopCardProps) {
  const stopType = STOP_TYPES.find((t) => t.value === stop.stop_type);
  const totalCost = stop.flat_cost + stop.per_person_cost * partySize;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{stopType?.icon || '📍'}</span>
          <span className="font-bold text-sm">{stopType?.label || 'Stop'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#8B1538]">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Venue Selection based on type */}
        {stop.stop_type === 'winery' && (
          <div className="col-span-2">
            <select
              value={stop.winery_id || ''}
              onChange={(e) => onUpdate({ winery_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select winery...</option>
              {wineries.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {stop.stop_type === 'restaurant' && (
          <div className="col-span-2">
            <select
              value={stop.restaurant_id || ''}
              onChange={(e) => onUpdate({ restaurant_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select restaurant...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} - {r.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {stop.stop_type === 'hotel' && (
          <div className="col-span-2">
            <select
              value={stop.hotel_id || ''}
              onChange={(e) => onUpdate({ hotel_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select hotel...</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} - {h.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {['custom', 'activity', 'pickup', 'dropoff'].includes(stop.stop_type) && (
          <>
            <div>
              <input
                type="text"
                value={stop.custom_name || ''}
                onChange={(e) => onUpdate({ custom_name: e.target.value })}
                placeholder="Name"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <input
                type="text"
                value={stop.custom_address || ''}
                onChange={(e) => onUpdate({ custom_address: e.target.value })}
                placeholder="Address"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </>
        )}

        {/* Time and Duration */}
        <div>
          <input
            type="time"
            value={stop.scheduled_time || ''}
            onChange={(e) => onUpdate({ scheduled_time: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>

        <div>
          <input
            type="number"
            min="0"
            value={stop.duration_minutes || ''}
            onChange={(e) => onUpdate({ duration_minutes: parseInt(e.target.value) || undefined })}
            placeholder="Min"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>

        {/* Pricing */}
        <div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              $/pp
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={stop.per_person_cost || ''}
              onChange={(e) => onUpdate({ per_person_cost: parseFloat(e.target.value) || 0 })}
              className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={stop.flat_cost || ''}
              onChange={(e) => onUpdate({ flat_cost: parseFloat(e.target.value) || 0 })}
              placeholder="Flat"
              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-2">
        <input
          type="text"
          value={stop.client_notes || ''}
          onChange={(e) => onUpdate({ client_notes: e.target.value })}
          placeholder="Notes for client..."
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
    </div>
  );
}
