'use client';

/**
 * VehicleSelector Component
 *
 * Checkbox selection for vehicles with:
 * - Multi-vehicle support for large groups
 * - Capacity display per vehicle
 * - Auto-suggest when party exceeds single vehicle
 */

import { VehicleSelectorProps, calculateTotalCapacity } from './types';

export default function VehicleSelector({
  vehicles,
  selectedVehicles,
  partySize,
  onSelectionChange,
}: VehicleSelectorProps) {
  const availableVehicles = vehicles.filter(v => v.available);
  const maxSingleCapacity = Math.max(...availableVehicles.map(v => v.capacity), 0);
  const needsMultipleVehicles = partySize > maxSingleCapacity && maxSingleCapacity > 0;

  const currentCapacity = calculateTotalCapacity(vehicles, selectedVehicles);
  const capacityMet = currentCapacity >= partySize;

  const handleVehicleToggle = (vehicleId: number) => {
    if (selectedVehicles.includes(vehicleId)) {
      // Remove vehicle
      onSelectionChange(selectedVehicles.filter(id => id !== vehicleId));
    } else {
      // Add vehicle
      if (needsMultipleVehicles) {
        // Multi-vehicle mode: allow multiple selections
        onSelectionChange([...selectedVehicles, vehicleId]);
      } else {
        // Single-vehicle mode: replace selection
        onSelectionChange([vehicleId]);
      }
    }
  };

  const handleAutoSelect = () => {
    // Auto-select smallest combination of vehicles that meets capacity
    const sorted = [...availableVehicles].sort((a, b) => b.capacity - a.capacity);
    const selected: number[] = [];
    let totalCapacity = 0;

    for (const vehicle of sorted) {
      if (totalCapacity >= partySize) break;
      selected.push(vehicle.id);
      totalCapacity += vehicle.capacity;
    }

    onSelectionChange(selected);
  };

  if (availableVehicles.length === 0) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold text-sm">
          No vehicles available for this date/time
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <span>🚐</span>
          {needsMultipleVehicles ? 'Select Vehicles' : 'Select Vehicle'}
        </h4>
        {needsMultipleVehicles && (
          <button
            type="button"
            onClick={handleAutoSelect}
            className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
          >
            Auto-select
          </button>
        )}
      </div>

      {/* Multi-vehicle notice */}
      {needsMultipleVehicles && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Party size ({partySize})</span> exceeds single
            vehicle capacity. Select multiple vehicles.
          </p>
        </div>
      )}

      {/* Vehicle List */}
      <div className="space-y-2">
        {availableVehicles.map(vehicle => {
          const isSelected = selectedVehicles.includes(vehicle.id);
          const meetsCapacity = vehicle.capacity >= partySize;

          return (
            <label
              key={vehicle.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type={needsMultipleVehicles ? 'checkbox' : 'radio'}
                name="vehicle"
                checked={isSelected}
                onChange={() => handleVehicleToggle(vehicle.id)}
                className="w-5 h-5 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{vehicle.name}</span>
                  {!needsMultipleVehicles && meetsCapacity && (
                    <span className="text-xs text-green-600 font-semibold">
                      ✓ Fits party
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Capacity: {vehicle.capacity} passengers
                  {vehicle.vehicle_type && ` • ${vehicle.vehicle_type}`}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Capacity Summary (for multi-vehicle) */}
      {needsMultipleVehicles && selectedVehicles.length > 0 && (
        <div className={`mt-3 pt-3 border-t border-gray-200 ${
          capacityMet ? 'text-green-700' : 'text-amber-700'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">
              {selectedVehicles.length} vehicle{selectedVehicles.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-sm">
              <span className="font-semibold">{currentCapacity}</span> / {partySize} guests
            </span>
          </div>
          {!capacityMet && (
            <p className="text-sm mt-1">
              ⚠️ Need {partySize - currentCapacity} more seats
            </p>
          )}
          {capacityMet && (
            <p className="text-sm mt-1">✓ Capacity met</p>
          )}
        </div>
      )}
    </div>
  );
}
