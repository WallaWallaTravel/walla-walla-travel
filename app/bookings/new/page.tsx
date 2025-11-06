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
    tour_type: 'standard',
    tour_date: prefilledDate || '',
    party_size: 2,

    // Additional Info
    lodging_location: '',
    additional_info: '',
    referral_source: '',
    newsletter_signup: false,

    // Internal (auto-filled)
    pickup_time: '10:00',
    tour_duration: 6,
    status: 'pending'
  });

  const [saving, setSaving] = useState(false);

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
          tour_date: formData.tour_date,
          start_time: formData.pickup_time,
          party_size: parseInt(String(formData.party_size)),
          duration_hours: formData.tour_duration,
          pickup_location: formData.lodging_location || 'TBD',
          dropoff_location: formData.lodging_location || 'TBD',
          status: formData.status,
          special_requests: formData.additional_info,
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
      await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          pickup_location: formData.lodging_location || 'TBD',
          pickup_time: formData.pickup_time,
          dropoff_location: formData.lodging_location || 'TBD',
          estimated_dropoff_time: '16:00',
          driver_notes: `${formData.tour_type} tour for ${formData.party_size} guests`,
          internal_notes: formData.additional_info,
          stops: []
        })
      });

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
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="standard">Standard Tour</option>
                  <option value="private">Private Tour</option>
                  <option value="custom">Custom Experience</option>
                  <option value="corporate">Corporate Event</option>
                </select>
              </div>

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

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Pickup Time
                </label>
                <input
                  type="time"
                  name="pickup_time"
                  value={formData.pickup_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
              Additional Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Lodging/Pickup Location
                </label>
                <input
                  type="text"
                  name="lodging_location"
                  value={formData.lodging_location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Marcus Whitman Hotel, 6 West Rose Street"
                />
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
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select one...</option>
                  <option value="google">Google Search</option>
                  <option value="social_media">Social Media</option>
                  <option value="friend_referral">Friend/Family Referral</option>
                  <option value="hotel_concierge">Hotel Concierge</option>
                  <option value="winery_recommendation">Winery Recommendation</option>
                  <option value="repeat_customer">Repeat Customer</option>
                  <option value="other">Other</option>
                </select>
              </div>

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
                    Sign me up for your newsletter! I want to know everything! 📧
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
