'use client';

import { useState, useEffect } from 'react';
import { BookingData } from '../page';

interface Props {
  bookingData: BookingData;
  updateBookingData: (data: Partial<BookingData>) => void;
  nextStep: () => void;
}

export default function Step1TourDetails({ bookingData, updateBookingData, nextStep }: Props) {
  const [loading, setLoading] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([]);
  const [error, setError] = useState('');

  // Check availability and pricing when date/duration/party size changes
  useEffect(() => {
    if (bookingData.tour_date && bookingData.duration_hours && bookingData.party_size) {
      checkAvailabilityAndPricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData.tour_date, bookingData.duration_hours, bookingData.party_size]);

  const checkAvailabilityAndPricing = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookingData.tour_date,
          duration_hours: bookingData.duration_hours,
          party_size: bookingData.party_size,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.available) {
        setAvailableSlots(result.data.available_times);
        updateBookingData({
          vehicle: result.data.suggested_vehicle,
          pricing: result.data.pricing,
        });
        setAvailabilityChecked(true);
      } else {
        setError(result.data.conflicts?.[0] || 'No availability for selected date');
        setAvailabilityChecked(false);
      }
    } catch (_err) {
      setError('Failed to check availability. Please try again.');
      setAvailabilityChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!bookingData.tour_date || !bookingData.start_time) {
      setError('Please select a date and time');
      return;
    }

    if (!availabilityChecked) {
      setError('Please wait while we check availability');
      return;
    }

    nextStep();
  };

  // Get minimum date (48 hours from now)
  const getMinDate = () => {
    const date = new Date();
    date.setHours(date.getHours() + 48);
    return date.toISOString().split('T')[0];
  };

  // Get maximum date (120 days from now)
  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 120);
    return date.toISOString().split('T')[0];
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Let's Plan Your Tour</h2>
      <p className="text-gray-600 mb-8">Tell us when you'd like to visit and how many guests</p>

      <div className="space-y-6">
        {/* Tour Date */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Tour Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={bookingData.tour_date}
            onChange={(e) => updateBookingData({ tour_date: e.target.value })}
            min={getMinDate()}
            max={getMaxDate()}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Bookings require 48-hour advance notice
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Tour Duration <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { hours: 4, label: '4 Hours', desc: '2-3 wineries' },
              { hours: 6, label: '6 Hours', desc: '3-4 wineries' },
              { hours: 8, label: '8 Hours', desc: '4-6 wineries' },
            ].map((option) => (
              <button
                key={option.hours}
                type="button"
                onClick={() => updateBookingData({ duration_hours: option.hours })}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${bookingData.duration_hours === option.hours
                    ? 'border-purple-600 bg-purple-50 shadow-md'
                    : 'border-gray-300 hover:border-purple-300'
                  }
                `}
              >
                <div className="text-2xl font-bold text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Party Size */}
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">
            Party Size <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => updateBookingData({ party_size: Math.max(1, bookingData.party_size - 1) })}
              className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-900"
            >
              −
            </button>
            <input
              type="number"
              value={bookingData.party_size}
              onChange={(e) => updateBookingData({ party_size: Math.max(1, Math.min(14, parseInt(e.target.value) || 1)) })}
              min="1"
              max="14"
              className="w-24 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold text-gray-900 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => updateBookingData({ party_size: Math.min(14, bookingData.party_size + 1) })}
              className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-900"
            >
              +
            </button>
            <span className="text-gray-600 font-semibold">guests (max 14)</span>
          </div>
        </div>

        {/* Available Time Slots */}
        {availabilityChecked && availableSlots.length > 0 && (
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">
              Select Start Time <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableSlots.filter(slot => slot.available).map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => updateBookingData({ start_time: slot.start })}
                  className={`
                    p-3 rounded-lg border-2 font-semibold transition-all
                    ${bookingData.start_time === slot.start
                      ? 'border-purple-600 bg-purple-600 text-white shadow-md'
                      : 'border-gray-300 text-gray-900 hover:border-purple-300'
                    }
                  `}
                >
                  {slot.start}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Pricing Display */}
        {bookingData.pricing && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Your Tour Pricing</h3>
            
            <div className="space-y-2 mb-4">
              {bookingData.pricing.breakdown.slice(0, -3).map((item, index) => (
                <div key={index} className="flex justify-between text-gray-700">
                  <span>{item.label}</span>
                  <span className="font-semibold">
                    {item.amount >= 0 ? '+' : ''} ${Math.abs(item.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-green-300 pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total Tour Price:</span>
                <span className="text-2xl text-green-600">
                  ${bookingData.pricing.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Deposit Required Today:</span>
                <span className="font-bold">${bookingData.pricing.deposit_required.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Balance (due 48hrs before tour):</span>
                <span className="font-bold">
                  ${(bookingData.pricing.total - bookingData.pricing.deposit_required).toFixed(2)}
                </span>
              </div>
            </div>

            {bookingData.vehicle && (
              <div className="mt-4 pt-4 border-t border-green-300">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-2xl">🚐</span>
                  <span className="font-semibold">
                    {bookingData.vehicle.name} (seats {bookingData.vehicle.capacity})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-semibold">Checking availability and calculating pricing...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleContinue}
            disabled={!availabilityChecked || loading}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
          >
            Continue to Winery Selection →
          </button>
        </div>
      </div>
    </div>
  );
}

