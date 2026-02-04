'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Partner Portal - Book Guest Form
 *
 * Form for hotel partners to book a tour for their guests
 */

interface Tour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  base_price_per_person: number;
  lunch_price_per_person: number;
  spots_available: number;
}

export default function PartnerBookGuestPage({ params }: { params: Promise<{ tour_id: string }> }) {
  const { tour_id } = use(params);
  const router = useRouter();

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ ticketNumber: string; paymentUrl: string } | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    ticket_count: 1,
    includes_lunch: true,
    dietary_restrictions: '',
    special_requests: '',
  });

  useEffect(() => {
    const fetchTour = async () => {
      try {
        const response = await fetch(`/api/shared-tours/${tour_id}`);
        const data = await response.json();

        if (data.success) {
          setTour(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to load tour');
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tour_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const hotelData = localStorage.getItem('hotelPartner');
      if (!hotelData) {
        setError('Please log in again');
        return;
      }

      const hotel = JSON.parse(hotelData);
      const response = await fetch('/api/partner/shared-tours/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hotel-id': hotel.id,
        },
        body: JSON.stringify({
          tour_id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setBookingResult({
          ticketNumber: data.data.ticket.ticket_number,
          paymentUrl: data.data.paymentUrl,
        });
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateTotal = () => {
    if (!tour) return 0;
    const pricePerPerson = formData.includes_lunch
      ? tour.lunch_price_per_person
      : tour.base_price_per_person;
    const subtotal = pricePerPerson * formData.ticket_count;
    const tax = subtotal * 0.089;
    return subtotal + tax;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (success && bookingResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Booking Created!</h1>
          <p className="text-slate-600 mb-6">
            A payment request email has been sent to <strong>{formData.customer_email}</strong>
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500 mb-1">Ticket Number</p>
            <p className="text-2xl font-bold text-[#E07A5F] font-mono">{bookingResult.ticketNumber}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-amber-700">
              <strong>Note:</strong> The guest has 24 hours to complete payment. You can track the status in your bookings.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={`/partner-portal/shared-tours/book/${tour_id}`}
              onClick={() => {
                setSuccess(false);
                setBookingResult(null);
                setFormData({
                  customer_name: '',
                  customer_email: '',
                  customer_phone: '',
                  ticket_count: 1,
                  includes_lunch: true,
                  dietary_restrictions: '',
                  special_requests: '',
                });
              }}
              className="block w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
            >
              Book Another Guest
            </Link>
            <Link
              href="/partner-portal/shared-tours/bookings"
              className="block w-full py-3 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              View All Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/partner-portal/shared-tours"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tours
      </Link>

      {/* Tour Info */}
      <div className="bg-[#E07A5F]/10 rounded-xl p-6 mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-2">{tour.title}</h1>
        <p className="text-slate-600">
          {formatDate(tour.tour_date)} • {formatTime(tour.start_time)} • {tour.duration_hours} hours
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {tour.spots_available} spots remaining
        </p>
      </div>

      {/* Booking Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Guest Information</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Guest Name *
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Guest Email *
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
              placeholder="guest@email.com"
            />
            <p className="text-xs text-slate-500 mt-1">Payment link will be sent to this email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Guest Phone
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
              placeholder="(509) 555-0123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number of Guests *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, ticket_count: n }))}
                  disabled={n > tour.spots_available}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                    formData.ticket_count === n
                      ? 'bg-[#E07A5F] text-white'
                      : n > tour.spots_available
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Include Lunch?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, includes_lunch: true }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.includes_lunch
                    ? 'border-[#E07A5F] bg-[#E07A5F]/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="block font-semibold text-slate-900">With Lunch</span>
                <span className="text-sm text-slate-600">${tour.lunch_price_per_person}/person</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, includes_lunch: false }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  !formData.includes_lunch
                    ? 'border-[#E07A5F] bg-[#E07A5F]/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="block font-semibold text-slate-900">Tour Only</span>
                <span className="text-sm text-slate-600">${tour.base_price_per_person}/person</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dietary Restrictions
            </label>
            <input
              type="text"
              value={formData.dietary_restrictions}
              onChange={(e) => setFormData(prev => ({ ...prev, dietary_restrictions: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
              placeholder="Vegetarian, gluten-free, allergies..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Special Requests
            </label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
              placeholder="Celebration, specific winery requests..."
            />
          </div>

          {/* Total */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {formData.ticket_count} guest{formData.ticket_count > 1 ? 's' : ''} ×{' '}
                ${formData.includes_lunch ? tour.lunch_price_per_person : tour.base_price_per_person}
              </span>
              <span className="text-xl font-bold text-slate-900">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Includes 8.9% tax</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Booking...
              </>
            ) : (
              'Book Guest & Send Payment Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
