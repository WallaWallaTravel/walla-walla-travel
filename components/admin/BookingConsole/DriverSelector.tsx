'use client';

/**
 * DriverSelector Component
 *
 * Dropdown for selecting a driver:
 * - Shows available drivers for the date
 * - Optional assignment (can leave unassigned)
 */

import { DriverSelectorProps } from './types';

export default function DriverSelector({
  drivers,
  selectedDriver,
  onSelectionChange,
}: DriverSelectorProps) {
  const availableDrivers = drivers.filter(d => d.available);
  const unavailableDrivers = drivers.filter(d => !d.available);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onSelectionChange(value ? parseInt(value, 10) : null);
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>👤</span> Assign Driver
        <span className="text-xs font-normal text-gray-500">(optional)</span>
      </h4>

      <select
        value={selectedDriver || ''}
        onChange={handleChange}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">— Leave Unassigned —</option>

        {availableDrivers.length > 0 && (
          <optgroup label="Available">
            {availableDrivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </optgroup>
        )}

        {unavailableDrivers.length > 0 && (
          <optgroup label="Already Assigned (Not Recommended)">
            {unavailableDrivers.map(driver => (
              <option key={driver.id} value={driver.id} disabled>
                {driver.name} (booked)
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Selected Driver Info */}
      {selectedDriver && (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
          {(() => {
            const driver = drivers.find(d => d.id === selectedDriver);
            if (!driver) return null;

            return (
              <div>
                <p className="font-semibold text-gray-900">{driver.name}</p>
                <p className="text-sm text-gray-600">{driver.email}</p>
                <p className="text-sm text-gray-600">{driver.phone}</p>
              </div>
            );
          })()}
        </div>
      )}

      {/* No available drivers notice */}
      {availableDrivers.length === 0 && drivers.length > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          ⚠️ All drivers have other assignments on this date
        </p>
      )}
    </div>
  );
}
