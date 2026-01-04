'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Stop {
  id?: number;
  winery_name: string;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  address: string;
  phone?: string;
  notes?: string;
}

interface TourDetails {
  id: number;
  booking_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  tour_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  party_size: number;
  driver_notes: string;
  internal_notes?: string;
  special_requests?: string;
  status: string;
  tour_type?: string;
  total_amount?: number;
  stops: Stop[];
  vehicle?: {
    id: number;
    name: string;
    license_plate: string;
  };
}

export default function DriverTourDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [tour, setTour] = useState<TourDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      loadTourDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadTourDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch tour without driver access check (page is already driver-authenticated)
      const response = await fetch(`/api/driver/tours/${bookingId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Tour not found or you do not have access to this tour.');
        } else {
          throw new Error('Failed to load tour details');
        }
        return;
      }
      
      const data = await response.json();
      setTour(data.tour || data.data || data);
    } catch (err) {
      console.error('Error loading tour:', err);
      setError('Failed to load tour details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const generateMapsLink = (): string => {
    if (!tour) return '';
    
    if (!tour.stops || tour.stops.length === 0) {
      // Just pickup to dropoff
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tour.pickup_location)}&destination=${encodeURIComponent(tour.dropoff_location)}`;
    }

    const waypoints = tour.stops.map(stop => encodeURIComponent(stop.address)).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tour.pickup_location)}&destination=${encodeURIComponent(tour.dropoff_location)}&waypoints=${waypoints}`;
  };

  const openPhoneDialer = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1E3A5F] border-t-transparent"></div>
        <p className="mt-4 text-slate-600">Loading tour details...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Tour Not Found</h2>
        <p className="text-slate-600 mb-6 text-center">{error || 'This tour could not be loaded.'}</p>
        <button
          onClick={() => router.push('/driver-portal/dashboard')}
          className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#1A3354] transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#1E3A5F] p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-[#BCCCDC] hover:text-white mb-3 flex items-center gap-1 text-sm"
          >
            ← Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{tour.customer_name}</h1>
              <p className="text-[#BCCCDC] mt-1">
                {formatDate(tour.tour_date)} • {tour.party_size} guests
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white/10 rounded px-3 py-1.5">
                <div className="text-xs text-[#BCCCDC]">Booking</div>
                <div className="text-lg font-bold text-white">#{tour.booking_id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={generateMapsLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
          >
            <span className="text-xl">📍</span>
            <span>Open Maps</span>
          </a>
          {tour.customer_phone && (
            <button
              onClick={() => openPhoneDialer(tour.customer_phone!)}
              className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              <span className="text-xl">📞</span>
              <span>Call Customer</span>
            </button>
          )}
          {!tour.customer_phone && (
            <Link
              href={`/inspections/pre-trip?booking_id=${tour.booking_id}`}
              className="flex items-center justify-center gap-2 p-4 bg-[#B87333] hover:bg-[#A66329] text-white rounded-xl font-semibold transition-colors"
            >
              <span className="text-xl">✓</span>
              <span>Pre-Trip</span>
            </Link>
          )}
        </div>

        {/* Driver Notes Alert */}
        {tour.driver_notes && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
              <span className="text-xl">⚠️</span>
              <span>Important Notes</span>
            </div>
            <p className="text-amber-900 text-lg">{tour.driver_notes}</p>
          </div>
        )}

        {/* Special Requests */}
        {tour.special_requests && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-800 font-semibold mb-2">
              <span>✨</span>
              <span>Special Requests</span>
            </div>
            <p className="text-purple-900">{tour.special_requests}</p>
          </div>
        )}

        {/* Pickup & Dropoff */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="text-green-600">📍</span> Pickup
            </h3>
            <div className="mt-2">
              <div className="text-2xl font-bold text-[#1E3A5F]">{formatTime(tour.pickup_time)}</div>
              <div className="text-slate-600 mt-1">{tour.pickup_location}</div>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="text-red-600">🏁</span> Dropoff
            </h3>
            <div className="text-slate-600 mt-2">{tour.dropoff_location}</div>
          </div>
        </div>

        {/* Itinerary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span>🍷</span> Tour Itinerary
              <span className="bg-[#1E3A5F] text-white text-xs px-2 py-0.5 rounded-full ml-auto">
                {tour.stops?.length || 0} stops
              </span>
            </h3>
          </div>
          
          {tour.stops && tour.stops.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {tour.stops.map((stop, index) => (
                <div key={index} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-lg">{stop.winery_name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-[#1E3A5F] font-semibold">
                          {formatTime(stop.arrival_time)} → {formatTime(stop.departure_time)}
                        </span>
                        <span className="text-slate-500 text-sm">
                          ({stop.duration_minutes} min)
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{stop.address}</p>
                      {stop.notes && (
                        <p className="text-amber-700 text-sm mt-2 bg-amber-50 rounded px-2 py-1">
                          📝 {stop.notes}
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      📍
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-slate-600">No itinerary stops added yet.</p>
              <p className="text-slate-500 text-sm mt-1">Contact the office for tour details.</p>
            </div>
          )}
        </div>

        {/* Customer Info */}
        {(tour.customer_phone || tour.customer_email) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span>👤</span> Customer Contact
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {tour.customer_phone && (
                <button
                  onClick={() => openPhoneDialer(tour.customer_phone!)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span className="text-xl">📞</span>
                  <span className="font-medium text-blue-900">{tour.customer_phone}</span>
                  <span className="ml-auto text-blue-600 text-sm">Tap to call</span>
                </button>
              )}
              {tour.customer_email && (
                <a
                  href={`mailto:${tour.customer_email}`}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="text-xl">✉️</span>
                  <span className="font-medium text-slate-900">{tour.customer_email}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Vehicle Info */}
        {tour.vehicle && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <span>🚐</span> Vehicle Assignment
            </h3>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 rounded-lg px-4 py-2">
                <div className="text-sm text-slate-500">Vehicle</div>
                <div className="font-bold text-slate-900">{tour.vehicle.name}</div>
              </div>
              <div className="bg-slate-100 rounded-lg px-4 py-2">
                <div className="text-sm text-slate-500">License</div>
                <div className="font-bold text-slate-900">{tour.vehicle.license_plate}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tour Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/inspections/pre-trip?booking_id=${tour.booking_id}`}
            className="flex items-center justify-center gap-2 p-4 bg-[#B87333] hover:bg-[#A66329] text-white rounded-xl font-semibold transition-colors"
          >
            <span>✓</span>
            <span>Pre-Trip</span>
          </Link>
          <Link
            href={`/inspections/post-trip?booking_id=${tour.booking_id}`}
            className="flex items-center justify-center gap-2 p-4 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            <span>✓</span>
            <span>Post-Trip</span>
          </Link>
        </div>

        <Link
          href={`/time-clock/clock-in?booking_id=${tour.booking_id}`}
          className="flex items-center justify-center gap-2 p-4 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-xl font-semibold transition-colors"
        >
          <span>⏰</span>
          <span>Clock In for This Tour</span>
        </Link>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
          <button
            onClick={() => router.push('/driver-portal/dashboard')}
            className="flex flex-col items-center justify-center min-w-[64px] h-full px-2 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium mt-1">Home</span>
          </button>
          <button
            onClick={() => router.push('/driver-portal/schedule')}
            className="flex flex-col items-center justify-center min-w-[64px] h-full px-2 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">📅</span>
            <span className="text-xs font-medium mt-1">Schedule</span>
          </button>
          <button
            onClick={() => router.push('/time-clock/dashboard')}
            className="flex flex-col items-center justify-center min-w-[64px] h-full px-2 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">⏰</span>
            <span className="text-xs font-medium mt-1">Clock</span>
          </button>
          <button
            onClick={() => router.push('/inspections/pre-trip')}
            className="flex flex-col items-center justify-center min-w-[64px] h-full px-2 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">🔧</span>
            <span className="text-xs font-medium mt-1">Inspect</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

