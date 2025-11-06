'use client';

import { useState, useEffect } from 'react';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  driver_id?: number;
  vehicle_id?: number;
}

interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_available: boolean;
  hours_today: number;
  hours_this_week: number;
}

interface Vehicle {
  id: number;
  make: string;
  model: string;
  vehicle_number: string;
  capacity: number;
  is_available: boolean;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
}

export default function AssignmentModal({ booking, onClose, onComplete }: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(booking.driver_id || null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(booking.vehicle_id || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const response = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: booking.tour_date,
          duration_hours: calculateDuration(booking.start_time, booking.end_time),
          party_size: booking.party_size,
          start_time: booking.start_time,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Get available drivers
        const driversResponse = await fetch('/api/drivers');
        const driversResult = await driversResponse.json();
        setDrivers(driversResult.data || []);

        // Get available vehicles
        const vehiclesResponse = await fetch('/api/vehicles');
        const vehiclesResult = await vehiclesResponse.json();
        setVehicles(vehiclesResult.data || []);
      }
    } catch (err) {
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriver || !selectedVehicle) {
      setError('Please select both a driver and vehicle');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: selectedDriver,
          vehicle_id: selectedVehicle,
          notify_driver: true,
          notify_customer: true,
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        setError('Failed to assign driver/vehicle');
      }
    } catch (err) {
      setError('Error assigning driver/vehicle');
    } finally {
      setSaving(false);
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Assign Driver & Vehicle</h2>
              <p className="text-purple-100 mt-1">
                {booking.customer_name} • {booking.booking_number}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-3xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Date</p>
                <p className="text-gray-900 font-bold">
                  {new Date(booking.tour_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-semibold">Time</p>
                <p className="text-gray-900 font-bold">{booking.start_time} - {booking.end_time}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-semibold">Party Size</p>
                <p className="text-gray-900 font-bold">{booking.party_size} guests</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-semibold">Loading availability...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Driver Selection */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Select Driver</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {drivers.length === 0 ? (
                    <p className="text-gray-600">No drivers available</p>
                  ) : (
                    drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => setSelectedDriver(driver.id)}
                        disabled={!driver.is_available}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedDriver === driver.id
                            ? 'border-purple-600 bg-purple-50'
                            : driver.is_available
                            ? 'border-gray-200 hover:border-purple-300'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{driver.name}</h4>
                          {selectedDriver === driver.id && (
                            <span className="text-purple-600 text-xl">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{driver.email}</p>
                        <p className="text-sm text-gray-600">{driver.phone}</p>
                        {!driver.is_available && (
                          <p className="text-sm text-red-600 font-semibold mt-2">Not available</p>
                        )}
                        {driver.is_available && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Today: {driver.hours_today.toFixed(1)}h / 10h</p>
                            <p>This week: {driver.hours_this_week.toFixed(1)}h / 60h</p>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Vehicle Selection */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">🚐 Select Vehicle</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {vehicles.length === 0 ? (
                    <p className="text-gray-600">No vehicles available</p>
                  ) : (
                    vehicles.map((vehicle) => {
                      const canFitParty = vehicle.capacity >= booking.party_size;
                      const isAvailable = vehicle.is_available && canFitParty;

                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => setSelectedVehicle(vehicle.id)}
                          disabled={!isAvailable}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedVehicle === vehicle.id
                              ? 'border-purple-600 bg-purple-50'
                              : isAvailable
                              ? 'border-gray-200 hover:border-purple-300'
                              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900">
                              {vehicle.make} {vehicle.model}
                            </h4>
                            {selectedVehicle === vehicle.id && (
                              <span className="text-purple-600 text-xl">✓</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">#{vehicle.vehicle_number}</p>
                          <p className="text-sm text-gray-600">Capacity: {vehicle.capacity} passengers</p>
                          {!canFitParty && (
                            <p className="text-sm text-red-600 font-semibold mt-2">
                              Too small for {booking.party_size} guests
                            </p>
                          )}
                          {!vehicle.is_available && canFitParty && (
                            <p className="text-sm text-red-600 font-semibold mt-2">Not available</p>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-6 pt-6 border-t-2 border-gray-200">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 rounded-lg font-bold text-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedDriver || !selectedVehicle || saving}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors"
            >
              {saving ? 'Assigning...' : 'Assign & Notify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

