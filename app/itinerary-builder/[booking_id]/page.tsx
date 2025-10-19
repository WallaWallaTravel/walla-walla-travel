'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Winery {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  tasting_fee: number;
  specialties: string[];
  description: string;
}

interface ItineraryStop {
  id?: number;
  winery_id: number;
  stop_order: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  drive_time_to_next_minutes: number;
  stop_type: string;
  reservation_confirmed: boolean;
  special_notes: string;
  winery?: Winery;
}

interface Itinerary {
  id?: number;
  booking_id: number;
  template_name: string;
  is_template: boolean;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  estimated_dropoff_time: string;
  total_drive_time_minutes: number;
  internal_notes: string;
  driver_notes: string;
  stops: ItineraryStop[];
}

export default function ItineraryBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.booking_id as string;

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [availableWineries, setAvailableWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadItinerary();
    loadAvailableWineries();
  }, [bookingId]);

  const loadItinerary = async () => {
    try {
      const response = await fetch(`/api/itineraries/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setItinerary(data.data);
      } else if (response.status === 404) {
        // No itinerary exists yet, create empty one
        setItinerary({
          booking_id: parseInt(bookingId),
          template_name: '',
          is_template: false,
          pickup_location: '',
          pickup_time: '10:00',
          dropoff_location: '',
          estimated_dropoff_time: '16:00',
          total_drive_time_minutes: 0,
          internal_notes: '',
          driver_notes: '',
          stops: []
        });
      }
    } catch (error) {
      console.error('Failed to load itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      if (response.ok) {
        const data = await response.json();
        setAvailableWineries(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load wineries:', error);
    }
  };

  const addWineryToItinerary = (winery: Winery) => {
    if (!itinerary) return;

    const newStop: ItineraryStop = {
      winery_id: winery.id,
      stop_order: itinerary.stops.length + 1,
      arrival_time: '',
      departure_time: '',
      duration_minutes: 60,
      drive_time_to_next_minutes: 15,
      stop_type: 'winery',
      reservation_confirmed: false,
      special_notes: '',
      winery
    };

    setItinerary({
      ...itinerary,
      stops: [...itinerary.stops, newStop]
    });
  };

  const removeStop = (index: number) => {
    if (!itinerary) return;

    const updatedStops = itinerary.stops.filter((_, i) => i !== index);
    const reorderedStops = updatedStops.map((stop, i) => ({
      ...stop,
      stop_order: i + 1
    }));

    setItinerary({
      ...itinerary,
      stops: reorderedStops
    });
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

    const reorderedStops = stops.map((stop, i) => ({
      ...stop,
      stop_order: i + 1
    }));

    setItinerary({
      ...itinerary!,
      stops: reorderedStops
    });

    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateStop = (index: number, field: keyof ItineraryStop, value: any) => {
    if (!itinerary) return;

    const updatedStops = itinerary.stops.map((stop, i) =>
      i === index ? { ...stop, [field]: value } : stop
    );

    setItinerary({
      ...itinerary,
      stops: updatedStops
    });
  };

  const calculateTotalDriveTime = () => {
    if (!itinerary) return 0;
    return itinerary.stops.reduce((sum, stop) => sum + stop.drive_time_to_next_minutes, 0);
  };

  const saveItinerary = async () => {
    if (!itinerary) return;

    setSaving(true);
    try {
      const method = itinerary.id ? 'PUT' : 'POST';
      const url = itinerary.id
        ? `/api/itineraries/${itinerary.id}`
        : '/api/itineraries';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itinerary,
          total_drive_time_minutes: calculateTotalDriveTime()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItinerary(data.data.itinerary);
        alert('Itinerary saved successfully!');
      } else {
        throw new Error('Failed to save itinerary');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save itinerary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading itinerary...</div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load itinerary</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Itinerary Builder</h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          </div>

          {/* Itinerary Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <input
                type="text"
                value={itinerary.pickup_location}
                onChange={(e) => setItinerary({ ...itinerary, pickup_location: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Marcus Whitman Hotel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Time
              </label>
              <input
                type="time"
                value={itinerary.pickup_time}
                onChange={(e) => setItinerary({ ...itinerary, pickup_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Location
              </label>
              <input
                type="text"
                value={itinerary.dropoff_location}
                onChange={(e) => setItinerary({ ...itinerary, dropoff_location: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Same as pickup"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Dropoff Time
              </label>
              <input
                type="time"
                value={itinerary.estimated_dropoff_time}
                onChange={(e) => setItinerary({ ...itinerary, estimated_dropoff_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Notes
            </label>
            <textarea
              value={itinerary.driver_notes}
              onChange={(e) => setItinerary({ ...itinerary, driver_notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Special instructions for the driver..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total Drive Time: <span className="font-semibold">{calculateTotalDriveTime()} minutes</span>
              {' | '}
              Stops: <span className="font-semibold">{itinerary.stops.length}</span>
            </div>

            <button
              onClick={saveItinerary}
              disabled={saving || itinerary.stops.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Itinerary'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Winery Stops (Drag & Drop) */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Tour Stops</h2>

              {itinerary.stops.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No stops added yet.</p>
                  <p className="text-sm mt-2">Select wineries from the list →</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {itinerary.stops.map((stop, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border rounded-lg p-4 cursor-move hover:shadow-md transition-shadow ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-semibold">
                            {stop.stop_order}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{stop.winery?.name || 'Unknown Winery'}</h3>
                            <p className="text-sm text-gray-600">{stop.winery?.address}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStop(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
                          <input
                            type="number"
                            value={stop.duration_minutes}
                            onChange={(e) => updateStop(index, 'duration_minutes', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border rounded text-sm"
                            min="15"
                            step="15"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Drive to Next (min)</label>
                          <input
                            type="number"
                            value={stop.drive_time_to_next_minutes}
                            onChange={(e) => updateStop(index, 'drive_time_to_next_minutes', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border rounded text-sm"
                            min="0"
                            step="5"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Reservation</label>
                          <input
                            type="checkbox"
                            checked={stop.reservation_confirmed}
                            onChange={(e) => updateStop(index, 'reservation_confirmed', e.target.checked)}
                            className="mt-2"
                          />
                          <span className="ml-2 text-sm">Confirmed</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <input
                          type="text"
                          value={stop.special_notes}
                          onChange={(e) => updateStop(index, 'special_notes', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Special notes..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Wineries */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Available Wineries</h2>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {availableWineries.map((winery) => {
                  const alreadyAdded = itinerary.stops.some(s => s.winery_id === winery.id);

                  return (
                    <button
                      key={winery.id}
                      onClick={() => !alreadyAdded && addWineryToItinerary(winery)}
                      disabled={alreadyAdded}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        alreadyAdded
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                      }`}
                    >
                      <div className="font-medium">{winery.name}</div>
                      <div className="text-xs text-gray-600">{winery.city}</div>
                      {alreadyAdded && (
                        <div className="text-xs text-green-600 mt-1">✓ Added</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
