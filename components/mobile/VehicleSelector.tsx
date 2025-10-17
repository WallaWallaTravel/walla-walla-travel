'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api-client';
import { TouchButton, MobileCard, AlertBanner } from '@/components/mobile';

interface Vehicle {
  id: number;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  licensePlate: string;
  color?: string;
  status: 'available' | 'assigned' | 'in_use' | 'assigned_other' | 'out_of_service';
  currentDriver?: string;
  isAvailable: boolean;
  isAssignedToMe: boolean;
  displayName: string;
  defectNotes?: string; // Defect description if vehicle is out of service
}

interface VehicleSelectorProps {
  onSelect: (vehicleId: number | null) => void;
  onCancel: () => void;
  selectedVehicleId?: number | null;
}

export function VehicleSelector({ onSelect, onCancel, selectedVehicleId }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<{
    assigned: Vehicle[];
    available: Vehicle[];
    inUse: Vehicle[];
    all: Vehicle[];
  }>({ assigned: [], available: [], inUse: [], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(selectedVehicleId || null);
  const [hasSelection, setHasSelection] = useState(false); // Track if user made a choice

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      setError(null);
      const result = await api.vehicles.getAvailable();
      
      if (result.success && result.data) {
        setVehicles(result.data.vehicles);
        
        // Auto-select if there's only one assigned vehicle
        if (result.data.vehicles.assigned.length === 1 && !selectedVehicleId) {
          setSelectedId(result.data.vehicles.assigned[0].id);
        }
      } else {
        setError('Unable to load vehicles. Please try again.');
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
      setError('Failed to load available vehicles');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectVehicle = (vehicleId: number | null) => {
    setSelectedId(vehicleId);
    setHasSelection(true);
  };

  const handleConfirm = () => {
    if (hasSelection) {
      onSelect(selectedId);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <MobileCard className="max-w-sm mx-4">
          <p className="text-center text-gray-800">Loading vehicles...</p>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-4 pb-20">
      <div className="w-full max-w-lg mx-4 my-4">
        <MobileCard>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Vehicle</h2>
          
          {error && (
            <AlertBanner
              type="error"
              message={error}
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}

          {/* No Vehicle Option (for non-driving tasks) */}
          <div className="mb-6">
            <button
              onClick={() => handleSelectVehicle(null)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${selectedId === null && hasSelection
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏢</span>
                    <span className="font-semibold text-gray-900">
                      No Vehicle - Non-Driving Task
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    Select this for office work, loading, or other non-driving tasks
                  </p>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      ℹ️ Pre-trip and post-trip inspections will not be required
                    </p>
                  </div>
                </div>
                {selectedId === null && hasSelection && (
                  <div className="ml-2">
                    <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Assigned Vehicles */}
          {vehicles.assigned.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Assigned Vehicle</h3>
              {vehicles.assigned.map(vehicle => (
                <VehicleOption
                  key={vehicle.id}
                  vehicle={vehicle}
                  isSelected={selectedId === vehicle.id}
                  onSelect={handleSelectVehicle}
                  isRecommended
                />
              ))}
            </div>
          )}

          {/* Available Vehicles */}
          {vehicles.available.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Available Vehicles</h3>
              <div className="space-y-2">
                {vehicles.available.map(vehicle => (
                  <VehicleOption
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={selectedId === vehicle.id}
                    onSelect={handleSelectVehicle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In-Use Vehicles (display only, not selectable) */}
          {vehicles.inUse.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Currently In Use</h3>
              <div className="space-y-2 opacity-60">
                {vehicles.inUse.map(vehicle => (
                  <VehicleOption
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={false}
                    onSelect={() => {}}
                    disabled
                  />
                ))}
              </div>
            </div>
          )}

          {/* No vehicles available */}
          {vehicles.assigned.length === 0 && vehicles.available.length === 0 && (
            <div className="text-center py-8 text-gray-800">
              <p className="mb-2">No vehicles available at this time.</p>
              <p className="text-sm">Please contact dispatch for assistance.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <TouchButton
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="primary"
              onClick={handleConfirm}
              disabled={!hasSelection}
              className="flex-1"
            >
              Confirm Selection
            </TouchButton>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}

// Vehicle option component
function VehicleOption({
  vehicle,
  isSelected,
  onSelect,
  isRecommended = false,
  disabled = false
}: {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: (id: number | null) => void;
  isRecommended?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onSelect(vehicle.id)}
      disabled={disabled}
      className={`
        w-full p-4 rounded-lg border-2 text-left transition-all
        ${isSelected 
          ? 'border-blue-600 bg-blue-50' 
          : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${disabled ? 'text-gray-600' : 'text-gray-900'}`}>
              {vehicle.vehicleNumber}
            </span>
            {isRecommended && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                Assigned
              </span>
            )}
            {vehicle.status === 'in_use' && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                In Use
              </span>
            )}
            {vehicle.status === 'out_of_service' && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-semibold">
                🚫 OUT OF SERVICE
              </span>
            )}
          </div>
          <p className={`text-sm ${disabled ? 'text-gray-600' : 'text-gray-800'} mt-1`}>
            {vehicle.make} {vehicle.model} {vehicle.year}
            {vehicle.color && ` - ${vehicle.color}`}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-gray-700">
            <span>Plate: {vehicle.licensePlate}</span>
            <span>Capacity: {vehicle.capacity}</span>
          </div>
          {vehicle.currentDriver && (
            <p className="text-xs text-gray-700 mt-1">
              Driver: {vehicle.currentDriver}
            </p>
          )}
          {vehicle.status === 'out_of_service' && vehicle.defectNotes && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs font-semibold text-red-800 mb-1">Defect Reported:</p>
              <p className="text-xs text-red-700">{vehicle.defectNotes}</p>
            </div>
          )}
        </div>
        {isSelected && (
          <div className="ml-2">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

export default VehicleSelector;