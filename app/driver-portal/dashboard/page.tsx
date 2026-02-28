'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface Tour {
  id: number;
  booking_id: number;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  party_size: number;
  driver_notes: string;
  status: string;
  stops: Array<{
    winery_name: string;
    arrival_time: string;
    departure_time: string;
    duration_minutes: number;
    address: string;
  }>;
}

type ViewMode = 'upcoming' | 'today';

export default function DriverDashboard() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch current driver's user ID from session
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user?.role !== 'driver') { router.push('/login?error=forbidden'); return; }
        setDriverId(data.user.id);
      } catch {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (driverId) loadTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate, driverId]);

  const loadTours = async () => {
    if (!driverId) return;
    setLoading(true);
    try {

      let url: string;
      if (viewMode === 'upcoming') {
        // Fetch upcoming tours (next 30 days, up to 50 tours)
        url = `/api/driver/tours?driver_id=${driverId}&upcoming=true&days=30&limit=50`;
      } else {
        // Fetch tours for specific date
        url = `/api/driver/tours?driver_id=${driverId}&date=${selectedDate}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setTours(data.data?.tours || data.tours || []);
      }
    } catch (error) {
      logger.error('Error loading tours', { error });
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
    if (!dateStr || typeof dateStr !== 'string') return 'Unknown Date';

    // Clean the date string
    const cleanDate = String(dateStr).trim();
    if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return 'Unknown Date';
    
    // Extract date part if it's an ISO timestamp
    let datePart = cleanDate;
    if (cleanDate.includes('T')) {
      datePart = cleanDate.split('T')[0];
    }
    
    // Validate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 'Invalid Date';
    
    // Parse the date
    const date = new Date(datePart + 'T12:00:00');
    if (isNaN(date.getTime())) return 'Invalid Date';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';

    // Clean the date string
    const cleanDate = String(dateStr).trim();
    if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return '';
    
    // Extract date part if it's an ISO timestamp
    let datePart = cleanDate;
    if (cleanDate.includes('T')) {
      datePart = cleanDate.split('T')[0];
    }
    
    // Validate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '';
    
    // Parse the date
    const date = new Date(datePart + 'T12:00:00');
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const generateMapsLink = (tour: Tour): string => {
    if (!tour.stops || tour.stops.length === 0) return '';

    const waypoints = tour.stops.map(stop => encodeURIComponent(stop.address)).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tour.pickup_location)}&destination=${encodeURIComponent(tour.dropoff_location)}&waypoints=${waypoints}`;
  };

  // Helper to extract and validate date string
  const extractDateString = (dateValue: string | null | undefined): string | null => {
    if (!dateValue || typeof dateValue !== 'string') return null;
    
    const cleanDate = String(dateValue).trim();
    if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return null;
    
    // Extract date part from ISO timestamp or use as-is
    let datePart = cleanDate;
    if (cleanDate.includes('T')) {
      datePart = cleanDate.split('T')[0];
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    
    // Verify it's a valid date
    const parsed = new Date(datePart + 'T12:00:00');
    if (isNaN(parsed.getTime())) return null;
    
    return datePart;
  };

  // Group tours by date for upcoming view
  const groupToursByDate = (tours: Tour[]): Record<string, Tour[]> => {
    return tours.reduce(
      (acc, tour) => {
        const date = extractDateString(tour.tour_date);
        if (!date) return acc; // Skip invalid dates
        
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(tour);
        return acc;
      },
      {} as Record<string, Tour[]>
    );
  };

  const groupedTours = viewMode === 'upcoming' ? groupToursByDate(tours) : {};
  // Filter out any invalid date keys and sort
  const sortedDates = Object.keys(groupedTours)
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy-700 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading your tours...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1E3A5F] p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 text-white">Driver Dashboard</h1>
          <p className="text-[#BCCCDC] text-sm">
            {viewMode === 'upcoming'
              ? 'Your upcoming tours (next 30 days)'
              : 'Tours for selected date'}
          </p>
        </div>
      </div>

      {/* View Toggle & Date Selector */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('upcoming')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'upcoming'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Upcoming Tours
            </button>
            <button
              onClick={() => setViewMode('today')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'today'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              By Date
            </button>
          </div>

          {/* Date selector (only show in "today" mode) */}
          {viewMode === 'today' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
              >
                ← Prev
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-2 bg-white text-slate-900 rounded-lg font-medium border border-slate-200 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100"
              />

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-lg font-medium transition-colors"
              >
                Today
              </button>

              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tours List */}
      <div className="max-w-4xl mx-auto p-6">
        {(tours.length === 0 || (viewMode === 'upcoming' && sortedDates.length === 0)) ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg border border-gray-200">
            <div className="text-6xl mb-6">🍷</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">
              {viewMode === 'upcoming' ? 'No Upcoming Tours' : 'No Tours This Day'}
            </h2>
            <p className="text-gray-600 text-lg">
              {viewMode === 'upcoming' ? (
                <>You have no tours scheduled for the next 30 days.</>
              ) : (
                <>
                  You have no tours scheduled for{' '}
                  <span className="text-navy-700 font-semibold">
                    {formatFullDate(selectedDate)}
                  </span>
                </>
              )}
            </p>
            {viewMode === 'today' && (
              <p className="text-gray-500 mt-4">
                Use the date picker above to check other days, or switch to Upcoming Tours view.
              </p>
            )}
          </div>
        ) : viewMode === 'upcoming' ? (
          /* Upcoming Tours - Grouped by Date */
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded font-semibold">
                    {formatDate(date)}
                  </div>
                  <div className="text-gray-500 text-sm">{formatFullDate(date)}</div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="text-gray-400 text-sm">
                    {groupedTours[date].length} tour{groupedTours[date].length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Tours for this date */}
                <div className="space-y-4">
                  {groupedTours[date].map(tour => (
                    <TourCard
                      key={tour.booking_id}
                      tour={tour}
                      formatTime={formatTime}
                      generateMapsLink={generateMapsLink}
                      router={router}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-6 text-center">
              <p className="text-slate-600">
                Showing <strong>{tours.length}</strong> tour{tours.length !== 1 ? 's' : ''} across{' '}
                <strong>{sortedDates.length}</strong> day{sortedDates.length !== 1 ? 's' : ''} (next
                30 days)
              </p>
            </div>
          </div>
        ) : (
          /* Single Date View - Full Detail Cards */
          <div className="space-y-6">
            {tours.map(tour => (
              <TourCard
                key={tour.booking_id}
                tour={tour}
                formatTime={formatTime}
                generateMapsLink={generateMapsLink}
                router={router}
                compact={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tour Card Component
interface TourCardProps {
  tour: Tour;
  formatTime: (time: string) => string;
  generateMapsLink: (tour: Tour) => string;
  router: ReturnType<typeof useRouter>;
  compact?: boolean;
}

function TourCard({ tour, formatTime, generateMapsLink, router, compact = false }: TourCardProps) {
  if (compact) {
    // Compact card for upcoming tours list
    return (
      <div className="bg-white rounded-lg shadow-soft overflow-hidden border border-slate-200 hover:shadow-medium transition-shadow">
        <div className="flex items-stretch">
          {/* Time Badge */}
          <div className="bg-[#1E3A5F] p-4 flex flex-col items-center justify-center min-w-[90px]">
            <div className="text-white text-xl font-bold">{formatTime(tour.pickup_time)}</div>
            <div className="text-[#BCCCDC] text-xs">Pickup</div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{tour.customer_name}</h3>
                <p className="text-slate-500 text-sm">
                  {tour.party_size} guests • {tour.stops?.length || 0} stops
                </p>
                {tour.pickup_location && (
                  <p className="text-slate-400 text-sm mt-1">{tour.pickup_location}</p>
                )}
              </div>
              <div className="text-right">
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                  #{tour.booking_id}
                </span>
              </div>
            </div>

            {tour.driver_notes && (
              <div className="mt-2 bg-copper-50 border border-copper-200 rounded p-2 text-sm">
                <span className="text-copper-700">{tour.driver_notes}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col border-l border-slate-200">
            <a
              href={generateMapsLink(tour)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Open in Maps"
            >
              📍
            </a>
            <button
              onClick={() => router.push(`/driver-portal/tour/${tour.booking_id}`)}
              className="flex-1 px-3 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border-t border-slate-200 transition-colors"
              title="View Details"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full detail card
  return (
    <div className="bg-white rounded-lg shadow-soft overflow-hidden border border-slate-200">
      {/* Tour Header */}
      <div className="bg-[#1E3A5F] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">{tour.customer_name}</h2>
            <p className="text-[#BCCCDC] mt-1">
              {tour.party_size} guests • Pickup: {formatTime(tour.pickup_time)}
            </p>
          </div>
          <div className="text-right bg-white/10 rounded px-3 py-1.5">
            <div className="text-xs font-medium text-[#BCCCDC] uppercase tracking-wider">
              Booking
            </div>
            <div className="text-lg font-bold text-white">#{tour.booking_id}</div>
          </div>
        </div>
      </div>

      {/* Pickup/Dropoff */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-navy-600 mb-1 uppercase tracking-wider">
              📍 Pickup Location
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatTime(tour.pickup_time)}</div>
            <div className="text-gray-600 font-medium mt-1">{tour.pickup_location}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-navy-600 mb-1 uppercase tracking-wider">
              🏁 Dropoff Location
            </div>
            <div className="text-gray-600 font-medium">{tour.dropoff_location}</div>
          </div>
        </div>
      </div>

      {/* Driver Notes */}
      {tour.driver_notes && (
        <div className="p-6 bg-amber-50 border-b border-amber-200">
          <div className="text-sm font-bold text-amber-700 mb-2 uppercase tracking-wider">
            ⚠️ Important Notes
          </div>
          <div className="text-lg font-medium text-gray-900">{tour.driver_notes}</div>
        </div>
      )}

      {/* Winery Stops */}
      <div className="p-6">
        <div className="text-lg font-bold mb-4 text-gray-900 uppercase tracking-wider">
          🍷 Tour Itinerary ({tour.stops?.length || 0} stops)
        </div>
        <div className="space-y-4">
          {tour.stops?.map((stop, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-navy-400 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#334E68] rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {stop.winery_name}
                  </h3>
                  <div className="text-base font-semibold text-navy-700 mb-1">
                    {formatTime(stop.arrival_time)} → {formatTime(stop.departure_time)}
                    <span className="text-gray-500 text-sm ml-3">
                      ({stop.duration_minutes} min)
                    </span>
                  </div>
                  <div className="text-gray-600">{stop.address}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 bg-gray-50 flex flex-col md:flex-row gap-4 border-t border-gray-200">
        <a
          href={generateMapsLink(tour)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-center transition-colors"
        >
          📍 Open in Google Maps
        </a>
        <button
          onClick={() => router.push(`/driver-portal/tour/${tour.booking_id}`)}
          className="flex-1 py-3 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-lg font-semibold text-center transition-colors"
        >
          📋 View Full Details
        </button>
      </div>
    </div>
  );
}
