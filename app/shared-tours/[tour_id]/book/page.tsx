'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

/**
 * Shared Tour Ticket Booking Page
 *
 * Multi-step ticket purchase flow:
 * 1. Select ticket count and lunch option
 * 2. Enter customer details
 * 3. Review and confirm (payment integration placeholder)
 */

interface Tour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  description: string | null;
  meeting_location: string | null;
  wineries_preview: string[] | null;
  max_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  spots_available: number;
  accepting_bookings: boolean;
}

interface Pricing {
  price_per_person: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

interface BookingFormData {
  ticketCount: number;
  includesLunch: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  guestNames: string[];
  dietaryRestrictions: string;
  specialRequests: string;
  referralSource: string;
}

export default function BookSharedTourPage({ params }: { params: Promise<{ tour_id: string }> }) {
  const { tour_id } = use(params);

  const [tour, setTour] = useState<Tour | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    ticketCount: 1,
    includesLunch: true,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    guestNames: [],
    dietaryRestrictions: '',
    specialRequests: '',
    referralSource: '',
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
      } catch (_err) {
        setError('Failed to load tour details');
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tour_id]);

  useEffect(() => {
    if (tour) {
      const fetchPricing = async () => {
        try {
          const response = await fetch(
            `/api/shared-tours/${tour_id}/price?tickets=${formData.ticketCount}&lunch=${formData.includesLunch}`
          );
          const data = await response.json();
          if (data.success) {
            setPricing(data.data);
          }
        } catch (err) {
          console.error('Failed to fetch pricing:', err);
        }
      };

      fetchPricing();
    }
  }, [formData.ticketCount, formData.includesLunch, tour, tour_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGuestNameChange = (index: number, value: string) => {
    const newGuestNames = [...formData.guestNames];
    newGuestNames[index] = value;
    setFormData(prev => ({ ...prev, guestNames: newGuestNames }));
  };

  const handleTicketCountChange = (count: number) => {
    setFormData(prev => ({
      ...prev,
      ticketCount: count,
      guestNames: Array(count - 1).fill(''),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/shared-tours/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id,
          ticket_count: formData.ticketCount,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone || undefined,
          guest_names: formData.guestNames.filter(n => n.trim()) || undefined,
          includes_lunch: formData.includesLunch,
          dietary_restrictions: formData.dietaryRestrictions || undefined,
          special_requests: formData.specialRequests || undefined,
          referral_source: formData.referralSource || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTicketNumber(data.data.ticket_number);
        setBookingConfirmed(true);
      } else {
        setError(data.error);
      }
    } catch (_err) {
      setError('Failed to create booking. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tour details...</p>
        </div>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Tour Not Found</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/shared-tours"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold"
          >
            View Available Tours
          </Link>
        </div>
      </div>
    );
  }

  if (!tour) return null;

  // Booking Confirmation
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h1>
            <p className="text-slate-600 mb-6">
              Your tickets have been reserved. A confirmation email will be sent to {formData.customerEmail}.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500 mb-1">Ticket Number</p>
              <p className="text-2xl font-bold text-[#E07A5F]">{ticketNumber}</p>
            </div>

            <div className="text-left bg-slate-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tour</span>
                <span className="font-medium text-slate-900">{tour.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-900">{formatDate(tour.tour_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-900">{formatTime(tour.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tickets</span>
                <span className="font-medium text-slate-900">{formData.ticketCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lunch Included</span>
                <span className="font-medium text-slate-900">{formData.includesLunch ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-medium text-slate-900">Total</span>
                <span className="font-bold text-slate-900">${pricing?.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-800">Payment Required</p>
                  <p className="text-sm text-amber-700">
                    Please complete payment within 24 hours to secure your tickets.
                    We'll send payment instructions to your email.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/shared-tours"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
            >
              Back to Tours
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <Link href="/shared-tours" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Tours</span>
          </Link>
          <div className="text-sm text-slate-500">Step {step} of 3</div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 py-3">
                <div className={`h-1 rounded-full ${s <= step ? 'bg-[#E07A5F]' : 'bg-slate-200'}`} />
                <div className={`text-xs mt-1 ${s <= step ? 'text-[#E07A5F]' : 'text-slate-400'}`}>
                  {s === 1 && 'Tickets'}
                  {s === 2 && 'Your Info'}
                  {s === 3 && 'Review'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tour Summary */}
      <div className="bg-gradient-to-r from-[#E07A5F]/10 to-[#B87333]/10 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-medium text-[#E07A5F] uppercase">
                {new Date(tour.tour_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-2xl font-bold text-slate-900">
                {new Date(tour.tour_date + 'T00:00:00').getDate()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{tour.title}</h1>
              <p className="text-sm text-slate-600">
                {formatDate(tour.tour_date)} • {formatTime(tour.start_time)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Tickets */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Select Your Tickets</h2>

            {/* Ticket Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Tickets
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => handleTicketCountChange(n)}
                    disabled={n > tour.spots_available}
                    className={`py-3 rounded-lg font-semibold transition-colors ${
                      formData.ticketCount === n
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
              {tour.spots_available < 6 && (
                <p className="text-sm text-amber-600 mt-2">
                  Only {tour.spots_available} spots remaining
                </p>
              )}
            </div>

            {/* Lunch Option */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Include Lunch?
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, includesLunch: true }))}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.includesLunch
                      ? 'border-[#E07A5F] bg-[#E07A5F]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">With Lunch</span>
                    <span className="text-lg font-bold text-slate-900">${tour.lunch_price_per_person}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Includes lunch at a local restaurant
                  </p>
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, includesLunch: false }))}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    !formData.includesLunch
                      ? 'border-[#E07A5F] bg-[#E07A5F]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">Tour Only</span>
                    <span className="text-lg font-bold text-slate-900">${tour.base_price_per_person}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Wine tastings and transportation only
                  </p>
                </button>
              </div>
            </div>

            {/* Price Summary */}
            {pricing && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      {formData.ticketCount} ticket{formData.ticketCount > 1 ? 's' : ''} × ${pricing.price_per_person}
                    </span>
                    <span className="text-slate-900">${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (8.9%)</span>
                    <span className="text-slate-900">${pricing.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-slate-900">${pricing.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Customer Info */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to tickets
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-6">Your Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="(509) 555-0123"
                />
              </div>

              {formData.ticketCount > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Other Guest Names
                  </label>
                  {Array.from({ length: formData.ticketCount - 1 }).map((_, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={formData.guestNames[idx] || ''}
                      onChange={e => handleGuestNameChange(idx, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] mb-2"
                      placeholder={`Guest ${idx + 2} name`}
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dietary Restrictions
                </label>
                <input
                  type="text"
                  name="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="Vegetarian, gluten-free, allergies..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
                  placeholder="Celebrating a birthday, anniversary, specific winery requests..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  How did you hear about us?
                </label>
                <select
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                >
                  <option value="">Select...</option>
                  <option value="google">Google Search</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="friend">Friend / Family</option>
                  <option value="hotel">Hotel Concierge</option>
                  <option value="winery">Winery Recommendation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!formData.customerName || !formData.customerEmail}
              className="w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors mt-6 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Continue to Review
            </button>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && pricing && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to details
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-6">Review Your Booking</h2>

            {/* Booking Summary */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 mb-3">Tour Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tour</span>
                  <span className="font-medium text-slate-900">{tour.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date</span>
                  <span className="font-medium text-slate-900">{formatDate(tour.tour_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Time</span>
                  <span className="font-medium text-slate-900">{formatTime(tour.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-medium text-slate-900">{tour.duration_hours} hours</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 mb-3">Ticket Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tickets</span>
                  <span className="font-medium text-slate-900">{formData.ticketCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Lunch Included</span>
                  <span className="font-medium text-slate-900">{formData.includesLunch ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Price per person</span>
                  <span className="font-medium text-slate-900">${pricing.price_per_person.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name</span>
                  <span className="font-medium text-slate-900">{formData.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Email</span>
                  <span className="font-medium text-slate-900">{formData.customerEmail}</span>
                </div>
                {formData.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone</span>
                    <span className="font-medium text-slate-900">{formData.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-[#E07A5F]/10 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">Subtotal</span>
                  <span className="text-slate-900">${pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Tax (8.9%)</span>
                  <span className="text-slate-900">${pricing.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E07A5F]/30">
                  <span className="font-semibold text-slate-900">Total Due</span>
                  <span className="text-2xl font-bold text-[#E07A5F]">${pricing.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              By completing this booking, you agree to our terms of service and cancellation policy.
              Full refunds are available up to 48 hours before the tour.
            </p>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
