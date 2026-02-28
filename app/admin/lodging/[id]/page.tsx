'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { logger } from '@/lib/logger';

interface LodgingProperty {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  address?: string;
  city: string;
  state: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  short_description?: string;
  amenities: string[];
  property_features: string[];
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  min_stay_nights: number;
  price_range_min?: number;
  price_range_max?: number;
  booking_url?: string;
  booking_platform?: string;
  affiliate_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  cover_image_url?: string;
  images: string[];
  check_in_time?: string;
  check_out_time?: string;
  cancellation_policy?: string;
  pet_policy?: string;
  is_verified: boolean;
  is_active: boolean;
  is_featured: boolean;
}

interface AvailabilityEntry {
  id: number;
  property_id: number;
  date: string;
  status: string;
  nightly_rate?: number;
  min_stay?: number;
  notes?: string;
}

interface ClickStats {
  total: number;
  recent: Array<{ date: string; click_count: number }>;
}

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'str', label: 'Short-Term Rental' },
  { value: 'bnb', label: 'B&B' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'resort', label: 'Resort' },
];

const COMMON_AMENITIES = [
  'WiFi', 'Air Conditioning', 'Heating', 'Kitchen', 'Washer/Dryer',
  'Free Parking', 'Pool', 'Hot Tub', 'Fireplace', 'Gym',
  'Breakfast Included', 'Pet Friendly', 'EV Charging', 'Patio/Deck',
  'BBQ Grill', 'TV', 'Workspace', 'Coffee Maker', 'Dishwasher', 'Elevator',
];

const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'booked', label: 'Booked', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'blocked', label: 'Blocked', color: 'bg-slate-200 text-slate-700 border-slate-300' },
];

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function EditLodgingPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<LodgingProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    property_type: 'hotel',
    address: '',
    city: 'Walla Walla',
    state: 'WA',
    zip_code: '',
    latitude: '',
    longitude: '',
    description: '',
    short_description: '',
    amenities: [] as string[],
    property_features: '',
    bedrooms: '',
    bathrooms: '',
    max_guests: '',
    min_stay_nights: '1',
    price_range_min: '',
    price_range_max: '',
    booking_url: '',
    booking_platform: '',
    affiliate_code: '',
    phone: '',
    email: '',
    website: '',
    cover_image_url: '',
    images: '',
    check_in_time: '',
    check_out_time: '',
    cancellation_policy: '',
    pet_policy: '',
  });

  // Availability calendar state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [selectedAvailStatus, setSelectedAvailStatus] = useState<string>('available');
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Click stats state
  const [clickStats, setClickStats] = useState<ClickStats>({ total: 0, recent: [] });

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/lodging/${propertyId}`);
      if (response.ok) {
        const data = await response.json();
        const p = data.data.property;
        setProperty(p);
        setFormData({
          name: p.name || '',
          slug: p.slug || '',
          property_type: p.property_type || 'hotel',
          address: p.address || '',
          city: p.city || 'Walla Walla',
          state: p.state || 'WA',
          zip_code: p.zip_code || '',
          latitude: p.latitude?.toString() || '',
          longitude: p.longitude?.toString() || '',
          description: p.description || '',
          short_description: p.short_description || '',
          amenities: p.amenities || [],
          property_features: (p.property_features || []).join(', '),
          bedrooms: p.bedrooms?.toString() || '',
          bathrooms: p.bathrooms?.toString() || '',
          max_guests: p.max_guests?.toString() || '',
          min_stay_nights: (p.min_stay_nights || 1).toString(),
          price_range_min: p.price_range_min?.toString() || '',
          price_range_max: p.price_range_max?.toString() || '',
          booking_url: p.booking_url || '',
          booking_platform: p.booking_platform || '',
          affiliate_code: p.affiliate_code || '',
          phone: p.phone || '',
          email: p.email || '',
          website: p.website || '',
          cover_image_url: p.cover_image_url || '',
          images: (p.images || []).join(', '),
          check_in_time: p.check_in_time || '',
          check_out_time: p.check_out_time || '',
          cancellation_policy: p.cancellation_policy || '',
          pet_policy: p.pet_policy || '',
        });
      } else {
        setError('Property not found');
      }
    } catch (err) {
      logger.error('Failed to fetch property', { error: err });
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const fetchAvailability = useCallback(async () => {
    if (!property || property.property_type !== 'str') return;
    setLoadingAvailability(true);
    try {
      const startDate = formatDateForInput(new Date(calendarYear, calendarMonth, 1));
      const endDate = formatDateForInput(new Date(calendarYear, calendarMonth + 1, 0));

      const response = await fetch(
        `/api/admin/lodging/${propertyId}/availability?start_date=${startDate}&end_date=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.data.availability);
      }
    } catch (err) {
      logger.error('Failed to fetch availability', { error: err });
    } finally {
      setLoadingAvailability(false);
    }
  }, [propertyId, property, calendarYear, calendarMonth]);

  const fetchClickStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/lodging/analytics?days=30`);
      if (response.ok) {
        const data = await response.json();
        const stats = data.data.click_stats || [];
        const propertyStats = stats.find(
          (s: { property_id: number }) => s.property_id === parseInt(propertyId, 10)
        );
        setClickStats({
          total: propertyStats?.total_clicks || 0,
          recent: data.data.click_trends || [],
        });
      }
    } catch (err) {
      logger.error('Failed to fetch click stats', { error: err });
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  useEffect(() => {
    if (property) {
      fetchAvailability();
      fetchClickStats();
    }
  }, [property, fetchAvailability, fetchClickStats]);

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const current = prev.amenities;
      if (current.includes(amenity)) {
        return { ...prev, amenities: current.filter((a) => a !== amenity) };
      }
      return { ...prev, amenities: [...current, amenity] };
    });
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: formData.name,
      slug: formData.slug,
      property_type: formData.property_type,
      city: formData.city,
      state: formData.state,
      amenities: formData.amenities,
      min_stay_nights: parseInt(formData.min_stay_nights, 10) || 1,
      address: formData.address || undefined,
      zip_code: formData.zip_code || undefined,
      description: formData.description || undefined,
      short_description: formData.short_description || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
      check_in_time: formData.check_in_time || undefined,
      check_out_time: formData.check_out_time || undefined,
      cancellation_policy: formData.cancellation_policy || undefined,
      pet_policy: formData.pet_policy || undefined,
      booking_platform: formData.booking_platform || undefined,
      affiliate_code: formData.affiliate_code || undefined,
    };

    if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
    if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
    if (formData.property_features) {
      payload.property_features = formData.property_features.split(',').map((f) => f.trim()).filter(Boolean);
    } else {
      payload.property_features = [];
    }
    if (formData.bedrooms) payload.bedrooms = parseInt(formData.bedrooms, 10);
    if (formData.bathrooms) payload.bathrooms = parseFloat(formData.bathrooms);
    if (formData.max_guests) payload.max_guests = parseInt(formData.max_guests, 10);
    if (formData.price_range_min) payload.price_range_min = parseFloat(formData.price_range_min);
    if (formData.price_range_max) payload.price_range_max = parseFloat(formData.price_range_max);
    if (formData.booking_url) payload.booking_url = formData.booking_url;
    if (formData.cover_image_url) payload.cover_image_url = formData.cover_image_url;
    if (formData.images) {
      payload.images = formData.images.split(',').map((u) => u.trim()).filter(Boolean);
    } else {
      payload.images = [];
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setSubmitting(true);

    try {
      const payload = buildPayload();
      const response = await fetch(`/api/admin/lodging/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Property updated successfully');
        setProperty(data.data.property);
        setTimeout(() => setSuccess(null), 3000);
      } else if (data.details) {
        setValidationErrors(data.details);
        setError(data.error || 'Validation failed');
      } else {
        setError(data.error?.message || data.error || 'Failed to update property');
      }
    } catch (err) {
      logger.error('Failed to update property', { error: err });
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/lodging/${propertyId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/admin/lodging');
      } else {
        const data = await response.json();
        setError(data.error?.message || data.error || 'Failed to delete property');
      }
    } catch (err) {
      logger.error('Failed to delete property', { error: err });
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  // Availability calendar handlers
  const handleDateClick = async (day: number) => {
    const dateStr = formatDateForInput(new Date(calendarYear, calendarMonth, day));
    const _existing = availability.find((a) => a.date === dateStr);

    // Cycle through statuses or set to selected status
    const newStatus = selectedAvailStatus;

    setSavingAvailability(true);
    try {
      const response = await fetch(`/api/admin/lodging/${propertyId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{ date: dateStr, status: newStatus }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const updated = data.data.availability;
        setAvailability((prev) => {
          const filtered = prev.filter((a) => a.date !== dateStr);
          return [...filtered, ...updated];
        });
      }
    } catch (err) {
      logger.error('Failed to set availability', { error: err });
    } finally {
      setSavingAvailability(false);
    }
  };

  const getDateStatus = (day: number): string | null => {
    const dateStr = formatDateForInput(new Date(calendarYear, calendarMonth, day));
    const entry = availability.find((a) => a.date === dateStr);
    return entry?.status || null;
  };

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'booked':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'blocked':
        return 'bg-slate-200 text-slate-600 border-slate-300';
      default:
        return 'bg-white text-slate-700 border-slate-200';
    }
  };

  const navigateMonth = (direction: number) => {
    let newMonth = calendarMonth + direction;
    let newYear = calendarYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  const fieldError = (field: string) => {
    const errors = validationErrors[field];
    if (!errors || errors.length === 0) return null;
    return <p className="text-sm text-red-600 mt-1">{errors[0]}</p>;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading property...</div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Property not found.</p>
        <button
          onClick={() => router.push('/admin/lodging')}
          className="text-[#1E3A5F] hover:text-[#2d4a6f] font-medium"
        >
          Back to Lodging
        </button>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const monthName = new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long' });

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/lodging')}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
        >
          &larr; Back to Lodging
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Property: {property.name}</h1>
        <p className="text-slate-500 mt-1">
          {property.is_active ? 'Active' : 'Inactive'}
          {property.is_verified && ' | Verified'}
          {property.is_featured && ' | Featured'}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Property Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('name')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('slug')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Property Type *</label>
              <select
                value={formData.property_type}
                onChange={(e) => updateField('property_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('email')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-900 mb-1">Short Description</label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) => updateField('short_description', e.target.value)}
              maxLength={500}
              placeholder="Brief overview (max 500 characters)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
            {fieldError('short_description')}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-900 mb-1">Full Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => updateField('zip_code', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Latitude</label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
                placeholder="e.g. 46.0646"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Longitude</label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => updateField('longitude', e.target.value)}
                placeholder="e.g. -118.3430"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Bedrooms</label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => updateField('bedrooms', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Bathrooms</label>
              <input
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => updateField('bathrooms', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Max Guests</label>
              <input
                type="number"
                value={formData.max_guests}
                onChange={(e) => updateField('max_guests', e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Min Stay (nights)</label>
              <input
                type="number"
                value={formData.min_stay_nights}
                onChange={(e) => updateField('min_stay_nights', e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-2">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMMON_AMENITIES.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-1">Property Features</label>
            <input
              type="text"
              value={formData.property_features}
              onChange={(e) => updateField('property_features', e.target.value)}
              placeholder="Comma-separated: River view, Wine cellar, Historic building"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Enter features separated by commas</p>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Minimum Price ($/night)</label>
              <input
                type="number"
                value={formData.price_range_min}
                onChange={(e) => updateField('price_range_min', e.target.value)}
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Maximum Price ($/night)</label>
              <input
                type="number"
                value={formData.price_range_max}
                onChange={(e) => updateField('price_range_max', e.target.value)}
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Booking */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900 mb-1">Booking URL</label>
              <input
                type="url"
                value={formData.booking_url}
                onChange={(e) => updateField('booking_url', e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('booking_url')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Booking Platform</label>
              <input
                type="text"
                value={formData.booking_platform}
                onChange={(e) => updateField('booking_platform', e.target.value)}
                placeholder="e.g. Airbnb, VRBO, Direct"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Affiliate Code</label>
              <input
                type="text"
                value={formData.affiliate_code}
                onChange={(e) => updateField('affiliate_code', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Media */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Media</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Cover Image URL</label>
              <input
                type="url"
                value={formData.cover_image_url}
                onChange={(e) => updateField('cover_image_url', e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('cover_image_url')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Additional Images</label>
              <textarea
                value={formData.images}
                onChange={(e) => updateField('images', e.target.value)}
                rows={3}
                placeholder="Enter image URLs separated by commas"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of image URLs</p>
            </div>
          </div>
        </section>

        {/* Policies */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Check-in Time</label>
              <input
                type="text"
                value={formData.check_in_time}
                onChange={(e) => updateField('check_in_time', e.target.value)}
                placeholder="e.g. 3:00 PM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Check-out Time</label>
              <input
                type="text"
                value={formData.check_out_time}
                onChange={(e) => updateField('check_out_time', e.target.value)}
                placeholder="e.g. 11:00 AM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-900 mb-1">Cancellation Policy</label>
            <textarea
              value={formData.cancellation_policy}
              onChange={(e) => updateField('cancellation_policy', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-900 mb-1">Pet Policy</label>
            <input
              type="text"
              value={formData.pet_policy}
              onChange={(e) => updateField('pet_policy', e.target.value)}
              placeholder="e.g. Pets welcome with $50 fee, No pets, Service animals only"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#722F37] transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/lodging')}
            className="px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Availability Calendar (STR only) */}
      {property.property_type === 'str' && (
        <section className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Availability Calendar</h2>

          {/* Status selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-slate-700">Set dates to:</span>
            {AVAILABILITY_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSelectedAvailStatus(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedAvailStatus === s.value
                    ? s.color + ' ring-2 ring-offset-1 ring-slate-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              &larr; Previous
            </button>
            <h3 className="text-base font-semibold text-slate-900">
              {monthName} {calendarYear}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Next &rarr;
            </button>
          </div>

          {/* Calendar grid */}
          {loadingAvailability ? (
            <div className="p-4 text-center text-slate-500">Loading availability...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for first week offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDateStatus(day);
                const colorClass = getStatusColor(status);
                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    disabled={savingAvailability}
                    className={`h-10 rounded-lg text-sm font-medium border transition-colors hover:opacity-80 disabled:opacity-50 ${colorClass}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Legend:</span>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
              <span className="text-xs text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
              <span className="text-xs text-slate-600">Booked</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-slate-200 border border-slate-300" />
              <span className="text-xs text-slate-600">Blocked</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-white border border-slate-200" />
              <span className="text-xs text-slate-600">Unset</span>
            </div>
          </div>
        </section>
      )}

      {/* Click Stats */}
      <section className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Click Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">Total Clicks (All Time)</p>
            <p className="text-3xl font-bold text-slate-900">{clickStats.total}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-2">Recent Clicks (Last 30 Days)</p>
            {clickStats.recent.length > 0 ? (
              <div className="space-y-1">
                {clickStats.recent.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{day.date}</span>
                    <span className="font-medium text-slate-900">{day.click_count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No clicks recorded yet</p>
            )}
          </div>
        </div>
      </section>

      {/* Delete Property */}
      <section className="mt-8 bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-600 mb-4">
          Deactivating this property will hide it from the public directory. This action can be undone.
        </p>
        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-700 font-medium">
              Are you sure you want to deactivate this property?
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deactivating...' : 'Yes, Deactivate'}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-4 py-2 bg-white text-slate-600 text-sm border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm rounded-lg font-medium hover:bg-red-100 transition-colors"
          >
            Deactivate Property
          </button>
        )}
      </section>
    </div>
  );
}
