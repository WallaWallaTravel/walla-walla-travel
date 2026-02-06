'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TouchButton, MobileCard, AlertBanner, BottomActionBar, BottomActionBarSpacer } from '@/components/mobile';
import { logger } from '@/lib/logger';

interface Driver {
  id: number;
  name: string;
  email: string;
}

interface Vehicle {
  id: number;
  vehicle_number: string;
  capacity: number;
  make: string;
  model: string;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function ClockInPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load drivers and vehicles
  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  const loadData = async () => {
    try {
      // Load drivers from API
      const driversResponse = await fetch('/api/drivers');
      const driversData = await driversResponse.json();
      if (driversData.success) {
        // Handle different response formats
        const driversList = driversData.drivers || driversData.data?.drivers || driversData.data || [];
        setDrivers(Array.isArray(driversList) ? driversList : []);
      }

      // Load vehicles from API
      const vehiclesResponse = await fetch('/api/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      if (vehiclesData.success) {
        // Handle different response formats
        const vehiclesList = vehiclesData.vehicles || vehiclesData.data?.vehicles || vehiclesData.data || [];
        setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
      }
    } catch (err) {
      logger.error('Error loading data', { error: err });
      // Provide fallback vehicles for emergency use
      setVehicles([
        { id: 2, vehicle_number: 'Vehicle #2', capacity: 14, make: 'Mercedes', model: 'Sprinter' },
      ]);
      setError('Using offline vehicle list');
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationError('');
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`);
      }
    );
  };

  const handleClockIn = async () => {
    if (!selectedDriver) {
      setError('Please select a driver');
      return;
    }
    if (!selectedVehicle) {
      setError('Please select a vehicle');
      return;
    }
    // Location is optional - proceed without it if needed

    setLoading(true);
    setError('');

    try {
      // Call the real clock-in API
      const response = await fetch('/api/time-clock/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriver,
          vehicleId: selectedVehicle,
          location,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Success! Redirect to dashboard
        router.push('/time-clock/dashboard');
      } else {
        const errorMessage = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : (data.error || 'Failed to clock in');
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('Clock in error', { error: err });
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-32">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Clock In</h1>
          <p className="text-gray-800 mt-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Location Status */}
        {location ? (
          <AlertBanner
            type="success"
            message={`Location acquired (±${Math.round(location.accuracy)}m accuracy)`}
          />
        ) : locationError ? (
          <AlertBanner
            type="warning"
            message="Location unavailable - you can still clock in without it"
          />
        ) : (
          <AlertBanner type="info" message="Getting your location..." />
        )}

        {/* Error Alert */}
        {error && (
          <AlertBanner
            type="error"
            message={error}
            dismissible
            onDismiss={() => setError('')}
          />
        )}

        {/* Driver Selection */}
        <MobileCard title="Select Driver" variant="elevated">
          <div className="space-y-2">
            {drivers && drivers.length > 0 ? (
              drivers.map((driver) => (
                <TouchButton
                  key={driver.id}
                  variant={selectedDriver === driver.id ? 'primary' : 'secondary'}
                  size="large"
                  fullWidth
                  onClick={() => setSelectedDriver(driver.id)}
                >
                  {driver.name}
                </TouchButton>
              ))
            ) : (
              <p className="text-gray-500 text-center py-2">Loading drivers...</p>
            )}
          </div>
        </MobileCard>

        {/* Vehicle Selection */}
        <MobileCard title="Select Vehicle" variant="elevated">
          <div className="space-y-2">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TouchButton
                  key={vehicle.id}
                  variant={selectedVehicle === vehicle.id ? 'primary' : 'secondary'}
                  size="large"
                  fullWidth
                  onClick={() => setSelectedVehicle(vehicle.id)}
                >
                  <div className="text-left w-full">
                    <div className="font-semibold">{vehicle.vehicle_number}</div>
                    <div className="text-sm opacity-90">
                      {vehicle.make} {vehicle.model} • {vehicle.capacity} passengers
                    </div>
                  </div>
                </TouchButton>
              ))
            ) : (
              <p className="text-gray-500 text-center py-2">Loading vehicles...</p>
            )}
          </div>
        </MobileCard>

        {/* Compliance Reminder */}
        <MobileCard variant="bordered">
          <div className="space-y-2 text-sm text-gray-700">
            <h3 className="font-semibold text-base">📋 Today&apos;s Requirements:</h3>
            <ul className="space-y-1 ml-4">
              <li>✓ Pre-trip inspection before departure</li>
              <li>✓ Maximum 10 hours driving</li>
              <li>✓ Maximum 15 hours on-duty</li>
              <li>✓ Minimum 8 hours off-duty before next shift</li>
            </ul>
          </div>
        </MobileCard>

        <BottomActionBarSpacer />
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar>
        <TouchButton
          variant="secondary"
          size="large"
          fullWidth
          onClick={() => router.back()}
        >
          Cancel
        </TouchButton>
        <TouchButton
          variant="primary"
          size="large"
          fullWidth
          onClick={handleClockIn}
          disabled={!selectedDriver || !selectedVehicle || loading}
        >
          {loading ? 'Clocking In...' : 'Clock In Now'}
        </TouchButton>
      </BottomActionBar>
    </div>
  );
}
