'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTripPlannerStore } from '@/lib/stores/trip-planner';
import { TripSummary } from '@/lib/types/trip-planner';
import { logger } from '@/lib/logger';

interface WineryInfo {
  id: number;
  name: string;
  slug: string;
}

interface AddToTripButtonProps {
  winery: WineryInfo;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'text';
  className?: string;
  onSuccess?: () => void;
}

export function AddToTripButton({
  winery,
  size = 'md',
  variant = 'icon',
  className = '',
  onSuccess,
}: AddToTripButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { trips, loadMyTrips, addStop, createTrip } = useTripPlannerStore();

  // Load trips when dropdown opens
  useEffect(() => {
    if (showDropdown && trips.length === 0) {
      loadMyTrips();
    }
  }, [showDropdown, trips.length, loadMyTrips]);

  // Filter to active trips only
  const activeTrips = trips.filter(
    (t) => !['completed', 'cancelled', 'booked'].includes(t.status)
  );

  const handleAddToTrip = useCallback(async (trip: TripSummary) => {
    setIsAdding(true);

    try {
      await addStop(trip.share_code, {
        name: winery.name,
        winery_id: winery.id,
        stop_type: 'winery',
        day_number: 1,
        notes: `Added from winery directory`,
      });

      setShowSuccess(true);
      setShowDropdown(false);
      onSuccess?.();

      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      logger.error('Failed to add winery to existing trip', { error, wineryId: winery.id, wineryName: winery.name });
    } finally {
      setIsAdding(false);
    }
  }, [winery, addStop, onSuccess]);

  const handleCreateNewTrip = useCallback(async () => {
    setIsAdding(true);

    try {
      const newTrip = await createTrip({
        title: `Wine Tour`,
        trip_type: 'wine_tour',
      });

      if (newTrip) {
        await addStop(newTrip.share_code, {
          name: winery.name,
          winery_id: winery.id,
          stop_type: 'winery',
          day_number: 1,
          notes: `Added from winery directory`,
        });

        setShowSuccess(true);
        setShowDropdown(false);
        onSuccess?.();

        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      logger.error('Failed to create new trip with winery', { error, wineryId: winery.id, wineryName: winery.name });
    } finally {
      setIsAdding(false);
    }
  }, [winery, createTrip, addStop, onSuccess]);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Success state
  if (showSuccess) {
    return (
      <div className={`${sizeClasses[size]} text-green-600 flex items-center gap-1 ${className}`}>
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {variant !== 'icon' && <span className="text-sm font-medium">Added!</span>}
      </div>
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={`
            ${sizeClasses[size]}
            text-stone-400 hover:text-[#8B1538]
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 rounded-full
            ${className}
          `}
          aria-label={`Add ${winery.name} to trip`}
          title="Add to trip"
        >
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {showDropdown && (
          <TripDropdown
            trips={activeTrips}
            isAdding={isAdding}
            onSelectTrip={handleAddToTrip}
            onCreateNew={handleCreateNewTrip}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className={`
            inline-flex items-center gap-2 px-4 py-2
            bg-stone-100 hover:bg-stone-200 text-stone-700
            rounded-lg font-medium text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30
            ${className}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add to Trip
        </button>

        {showDropdown && (
          <TripDropdown
            trips={activeTrips}
            isAdding={isAdding}
            onSelectTrip={handleAddToTrip}
            onCreateNew={handleCreateNewTrip}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  // Text variant
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        className={`
          text-[#8B1538] hover:text-[#722F37] text-sm font-medium
          hover:underline transition-colors
          ${className}
        `}
      >
        + Add to Trip
      </button>

      {showDropdown && (
        <TripDropdown
          trips={activeTrips}
          isAdding={isAdding}
          onSelectTrip={handleAddToTrip}
          onCreateNew={handleCreateNewTrip}
          onClose={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

// Dropdown component for selecting trips
function TripDropdown({
  trips,
  isAdding,
  onSelectTrip,
  onCreateNew,
  onClose,
}: {
  trips: TripSummary[];
  isAdding: boolean;
  onSelectTrip: (trip: TripSummary) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.trip-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const tripTypeIcons: Record<string, string> = {
    wine_tour: '🍷',
    celebration: '🎉',
    corporate: '💼',
    wedding: '💒',
    anniversary: '❤️',
    custom: '✨',
  };

  return (
    <div className="trip-dropdown absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 z-50 overflow-hidden">
      <div className="p-3 border-b border-stone-100">
        <h4 className="font-semibold text-stone-900 text-sm">Add to Trip</h4>
      </div>

      {isAdding ? (
        <div className="p-4 text-center">
          <div className="animate-spin text-2xl mb-2">🍷</div>
          <p className="text-sm text-stone-600">Adding...</p>
        </div>
      ) : (
        <>
          {trips.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectTrip(trip);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">{tripTypeIcons[trip.trip_type] || '🍷'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{trip.title}</p>
                    <p className="text-xs text-stone-500">
                      {trip.stops_count} stop{trip.stops_count !== 1 ? 's' : ''}
                      {trip.start_date && ` • ${new Date(trip.start_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-stone-500 mb-2">No active trips</p>
            </div>
          )}

          <div className="p-3 border-t border-stone-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateNew();
              }}
              className="w-full px-4 py-2 bg-[#8B1538] text-white text-sm font-medium rounded-lg hover:bg-[#722F37] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Trip
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Compact version for grid cards (positioned in corner)
export function AddToTripButtonCompact({ winery }: { winery: WineryInfo }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { trips, loadMyTrips, addStop, createTrip } = useTripPlannerStore();

  useEffect(() => {
    if (showDropdown && trips.length === 0) {
      loadMyTrips();
    }
  }, [showDropdown, trips.length, loadMyTrips]);

  const activeTrips = trips.filter(
    (t) => !['completed', 'cancelled', 'booked'].includes(t.status)
  );

  const handleAddToTrip = useCallback(async (trip: TripSummary) => {
    setIsAdding(true);

    try {
      await addStop(trip.share_code, {
        name: winery.name,
        winery_id: winery.id,
        stop_type: 'winery',
        day_number: 1,
      });

      setShowSuccess(true);
      setShowDropdown(false);

      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      logger.error('Failed to add winery to trip', { error, wineryId: winery.id, wineryName: winery.name });
    } finally {
      setIsAdding(false);
    }
  }, [winery, addStop]);

  const handleCreateNewTrip = useCallback(async () => {
    setIsAdding(true);

    try {
      const newTrip = await createTrip({
        title: `Wine Tour`,
        trip_type: 'wine_tour',
      });

      if (newTrip) {
        await addStop(newTrip.share_code, {
          name: winery.name,
          winery_id: winery.id,
          stop_type: 'winery',
          day_number: 1,
        });

        setShowSuccess(true);
        setShowDropdown(false);

        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      logger.error('Failed to create trip with winery', { error, wineryId: winery.id, wineryName: winery.name });
    } finally {
      setIsAdding(false);
    }
  }, [winery, createTrip, addStop]);

  if (showSuccess) {
    return (
      <div className="absolute bottom-3 left-3 z-10 p-2 rounded-full bg-green-500 text-white shadow-lg">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 z-10">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        className="p-2 rounded-full shadow-lg bg-white/90 text-stone-500 hover:text-[#8B1538] hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30"
        aria-label={`Add ${winery.name} to trip`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {showDropdown && (
        <TripDropdown
          trips={activeTrips}
          isAdding={isAdding}
          onSelectTrip={handleAddToTrip}
          onCreateNew={handleCreateNewTrip}
          onClose={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
