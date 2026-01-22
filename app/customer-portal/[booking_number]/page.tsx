'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import FinalPaymentForm from './FinalPaymentForm';
import { MultiDayItineraryView } from '@/components/client-portal/MultiDayItineraryView';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  pickup_location: string;
  dropoff_location: string;
  special_requests: string;
  status: string;
  base_price: string;
  total_price: string;
  deposit_amount: string;
  deposit_paid: boolean;
  final_payment_amount: string;
  final_payment_paid: boolean;
  created_at: string;
  driver_name?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  // Multi-day support
  tour_duration_type?: 'single_day' | 'multi_day';
  tour_start_date?: string;
  tour_end_date?: string;
}

interface Winery {
  id: number;
  name: string;
  city: string;
  address: string;
  arrival_time: string;
  departure_time: string;
  stop_order: number;
  day_number?: number;
}

export default function CustomerPortalPage({ params }: { params: Promise<{ booking_number: string }> }) {
  const unwrappedParams = use(params);
  const bookingNumber = unwrappedParams.booking_number;
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingNumber]);

  const loadBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingNumber}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError('Booking not found');
        return;
      }

      setBooking(result.data);

      // Load itinerary
      const itineraryResponse = await fetch(`/api/itinerary/${result.data.id}`);
      const itineraryResult = await itineraryResponse.json();

      if (itineraryResult.success) {
        setWineries(itineraryResult.stops || []);
      }

    } catch (_err) {
      setError('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    const confirmed = confirm(
      'Are you sure you want to cancel this booking? Refund will be processed according to our cancellation policy.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer requested cancellation',
        }),
      });

      if (response.ok) {
        alert('Booking cancelled successfully');
        loadBooking();
      } else {
        alert('Failed to cancel booking');
      }
    } catch (_err) {
      alert('Error cancelling booking');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find a booking with number: <strong>{bookingNumber}</strong>
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const tourDate = new Date(booking.tour_date);
  const now = new Date();
  const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canCancel = hoursUntilTour > 24;
  const needsFinalPayment = !booking.final_payment_paid && hoursUntilTour < 48 && hoursUntilTour > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-purple-600 hover:text-purple-700 font-semibold mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Booking</h1>
          <p className="text-lg text-gray-600">Booking #{booking.booking_number}</p>
        </div>

        {/* Status Banner */}
        <div className={`
          rounded-xl p-6 mb-8 border-2
          ${booking.status === 'confirmed' ? 'bg-green-50 border-green-200' :
            booking.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
            booking.status === 'cancelled' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'}
        `}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </h3>
              {needsFinalPayment && (
                <p className="text-orange-800 font-semibold">
                  ⚠️ Final payment required - Tour is in {Math.floor(hoursUntilTour)} hours
                </p>
              )}
            </div>
            {booking.status === 'confirmed' && (
              <span className="text-4xl">✓</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tour Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {booking.tour_duration_type === 'multi_day' ? 'Multi-Day Tour' : 'Tour Details'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Date Display - Different for multi-day vs single-day */}
                {booking.tour_duration_type === 'multi_day' && booking.tour_start_date && booking.tour_end_date ? (
                  <div className="sm:col-span-2">
                    <p className="text-gray-600 font-semibold text-sm mb-1">Tour Dates</p>
                    <p className="text-gray-900 font-bold text-lg">
                      {new Date(booking.tour_start_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                      })} — {new Date(booking.tour_end_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-purple-600 font-semibold text-sm mt-1">
                      {Math.ceil((new Date(booking.tour_end_date).getTime() - new Date(booking.tour_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-gray-600 font-semibold text-sm mb-1">Date</p>
                      <p className="text-gray-900 font-bold text-lg">
                        {tourDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-semibold text-sm mb-1">Time</p>
                      <p className="text-gray-900 font-bold text-lg">
                        {booking.start_time} - {booking.end_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-semibold text-sm mb-1">Duration</p>
                      <p className="text-gray-900 font-bold text-lg">{booking.duration_hours} hours</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-gray-600 font-semibold text-sm mb-1">Party Size</p>
                  <p className="text-gray-900 font-bold text-lg">{booking.party_size} guests</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-gray-600 font-semibold text-sm mb-1">Pickup Location</p>
                  <p className="text-gray-900 font-bold">{booking.pickup_location}</p>
                </div>
                {booking.special_requests && (
                  <div className="sm:col-span-2">
                    <p className="text-gray-600 font-semibold text-sm mb-1">Special Requests</p>
                    <p className="text-gray-700">{booking.special_requests}</p>
                  </div>
                )}
              </div>

              {booking.driver_name && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <p className="text-gray-600 font-semibold text-sm mb-2">Your Driver</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-lg">{booking.driver_name}</p>
                      {booking.vehicle_make && (
                        <p className="text-gray-600 text-sm">
                          {booking.vehicle_make} {booking.vehicle_model}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Itinerary - Multi-day or Single-day */}
            {booking.tour_duration_type === 'multi_day' && booking.tour_start_date && booking.tour_end_date ? (
              <MultiDayItineraryView
                stops={wineries}
                startDate={new Date(booking.tour_start_date)}
                endDate={new Date(booking.tour_end_date)}
              />
            ) : wineries.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Itinerary</h2>

                {/* Guideline Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Please Note:</span> This itinerary is a guideline.
                    The final order of winery visits may vary based on appointment times and availability.
                  </p>
                </div>

                <div className="space-y-4">
                  {wineries.map((winery) => (
                    <div key={winery.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {winery.stop_order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{winery.name}</h3>
                        <p className="text-gray-600 text-sm mb-2 truncate">{winery.address}, {winery.city}</p>
                        {winery.arrival_time && winery.departure_time && (
                          <p className="text-gray-500 text-sm">
                            {winery.arrival_time} - {winery.departure_time}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold transition-colors"
                  >
                    Print
                  </button>
                  <a
                    href={`/api/bookings/${booking.id}/itinerary-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors text-center"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Payment</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Price:</span>
                  <span className="text-gray-900 font-bold">${parseFloat(booking.total_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit:</span>
                  <span className={booking.deposit_paid ? 'text-green-600 font-bold' : 'text-gray-900 font-bold'}>
                    ${parseFloat(booking.deposit_amount).toFixed(2)}
                    {booking.deposit_paid && ' ✓'}
                  </span>
                </div>
                <div className="border-t-2 border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-900 font-bold">Balance Due:</span>
                    <span className="text-lg font-bold text-purple-600">
                      ${parseFloat(booking.final_payment_amount).toFixed(2)}
                    </span>
                  </div>
                  {booking.final_payment_paid ? (
                    <p className="text-green-600 text-sm mt-2 font-semibold">✓ Paid</p>
                  ) : (
                    <p className="text-gray-500 text-sm mt-2">
                      {hoursUntilTour > 48 
                        ? 'Auto-charged 48 hours before tour'
                        : 'Payment required now'}
                    </p>
                  )}
                </div>
              </div>

              {needsFinalPayment && !showPaymentForm && (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                >
                  Pay Balance Now
                </button>
              )}

              {showPaymentForm && (
                <div className="mt-4">
                  <Elements stripe={stripePromise}>
                    <FinalPaymentForm
                      booking={booking}
                      onSuccess={() => {
                        setShowPaymentForm(false);
                        loadBooking();
                      }}
                      onCancel={() => setShowPaymentForm(false)}
                    />
                  </Elements>
                </div>
              )}
            </div>

            {/* Actions */}
            {booking.status !== 'cancelled' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Actions</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/client-portal/${booking.id}/lunch`)}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
                  >
                    🍽️ Order Lunch
                  </button>

                  {canCancel && (
                    <button
                      onClick={handleCancelBooking}
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {!canCancel && booking.status !== 'cancelled' && (
                    <p className="text-sm text-gray-500 text-center">
                      Cancellation not available within 24 hours of tour
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📞 Need Help?</h2>
              <div className="space-y-3">
                <a
                  href="tel:+15092008000"
                  className="block text-purple-600 hover:text-purple-700 font-semibold"
                >
                  📞 (509) 200-8000
                </a>
                <a
                  href="mailto:info@wallawalla.travel"
                  className="block text-purple-600 hover:text-purple-700 font-semibold"
                >
                  ✉️ info@wallawalla.travel
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

