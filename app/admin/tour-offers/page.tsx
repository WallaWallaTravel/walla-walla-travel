'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  party_size: number;
  status: string;
  driver_id: number | null;
}

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Vehicle {
  id: number;
  name: string;
  model: string;
  capacity: number;
}

export default function TourOffersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load unassigned bookings
      const bookingsRes = await fetch('/api/admin/bookings?status=pending,confirmed&no_driver=true');
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings || []);

      // Load drivers
      const driversRes = await fetch('/api/admin/drivers');
      const driversData = await driversRes.json();
      setDrivers(driversData.drivers || []);

      // Load vehicles
      const vehiclesRes = await fetch('/api/admin/vehicles');
      const vehiclesData = await vehiclesRes.json();
      setVehicles(vehiclesData.vehicles || []);

      setLoading(false);
    } catch (error) {
      logger.error('Error loading data', { error });
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!selectedBooking || !selectedDriver) {
      alert('Please select a booking and driver');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/admin/tour-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          driver_id: selectedDriver,
          vehicle_id: selectedVehicle,
          notes,
          expires_in_hours: expiresInHours,
        }),
      });

      if (response.ok) {
        alert('Tour offer sent to driver!');
        setSelectedBooking(null);
        setSelectedDriver(null);
        setSelectedVehicle(null);
        setNotes('');
        loadData();
      } else {
        throw new Error('Failed to create offer');
      }
    } catch (error) {
      logger.error('Error creating offer', { error });
      alert('Failed to create offer. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🚗 Create Tour Offers</h1>
          <p className="text-gray-600 mt-2">
            Offer tours to drivers for acceptance
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Bookings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Unassigned Bookings ({bookings.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {bookings.map(booking => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedBooking?.id === booking.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{booking.customer_name}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(booking.tour_date).toLocaleDateString()} • {booking.start_time}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.booking_number} • Party of {booking.party_size}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Offer Form */}
          <div>
            {selectedBooking ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Create Offer
                </h2>

                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <div className="font-semibold text-gray-900">{selectedBooking.customer_name}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(selectedBooking.tour_date).toLocaleDateString()} • {selectedBooking.start_time}
                  </div>
                </div>

                {/* Driver Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Driver *
                  </label>
                  <select
                    value={selectedDriver || ''}
                    onChange={(e) => setSelectedDriver(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Choose a driver...</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Vehicle (Optional)
                  </label>
                  <select
                    value={selectedVehicle || ''}
                    onChange={(e) => setSelectedVehicle(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No vehicle assigned yet</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.model} (Capacity: {vehicle.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expiration */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offer Expires In (hours)
                  </label>
                  <input
                    type="number"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
                    min="1"
                    max="168"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes for Driver
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any special instructions or information..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOffer}
                    disabled={!selectedDriver || creating}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    {creating ? 'Sending...' : 'Send Offer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">👈</div>
                <p>Select a booking to create a tour offer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

