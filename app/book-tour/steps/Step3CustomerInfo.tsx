'use client';

import { useState } from 'react';
import { BookingData } from '../page';

interface Props {
  bookingData: BookingData;
  updateBookingData: (data: Partial<BookingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export default function Step3CustomerInfo({ bookingData, updateBookingData, nextStep, prevStep }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!bookingData.customer_name.trim()) {
      newErrors.customer_name = 'Name is required';
    }

    if (!bookingData.customer_email.trim()) {
      newErrors.customer_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.customer_email)) {
      newErrors.customer_email = 'Please enter a valid email';
    }

    if (!bookingData.customer_phone.trim()) {
      newErrors.customer_phone = 'Phone number is required';
    }

    if (!bookingData.pickup_location.trim()) {
      newErrors.pickup_location = 'Pickup location is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    nextStep();
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Information</h2>
      <p className="text-gray-600 mb-8">We need a few details to finalize your booking</p>

      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={bookingData.customer_name}
            onChange={(e) => updateBookingData({ customer_name: e.target.value })}
            placeholder="John Smith"
            className={`
              w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-semibold text-lg
              focus:ring-2 focus:ring-purple-200
              ${errors.customer_name ? 'border-red-500' : 'border-gray-300 focus:border-purple-500'}
            `}
          />
          {errors.customer_name && (
            <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.customer_name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Email Address <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={bookingData.customer_email}
            onChange={(e) => updateBookingData({ customer_email: e.target.value })}
            placeholder="john@example.com"
            className={`
              w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-semibold text-lg
              focus:ring-2 focus:ring-purple-200
              ${errors.customer_email ? 'border-red-500' : 'border-gray-300 focus:border-purple-500'}
            `}
          />
          {errors.customer_email && (
            <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.customer_email}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ll send your confirmation and itinerary here
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Phone Number <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            value={bookingData.customer_phone}
            onChange={(e) => updateBookingData({ customer_phone: e.target.value })}
            placeholder="(555) 123-4567"
            className={`
              w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-semibold text-lg
              focus:ring-2 focus:ring-purple-200
              ${errors.customer_phone ? 'border-red-500' : 'border-gray-300 focus:border-purple-500'}
            `}
          />
          {errors.customer_phone && (
            <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.customer_phone}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Your driver will contact you on tour day
          </p>
        </div>

        {/* Pickup Location */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Pickup Location <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={bookingData.pickup_location}
            onChange={(e) => updateBookingData({ pickup_location: e.target.value })}
            placeholder="Marcus Whitman Hotel, 6 West Rose Street"
            className={`
              w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-semibold text-lg
              focus:ring-2 focus:ring-purple-200
              ${errors.pickup_location ? 'border-red-500' : 'border-gray-300 focus:border-purple-500'}
            `}
          />
          {errors.pickup_location && (
            <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.pickup_location}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Hotel, Airbnb, or any address in Walla Walla
          </p>
        </div>

        {/* Special Requests */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Special Requests (Optional)
          </label>
          <textarea
            value={bookingData.special_requests}
            onChange={(e) => updateBookingData({ special_requests: e.target.value })}
            placeholder="Celebrating an anniversary, dietary restrictions, wine preferences, accessibility needs..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          />
          <p className="text-sm text-gray-500 mt-1">
            Let us know about any special occasions or requirements
          </p>
        </div>

        {/* Tour Summary Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Your Tour Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Date:</span>
              <span className="text-gray-900 font-bold">
                {new Date(bookingData.tour_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Time:</span>
              <span className="text-gray-900 font-bold">{bookingData.start_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Duration:</span>
              <span className="text-gray-900 font-bold">{bookingData.duration_hours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Party Size:</span>
              <span className="text-gray-900 font-bold">{bookingData.party_size} guests</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Wineries:</span>
              <span className="text-gray-900 font-bold">{bookingData.selected_wineries.length} stops</span>
            </div>
            
            {bookingData.pricing && (
              <>
                <div className="border-t-2 border-blue-300 pt-3 mt-3"></div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-900 font-bold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${bookingData.pricing.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deposit Today:</span>
                  <span className="text-gray-900 font-bold">
                    ${bookingData.pricing.deposit_required.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t-2 border-gray-200 mt-8">
        <button
          onClick={prevStep}
          className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={validateAndContinue}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

