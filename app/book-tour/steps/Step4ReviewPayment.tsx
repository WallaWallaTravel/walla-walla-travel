'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { BookingData } from '../page';

interface Props {
  bookingData: BookingData;
  updateBookingData: (data: Partial<BookingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export default function Step4ReviewPayment({ bookingData, updateBookingData, nextStep, prevStep }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingCreated, setBookingCreated] = useState(false);

  // Create booking and payment intent
  const createBookingAndPayment = async () => {
    if (bookingCreated) return;

    setProcessing(true);
    setError('');

    try {
      // 1. Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone,
          tour_date: bookingData.tour_date,
          start_time: bookingData.start_time,
          party_size: bookingData.party_size,
          duration_hours: bookingData.duration_hours,
          pickup_location: bookingData.pickup_location,
          dropoff_location: bookingData.pickup_location,
          special_requests: bookingData.special_requests,
          base_price: bookingData.pricing?.subtotal || 0,
          total_price: bookingData.pricing?.total || 0,
          deposit_amount: bookingData.pricing?.deposit_required || 0,
          final_payment_amount: bookingData.pricing ? bookingData.pricing.total - bookingData.pricing.deposit_required : 0,
          status: 'pending',
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      const bookingResult = await bookingResponse.json();
      const booking = bookingResult.booking;

      // 2. Create itinerary with selected wineries
      await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          pickup_location: bookingData.pickup_location,
          pickup_time: bookingData.start_time,
          dropoff_location: bookingData.pickup_location,
          estimated_dropoff_time: calculateEndTime(bookingData.start_time, bookingData.duration_hours),
          driver_notes: `${bookingData.duration_hours}-hour tour for ${bookingData.party_size} guests`,
          internal_notes: bookingData.special_requests,
          stops: bookingData.selected_wineries.map((winery, index) => ({
            winery_id: winery.id,
            stop_order: index + 1,
            duration_minutes: 75,
            drive_time_to_next_minutes: 15,
          })),
        }),
      });

      // 3. Create payment intent
      const paymentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_number: booking.booking_number,
          amount: bookingData.pricing?.deposit_required || 0,
          payment_type: 'deposit',
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const paymentResult = await paymentResponse.json();

      updateBookingData({
        booking_number: booking.booking_number,
        payment_intent_id: paymentResult.data.payment_intent_id,
      });

      setClientSecret(paymentResult.data.client_secret);
      setBookingCreated(true);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment in our backend
        await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
          }),
        });

        // Send confirmation email
        await fetch('/api/bookings/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_number: bookingData.booking_number,
          }),
        });

        nextStep();
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const calculateEndTime = (startTime: string, hours: number): string => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Payment</h2>
      <p className="text-gray-600 mb-8">Review your tour details and complete your booking</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Booking Summary */}
        <div className="space-y-6">
          {/* Tour Details */}
          <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🍷 Tour Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 font-semibold">Date:</span>
                <p className="text-gray-900 font-bold">
                  {new Date(bookingData.tour_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Time:</span>
                <p className="text-gray-900 font-bold">{bookingData.start_time} ({bookingData.duration_hours} hours)</p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Party Size:</span>
                <p className="text-gray-900 font-bold">{bookingData.party_size} guests</p>
              </div>
              <div>
                <span className="text-gray-600 font-semibold">Pickup:</span>
                <p className="text-gray-900 font-bold">{bookingData.pickup_location}</p>
              </div>
            </div>
          </div>

          {/* Wineries */}
          <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🍇 Your Wineries</h3>
            <div className="space-y-2">
              {bookingData.selected_wineries.map((winery, index) => (
                <div key={winery.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">{winery.name}</p>
                    <p className="text-sm text-gray-600">{winery.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Your Information</h3>
            <div className="space-y-2">
              <p className="text-gray-900 font-bold">{bookingData.customer_name}</p>
              <p className="text-gray-700">{bookingData.customer_email}</p>
              <p className="text-gray-700">{bookingData.customer_phone}</p>
              {bookingData.special_requests && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-gray-600 font-semibold text-sm">Special Requests:</p>
                  <p className="text-gray-700 text-sm">{bookingData.special_requests}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Payment */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          {bookingData.pricing && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">💳 Payment Summary</h3>
              
              <div className="space-y-2 mb-4">
                {bookingData.pricing.breakdown.filter(item => 
                  !item.label.includes('Suggested') && !item.label.includes('Deposit')
                ).map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700">
                    <span>{item.label}</span>
                    <span className="font-semibold">
                      ${Math.abs(item.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-green-300 pt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total Tour Price:</span>
                  <span className="text-green-600">${bookingData.pricing.total.toFixed(2)}</span>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between text-xl font-bold mb-2">
                    <span className="text-gray-900">Deposit Due Today:</span>
                    <span className="text-2xl text-purple-600">
                      ${bookingData.pricing.deposit_required.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">50% of total price</p>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Balance due: ${(bookingData.pricing.total - bookingData.pricing.deposit_required).toFixed(2)}</p>
                  <p>• Charged automatically 48 hours before tour</p>
                  <p>• Suggested gratuity: ${bookingData.pricing.estimated_gratuity.toFixed(2)} (15%)</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💳 Payment Method</h3>
            
            {!clientSecret ? (
              <button
                onClick={createBookingAndPayment}
                disabled={processing}
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
              >
                {processing ? 'Creating Booking...' : 'Continue to Payment'}
              </button>
            ) : (
              <form onSubmit={handlePayment}>
                <div className="mb-6">
                  <PaymentElement />
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-semibold">⚠️ {error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!stripe || processing}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
                >
                  {processing ? 'Processing Payment...' : `Pay $${bookingData.pricing?.deposit_required.toFixed(2)}`}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  🔒 Secure payment powered by Stripe. Your payment information is encrypted and secure.
                </p>
              </form>
            )}
          </div>

          {/* Cancellation Policy */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">📋 Cancellation Policy</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 72+ hours: Full refund minus processing fee</li>
              <li>• 72-24 hours: 50% refund</li>
              <li>• Less than 24 hours: No refund</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t-2 border-gray-200 mt-8">
        <button
          onClick={prevStep}
          disabled={processing}
          className="px-8 py-4 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 rounded-lg font-bold text-lg transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

