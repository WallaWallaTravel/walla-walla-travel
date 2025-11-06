'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileButton } from '@/components/mobile';

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

export default function DriverDashboard() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadTours();
  }, [selectedDate]);

  const loadTours = async () => {
    try {
      // TODO: Get actual driver ID from auth
      const driverId = 1;
      const response = await fetch(`/api/driver/tours?driver_id=${driverId}&date=${selectedDate}`);

      if (response.ok) {
        const data = await response.json();
        setTours(data.tours || []);
      }
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const generateMapsLink = (tour: Tour): string => {
    if (!tour.stops || tour.stops.length === 0) return '';

    const waypoints = tour.stops
      .map(stop => encodeURIComponent(stop.address))
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tour.pickup_location)}&destination=${encodeURIComponent(tour.dropoff_location)}&waypoints=${waypoints}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading your tours...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b-4 border-blue-500 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">🚗 Driver Dashboard</h1>
          <p className="text-gray-300 text-lg">Your assigned tours</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-gray-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <MobileButton
            variant="secondary"
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
          >
            ← Previous Day
          </MobileButton>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-bold text-lg border-2 border-gray-600 focus:border-blue-500"
          />

          <MobileButton
            variant="primary"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Today
          </MobileButton>

          <MobileButton
            variant="secondary"
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
          >
            Next Day →
          </MobileButton>
        </div>
      </div>

      {/* Tours List */}
      <div className="max-w-4xl mx-auto p-6">
        {tours.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🍷</div>
            <h2 className="text-2xl font-bold mb-2">No tours scheduled</h2>
            <p className="text-gray-400 text-lg">You have no tours on {selectedDate}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tours.map((tour) => (
              <div key={tour.id} className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border-2 border-gray-700">
                {/* Tour Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold">{tour.customer_name}</h2>
                      <p className="text-blue-100 text-xl mt-1">
                        {tour.party_size} guests • Pickup: {formatTime(tour.pickup_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-100">BOOKING</div>
                      <div className="text-2xl font-bold">#{tour.booking_id}</div>
                    </div>
                  </div>
                </div>

                {/* Pickup/Dropoff */}
                <div className="p-6 bg-gray-750 border-b-2 border-gray-700">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-1">📍 PICKUP</div>
                      <div className="text-xl font-bold">{formatTime(tour.pickup_time)}</div>
                      <div className="text-gray-300 font-semibold mt-1">{tour.pickup_location}</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-400 mb-1">🏁 DROPOFF</div>
                      <div className="text-xl font-bold">{tour.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                {/* Driver Notes */}
                {tour.driver_notes && (
                  <div className="p-6 bg-yellow-900 bg-opacity-20 border-b-2 border-gray-700">
                    <div className="text-sm font-bold text-yellow-400 mb-2">⚠️ DRIVER NOTES</div>
                    <div className="text-lg font-semibold text-white">{tour.driver_notes}</div>
                  </div>
                )}

                {/* Winery Stops */}
                <div className="p-6">
                  <div className="text-lg font-bold mb-4 text-gray-300">TOUR ITINERARY ({tour.stops?.length || 0} stops)</div>
                  <div className="space-y-4">
                    {tour.stops?.map((stop, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4 border-2 border-gray-600">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2">{stop.winery_name}</h3>
                            <div className="text-xl font-bold text-blue-400 mb-2">
                              {formatTime(stop.arrival_time)} - {formatTime(stop.departure_time)}
                              <span className="text-gray-400 text-base ml-3">({stop.duration_minutes} min)</span>
                            </div>
                            <div className="text-gray-300 font-semibold">{stop.address}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gray-750 flex gap-4">
                  <a
                    href={generateMapsLink(tour)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xl text-center transition-colors"
                  >
                    📍 Open in Google Maps
                  </a>
                  <MobileButton
                    variant="primary"
                    onClick={() => router.push(`/driver-portal/tour/${tour.booking_id}`)}
                    className="flex-1"
                  >
                    📋 View Full Details
                  </MobileButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
