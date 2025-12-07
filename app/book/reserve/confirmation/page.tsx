"use client";

/**
 * Reserve & Refine Confirmation Page
 * Shows receipt and next steps after reservation
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Reservation {
  id: number;
  reservation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  preferred_date: string;
  alternate_date?: string;
  event_type: string;
  special_requests?: string;
  deposit_amount: number;
  payment_method: string;
  deposit_paid: boolean;
  consultation_deadline: string;
  created_at: string;
}

function ReservationConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');
  
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reservationId) {
      loadReservation();
    }
  }, [reservationId]);

  const loadReservation = async () => {
    try {
      const response = await fetch(`/api/booking/reserve/${reservationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load reservation');
      }
      
      const data = await response.json();
      setReservation(data.reservation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your reservation...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'Reservation not found'}</p>
          <button
            onClick={() => router.push('/book')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Booking
          </button>
        </div>
      </div>
    );
  }

  const preferredDate = new Date(reservation.preferred_date);
  const deadlineDate = new Date(reservation.consultation_deadline);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Success Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎉 Reservation Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Your date is secured - Ryan will call you soon
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Reservation Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reservation #{reservation.reservation_number}</h2>
              <p className="text-gray-600">Created {new Date(reservation.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">${reservation.deposit_amount}</div>
              <div className="text-sm text-gray-600">Deposit {reservation.deposit_paid ? 'Paid' : 'Pending'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{reservation.customer_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{reservation.customer_email}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{reservation.customer_phone}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tour Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Party Size:</span>
                  <span className="ml-2 font-medium">{reservation.party_size} guests</span>
                </div>
                <div>
                  <span className="text-gray-600">Preferred Date:</span>
                  <span className="ml-2 font-medium">{preferredDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {reservation.alternate_date && (
                  <div>
                    <span className="text-gray-600">Alternate Date:</span>
                    <span className="ml-2 font-medium">{new Date(reservation.alternate_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Event Type:</span>
                  <span className="ml-2 font-medium capitalize">{reservation.event_type.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {reservation.special_requests && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Your Notes</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{reservation.special_requests}</p>
            </div>
          )}
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What Happens Next?</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Ryan Calls You</h3>
                <p className="text-gray-600 text-sm">
                  Within {Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60))} hours (by {deadlineDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Design Your Perfect Day</h3>
                <p className="text-gray-600 text-sm">
                  Together you'll choose wineries, timing, lunch spots, and any special touches. Ryan knows the area inside and out and will make sure it's perfect for your group.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Enjoy Your Tour!</h3>
                <p className="text-gray-600 text-sm">
                  Show up ready to have an amazing time. We handle all the driving, planning, and logistics so you can relax and enjoy Walla Walla wine country.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Final Payment</h3>
                <p className="text-gray-600 text-sm">
                  Final payment is due 48 hours after your tour concludes to accurately reflect final service time, lunch costs, and any added services provided during your experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {reservation.payment_method === 'check' && !reservation.deposit_paid && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-gray-900 mb-2">📮 Mail Your Check</h3>
            <p className="text-gray-700 mb-4">
              Please mail a check for <strong>${reservation.deposit_amount}</strong> to:
            </p>
            <div className="bg-white rounded-lg p-4 font-mono text-sm">
              Walla Walla Travel<br />
              [Your Address]<br />
              Walla Walla, WA [ZIP]
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Make checks payable to "Walla Walla Travel"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Back to Home
          </button>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Questions? We're here to help!</p>
          <div className="flex items-center justify-center gap-6">
            <a href={`mailto:${reservation.customer_email}`} className="text-blue-600 hover:underline font-medium">
              📧 Email Us
            </a>
            <a href={`tel:${reservation.customer_phone}`} className="text-blue-600 hover:underline font-medium">
              📞 Call Us
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReservationConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">Loading confirmation...</div>}>
      <ReservationConfirmationContent />
    </Suspense>
  );
}
