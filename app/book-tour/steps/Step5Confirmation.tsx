'use client';

import { useRouter } from 'next/navigation';
import { BookingData } from '../page';

interface Props {
  bookingData: BookingData;
}

export default function Step5Confirmation({ bookingData }: Props) {
  const router = useRouter();

  return (
    <div className="text-center py-8">
      {/* Success Animation */}
      <div className="mb-8">
        <div className="inline-block">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <span className="text-5xl">✓</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        🎉 Booking Confirmed!
      </h2>
      <p className="text-xl text-gray-600 mb-8">
        Your wine tour is all set. We can't wait to show you Walla Walla!
      </p>

      {/* Booking Number */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 max-w-md mx-auto mb-8">
        <p className="text-gray-600 font-semibold mb-2">Your Booking Number</p>
        <p className="text-3xl font-bold text-purple-600">{bookingData.booking_number}</p>
        <p className="text-sm text-gray-500 mt-2">Save this for your records</p>
      </div>

      {/* What's Next */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 max-w-2xl mx-auto mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">📅 What Happens Next?</h3>
        
        <div className="space-y-6 text-left">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Confirmation Email Sent</h4>
              <p className="text-gray-600">
                Check {bookingData.customer_email} for your booking confirmation and tour details
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              7d
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Detailed Itinerary</h4>
              <p className="text-gray-600">
                You'll receive your detailed itinerary before your tour
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              👤
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Driver Assignment</h4>
              <p className="text-gray-600">
                Your driver will be assigned and you'll receive their contact information
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              72h
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Reminder</h4>
              <p className="text-gray-600">
                We'll send you a reminder 72 hours before your tour
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              48h
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Final Payment</h4>
              <p className="text-gray-600">
                Your final payment of ${bookingData.pricing ? (bookingData.pricing.total - bookingData.pricing.deposit_required).toFixed(2) : '0.00'} will be automatically charged
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl flex-shrink-0">
              🍷
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Tour Day!</h4>
              <p className="text-gray-600">
                Your driver will arrive at {bookingData.pickup_location} at {bookingData.start_time}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tour Summary */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 max-w-2xl mx-auto mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your Tour Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 text-left">
          <div>
            <p className="text-gray-600 font-semibold text-sm">Date</p>
            <p className="text-gray-900 font-bold">
              {new Date(bookingData.tour_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold text-sm">Time</p>
            <p className="text-gray-900 font-bold">{bookingData.start_time}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold text-sm">Duration</p>
            <p className="text-gray-900 font-bold">{bookingData.duration_hours} hours</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold text-sm">Guests</p>
            <p className="text-gray-900 font-bold">{bookingData.party_size}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-600 font-semibold text-sm mb-2">Wineries</p>
            <div className="space-y-1">
              {bookingData.selected_wineries.map((winery, index) => (
                <p key={winery.id} className="text-gray-900 text-sm">
                  {index + 1}. {winery.name}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
        <button
          onClick={() => router.push(`/customer-portal/${bookingData.booking_number}`)}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          View My Booking
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors"
        >
          Return Home
        </button>
      </div>

      {/* Contact Info */}
      <div className="mt-12 pt-8 border-t-2 border-gray-200">
        <p className="text-gray-600 mb-4">Questions about your tour?</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a
            href="tel:+15092008000"
            className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
          >
            📞 (509) 200-8000
          </a>
          <a
            href="mailto:info@wallawalla.travel"
            className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
          >
            ✉️ info@wallawalla.travel
          </a>
        </div>
      </div>

      {/* Social Sharing */}
      <div className="mt-8">
        <p className="text-gray-600 mb-4">Share your excitement!</p>
        <div className="flex justify-center gap-4">
          <button className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xl transition-colors">
            f
          </button>
          <button className="w-12 h-12 bg-blue-400 hover:bg-blue-500 text-white rounded-full flex items-center justify-center text-xl transition-colors">
            🐦
          </button>
          <button className="w-12 h-12 bg-pink-600 hover:bg-pink-700 text-white rounded-full flex items-center justify-center text-xl transition-colors">
            📷
          </button>
        </div>
      </div>
    </div>
  );
}

