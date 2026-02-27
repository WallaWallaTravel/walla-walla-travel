'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import PhoneInput from '@/components/ui/PhoneInput';

interface FormData {
  // Customer Info
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  can_text: boolean;

  // Tour Details
  tour_type: string;
  tour_duration_type: 'single' | 'multi';
  wine_tour_preference: string;
  tour_date: string;
  tour_end_date: string;
  party_size: number;

  // Additional Info
  lodging_location: string;
  additional_info: string;
  referral_source: string;
  specific_social_media: string;
  specific_ai: string;
  hotel_concierge_name: string;
  referral_other_details: string;
  newsletter_signup: boolean;

  // Honeypot
  website: string;
}

export default function InquiryPage() {
  const [formData, setFormData] = useState<FormData>({
    // Customer Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    can_text: true,

    // Tour Details
    tour_type: 'wine_tour',
    tour_duration_type: 'single',
    wine_tour_preference: '',
    tour_date: '',
    tour_end_date: '',
    party_size: 2,

    // Additional Info
    lodging_location: '',
    additional_info: '',
    referral_source: '',
    specific_social_media: '',
    specific_ai: '',
    hotel_concierge_name: '',
    referral_other_details: '',
    newsletter_signup: true,

    // Honeypot
    website: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [error, setError] = useState('');
  const [hotels, setHotels] = useState<Array<{ id: number; name: string; address: string; city: string; type: string }>>([]);
  const [showLodgingAutocomplete, setShowLodgingAutocomplete] = useState(false);

  // Fetch hotels on mount
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch('/api/hotels');
        if (response.ok) {
          const data = await response.json();
          setHotels(data.data || []);
        }
      } catch (err) {
        logger.error('Error fetching hotels', { error: err });
      }
    };
    fetchHotels();
  }, []);

  // Calculate min date (3 days from now)
  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'party_size') {
      setFormData({ ...formData, [name]: parseInt(value) || 1 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tour_date: formData.tour_duration_type === 'single' ? formData.tour_date : formData.tour_date,
          tour_end_date: formData.tour_duration_type === 'multi' ? formData.tour_end_date : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Something went wrong');
      }

      setRequestNumber(data.request_number);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
            <p className="text-lg text-gray-600 mb-6">
              We&apos;ve received your inquiry and are excited to help plan your wine country adventure.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Your reference number</p>
              <p className="text-2xl font-bold text-[#8B1538]">{requestNumber}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-green-900 mb-3">What happens next?</h3>
              <ol className="space-y-2 text-green-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span><strong>We&apos;ll call you within 24 hours</strong> to discuss your preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Together we&apos;ll craft the perfect wine tour itinerary</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>We&apos;ll send you a detailed proposal with pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Once confirmed, we handle all the reservations!</span>
                </li>
              </ol>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Check your email for a confirmation with these details.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wineries"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Explore Wineries
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#8B1538] text-white rounded-lg font-semibold hover:bg-[#722F37] transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Request a Wine Tour
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Fill out this form and we&apos;ll call you within 24 hours to plan your perfect Walla Walla wine country experience.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Honeypot field - hidden from humans */}
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Your Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="first_name" className="block text-base font-semibold text-gray-900 mb-2">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-base font-semibold text-gray-900 mb-2">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="Smith"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-base font-semibold text-gray-900 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-base font-semibold text-gray-900 mb-2">
                  Phone <span className="text-red-600">*</span>
                </label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_text"
                  checked={formData.can_text}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
                />
                <span className="text-gray-700">
                  Yes, you can text me at this number
                </span>
              </label>
            </div>
          </div>

          {/* Tour Details */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Tour Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="tour_type" className="block text-base font-semibold text-gray-900 mb-2">
                  Type of Experience <span className="text-red-600">*</span>
                </label>
                <select
                  id="tour_type"
                  name="tour_type"
                  value={formData.tour_type}
                  onChange={(e) => {
                    handleChange(e);
                    if (e.target.value !== 'wine_tour') {
                      setFormData(prev => ({ ...prev, wine_tour_preference: '' }));
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                >
                  <option value="wine_tour">Wine Tour</option>
                  <option value="private_transportation">Private Transportation</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="airport_transfer">Airport Transfer</option>
                </select>
              </div>

              <div>
                <label htmlFor="tour_duration_type" className="block text-base font-semibold text-gray-900 mb-2">
                  Single or Multi-Day? <span className="text-red-600">*</span>
                </label>
                <select
                  id="tour_duration_type"
                  name="tour_duration_type"
                  value={formData.tour_duration_type}
                  onChange={(e) => {
                    handleChange(e);
                    if (e.target.value === 'single') {
                      setFormData(prev => ({ ...prev, tour_end_date: '' }));
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                >
                  <option value="single">Single Day</option>
                  <option value="multi">Multi-Day</option>
                </select>
              </div>

              {/* Single Day Date */}
              {formData.tour_duration_type === 'single' && (
                <div>
                  <label htmlFor="tour_date" className="block text-base font-semibold text-gray-900 mb-2">
                    Tour Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="tour_date"
                    name="tour_date"
                    value={formData.tour_date}
                    onChange={handleChange}
                    required
                    min={getMinDate()}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  />
                </div>
              )}

              {/* Multi-Day Date Range */}
              {formData.tour_duration_type === 'multi' && (
                <>
                  <div>
                    <label htmlFor="tour_date" className="block text-base font-semibold text-gray-900 mb-2">
                      Start Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      id="tour_date"
                      name="tour_date"
                      value={formData.tour_date}
                      onChange={handleChange}
                      required
                      min={getMinDate()}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="tour_end_date" className="block text-base font-semibold text-gray-900 mb-2">
                      End Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      id="tour_end_date"
                      name="tour_end_date"
                      value={formData.tour_end_date}
                      onChange={handleChange}
                      required
                      min={formData.tour_date || getMinDate()}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="party_size" className="block text-base font-semibold text-gray-900 mb-2">
                  Number of Guests <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="party_size"
                  name="party_size"
                  value={formData.party_size}
                  onChange={handleChange}
                  required
                  min="1"
                  max="50"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                />
              </div>

              {/* Wine Tour Preferences */}
              {formData.tour_type === 'wine_tour' && (
                <div className="md:col-span-2 pl-4 border-l-4 border-[#8B1538] bg-[#8B1538]/5 p-4 rounded-r-lg">
                  <label htmlFor="wine_tour_preference" className="block text-base font-semibold text-gray-900 mb-2">
                    Wine Tour Preference
                  </label>
                  <select
                    id="wine_tour_preference"
                    name="wine_tour_preference"
                    value={formData.wine_tour_preference}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors mb-2"
                  >
                    <option value="">Select a preference...</option>
                    <option value="private">Private Tour</option>
                    <option value="open_to_shared">Open to Shared Tour</option>
                    <option value="open_to_private_offset">Open to Private Offset</option>
                    <option value="early_week_combo">Early Week Combo</option>
                  </select>
                  <p className="text-sm text-gray-600 italic">
                    Don&apos;t worry! We&apos;ll explain all the options when we call. Just pick what sounds right for now.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Additional Information
            </h2>

            <div className="space-y-5">
              <div className="relative">
                <label htmlFor="lodging_location" className="block text-base font-semibold text-gray-900 mb-2">
                  Where are you staying?
                </label>
                <input
                  type="text"
                  id="lodging_location"
                  name="lodging_location"
                  value={formData.lodging_location}
                  onChange={(e) => {
                    handleChange(e);
                    setShowLodgingAutocomplete(true);
                  }}
                  onFocus={() => setShowLodgingAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowLodgingAutocomplete(false), 200)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="Hotel name, vacation rental, or address"
                />

                {/* Hotel Autocomplete */}
                {showLodgingAutocomplete && formData.lodging_location && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {hotels
                      .filter(hotel =>
                        hotel.name.toLowerCase().includes(formData.lodging_location.toLowerCase()) ||
                        hotel.address.toLowerCase().includes(formData.lodging_location.toLowerCase())
                      )
                      .sort((a, b) => {
                        const searchLower = formData.lodging_location.toLowerCase();
                        const aStartsWith = a.name.toLowerCase().startsWith(searchLower);
                        const bStartsWith = b.name.toLowerCase().startsWith(searchLower);
                        if (aStartsWith && !bStartsWith) return -1;
                        if (!aStartsWith && bStartsWith) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .slice(0, 6)
                      .map(hotel => (
                        <button
                          key={hotel.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, lodging_location: `${hotel.name}, ${hotel.address}` });
                            setShowLodgingAutocomplete(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#8B1538]/5 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{hotel.name}</div>
                          <div className="text-sm text-gray-600">{hotel.address}, {hotel.city}</div>
                        </button>
                      ))}
                    {hotels.filter(hotel =>
                      hotel.name.toLowerCase().includes(formData.lodging_location.toLowerCase()) ||
                      hotel.address.toLowerCase().includes(formData.lodging_location.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-gray-600 text-center text-sm">
                        No matches - just type your location
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="additional_info" className="block text-base font-semibold text-gray-900 mb-2">
                  Anything else we should know?
                </label>
                <textarea
                  id="additional_info"
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                  placeholder="Special occasions, dietary restrictions, accessibility needs, wine preferences..."
                />
              </div>

              <div>
                <label htmlFor="referral_source" className="block text-base font-semibold text-gray-900 mb-2">
                  How did you hear about us?
                </label>
                <select
                  id="referral_source"
                  name="referral_source"
                  value={formData.referral_source}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear conditional fields
                    if (e.target.value !== 'social_media') {
                      setFormData(prev => ({ ...prev, specific_social_media: '' }));
                    }
                    if (e.target.value !== 'ai_search') {
                      setFormData(prev => ({ ...prev, specific_ai: '' }));
                    }
                    if (e.target.value !== 'hotel_concierge') {
                      setFormData(prev => ({ ...prev, hotel_concierge_name: '' }));
                    }
                    if (e.target.value !== 'other') {
                      setFormData(prev => ({ ...prev, referral_other_details: '' }));
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-[#8B1538] focus:ring-2 focus:ring-[#8B1538]/20 transition-colors"
                >
                  <option value="">Select one...</option>
                  <option value="google">Google Search</option>
                  <option value="ai_search">AI Search (ChatGPT, Claude, etc.)</option>
                  <option value="social_media">Social Media</option>
                  <option value="friend_referral">Friend/Family Referral</option>
                  <option value="hotel_concierge">Hotel Concierge</option>
                  <option value="winery_recommendation">Winery Recommendation</option>
                  <option value="repeat_customer">Repeat Customer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Conditional: AI Search Follow-up */}
              {formData.referral_source === 'ai_search' && (
                <div className="pl-4 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <label htmlFor="specific_ai" className="block text-base font-semibold text-gray-900 mb-2">
                    Which AI did you use?
                  </label>
                  <select
                    id="specific_ai"
                    name="specific_ai"
                    value={formData.specific_ai}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  >
                    <option value="">Select one...</option>
                    <option value="chatgpt">ChatGPT</option>
                    <option value="claude">Claude</option>
                    <option value="perplexity">Perplexity</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="copilot">Microsoft Copilot</option>
                    <option value="other_ai">Other AI</option>
                  </select>
                </div>
              )}

              {/* Conditional: Social Media Follow-up */}
              {formData.referral_source === 'social_media' && (
                <div className="pl-4 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <label htmlFor="specific_social_media" className="block text-base font-semibold text-gray-900 mb-2">
                    Which platform?
                  </label>
                  <select
                    id="specific_social_media"
                    name="specific_social_media"
                    value={formData.specific_social_media}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  >
                    <option value="">Select one...</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="tiktok">TikTok</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="other_social">Other</option>
                  </select>
                </div>
              )}

              {/* Conditional: Hotel Concierge Follow-up */}
              {formData.referral_source === 'hotel_concierge' && (
                <div className="pl-4 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <label htmlFor="hotel_concierge_name" className="block text-base font-semibold text-gray-900 mb-2">
                    Which hotel or concierge?
                  </label>
                  <input
                    type="text"
                    id="hotel_concierge_name"
                    name="hotel_concierge_name"
                    value={formData.hotel_concierge_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="e.g., Marcus Whitman Hotel"
                  />
                </div>
              )}

              {/* Conditional: Other Referral Follow-up */}
              {formData.referral_source === 'other' && (
                <div className="pl-4 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <label htmlFor="referral_other_details" className="block text-base font-semibold text-gray-900 mb-2">
                    Please tell us more
                  </label>
                  <input
                    type="text"
                    id="referral_other_details"
                    name="referral_other_details"
                    value={formData.referral_other_details}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Let us know where you found us..."
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="newsletter_signup"
                    checked={formData.newsletter_signup}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
                  />
                  <span className="text-gray-700">
                    Sign me up for your newsletter with wine country tips and events!
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/plan-your-visit"
              className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-center transition-colors"
            >
              Back
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-semibold text-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Request a Call'
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 text-center mt-4">
            By submitting this form, you agree to be contacted about your wine tour inquiry.
          </p>
        </form>
      </div>
    </div>
  );
}
