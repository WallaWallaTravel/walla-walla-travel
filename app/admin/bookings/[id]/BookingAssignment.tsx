'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Driver {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
}

interface BookingAssignmentProps {
  bookingId: number;
  currentDriverId: number | null;
  currentDriverName: string | null;
  currentVehicleId: number | null;
  currentVehicleNumber: string | null;
  drivers: Driver[];
  vehicles: Vehicle[];
}

export function BookingAssignment({
  bookingId,
  currentDriverId,
  currentDriverName,
  currentVehicleId,
  currentVehicleNumber,
  drivers,
  vehicles,
}: BookingAssignmentProps) {
  const router = useRouter();
  const [driverId, setDriverId] = useState<number | null>(currentDriverId);
  const [vehicleId, setVehicleId] = useState<number | null>(currentVehicleId);
  const [notifyDriver, setNotifyDriver] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges =
    driverId !== currentDriverId || vehicleId !== currentVehicleId;

  const handleSubmit = async () => {
    if (!driverId || !vehicleId) {
      setError('Please select both a driver and vehicle');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driverId,
          vehicle_id: vehicleId,
          notify_driver: notifyDriver,
          notify_customer: notifyCustomer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update assignment');
      }

      setSuccess('Assignment updated successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Assignment</h2>

      {/* Status messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-500">Driver</label>
          {currentDriverName ? (
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {currentDriverName}
            </p>
          ) : (
            <p className="text-lg font-semibold text-red-600 mt-1">
              ⚠️ Not Assigned
            </p>
          )}
          <select
            value={driverId || ''}
            onChange={(e) => setDriverId(e.target.value ? parseInt(e.target.value) : null)}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Driver...</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Vehicle</label>
          {currentVehicleNumber ? (
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {currentVehicleNumber}
            </p>
          ) : (
            <p className="text-lg font-semibold text-gray-400 mt-1">
              Not Assigned
            </p>
          )}
          <select
            value={vehicleId || ''}
            onChange={(e) => setVehicleId(e.target.value ? parseInt(e.target.value) : null)}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Vehicle...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number} - {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification options */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifyDriver}
            onChange={(e) => setNotifyDriver(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Notify driver of assignment
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Notify customer of driver assignment
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !hasChanges || !driverId || !vehicleId}
        className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            Updating...
          </>
        ) : (
          'Update Assignment'
        )}
      </button>

      {!hasChanges && (driverId || vehicleId) && (
        <p className="mt-2 text-sm text-gray-500">
          Make changes to enable the update button
        </p>
      )}
    </div>
  );
}
