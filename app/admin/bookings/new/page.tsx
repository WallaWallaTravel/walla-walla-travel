'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Component that uses search params - must be wrapped in Suspense
function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledDate = searchParams.get('date');

  const [formData, setFormData] = useState({
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
    tour_date: prefilledDate || '',
    tour_start_date: '',
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

    // Internal (auto-filled)
    pickup_time: '10:00',
    tour_duration: 6,
    status: 'pending'
  });

  const [saving, setSaving] = useState(false);
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
      } catch (error) {
        console.error('Error fetching hotels:', error);
      }
    };
    fetchHotels();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Create the booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${formData.first_name} ${formData.last_name}`,
          customer_email: formData.email,
          customer_phone: formData.phone,
          tour_date: formData.tour_duration_type === 'single' ? formData.tour_date : formData.tour_start_date,
          tour_start_date: formData.tour_duration_type === 'multi' ? formData.tour_start_date : null,
          tour_end_date: formData.tour_duration_type === 'multi' ? formData.tour_end_date : null,
          tour_type: formData.tour_type,
          tour_duration_type: formData.tour_duration_type,
          start_time: formData.pickup_time,
          party_size: parseInt(String(formData.party_size)),
          duration_hours: formData.tour_duration,
          pickup_location: formData.lodging_location || 'TBD',
          dropoff_location: formData.lodging_location || 'TBD',
          status: formData.status,
          special_requests: formData.additional_info,
          referral_source: formData.referral_source,
          specific_social_media: formData.specific_social_media,
          specific_ai: formData.specific_ai,
          hotel_concierge_name: formData.hotel_concierge_name,
          referral_other_details: formData.referral_other_details,
          wine_tour_preference: formData.wine_tour_preference,
          base_price: 0,
          total_price: 0,
          deposit_amount: 0
        })
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      const bookingData = await bookingResponse.json();
      const bookingId = bookingData.booking.id;

      // Create empty itinerary for this booking
      const itineraryResponse = await fetch(`/api/itineraries/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: formData.lodging_location || 'TBD',
          pickup_time: formData.pickup_time || '10:00',
          dropoff_location: formData.lodging_location || 'TBD',
          estimated_dropoff_time: '16:00',
          driver_notes: `${formData.tour_type} tour for ${formData.party_size} guests`,
          internal_notes: formData.additional_info
        })
      });

      if (!itineraryResponse.ok) {
        const errorData = await itineraryResponse.json();
        console.error('Itinerary creation error:', errorData);
        throw new Error(errorData.error || 'Failed to create itinerary');
      }

      const itineraryData = await itineraryResponse.json();
      console.log('Itinerary created:', itineraryData);

      alert('Booking created successfully!');
      router.push(`/itinerary-builder/${bookingId}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900">New Booking</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-900 hover:text-gray-700 font-semibold text-lg"
          >
            ← Back
          </button>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Smith"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_text"
                  checked={formData.can_text}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <span className="text-base font-semibold text-gray-900">
                  Can we text this number?
                </span>
              </label>
            </div>
          </div>

          {/* Tour Details */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
              Tour Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  What type of tour are you interested in? <span className="text-red-600">*</span>
                </label>
                <select
                  name="tour_type"
                  value={formData.tour_type}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear wine tour preference when changing away from wine tour
                    if (e.target.value !== 'wine_tour') {
                      setFormData(prev => ({ ...prev, wine_tour_preference: '' }));
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="wine_tour">Wine Tour</option>
                  <option value="private_transportation">Private Transportation</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="airport_transfer">Airport Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Single or Multi-Day Tour? <span className="text-red-600">*</span>
                </label>
                <select
                  name="tour_duration_type"
                  value={formData.tour_duration_type}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear date fields when switching between single and multi-day
                    if (e.target.value === 'single') {
                      setFormData(prev => ({ ...prev, tour_start_date: '', tour_end_date: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, tour_date: '' }));
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="single">Single Day</option>
                  <option value="multi">Multi-Day</option>
                </select>
              </div>

              {/* Conditional: Single Day Date */}
              {formData.tour_duration_type === 'single' && (
                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Date of desired tour <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="tour_date"
                    value={formData.tour_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              )}

              {/* Conditional: Multi-Day Date Range */}
              {formData.tour_duration_type === 'multi' && (
                <>
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">
                      Start Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="tour_start_date"
                      value={formData.tour_start_date}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-bold text-gray-900 mb-2">
                      End Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="tour_end_date"
                      value={formData.tour_end_date}
                      onChange={handleChange}
                      required
                      min={formData.tour_start_date}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  How many people are in your group? <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  name="party_size"
                  value={formData.party_size}
                  onChange={handleChange}
                  required
                  min="1"
                  max="14"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Conditional: Wine Tour Preferences */}
              {formData.tour_type === 'wine_tour' && (
                <div className="md:col-span-2 pl-4 border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Wine Tour Preference
                  </label>
                  <select
                    name="wine_tour_preference"
                    value={formData.wine_tour_preference}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-200 mb-3"
                  >
                    <option value="">Select a preference...</option>
                    <option value="private">Private</option>
                    <option value="open_to_shared">Open to Shared</option>
                    <option value="open_to_private_offset">Open to Private Offset</option>
                    <option value="early_week_combo">Early Week Combo</option>
                  </select>
                  <p className="text-sm text-gray-700 italic">
                    💬 Don't worry! We'll discuss all the details about these options when we call you. 
                    Just pick what sounds right for you, and we'll tailor your wine tour experience accordingly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
              Additional Information
            </h2>

            <div className="space-y-6">
              <div className="relative">
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Lodging/Pickup Location
                </label>
                <input
                  type="text"
                  name="lodging_location"
                  value={formData.lodging_location}
                  onChange={(e) => {
                    handleChange(e);
                    setShowLodgingAutocomplete(true);
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setShowLodgingAutocomplete(true);
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown
                    setTimeout(() => setShowLodgingAutocomplete(false), 200);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Type hotel name or custom location"
                />
                
                {/* Autocomplete Dropdown */}
                {showLodgingAutocomplete && formData.lodging_location && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
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
                      .slice(0, 8)
                      .map(hotel => (
                        <button
                          key={hotel.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, lodging_location: `${hotel.name}, ${hotel.address}` });
                            setShowLodgingAutocomplete(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
                        >
                          <div className="font-bold text-gray-900">{hotel.name}</div>
                          <div className="text-sm text-gray-600">{hotel.address}, {hotel.city}</div>
                          <div className="text-xs text-gray-500 mt-1 capitalize">{hotel.type}</div>
                        </button>
                      ))}
                    {hotels.filter(hotel => 
                      hotel.name.toLowerCase().includes(formData.lodging_location.toLowerCase()) ||
                      hotel.address.toLowerCase().includes(formData.lodging_location.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-gray-600 text-center">
                        <div className="font-semibold mb-1">No matching locations found</div>
                        <div className="text-sm">Just type your custom location - that works too!</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  What else should we know before we call you?
                </label>
                <textarea
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Dietary restrictions, accessibility needs, wine preferences, special occasions..."
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  How did you hear about us?
                </label>
                <select
                  name="referral_source"
                  value={formData.referral_source}
                  onChange={(e) => {
                    handleChange(e);
                    // Clear specific fields when changing referral source
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select one...</option>
                  <option value="google">Google Search</option>
                  <option value="ai_search">AI Search</option>
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
                <div className="pl-4 border-l-4 border-blue-500">
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Which AI/LLM did you use?
                  </label>
                  <select
                    name="specific_ai"
                    value={formData.specific_ai}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                <div className="pl-4 border-l-4 border-blue-500">
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Which social media platform?
                  </label>
                  <select
                    name="specific_social_media"
                    value={formData.specific_social_media}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select one...</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="tiktok">TikTok</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="other_social">Other Social Media</option>
                  </select>
                </div>
              )}

              {/* Conditional: Hotel Concierge Follow-up */}
              {formData.referral_source === 'hotel_concierge' && (
                <div className="pl-4 border-l-4 border-blue-500">
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Which hotel or concierge?
                  </label>
                  <input
                    type="text"
                    name="hotel_concierge_name"
                    value={formData.hotel_concierge_name}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g., Marcus Whitman Hotel"
                  />
                </div>
              )}

              {/* Conditional: Other Referral Follow-up */}
              {formData.referral_source === 'other' && (
                <div className="pl-4 border-l-4 border-blue-500">
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Please tell us how you heard about us
                  </label>
                  <input
                    type="text"
                    name="referral_other_details"
                    value={formData.referral_other_details}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Let us know where you found us..."
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="newsletter_signup"
                    checked={formData.newsletter_signup}
                    onChange={handleChange}
                    className="w-5 h-5"
                  />
                  <span className="text-base font-semibold text-gray-900">
                    Sign me up for your newsletter! I want to know everything!
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-colors disabled:bg-gray-400"
            >
              {saving ? 'Creating Booking...' : 'Create Booking & Build Itinerary →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function NewBookingForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading...</div>
      </div>
    }>
      <BookingFormContent />
    </Suspense>
  );
}
