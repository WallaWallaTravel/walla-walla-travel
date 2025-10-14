'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TouchButton, MobileCard, AlertBanner, BottomActionBar, BottomActionBarSpacer } from '@/components/mobile';

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
      // Mock data for now - will connect to real API
      setDrivers([
        { id: 1, name: 'Owner', email: 'owner@wallawallatravel.com' },
        { id: 2, name: 'Eric Critchlow', email: 'eric@wallawallatravel.com' },
        { id: 3, name: 'Janine Bergevin', email: 'janine@wallawallatravel.com' },
      ]);

      setVehicles([
        { id: 1, vehicle_number: 'Sprinter 1', capacity: 11, make: 'Mercedes-Benz', model: 'Sprinter' },
        { id: 2, vehicle_number: 'Sprinter 2', capacity: 14, make: 'Mercedes-Benz', model: 'Sprinter' },
        { id: 3, vehicle_number: 'Sprinter 3', capacity: 14, make: 'Mercedes-Benz', model: 'Sprinter' },
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
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
    if (!location) {
      setError('Location required for clock in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Clock in successful! (API to be connected)');
      router.push('/time-clock/daily-summary');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Clock In</h1>
          <p className="text-gray-600 mt-2">
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
            type="error"
            message={locationError}
            action="Retry"
            onAction={getLocation}
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
            {drivers.map((driver) => (
              <TouchButton
                key={driver.id}
                variant={selectedDriver === driver.id ? 'primary' : 'secondary'}
                size="large"
                fullWidth
                onClick={() => setSelectedDriver(driver.id)}
              >
                {driver.name}
              </TouchButton>
            ))}
          </div>
        </MobileCard>

        {/* Vehicle Selection */}
        <MobileCard title="Select Vehicle" variant="elevated">
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
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
            ))}
          </div>
        </MobileCard>

        {/* Compliance Reminder */}
        <MobileCard variant="bordered">
          <div className="space-y-2 text-sm text-gray-700">
            <h3 className="font-semibold text-base">📋 Today's Requirements:</h3>
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
          disabled={!selectedDriver || !selectedVehicle || !location || loading}
        >
          {loading ? 'Clocking In...' : 'Clock In Now'}
        </TouchButton>
      </BottomActionBar>
    </div>
  );
}
