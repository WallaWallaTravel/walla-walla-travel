/**
 * useItinerary Hook
 * 
 * Custom hook for managing itinerary state and operations.
 * Encapsulates itinerary logic for reusability across components.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/utils/fetch-utils';

export interface Stop {
  id?: number;
  winery_id: number;
  winery?: {
    id: number;
    name: string;
    address: string;
    city: string;
    tasting_fee: number;
    average_visit_duration: number;
  };
  stop_order: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  drive_time_to_next_minutes: number;
  reservation_confirmed: boolean;
  special_notes: string | null;
  is_lunch_stop?: boolean;
}

export interface Itinerary {
  id: number;
  booking_id: number;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  estimated_dropoff_time: string;
  driver_notes: string;
  internal_notes: string;
  stops: Stop[];
  pickup_drive_time_minutes?: number;
  dropoff_drive_time_minutes?: number;
}

interface UseItineraryReturn {
  itinerary: Itinerary | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadItinerary: (bookingId: string) => Promise<void>;
  saveItinerary: () => Promise<boolean>;
  updateItinerary: (updates: Partial<Itinerary>) => void;
  addStop: (winery: any) => void;
  removeStop: (index: number) => void;
  reorderStops: (fromIndex: number, toIndex: number) => void;
  updateStop: (index: number, updates: Partial<Stop>) => void;
  calculateTravelTime: (fromIndex: number) => Promise<void>;
  calculatePickupTravelTime: () => Promise<void>;
  calculateDropoffTravelTime: () => Promise<void>;
}

export function useItinerary(bookingId: string): UseItineraryReturn {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load itinerary from API
   */
  const loadItinerary = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiGet<Itinerary>(`/api/itineraries/${id}`);

      if (result.success && result.data) {
        setItinerary({
          ...result.data,
          stops: result.data.stops || [],
        });
      } else {
        setError(result.error || 'Failed to load itinerary');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading itinerary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save itinerary to API
   */
  const saveItinerary = useCallback(async (): Promise<boolean> => {
    if (!itinerary) return false;

    setSaving(true);
    setError(null);

    try {
      // Save main itinerary details
      const itineraryResult = await apiPut(`/api/itineraries/${bookingId}`, {
        pickup_location: itinerary.pickup_location,
        pickup_time: itinerary.pickup_time,
        pickup_drive_time_minutes: itinerary.pickup_drive_time_minutes || 0,
        dropoff_location: itinerary.dropoff_location,
        estimated_dropoff_time: itinerary.estimated_dropoff_time,
        dropoff_drive_time_minutes: itinerary.dropoff_drive_time_minutes || 0,
        driver_notes: itinerary.driver_notes,
        internal_notes: itinerary.internal_notes,
      });

      if (!itineraryResult.success) {
        throw new Error(itineraryResult.error || 'Failed to save itinerary');
      }

      // Save stops
      const stopsResult = await apiPut(`/api/itineraries/${bookingId}/stops`, {
        stops: itinerary.stops.map(stop => ({
          winery_id: stop.winery_id,
          stop_order: stop.stop_order,
          arrival_time: stop.arrival_time,
          departure_time: stop.departure_time,
          duration_minutes: stop.duration_minutes,
          is_lunch_stop: stop.is_lunch_stop || false,
          drive_time_to_next_minutes: stop.drive_time_to_next_minutes,
          reservation_confirmed: stop.reservation_confirmed,
          special_notes: stop.special_notes,
        })),
      });

      if (!stopsResult.success) {
        throw new Error(stopsResult.error || 'Failed to save stops');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      console.error('Error saving itinerary:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [itinerary, bookingId]);

  /**
   * Update itinerary fields
   */
  const updateItinerary = useCallback((updates: Partial<Itinerary>) => {
    setItinerary(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  /**
   * Add a new stop to the itinerary
   */
  const addStop = useCallback((winery: any) => {
    if (!itinerary) return;

    const newStopOrder = itinerary.stops.length + 1;
    const lastStop = itinerary.stops[itinerary.stops.length - 1];
    
    // Calculate arrival time based on last stop
    let arrivalTime = '10:00';
    if (lastStop) {
      const departureMinutes = parseInt(lastStop.departure_time.split(':')[0]) * 60 + 
                              parseInt(lastStop.departure_time.split(':')[1]);
      const travelMinutes = lastStop.drive_time_to_next_minutes || 15;
      const totalMinutes = departureMinutes + travelMinutes;
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      arrivalTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const departureMinutes = parseInt(arrivalTime.split(':')[0]) * 60 + 
                            parseInt(arrivalTime.split(':')[1]) + 
                            (winery.average_visit_duration || 75);
    const depHours = Math.floor(departureMinutes / 60) % 24;
    const depMins = departureMinutes % 60;
    const departureTime = `${String(depHours).padStart(2, '0')}:${String(depMins).padStart(2, '0')}`;

    const newStop: Stop = {
      winery_id: winery.id,
      winery,
      stop_order: newStopOrder,
      arrival_time: arrivalTime,
      departure_time: departureTime,
      duration_minutes: winery.average_visit_duration || 75,
      drive_time_to_next_minutes: 15,
      reservation_confirmed: false,
      special_notes: null,
      is_lunch_stop: false,
    };

    setItinerary({
      ...itinerary,
      stops: [...itinerary.stops, newStop],
    });
  }, [itinerary]);

  /**
   * Remove a stop from the itinerary
   */
  const removeStop = useCallback((index: number) => {
    if (!itinerary) return;

    const updatedStops = itinerary.stops.filter((_, i) => i !== index);
    // Reorder remaining stops
    const reorderedStops = updatedStops.map((stop, i) => ({
      ...stop,
      stop_order: i + 1,
    }));

    setItinerary({
      ...itinerary,
      stops: reorderedStops,
    });
  }, [itinerary]);

  /**
   * Reorder stops (drag and drop)
   */
  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    if (!itinerary) return;

    const updatedStops = [...itinerary.stops];
    const [movedStop] = updatedStops.splice(fromIndex, 1);
    updatedStops.splice(toIndex, 0, movedStop);

    // Update stop orders
    const reorderedStops = updatedStops.map((stop, i) => ({
      ...stop,
      stop_order: i + 1,
    }));

    setItinerary({
      ...itinerary,
      stops: reorderedStops,
    });
  }, [itinerary]);

  /**
   * Update a specific stop
   */
  const updateStop = useCallback((index: number, updates: Partial<Stop>) => {
    if (!itinerary) return;

    const updatedStops = [...itinerary.stops];
    updatedStops[index] = { ...updatedStops[index], ...updates };

    setItinerary({
      ...itinerary,
      stops: updatedStops,
    });
  }, [itinerary]);

  /**
   * Calculate travel time between stops
   */
  const calculateTravelTime = useCallback(async (fromIndex: number) => {
    if (!itinerary || fromIndex >= itinerary.stops.length - 1) return;

    const fromStop = itinerary.stops[fromIndex];
    const toStop = itinerary.stops[fromIndex + 1];

    if (!fromStop.winery?.address || !toStop.winery?.address) {
      console.warn('Missing address information for stops');
      return;
    }

    try {
      const result = await apiGet<{ duration: number }>(
        `/api/distance?origin=${encodeURIComponent(fromStop.winery.address)}&destination=${encodeURIComponent(toStop.winery.address)}`
      );

      if (result.success && result.data) {
        const travelMinutes = Math.ceil(result.data.duration / 60);
        updateStop(fromIndex, { drive_time_to_next_minutes: travelMinutes });
      }
    } catch (error) {
      console.error('Error calculating travel time:', error);
    }
  }, [itinerary, updateStop]);

  /**
   * Calculate travel time from pickup to first stop
   */
  const calculatePickupTravelTime = useCallback(async () => {
    if (!itinerary || itinerary.stops.length === 0) return;

    const firstStop = itinerary.stops[0];
    if (!firstStop.winery?.address) return;

    try {
      const result = await apiGet<{ duration: number }>(
        `/api/distance?origin=${encodeURIComponent(itinerary.pickup_location)}&destination=${encodeURIComponent(firstStop.winery.address)}`
      );

      if (result.success && result.data) {
        const travelMinutes = Math.ceil(result.data.duration / 60);
        updateItinerary({ pickup_drive_time_minutes: travelMinutes });
      }
    } catch (error) {
      console.error('Error calculating pickup travel time:', error);
    }
  }, [itinerary, updateItinerary]);

  /**
   * Calculate travel time from last stop to dropoff
   */
  const calculateDropoffTravelTime = useCallback(async () => {
    if (!itinerary || itinerary.stops.length === 0) return;

    const lastStop = itinerary.stops[itinerary.stops.length - 1];
    if (!lastStop.winery?.address) return;

    try {
      const result = await apiGet<{ duration: number }>(
        `/api/distance?origin=${encodeURIComponent(lastStop.winery.address)}&destination=${encodeURIComponent(itinerary.dropoff_location)}`
      );

      if (result.success && result.data) {
        const travelMinutes = Math.ceil(result.data.duration / 60);
        updateItinerary({ dropoff_drive_time_minutes: travelMinutes });
      }
    } catch (error) {
      console.error('Error calculating dropoff travel time:', error);
    }
  }, [itinerary, updateItinerary]);

  // Load itinerary on mount
  useEffect(() => {
    if (bookingId) {
      loadItinerary(bookingId);
    }
  }, [bookingId, loadItinerary]);

  return {
    itinerary,
    loading,
    saving,
    error,
    loadItinerary,
    saveItinerary,
    updateItinerary,
    addStop,
    removeStop,
    reorderStops,
    updateStop,
    calculateTravelTime,
    calculatePickupTravelTime,
    calculateDropoffTravelTime,
  };
}




