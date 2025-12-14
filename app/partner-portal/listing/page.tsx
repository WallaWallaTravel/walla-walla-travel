'use client';

import { useState, useEffect } from 'react';

interface ListingData {
  description: string;
  short_description: string;
  specialties: string[];
  hours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  price_range: string;
  reservation_required: boolean;
  tasting_fee: string;
  features: string[];
  ai_notes: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const FEATURE_OPTIONS = [
  'Outdoor Seating',
  'Private Tastings',
  'Group Tours',
  'Food Pairings',
  'Pet Friendly',
  'Wheelchair Accessible',
  'Events Space',
  'Gift Shop',
  'Wine Club',
  'Live Music',
];

export default function PartnerListingPage() {
  const [listing, setListing] = useState<ListingData>({
    description: '',
    short_description: '',
    specialties: [],
    hours: DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { open: '10:00', close: '17:00', closed: false }
    }), {}),
    price_range: '$$',
    reservation_required: false,
    tasting_fee: '',
    features: [],
    ai_notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await fetch('/api/partner/listing');
        if (response.ok) {
          const data = await response.json();
          if (data.listing) {
            setListing({ ...listing, ...data.listing });
          }
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/partner/listing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Listing updated successfully!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update listing' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function addSpecialty() {
    if (newSpecialty.trim() && !listing.specialties.includes(newSpecialty.trim())) {
      setListing({
        ...listing,
        specialties: [...listing.specialties, newSpecialty.trim()]
      });
      setNewSpecialty('');
    }
  }

  function removeSpecialty(specialty: string) {
    setListing({
      ...listing,
      specialties: listing.specialties.filter(s => s !== specialty)
    });
  }

  function toggleFeature(feature: string) {
    if (listing.features.includes(feature)) {
      setListing({
        ...listing,
        features: listing.features.filter(f => f !== feature)
      });
    } else {
      setListing({
        ...listing,
        features: [...listing.features, feature]
      });
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Directory Listing</h1>
        <p className="text-slate-500 mt-1">
          This information is used by our AI to recommend your business to visitors
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Description</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short Description (for search results)
              </label>
              <input
                type="text"
                value={listing.short_description}
                onChange={(e) => setListing({ ...listing, short_description: e.target.value })}
                maxLength={150}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                placeholder="A brief tagline for your business..."
              />
              <p className="text-xs text-slate-400 mt-1">{listing.short_description.length}/150 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Description
              </label>
              <textarea
                value={listing.description}
                onChange={(e) => setListing({ ...listing, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none resize-none"
                placeholder="Tell visitors what makes your business special..."
              />
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Specialties & Highlights</h2>
          <p className="text-sm text-slate-500 mb-4">
            Add tags that describe what you&apos;re known for (e.g., &quot;Cabernet Sauvignon&quot;, &quot;Farm-to-table&quot;, &quot;Mountain views&quot;)
          </p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
              placeholder="Add a specialty..."
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {listing.specialties.map((specialty) => (
              <span
                key={specialty}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
              >
                {specialty}
                <button
                  type="button"
                  onClick={() => removeSpecialty(specialty)}
                  className="w-4 h-4 flex items-center justify-center hover:bg-emerald-200 rounded-full"
                >
                  ×
                </button>
              </span>
            ))}
            {listing.specialties.length === 0 && (
              <span className="text-slate-400 text-sm">No specialties added yet</span>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Features & Amenities</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FEATURE_OPTIONS.map((feature) => (
              <label
                key={feature}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  listing.features.includes(feature)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={listing.features.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">{feature}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Hours of Operation</h2>
          
          <div className="space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24 font-medium text-slate-700 capitalize">{day}</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={listing.hours[day]?.closed}
                    onChange={(e) => setListing({
                      ...listing,
                      hours: {
                        ...listing.hours,
                        [day]: { ...listing.hours[day], closed: e.target.checked }
                      }
                    })}
                    className="w-4 h-4 text-slate-600 rounded"
                  />
                  <span className="text-sm text-slate-500">Closed</span>
                </label>
                {!listing.hours[day]?.closed && (
                  <>
                    <input
                      type="time"
                      value={listing.hours[day]?.open || '10:00'}
                      onChange={(e) => setListing({
                        ...listing,
                        hours: {
                          ...listing.hours,
                          [day]: { ...listing.hours[day], open: e.target.value }
                        }
                      })}
                      className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={listing.hours[day]?.close || '17:00'}
                      onChange={(e) => setListing({
                        ...listing,
                        hours: {
                          ...listing.hours,
                          [day]: { ...listing.hours[day], close: e.target.value }
                        }
                      })}
                      className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Notes for AI</h2>
          <p className="text-sm text-slate-500 mb-4">
            Share anything else our AI should know when recommending your business 
            (insider tips, best times to visit, what to pair with what, etc.)
          </p>
          
          <textarea
            value={listing.ai_notes}
            onChange={(e) => setListing({ ...listing, ai_notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none resize-none"
            placeholder="e.g., 'Our sunset tastings on Fridays are the most popular. The 2021 Reserve Cab pairs perfectly with our cheese board...'"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}




