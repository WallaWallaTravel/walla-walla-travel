'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'str', label: 'Short-Term Rental' },
  { value: 'bnb', label: 'B&B' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'resort', label: 'Resort' },
];

const COMMON_AMENITIES = [
  'WiFi',
  'Air Conditioning',
  'Heating',
  'Kitchen',
  'Washer/Dryer',
  'Free Parking',
  'Pool',
  'Hot Tub',
  'Fireplace',
  'Gym',
  'Breakfast Included',
  'Pet Friendly',
  'EV Charging',
  'Patio/Deck',
  'BBQ Grill',
  'TV',
  'Workspace',
  'Coffee Maker',
  'Dishwasher',
  'Elevator',
];

interface FormData {
  name: string;
  slug: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: string;
  longitude: string;
  description: string;
  short_description: string;
  amenities: string[];
  property_features: string;
  bedrooms: string;
  bathrooms: string;
  max_guests: string;
  min_stay_nights: string;
  price_range_min: string;
  price_range_max: string;
  booking_url: string;
  booking_platform: string;
  affiliate_code: string;
  phone: string;
  email: string;
  website: string;
  cover_image_url: string;
  images: string;
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string;
  pet_policy: string;
}

const initialFormData: FormData = {
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
  amenities: [],
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
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function NewLodgingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from name
      if (field === 'name' && typeof value === 'string') {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
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
    };

    if (formData.address) payload.address = formData.address;
    if (formData.zip_code) payload.zip_code = formData.zip_code;
    if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
    if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
    if (formData.description) payload.description = formData.description;
    if (formData.short_description) payload.short_description = formData.short_description;
    if (formData.property_features) {
      payload.property_features = formData.property_features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    } else {
      payload.property_features = [];
    }
    if (formData.bedrooms) payload.bedrooms = parseInt(formData.bedrooms, 10);
    if (formData.bathrooms) payload.bathrooms = parseFloat(formData.bathrooms);
    if (formData.max_guests) payload.max_guests = parseInt(formData.max_guests, 10);
    if (formData.price_range_min) payload.price_range_min = parseFloat(formData.price_range_min);
    if (formData.price_range_max) payload.price_range_max = parseFloat(formData.price_range_max);
    if (formData.booking_url) payload.booking_url = formData.booking_url;
    if (formData.booking_platform) payload.booking_platform = formData.booking_platform;
    if (formData.affiliate_code) payload.affiliate_code = formData.affiliate_code;
    if (formData.phone) payload.phone = formData.phone;
    if (formData.email) payload.email = formData.email;
    if (formData.website) payload.website = formData.website;
    if (formData.cover_image_url) payload.cover_image_url = formData.cover_image_url;
    if (formData.images) {
      payload.images = formData.images
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
    } else {
      payload.images = [];
    }
    if (formData.check_in_time) payload.check_in_time = formData.check_in_time;
    if (formData.check_out_time) payload.check_out_time = formData.check_out_time;
    if (formData.cancellation_policy) payload.cancellation_policy = formData.cancellation_policy;
    if (formData.pet_policy) payload.pet_policy = formData.pet_policy;

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setSubmitting(true);

    try {
      const payload = buildPayload();

      const response = await fetch('/api/admin/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/lodging');
      } else if (data.details) {
        setValidationErrors(data.details);
        setError(data.error || 'Validation failed');
      } else {
        setError(data.error?.message || data.error || 'Failed to create property');
      }
    } catch (err) {
      logger.error('Failed to create property', { error: err });
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field: string) => {
    const errors = validationErrors[field];
    if (!errors || errors.length === 0) return null;
    return (
      <p className="text-sm text-red-600 mt-1">{errors[0]}</p>
    );
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Add New Property</h1>
        <p className="text-slate-500 mt-1">Create a new lodging listing for the directory</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Property Name *
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Slug *
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Property Type *
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => updateField('property_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {fieldError('property_type')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
              {fieldError('email')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Website
              </label>
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
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Short Description
            </label>
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
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Full Description
            </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => updateField('zip_code', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
                placeholder="e.g. 46.0646"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Longitude
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => updateField('bedrooms', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Bathrooms
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Max Guests
              </label>
              <input
                type="number"
                value={formData.max_guests}
                onChange={(e) => updateField('max_guests', e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Min Stay (nights)
              </label>
              <input
                type="number"
                value={formData.min_stay_nights}
                onChange={(e) => updateField('min_stay_nights', e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMMON_AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
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

          {/* Property Features (tag input) */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Property Features
            </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Minimum Price ($/night)
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Maximum Price ($/night)
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Booking URL
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Booking Platform
              </label>
              <input
                type="text"
                value={formData.booking_platform}
                onChange={(e) => updateField('booking_platform', e.target.value)}
                placeholder="e.g. Airbnb, VRBO, Direct"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Affiliate Code
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Cover Image URL
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Additional Images
              </label>
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
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Check-in Time
              </label>
              <input
                type="text"
                value={formData.check_in_time}
                onChange={(e) => updateField('check_in_time', e.target.value)}
                placeholder="e.g. 3:00 PM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Check-out Time
              </label>
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
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Cancellation Policy
            </label>
            <textarea
              value={formData.cancellation_policy}
              onChange={(e) => updateField('cancellation_policy', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Pet Policy
            </label>
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
            {submitting ? 'Creating...' : 'Create Property'}
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
    </div>
  );
}
