'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { Itinerary, Winery, Stop, NewWineryData } from '../types';
import { useItineraryTime } from '../hooks/useItineraryTime';
import { TourStop } from '../components/TourStop';
import { PickupDropoff } from '../components/PickupDropoff';
import { WinerySearch } from '../components/WinerySearch';
import { AddWineryModal } from '../components/AddWineryModal';
import { logger } from '@/lib/logger';

export default function ItineraryBuilder({ params }: { params: Promise<{ booking_id: string }> }) {
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.booking_id;
  const router = useRouter();

  // State
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cascadeAdjustments, setCascadeAdjustments] = useState<Record<number, boolean>>({});
  const [showAddWineryForm, setShowAddWineryForm] = useState(false);
  const [newWineryData, setNewWineryData] = useState<NewWineryData>({
    name: '',
    address: '',
    city: 'Walla Walla',
    state: 'WA',
    zip_code: '',
    tasting_fee: 0,
    average_visit_duration: 75
  });

  // Custom hooks
  const {
    addMinutes,
    formatTime: _formatTime,
    getMinutesDifference,
    calculateTimes,
    isLunchTime,
    calculateTravelTime,
  } = useItineraryTime();

  // Helper function to select all text on focus
  const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.select();
  };

  // Load data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadData = async () => {
    try {
      const [itineraryRes, wineriesRes] = await Promise.all([
        fetch(`/api/itineraries/${bookingId}`),
        fetch('/api/wineries')
      ]);

      if (itineraryRes.ok) {
        const itineraryData = await itineraryRes.json();
        if (itineraryData.data) {
          const itinerary = {
            ...itineraryData.data,
            stops: itineraryData.data.stops || []
          };
          setItinerary(itinerary);

          // Initialize cascade checkboxes
          const cascadeDefaults: Record<number, boolean> = {};
          itinerary.stops.forEach((_: Stop, index: number) => {
            cascadeDefaults[index] = true;
          });
          setCascadeAdjustments(cascadeDefaults);
        }
      } else {
        const errorData = await itineraryRes.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Failed to load itinerary', { error: errorData });
      }

      if (wineriesRes.ok) {
        const wineriesData = await wineriesRes.json();
        setWineries(wineriesData.data || []);
      }
    } catch (error) {
      logger.error('Error loading data', { error });
    } finally {
      setLoading(false);
    }
  };

  // Winery management
  const handleAddWinery = (winery: Winery) => {
    if (!itinerary) return;

    const newStop: Stop = {
      winery_id: winery.id,
      winery,
      stop_order: (itinerary.stops?.length || 0) + 1,
      arrival_time: '10:00',
      departure_time: '11:00',
      duration_minutes: 75,
      drive_time_to_next_minutes: 15,
      reservation_confirmed: false,
      special_notes: ''
    };

    const updatedStops = calculateTimes([...itinerary.stops, newStop], itinerary.pickup_time);
    const finalStops = updatedStops.map(stop => {
      if (isLunchTime(stop.arrival_time) && stop.duration_minutes < 90) {
        return { ...stop, duration_minutes: 90 };
      }
      return stop;
    });

    setItinerary({ ...itinerary, stops: calculateTimes(finalStops, itinerary.pickup_time) });
    setCascadeAdjustments({ ...cascadeAdjustments, [finalStops.length - 1]: true });
    setSearchTerm('');
  };

  const handleCreateNewWinery = async () => {
    try {
      const response = await fetch('/api/wineries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWineryData)
      });

      if (response.ok) {
        const data = await response.json();
        const createdWinery = data.data;
        setWineries([...wineries, createdWinery]);
        handleAddWinery(createdWinery);
        setShowAddWineryForm(false);
        setNewWineryData({
          name: '',
          address: '',
          city: 'Walla Walla',
          state: 'WA',
          zip_code: '',
          tasting_fee: 0,
          average_visit_duration: 75
        });
      }
    } catch (error) {
      logger.error('Error creating winery', { error });
      alert('Failed to create winery. Please try again.');
    }
  };

  // Stop management
  const handleRemoveStop = (index: number) => {
    if (!itinerary || !itinerary.stops) return;
    const updatedStops = itinerary.stops
      .filter((_, i) => i !== index)
      .map((stop, i) => ({ ...stop, stop_order: i + 1 }));

    const newCascade = { ...cascadeAdjustments };
    delete newCascade[index];
    setCascadeAdjustments(newCascade);

    setItinerary({ ...itinerary, stops: calculateTimes(updatedStops, itinerary.pickup_time) });
  };

  const handleTimeChange = (index: number, field: 'arrival_time' | 'departure_time', newTime: string) => {
    if (!itinerary || !itinerary.stops) return;
    const updated = [...itinerary.stops];
    
    updated[index][field] = newTime;
    
    if (field === 'departure_time' || field === 'arrival_time') {
      const arrival = field === 'arrival_time' ? newTime : updated[index].arrival_time;
      const departure = field === 'departure_time' ? newTime : updated[index].departure_time;
      updated[index].duration_minutes = getMinutesDifference(arrival, departure);
    }
    
    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated, itinerary.pickup_time) });
    } else {
      setItinerary({ ...itinerary, stops: updated });
    }
  };

  const toggleLunchStop = (index: number) => {
    if (!itinerary || !itinerary.stops) return;
    const updated = [...itinerary.stops];
    
    const isCurrentlyLunch = updated[index].is_lunch_stop;
    
    if (isCurrentlyLunch) {
      updated[index].is_lunch_stop = false;
      updated[index].duration_minutes = 75;
    } else {
      updated.forEach(stop => stop.is_lunch_stop = false);
      updated[index].is_lunch_stop = true;
      updated[index].duration_minutes = 90;
    }
    
    updated[index].departure_time = addMinutes(
      updated[index].arrival_time, 
      updated[index].duration_minutes
    );
    
    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated, itinerary.pickup_time) });
    } else {
      setItinerary({ ...itinerary, stops: updated });
    }
  };

  const nudgeDuration = (index: number, adjustment: number) => {
    if (!itinerary) return;
    const updated = [...itinerary.stops];
    updated[index].duration_minutes = Math.max(15, updated[index].duration_minutes + adjustment);

    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated, itinerary.pickup_time) });
    } else {
      updated[index].departure_time = addMinutes(updated[index].arrival_time, updated[index].duration_minutes);
      setItinerary({ ...itinerary, stops: updated });
    }
  };

  const nudgeDriveTime = (index: number, adjustment: number) => {
    if (!itinerary) return;
    const updated = [...itinerary.stops];
    updated[index].drive_time_to_next_minutes = Math.max(0, updated[index].drive_time_to_next_minutes + adjustment);

    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated, itinerary.pickup_time) });
    } else {
      setItinerary({ ...itinerary, stops: updated });
    }
  };

  const toggleCascade = (index: number) => {
    const newCascade = { ...cascadeAdjustments, [index]: !cascadeAdjustments[index] };
    setCascadeAdjustments(newCascade);
    
    if (newCascade[index] && itinerary && itinerary.stops) {
      setItinerary({ ...itinerary, stops: calculateTimes(itinerary.stops, itinerary.pickup_time) });
    }
  };

  const handleCalculateTravelTime = async (fromIndex: number) => {
    if (!itinerary || !itinerary.stops || fromIndex >= itinerary.stops.length - 1) return;
    
    const fromStop = itinerary.stops[fromIndex];
    const toStop = itinerary.stops[fromIndex + 1];
    
    if (!fromStop.winery?.address || !toStop.winery?.address) {
      alert('Missing address information for wineries');
      return;
    }

    try {
      const travelMinutes = await calculateTravelTime(fromStop.winery.address, toStop.winery.address);
      
      const updated = [...itinerary.stops];
      updated[fromIndex].drive_time_to_next_minutes = travelMinutes;
      
      if (cascadeAdjustments[fromIndex]) {
        setItinerary({ ...itinerary, stops: calculateTimes(updated, itinerary.pickup_time) });
      } else {
        setItinerary({ ...itinerary, stops: updated });
      }
      
      alert(`Travel time updated: ${travelMinutes} minutes`);
    } catch (error) {
      logger.error('Error calculating travel time', { error });
      alert('Could not calculate travel time. Using default.');
    }
  };

  const calculatePickupTravelTime = async () => {
    if (!itinerary || !itinerary.stops || itinerary.stops.length === 0) return;
    
    const firstStop = itinerary.stops[0];
    if (!firstStop.winery?.address) {
      alert('Missing address information for first stop');
      return;
    }

    try {
      const travelMinutes = await calculateTravelTime(itinerary.pickup_location, firstStop.winery.address);
      setItinerary({ ...itinerary, pickup_drive_time_minutes: travelMinutes });
      alert(`Pickup travel time updated: ${travelMinutes} minutes`);
    } catch (error) {
      logger.error('Error calculating pickup travel time', { error });
      alert('Could not calculate pickup travel time.');
    }
  };

  const calculateDropoffTravelTime = async () => {
    if (!itinerary || !itinerary.stops || itinerary.stops.length === 0) return;
    
    const lastStop = itinerary.stops[itinerary.stops.length - 1];
    if (!lastStop.winery?.address) {
      alert('Missing address information for last stop');
      return;
    }

    try {
      const travelMinutes = await calculateTravelTime(lastStop.winery.address, itinerary.dropoff_location);
      setItinerary({ ...itinerary, dropoff_drive_time_minutes: travelMinutes });
      alert(`Dropoff travel time updated: ${travelMinutes} minutes`);
    } catch (error) {
      logger.error('Error calculating dropoff travel time', { error });
      alert('Could not calculate dropoff travel time.');
    }
  };

  // Drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const stops = [...itinerary!.stops];
    const draggedStop = stops[draggedIndex];
    stops.splice(draggedIndex, 1);
    stops.splice(index, 0, draggedStop);

    const reorderedStops = stops.map((stop, i) => ({ ...stop, stop_order: i + 1 }));
    setItinerary({ ...itinerary!, stops: calculateTimes(reorderedStops, itinerary!.pickup_time) });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save
  const handleSave = async () => {
    if (!itinerary || !itinerary.stops) return;

    setSaving(true);
    try {
      await fetch(`/api/itineraries/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: itinerary.pickup_location,
          pickup_time: itinerary.pickup_time,
          pickup_drive_time_minutes: itinerary.pickup_drive_time_minutes || 0,
          dropoff_location: itinerary.dropoff_location,
          estimated_dropoff_time: itinerary.estimated_dropoff_time,
          dropoff_drive_time_minutes: itinerary.dropoff_drive_time_minutes || 0,
          driver_notes: itinerary.driver_notes,
          internal_notes: itinerary.internal_notes
        })
      });

      await fetch(`/api/itineraries/${bookingId}/stops`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops: itinerary.stops.map(stop => ({
            winery_id: stop.winery_id,
            stop_order: stop.stop_order,
            arrival_time: stop.arrival_time,
            departure_time: stop.departure_time,
            duration_minutes: stop.duration_minutes,
            is_lunch_stop: stop.is_lunch_stop || false,
            drive_time_to_next_minutes: stop.drive_time_to_next_minutes,
            reservation_confirmed: stop.reservation_confirmed,
            special_notes: stop.special_notes
          }))
        })
      });

      alert('Itinerary saved successfully!');
      await loadData();
    } catch (_error) {
      alert('Error saving itinerary');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToDriver = async () => {
    if (!itinerary) return;
    alert('Send to Driver Portal feature coming soon!');
  };

  const generateGoogleMapsLink = (): string => {
    if (!itinerary || !itinerary.stops || itinerary.stops.length === 0) return '';

    const waypoints = itinerary.stops
      .map(stop => encodeURIComponent(stop.winery?.address || ''))
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(itinerary.pickup_location)}&destination=${encodeURIComponent(itinerary.dropoff_location)}&waypoints=${waypoints}`;
  };

  const totalDriveTime = 
    (itinerary?.pickup_drive_time_minutes || 0) + 
    (itinerary?.stops?.reduce((sum, stop) => sum + stop.drive_time_to_next_minutes, 0) || 0) +
    (itinerary?.dropoff_drive_time_minutes || 0);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading itinerary...</div>
      </div>
    );
  }

  // No itinerary state
  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Itinerary Found</h2>
          <p className="text-gray-700 mb-6">
            There is no itinerary associated with booking #{bookingId}.
            This might be because the itinerary wasn&apos;t created yet or there was an error during creation.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/admin/bookings')}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors"
            >
              ← Back to Trips
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/itineraries/${bookingId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      pickup_location: 'TBD',
                      pickup_time: '10:00',
                      dropoff_location: 'TBD',
                      estimated_dropoff_time: '16:00',
                      driver_notes: '',
                      internal_notes: ''
                    })
                  });
                  
                  if (response.ok) {
                    alert('Itinerary created! Reloading...');
                    await loadData();
                  } else {
                    const error = await response.json();
                    alert(`Failed to create itinerary: ${error.error || 'Unknown error'}`);
                  }
                } catch (error) {
                  logger.error('Error creating itinerary', { error });
                  alert('Failed to create itinerary. Please try again or contact support.');
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Create Itinerary Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Itinerary Builder</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-900 hover:text-gray-700 font-semibold text-lg"
          >
            ← Back
          </button>
        </div>

        {/* Unified Tour Stops Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Complete Tour Route</h2>
          </div>

          {/* Winery Search */}
          <WinerySearch
            searchTerm={searchTerm}
            wineries={wineries}
            onSearchChange={setSearchTerm}
            onWinerySelect={handleAddWinery}
            onAddNew={() => setShowAddWineryForm(true)}
            handleFocusSelect={handleFocusSelect}
          />

          <div className="space-y-4">
            {/* Pickup Location */}
            <PickupDropoff
              type="pickup"
              location={itinerary.pickup_location}
              time={itinerary.pickup_time}
              driveTime={itinerary.pickup_drive_time_minutes}
              showDriveTime={(itinerary.stops?.length || 0) > 0}
              onLocationChange={(value) => setItinerary({ ...itinerary, pickup_location: value })}
              onTimeChange={(value) => setItinerary({ ...itinerary, pickup_time: value, stops: calculateTimes(itinerary.stops, value) })}
              onCalculateDriveTime={calculatePickupTravelTime}
              handleFocusSelect={handleFocusSelect}
            />

            {/* Tour Stops */}
            {(itinerary.stops?.length || 0) === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">🍷</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No stops added yet</h3>
                <p className="text-gray-700 font-medium">Use the search above to add wineries to the tour</p>
              </div>
            ) : (
              itinerary.stops.map((stop, index) => (
                <TourStop
                  key={stop.id || index}
                  stop={stop}
                  index={index}
                  cascadeEnabled={cascadeAdjustments[index] ?? true}
                  onRemove={() => handleRemoveStop(index)}
                  onTimeChange={(field, value) => handleTimeChange(index, field, value)}
                  onToggleLunch={() => toggleLunchStop(index)}
                  onNudgeDuration={(adjustment) => nudgeDuration(index, adjustment)}
                  onNudgeDriveTime={(adjustment) => nudgeDriveTime(index, adjustment)}
                  onToggleCascade={() => toggleCascade(index)}
                  onReservationChange={(confirmed) => {
                    const updated = [...itinerary.stops];
                    updated[index].reservation_confirmed = confirmed;
                    setItinerary({ ...itinerary, stops: updated });
                  }}
                  onNotesChange={(notes) => {
                    const updated = [...itinerary.stops];
                    updated[index].special_notes = notes ?? '';
                    setItinerary({ ...itinerary, stops: updated });
                  }}
                  onDurationChange={(minutes) => {
                    const updated = [...itinerary.stops];
                    updated[index].duration_minutes = minutes;
                    setItinerary({ ...itinerary, stops: cascadeAdjustments[index] ? calculateTimes(updated, itinerary.pickup_time) : updated });
                  }}
                  onDriveTimeChange={(minutes) => {
                    const updated = [...itinerary.stops];
                    updated[index].drive_time_to_next_minutes = minutes;
                    setItinerary({ ...itinerary, stops: cascadeAdjustments[index] ? calculateTimes(updated, itinerary.pickup_time) : updated });
                  }}
                  onCalculateTravelTime={() => handleCalculateTravelTime(index)}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  showAutoCalculate={index < (itinerary.stops?.length || 0) - 1}
                  handleFocusSelect={handleFocusSelect}
                />
              ))
            )}

            {/* Dropoff Location */}
            <PickupDropoff
              type="dropoff"
              location={itinerary.dropoff_location}
              time={itinerary.estimated_dropoff_time}
              driveTime={itinerary.dropoff_drive_time_minutes}
              showDriveTime={(itinerary.stops?.length || 0) > 0}
              onLocationChange={(value) => setItinerary({ ...itinerary, dropoff_location: value })}
              onTimeChange={(value) => setItinerary({ ...itinerary, estimated_dropoff_time: value })}
              onCalculateDriveTime={calculateDropoffTravelTime}
              handleFocusSelect={handleFocusSelect}
            />
          </div>
        </div>

        {/* Driver Notes & Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <div className="mb-6">
            <label className="block text-base font-bold text-gray-900 mb-2">Driver Notes</label>
            <textarea
              value={itinerary.driver_notes || ''}
              onChange={(e) => setItinerary({ ...itinerary, driver_notes: e.target.value })}
              onFocus={handleFocusSelect}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Notes for the driver..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
            <div className="text-gray-900 font-bold text-lg">
              Total Drive Time: <span className="text-blue-600">{totalDriveTime} minutes</span> | Stops: <span className="text-blue-600">{itinerary.stops?.length || 0}</span>
            </div>
            <div className="flex gap-3">
              {(itinerary.stops?.length || 0) > 0 && (
                <a
                  href={generateGoogleMapsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-base hover:bg-green-700 transition-colors"
                >
                  📍 Google Maps
                </a>
              )}
              <button
                onClick={handleSendToDriver}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold text-base hover:bg-purple-700 transition-colors"
              >
                📤 Send to Driver
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Itinerary'}
              </button>
            </div>
          </div>
        </div>

        {/* Add New Winery Modal */}
        <AddWineryModal
          isOpen={showAddWineryForm}
          wineryData={newWineryData}
          onClose={() => setShowAddWineryForm(false)}
          onChange={setNewWineryData}
          onSubmit={handleCreateNewWinery}
        />
      </div>
    </div>
  );
}

