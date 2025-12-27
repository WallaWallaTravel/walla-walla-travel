'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTripPlannerStore, useMyTrips, useTripLoading } from '@/lib/stores/trip-planner';
import { TripSummary } from '@/lib/types/trip-planner';

// ============================================================================
// Trip Card Component
// ============================================================================

function TripCard({ trip }: { trip: TripSummary }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    planning: 'bg-blue-100 text-blue-700',
    ready_to_share: 'bg-amber-100 text-amber-700',
    shared: 'bg-green-100 text-green-700',
    handed_off: 'bg-purple-100 text-purple-700',
    booked: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-stone-100 text-stone-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const tripTypeIcons: Record<string, string> = {
    wine_tour: '🍷',
    bachelorette: '💍',
    corporate: '💼',
    wedding: '💒',
    anniversary: '❤️',
    custom: '✨',
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link
      href={`/my-trips/${trip.share_code}`}
      className="block bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tripTypeIcons[trip.trip_type] || '🍷'}</span>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-amber-300 transition-colors">
                {trip.title}
              </h3>
              {trip.start_date && (
                <p className="text-stone-300 text-sm">
                  {formatDate(trip.start_date)}
                  {trip.end_date && trip.end_date !== trip.start_date && (
                    <> – {formatDate(trip.end_date)}</>
                  )}
                </p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[trip.status]}`}>
            {trip.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-stone-600">
              <span>📍</span>
              <span>{trip.stops_count} stop{trip.stops_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1 text-stone-600">
              <span>👥</span>
              <span>
                {trip.confirmed_guests}/{trip.expected_guests} guest{trip.expected_guests !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span className="text-stone-400 text-xs">
            Updated {trip.last_activity_at ? new Date(trip.last_activity_at).toLocaleDateString() : 'Recently'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-6">🗺️</div>
      <h2 className="text-2xl font-semibold text-stone-900 mb-3">
        No trips yet
      </h2>
      <p className="text-stone-600 mb-8 max-w-md mx-auto">
        Start planning your Walla Walla wine adventure! Create a trip to organize your itinerary, 
        invite guests, and share with friends.
      </p>
      <Link
        href="/my-trips/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white font-medium rounded-xl hover:shadow-lg transition-all"
      >
        <span>✨</span>
        Create Your First Trip
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function MyTripsPage() {
  const loadMyTrips = useTripPlannerStore((state) => state.loadMyTrips);
  const myTrips = useMyTrips();
  const isLoading = useTripLoading();

  useEffect(() => {
    loadMyTrips();
  }, [loadMyTrips]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">My Trips</h1>
              <p className="text-stone-300">
                Plan, organize, and share your Walla Walla wine adventures
              </p>
            </div>
            <Link
              href="/my-trips/new"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
            >
              <span>+</span>
              New Trip
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-4xl mb-4">🍷</div>
            <p className="text-stone-600">Loading your trips...</p>
          </div>
        ) : myTrips.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-4">
              {myTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>

            {/* Mobile FAB */}
            <Link
              href="/my-trips/new"
              className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-shadow"
            >
              +
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

