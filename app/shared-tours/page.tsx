'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Shared Tours Calendar Page
 *
 * Public-facing page showing upcoming shared wine tour dates
 * with availability and booking options.
 */

interface SharedTour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  description: string | null;
  meeting_location: string | null;
  wineries_preview: string[] | null;
  max_guests: number;
  min_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  lunch_included_default: boolean;
  status: string;
  tickets_sold: number;
  spots_available: number;
  minimum_met: boolean;
  accepting_bookings: boolean;
}

export default function SharedToursPage() {
  const [tours, setTours] = useState<SharedTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_selectedMonth, _setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const response = await fetch('/api/shared-tours');
      const data = await response.json();
      if (data.success) {
        setTours(data.data);
      } else {
        // Handle error object with message property or plain string
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to load tours');
        setError(errorMessage);
      }
    } catch (_err) {
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const _formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getStatusBadge = (tour: SharedTour) => {
    if (tour.status === 'full' || tour.spots_available === 0) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          Sold Out
        </span>
      );
    }
    if (!tour.accepting_bookings) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          Booking Closed
        </span>
      );
    }
    if (tour.spots_available <= 3) {
      return (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          {tour.spots_available} spots left
        </span>
      );
    }
    if (tour.minimum_met) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          Confirmed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        {tour.spots_available} spots available
      </span>
    );
  };

  // Group tours by week
  const groupToursByWeek = (tours: SharedTour[]) => {
    const weeks: { [key: string]: SharedTour[] } = {};
    tours.forEach(tour => {
      const date = new Date(tour.tour_date + 'T00:00:00');
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(tour);
    });
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  };

  const weeklyTours = groupToursByWeek(tours);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading available tours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#E07A5F] rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-medium text-slate-900">Walla Walla Travel</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Shared Wine Tours
          </h1>
          <p className="text-slate-600 text-lg">
            Join fellow wine enthusiasts for a curated tasting journey through Walla Walla&apos;s finest wineries.
          </p>
        </div>
      </header>

      {/* Pricing Info */}
      <div className="bg-gradient-to-r from-[#E07A5F]/10 to-[#B87333]/10 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#E07A5F]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tour with Lunch</p>
                  <p className="text-2xl font-bold text-slate-900">$115<span className="text-base font-normal text-slate-500">/person</span></p>
                </div>
              </div>
              <p className="text-sm text-slate-600">Includes transportation, tastings at 4-5 wineries, and lunch at a local restaurant</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tour Only</p>
                  <p className="text-2xl font-bold text-slate-900">$95<span className="text-base font-normal text-slate-500">/person</span></p>
                </div>
              </div>
              <p className="text-sm text-slate-600">Transportation and tastings at 4-5 wineries (lunch not included)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tour List */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {typeof error === 'object' ? (error as { message?: string })?.message || 'An error occurred' : error}
          </div>
        )}

        {tours.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No upcoming tours scheduled</h2>
            <p className="text-slate-600 mb-6">Check back soon for new tour dates!</p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
            >
              Book a Private Tour
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {weeklyTours.map(([weekKey, weekTours]) => {
              const weekStart = new Date(weekKey + 'T00:00:00');
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);

              return (
                <div key={weekKey}>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </h2>
                  <div className="space-y-4">
                    {weekTours.map(tour => (
                      <div
                        key={tour.id}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="flex">
                          {/* Date Column */}
                          <div className="w-24 flex-shrink-0 bg-slate-50 p-4 flex flex-col items-center justify-center border-r border-slate-200">
                            <span className="text-sm font-medium text-[#E07A5F] uppercase">
                              {getDayName(tour.tour_date)}
                            </span>
                            <span className="text-3xl font-bold text-slate-900">
                              {new Date(tour.tour_date + 'T00:00:00').getDate()}
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(tour.tour_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-slate-900">
                                    {tour.title}
                                  </h3>
                                  {getStatusBadge(tour)}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatTime(tour.start_time)} • {tour.duration_hours} hours
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Up to {tour.max_guests} guests
                                  </span>
                                </div>
                                {tour.wineries_preview && tour.wineries_preview.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {tour.wineries_preview.slice(0, 4).map((winery, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                        {winery}
                                      </span>
                                    ))}
                                    {tour.wineries_preview.length > 4 && (
                                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                        +{tour.wineries_preview.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Price & Book */}
                              <div className="text-right">
                                <div className="text-sm text-slate-500 mb-1">From</div>
                                <div className="text-2xl font-bold text-slate-900 mb-3">
                                  ${tour.base_price_per_person}
                                </div>
                                {tour.accepting_bookings && tour.spots_available > 0 ? (
                                  <Link
                                    href={`/shared-tours/${tour.id}/book`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors text-sm"
                                  >
                                    Book Now
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </Link>
                                ) : (
                                  <button
                                    disabled
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-lg font-semibold cursor-not-allowed text-sm"
                                  >
                                    {tour.spots_available === 0 ? 'Sold Out' : 'Unavailable'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What&apos;s included in the tour?</h3>
              <p className="text-slate-600">Transportation in our comfortable vehicle, wine tastings at 4-5 carefully selected wineries, a knowledgeable driver/guide, and water. The lunch option includes a meal at a local restaurant.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">When are shared tours available?</h3>
              <p className="text-slate-600">Shared tours run Sunday through Wednesday. For Thursday through Saturday, we offer private tours which can be booked separately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">How many people are on each tour?</h3>
              <p className="text-slate-600">We cap our shared tours at 14 guests to ensure a personalized experience. Tours need a minimum of 2 guests to run.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What&apos;s your cancellation policy?</h3>
              <p className="text-slate-600">Full refunds are available up to 48 hours before the tour. Cancellations within 48 hours are non-refundable but can be rescheduled subject to availability.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Looking for a private experience?</p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#E07A5F] text-[#E07A5F] rounded-lg font-semibold hover:bg-[#E07A5F] hover:text-white transition-colors"
          >
            Book a Private Tour
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400">© {new Date().getFullYear()} Walla Walla Travel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
