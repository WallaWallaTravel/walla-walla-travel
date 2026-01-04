'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EXPERIENCE_TAGS, EXPERIENCE_TAG_LABELS } from '@/lib/config/content-types';

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
  experience_tags: string[];
  min_group_size: number | null;
  max_group_size: number | null;
  booking_advance_days_min: number | null;
  booking_advance_days_max: number | null;
  cancellation_policy: string;
  pet_policy: string;
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

const CANCELLATION_POLICIES = [
  { value: '', label: 'Select a policy...' },
  { value: 'flexible', label: 'Flexible - Free cancellation up to 24 hours before' },
  { value: 'moderate', label: 'Moderate - Free cancellation up to 48 hours before' },
  { value: 'strict', label: 'Strict - Free cancellation up to 7 days before' },
];

const PET_POLICIES = [
  { value: '', label: 'Select a policy...' },
  { value: 'welcome', label: 'Pets Welcome' },
  { value: 'outdoor_only', label: 'Pets Allowed Outdoors Only' },
  { value: 'service_animals_only', label: 'Service Animals Only' },
  { value: 'not_allowed', label: 'No Pets Allowed' },
];

type SectionId = 'essentials' | 'experience' | 'logistics' | 'advanced';

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
    experience_tags: [],
    min_group_size: null,
    max_group_size: null,
    booking_advance_days_min: null,
    booking_advance_days_max: null,
    cancellation_policy: '',
    pet_policy: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['essentials']));

  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await fetch('/api/partner/listing');
        if (response.ok) {
          const data = await response.json();
          if (data.listing) {
            setListing(prev => ({ ...prev, ...data.listing }));
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

  function toggleExperienceTag(tag: string) {
    if (listing.experience_tags.includes(tag)) {
      setListing({
        ...listing,
        experience_tags: listing.experience_tags.filter(t => t !== tag)
      });
    } else {
      setListing({
        ...listing,
        experience_tags: [...listing.experience_tags, tag]
      });
    }
  }

  function toggleSection(section: SectionId) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }

  function getSectionCompletion(section: SectionId): { complete: number; total: number } {
    if (!listing) return { complete: 0, total: 0 };
    switch (section) {
      case 'essentials':
        return {
          complete: [
            (listing.short_description || '').length > 10,
            (listing.description || '').length > 50,
            (listing.specialties || []).length > 0,
          ].filter(Boolean).length,
          total: 3
        };
      case 'experience':
        return {
          complete: [
            (listing.experience_tags || []).length > 0,
            (listing.features || []).length > 0,
          ].filter(Boolean).length,
          total: 2
        };
      case 'logistics':
        return {
          complete: [
            Object.values(listing.hours || {}).some(h => !h.closed),
            (listing.cancellation_policy || '') !== '',
          ].filter(Boolean).length,
          total: 2
        };
      case 'advanced':
        return {
          complete: [
            listing.max_group_size !== null,
            (listing.ai_notes || '').length > 20,
          ].filter(Boolean).length,
          total: 2
        };
      default:
        return { complete: 0, total: 0 };
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

  // Guard against listing not being properly loaded
  if (!listing || typeof listing !== 'object') {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const sections: { id: SectionId; title: string; icon: string; description: string; priority: string }[] = [
    { id: 'essentials', title: 'The Essentials', icon: '🎯', description: 'What visitors see first in search results', priority: 'Required' },
    { id: 'experience', title: 'Experience & Vibe', icon: '✨', description: 'Help visitors know what to expect', priority: 'Recommended' },
    { id: 'logistics', title: 'Hours & Policies', icon: '📅', description: 'Practical info visitors need to plan', priority: 'Required' },
    { id: 'advanced', title: 'AI Matching', icon: '🤖', description: 'Help our AI recommend you accurately', priority: 'Optional' },
  ];

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Directory Listing</h1>
      </div>

      {/* WHY THIS MATTERS */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 border border-emerald-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
            🎯
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">This Is Your First Impression</h2>
            <p className="text-slate-600 mt-2">
              When visitors search for wineries, your listing info determines whether they click on you or scroll past.
              A complete listing with experience tags helps our AI match you with visitors who&apos;ll love what you offer.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Progress */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sections.map((section) => {
            const { complete, total } = getSectionCompletion(section.id);
            const isComplete = complete === total;
            return (
              <div
                key={section.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : complete > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-500'
                }`}
                title={`${section.title}: ${complete}/${total}`}
              >
                {isComplete ? '✓' : complete}
              </div>
            );
          })}
        </div>
        <Link
          href="/partner-portal/preview"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Preview listing →
        </Link>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section Cards */}
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const { complete, total } = getSectionCompletion(section.id);

          return (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Section Header - Clickable */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{section.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{section.title}</h2>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        section.priority === 'Required'
                          ? 'bg-red-100 text-red-700'
                          : section.priority === 'Recommended'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {section.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${complete === total ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {complete}/{total}
                  </span>
                  <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                  {section.id === 'essentials' && (
                    <div className="space-y-6">
                      {/* Short Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tagline <span className="text-slate-400 font-normal">— The first thing visitors see</span>
                        </label>
                        <input
                          type="text"
                          value={listing.short_description}
                          onChange={(e) => setListing({ ...listing, short_description: e.target.value })}
                          maxLength={150}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                          placeholder="e.g., Family-owned estate specializing in bold Syrahs and mountain views"
                        />
                        <p className="text-xs text-slate-400 mt-1">{listing.short_description.length}/150</p>
                      </div>

                      {/* Full Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Full Description
                        </label>
                        <textarea
                          value={listing.description}
                          onChange={(e) => setListing({ ...listing, description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none resize-none"
                          placeholder="Tell visitors what makes your winery special..."
                        />
                      </div>

                      {/* Specialties */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          What You&apos;re Known For
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Wine varietals, experiences, or anything that makes you stand out
                        </p>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                            placeholder="e.g., Estate Syrah, Sunset Tastings, Cave Tours"
                          />
                          <button
                            type="button"
                            onClick={addSpecialty}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
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
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'experience' && (
                    <div className="space-y-6">
                      {/* Experience Tags */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Experience Style <span className="text-slate-400 font-normal">— What&apos;s the vibe?</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(EXPERIENCE_TAGS).map(([key, value]) => (
                            <label
                              key={key}
                              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                listing.experience_tags.includes(value)
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={listing.experience_tags.includes(value)}
                                onChange={() => toggleExperienceTag(value)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                              />
                              <span className="text-sm text-slate-700">
                                {EXPERIENCE_TAG_LABELS[value as keyof typeof EXPERIENCE_TAG_LABELS] || value}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Amenities & Features
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                    </div>
                  )}

                  {section.id === 'logistics' && (
                    <div className="space-y-6">
                      {/* Hours */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          Hours of Operation
                        </label>
                        <div className="space-y-2">
                          {DAYS.map((day) => (
                            <div key={day} className="flex items-center gap-4">
                              <div className="w-24 font-medium text-slate-700 capitalize text-sm">{day}</div>
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
                                  <span className="text-slate-400 text-sm">to</span>
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

                      {/* Policies */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Cancellation Policy
                          </label>
                          <select
                            value={listing.cancellation_policy}
                            onChange={(e) => setListing({ ...listing, cancellation_policy: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white"
                          >
                            {CANCELLATION_POLICIES.map((policy) => (
                              <option key={policy.value} value={policy.value}>
                                {policy.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Pet Policy
                          </label>
                          <select
                            value={listing.pet_policy}
                            onChange={(e) => setListing({ ...listing, pet_policy: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none bg-white"
                          >
                            {PET_POLICIES.map((policy) => (
                              <option key={policy.value} value={policy.value}>
                                {policy.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'advanced' && (
                    <div className="space-y-6">
                      {/* Group Size */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Group Size Capacity
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                          Helps visitors with large groups find you
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Minimum</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={listing.min_group_size ?? ''}
                              onChange={(e) => setListing({
                                ...listing,
                                min_group_size: e.target.value ? parseInt(e.target.value) : null
                              })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                              placeholder="1"
                            />
                          </div>
                          <span className="text-slate-400 mt-5">to</span>
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 mb-1">Maximum</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={listing.max_group_size ?? ''}
                              onChange={(e) => setListing({
                                ...listing,
                                max_group_size: e.target.value ? parseInt(e.target.value) : null
                              })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                              placeholder="20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* AI Notes */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Notes for Our AI
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Anything else we should know when recommending you? Best times, perfect pairings, special experiences...
                        </p>
                        <textarea
                          value={listing.ai_notes}
                          onChange={(e) => setListing({ ...listing, ai_notes: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none resize-none"
                          placeholder="e.g., 'Our sunset tastings on Fridays are magical. The 2021 Reserve Cab pairs perfectly with our cheese board. Groups of 8+ should book the private room...'"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Button - Sticky */}
        <div className="sticky bottom-4 pt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Changes are saved when you click the button
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Listing'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
