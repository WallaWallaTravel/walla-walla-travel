'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Partner Portal - Available Tours
 *
 * Shows upcoming shared tours that hotel can book for guests
 */

interface Tour {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  title: string;
  description: string | null;
  meeting_location: string | null;
  base_price_per_person: number;
  lunch_price_per_person: number;
  spots_available: number;
  max_guests: number;
  minimum_met: boolean;
}

export default function PartnerToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const hotelData = localStorage.getItem('hotelPartner');
        if (!hotelData) {
          setError('Please log in to view tours');
          setLoading(false);
          return;
        }

        const hotel = JSON.parse(hotelData);
        const response = await fetch('/api/partner/shared-tours', {
          headers: { 'x-hotel-id': hotel.id },
        });
        const data = await response.json();

        if (data.success) {
          setTours(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to load tours');
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading available tours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Book a Tour for Your Guest</h1>
        <p className="text-slate-600">
          Select a tour below to book for your guests. They'll receive a payment link via email.
        </p>
      </div>

      {tours.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600 mb-2">No tours currently available for booking.</p>
          <p className="text-sm text-slate-500">Check back soon for upcoming tour dates!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => (
            <div
              key={tour.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:border-[#E07A5F]/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-[#E07A5F]/10 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-[#E07A5F] uppercase">
                      {new Date(tour.tour_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      {new Date(tour.tour_date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tour.title}</h3>
                    <p className="text-sm text-slate-600">
                      {formatDate(tour.tour_date)} • {formatTime(tour.start_time)} • {tour.duration_hours}hrs
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-sm font-medium ${
                        tour.spots_available > 5 ? 'text-green-600' :
                        tour.spots_available > 0 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {tour.spots_available} spots left
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm text-slate-600">
                        ${tour.base_price_per_person} / ${tour.lunch_price_per_person} w/lunch
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/partner-portal/shared-tours/book/${tour.id}`}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-center transition-colors ${
                    tour.spots_available > 0
                      ? 'bg-[#E07A5F] text-white hover:bg-[#d06a4f]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {tour.spots_available > 0 ? 'Book Guest' : 'Sold Out'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
