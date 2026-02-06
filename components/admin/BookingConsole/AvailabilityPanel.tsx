'use client';

/**
 * AvailabilityPanel Component
 *
 * Displays availability status for the selected date/time:
 * - Status indicator (green/yellow/red)
 * - Available vehicles list
 * - Available drivers list
 * - Warning messages (blackout dates, high season)
 */

import { AvailabilityPanelProps } from './types';

export default function AvailabilityPanel({
  availability,
  isLoading,
  tour,
}: AvailabilityPanelProps) {
  if (!tour.date) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-gray-600 font-semibold">Select a date to check availability</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent mb-3"></div>
        <p className="text-gray-600 font-semibold">Checking availability...</p>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">❓</div>
        <p className="text-gray-600 font-semibold">Unable to check availability</p>
      </div>
    );
  }

  // Determine status color
  const hasConflicts = availability.conflicts.length > 0;
  const hasWarnings = availability.warnings.length > 0;
  const hasAvailableVehicles = availability.vehicles.some(v => v.available);
  const hasAvailableDrivers = availability.drivers.some(d => d.available);

  let statusColor: 'green' | 'yellow' | 'red';
  let statusIcon: string;
  let statusText: string;

  if (!hasAvailableVehicles || hasConflicts) {
    statusColor = 'red';
    statusIcon = '🔴';
    statusText = 'Unavailable';
  } else if (hasWarnings || !hasAvailableDrivers) {
    statusColor = 'yellow';
    statusIcon = '🟡';
    statusText = 'Available (with warnings)';
  } else {
    statusColor = 'green';
    statusIcon = '🟢';
    statusText = 'Available';
  }

  const statusBgColors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
  };

  const statusTextColors = {
    green: 'text-green-800',
    yellow: 'text-yellow-800',
    red: 'text-red-800',
  };

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <div className={`border-2 rounded-lg p-4 ${statusBgColors[statusColor]}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <h4 className={`font-bold ${statusTextColors[statusColor]}`}>
              {statusText}
            </h4>
            <p className="text-sm text-gray-600">
              {new Date(tour.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' at '}
              {tour.start_time}
            </p>
          </div>
        </div>
      </div>

      {/* Conflicts */}
      {availability.conflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
            <span>⚠️</span> Conflicts
          </h4>
          <ul className="space-y-1">
            {availability.conflicts.map((conflict, i) => (
              <li key={i} className="text-sm text-red-700">• {conflict}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {availability.warnings.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <span>⚡</span> Notices
          </h4>
          <ul className="space-y-1">
            {availability.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-yellow-700">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Available Vehicles */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>🚐</span> Vehicles
        </h4>
        {availability.vehicles.length === 0 ? (
          <p className="text-gray-500 text-sm">No vehicles configured</p>
        ) : (
          <div className="space-y-2">
            {availability.vehicles.map(vehicle => (
              <div
                key={vehicle.id}
                className={`flex items-center justify-between p-2 rounded ${
                  vehicle.available
                    ? 'bg-green-50'
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                <div>
                  <span className="font-semibold text-gray-900">{vehicle.name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({vehicle.capacity} passengers)
                  </span>
                </div>
                <span className={`text-sm font-semibold ${
                  vehicle.available ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {vehicle.available ? '✓ Available' : 'Booked'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Capacity summary */}
        {tour.party_size > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Party size:</span>
              <span className="font-semibold text-gray-900">{tour.party_size} guests</span>
            </div>
            {(() => {
              const totalAvailableCapacity = availability.vehicles
                .filter(v => v.available)
                .reduce((sum, v) => sum + v.capacity, 0);
              const needsMultipleVehicles = tour.party_size > Math.max(
                ...availability.vehicles.filter(v => v.available).map(v => v.capacity),
                0
              );

              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available capacity:</span>
                    <span className={`font-semibold ${
                      totalAvailableCapacity >= tour.party_size
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {totalAvailableCapacity} passengers
                    </span>
                  </div>
                  {needsMultipleVehicles && totalAvailableCapacity >= tour.party_size && (
                    <p className="mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                      💡 Multiple vehicles required for this party size
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Available Drivers */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>👤</span> Drivers
        </h4>
        {availability.drivers.length === 0 ? (
          <p className="text-gray-500 text-sm">No drivers configured</p>
        ) : (
          <div className="space-y-2">
            {availability.drivers.map(driver => (
              <div
                key={driver.id}
                className={`flex items-center justify-between p-2 rounded ${
                  driver.available
                    ? 'bg-green-50'
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                <div>
                  <span className="font-semibold text-gray-900">{driver.name}</span>
                  <span className="text-sm text-gray-500 ml-2">{driver.phone}</span>
                </div>
                <span className={`text-sm font-semibold ${
                  driver.available ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {driver.available ? '✓ Available' : 'Assigned'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
