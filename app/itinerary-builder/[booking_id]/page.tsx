'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface Winery {
  id: number;
  name: string;
  address: string;
  city: string;
  tasting_fee: number;
  average_visit_duration: number;
}

interface Stop {
  id?: number;
  winery_id: number;
  winery?: Winery;
  stop_order: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  drive_time_to_next_minutes: number;
  reservation_confirmed: boolean;
  special_notes: string;
}

interface Itinerary {
  id: number;
  booking_id: number;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  estimated_dropoff_time: string;
  driver_notes: string;
  internal_notes: string;
  stops: Stop[];
}

export default function ItineraryBuilder({ params }: { params: Promise<{ booking_id: string }> }) {
  const unwrappedParams = use(params);
  const bookingId = unwrappedParams.booking_id;

  const router = useRouter();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cascadeAdjustments, setCascadeAdjustments] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, [bookingId]);

  const loadData = async () => {
    try {
      const [itineraryRes, wineriesRes] = await Promise.all([
        fetch(`/api/itineraries/${bookingId}`),
        fetch('/api/wineries')
      ]);

      if (itineraryRes.ok) {
        const itineraryData = await itineraryRes.json();
        setItinerary(itineraryData.data);

        // Initialize cascade checkboxes (all checked by default)
        const cascadeDefaults: Record<number, boolean> = {};
        itineraryData.data.stops.forEach((_: Stop, index: number) => {
          cascadeDefaults[index] = true;
        });
        setCascadeAdjustments(cascadeDefaults);
      }

      if (wineriesRes.ok) {
        const wineriesData = await wineriesRes.json();
        setWineries(wineriesData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLunchTime = (arrivalTime: string): boolean => {
    const [hours, minutes] = arrivalTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const lunchStart = 12 * 60; // 12:00 PM
    const lunchEnd = 13 * 60 + 30; // 1:30 PM
    return totalMinutes >= lunchStart && totalMinutes <= lunchEnd;
  };

  const calculateTimes = (stops: Stop[]) => {
    if (stops.length === 0 || !itinerary) return stops;

    let currentTime = itinerary.pickup_time;

    return stops.map((stop) => {
      const arrival = currentTime;
      const departure = addMinutes(arrival, stop.duration_minutes);
      const nextTime = addMinutes(departure, stop.drive_time_to_next_minutes);

      currentTime = nextTime;

      return {
        ...stop,
        arrival_time: arrival,
        departure_time: departure
      };
    });
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const handleAddWinery = (winery: Winery) => {
    if (!itinerary) return;

    // Determine default duration based on position
    let defaultDuration = 75;

    const newStop: Stop = {
      winery_id: winery.id,
      winery,
      stop_order: itinerary.stops.length + 1,
      arrival_time: '10:00',
      departure_time: '11:00',
      duration_minutes: defaultDuration,
      drive_time_to_next_minutes: 15,
      reservation_confirmed: false,
      special_notes: ''
    };

    const updatedStops = calculateTimes([...itinerary.stops, newStop]);

    // Check if any stop is now at lunch time and adjust
    const finalStops = updatedStops.map(stop => {
      if (isLunchTime(stop.arrival_time) && stop.duration_minutes < 90) {
        return { ...stop, duration_minutes: 90 };
      }
      return stop;
    });

    setItinerary({ ...itinerary, stops: calculateTimes(finalStops) });
    setCascadeAdjustments({ ...cascadeAdjustments, [itinerary.stops.length]: true });
  };

  const handleRemoveStop = (index: number) => {
    if (!itinerary) return;
    const updatedStops = itinerary.stops
      .filter((_, i) => i !== index)
      .map((stop, i) => ({ ...stop, stop_order: i + 1 }));

    const newCascade = { ...cascadeAdjustments };
    delete newCascade[index];
    setCascadeAdjustments(newCascade);

    setItinerary({ ...itinerary, stops: calculateTimes(updatedStops) });
  };

  const nudgeDuration = (index: number, adjustment: number) => {
    if (!itinerary) return;
    const updated = [...itinerary.stops];
    updated[index].duration_minutes = Math.max(15, updated[index].duration_minutes + adjustment);

    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated) });
    } else {
      // Only update this stop's departure time
      updated[index].departure_time = addMinutes(updated[index].arrival_time, updated[index].duration_minutes);
      setItinerary({ ...itinerary, stops: updated });
    }
  };

  const nudgeDriveTime = (index: number, adjustment: number) => {
    if (!itinerary) return;
    const updated = [...itinerary.stops];
    updated[index].drive_time_to_next_minutes = Math.max(0, updated[index].drive_time_to_next_minutes + adjustment);

    if (cascadeAdjustments[index]) {
      setItinerary({ ...itinerary, stops: calculateTimes(updated) });
    } else {
      // Don't cascade changes
      setItinerary({ ...itinerary, stops: updated });
    }
  };

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
    setItinerary({ ...itinerary!, stops: calculateTimes(reorderedStops) });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    if (!itinerary) return;

    setSaving(true);
    try {
      await fetch(`/api/itineraries/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: itinerary.pickup_location,
          pickup_time: itinerary.pickup_time,
          dropoff_location: itinerary.dropoff_location,
          estimated_dropoff_time: itinerary.estimated_dropoff_time,
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
            drive_time_to_next_minutes: stop.drive_time_to_next_minutes,
            reservation_confirmed: stop.reservation_confirmed,
            special_notes: stop.special_notes
          }))
        })
      });

      alert('Itinerary saved successfully!');
      await loadData();
    } catch (error) {
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
    if (!itinerary || itinerary.stops.length === 0) return '';

    const waypoints = itinerary.stops
      .map(stop => encodeURIComponent(stop.winery?.address || ''))
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(itinerary.pickup_location)}&destination=${encodeURIComponent(itinerary.dropoff_location)}&waypoints=${waypoints}`;
  };

  const filteredWineries = wineries.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDriveTime = itinerary?.stops.reduce((sum, stop) => sum + stop.drive_time_to_next_minutes, 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading itinerary...</div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">No itinerary found for this booking</div>
      </div>
    );
  }

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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">Pickup Location</label>
              <input
                type="text"
                value={itinerary.pickup_location}
                onChange={(e) => setItinerary({ ...itinerary, pickup_location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">Pickup Time</label>
              <input
                type="time"
                value={itinerary.pickup_time}
                onChange={(e) => setItinerary({ ...itinerary, pickup_time: e.target.value, stops: calculateTimes(itinerary.stops) })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">Dropoff Location</label>
              <input
                type="text"
                value={itinerary.dropoff_location}
                onChange={(e) => setItinerary({ ...itinerary, dropoff_location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">Estimated Dropoff Time</label>
              <input
                type="time"
                value={itinerary.estimated_dropoff_time}
                onChange={(e) => setItinerary({ ...itinerary, estimated_dropoff_time: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-base font-bold text-gray-900 mb-2">Driver Notes</label>
            <textarea
              value={itinerary.driver_notes}
              onChange={(e) => setItinerary({ ...itinerary, driver_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Notes for the driver..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
            <div className="text-gray-900 font-bold text-lg">
              Total Drive Time: <span className="text-blue-600">{totalDriveTime} minutes</span> | Stops: <span className="text-blue-600">{itinerary.stops.length}</span>
            </div>
            <div className="flex gap-3">
              {itinerary.stops.length > 0 && (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tour Stops</h2>

            {itinerary.stops.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🍷</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No stops added yet</h3>
                <p className="text-gray-700 font-medium">Click a winery from the sidebar to add it to the tour</p>
              </div>
            ) : (
              <div className="space-y-4">
                {itinerary.stops.map((stop, index) => (
                  <div
                    key={stop.id || index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="bg-white rounded-lg shadow-md p-6 cursor-move hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-blue-400"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                          {stop.stop_order}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{stop.winery?.name}</h3>
                          <div className="text-2xl font-bold text-blue-600 mb-3">
                            {formatTime(stop.arrival_time)} - {formatTime(stop.departure_time)}
                            {isLunchTime(stop.arrival_time) && (
                              <span className="ml-3 text-base bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">🍽️ Lunch Time</span>
                            )}
                          </div>
                          <div className="text-base font-semibold text-gray-700">
                            {stop.winery?.address}, {stop.winery?.city}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStop(index)}
                        className="text-red-600 hover:text-red-800 font-bold text-lg ml-4"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-200">
                      {/* Duration Controls */}
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-900">Duration at Winery</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => nudgeDuration(index, -5)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
                          >
                            ⬇️ -5
                          </button>
                          <input
                            type="number"
                            value={stop.duration_minutes}
                            onChange={(e) => {
                              const updated = [...itinerary.stops];
                              updated[index].duration_minutes = parseInt(e.target.value) || 0;
                              setItinerary({ ...itinerary, stops: cascadeAdjustments[index] ? calculateTimes(updated) : updated });
                            }}
                            className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-gray-900 font-bold text-lg focus:border-blue-500"
                          />
                          <span className="text-gray-700 font-semibold">min</span>
                          <button
                            onClick={() => nudgeDuration(index, 5)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
                          >
                            ⬆️ +5
                          </button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cascadeAdjustments[index] ?? true}
                            onChange={(e) => setCascadeAdjustments({ ...cascadeAdjustments, [index]: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span className="text-sm font-semibold text-gray-700">Adjust following times</span>
                        </label>
                      </div>

                      {/* Drive Time Controls */}
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-900">Drive to Next Stop</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => nudgeDriveTime(index, -5)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
                          >
                            ⬇️ -5
                          </button>
                          <input
                            type="number"
                            value={stop.drive_time_to_next_minutes}
                            onChange={(e) => {
                              const updated = [...itinerary.stops];
                              updated[index].drive_time_to_next_minutes = parseInt(e.target.value) || 0;
                              setItinerary({ ...itinerary, stops: cascadeAdjustments[index] ? calculateTimes(updated) : updated });
                            }}
                            className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-gray-900 font-bold text-lg focus:border-blue-500"
                          />
                          <span className="text-gray-700 font-semibold">min</span>
                          <button
                            onClick={() => nudgeDriveTime(index, 5)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
                          >
                            ⬆️ +5
                          </button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cascadeAdjustments[index] ?? true}
                            onChange={(e) => setCascadeAdjustments({ ...cascadeAdjustments, [index]: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span className="text-sm font-semibold text-gray-700">Adjust following times</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stop.reservation_confirmed}
                          onChange={(e) => {
                            const updated = [...itinerary.stops];
                            updated[index].reservation_confirmed = e.target.checked;
                            setItinerary({ ...itinerary, stops: updated });
                          }}
                          className="w-6 h-6"
                        />
                        <span className="text-base font-bold text-gray-900">Reservation Confirmed</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Wineries</h2>
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
              <input
                type="text"
                placeholder="Search wineries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 text-gray-900 font-semibold focus:border-blue-500"
              />
              <div className="max-h-[600px] overflow-y-auto space-y-3">
                {filteredWineries.map((winery) => (
                  <div
                    key={winery.id}
                    onClick={() => handleAddWinery(winery)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                  >
                    <h3 className="font-bold text-gray-900 text-lg">{winery.name}</h3>
                    <p className="text-base text-gray-700 font-semibold">{winery.city}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
