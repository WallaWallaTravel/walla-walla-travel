'use client';

/**
 * BookingConsole Component
 *
 * Main orchestrator for the internal booking console.
 * Split-panel layout with:
 * - Left: Customer info and tour details
 * - Right: Availability, pricing, vehicle/driver selection
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CustomerPanel from './CustomerPanel';
import AvailabilityPanel from './AvailabilityPanel';
import PricingCalculator from './PricingCalculator';
import VehicleSelector from './VehicleSelector';
import DriverSelector from './DriverSelector';
import {
  CustomerInfo,
  TourDetails,
  AvailabilityResult,
  PricingResult,
  SaveMode,
  DEFAULT_CUSTOMER,
  DEFAULT_TOUR,
  validateCustomer,
  validateTour,
} from './types';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function BookingConsole() {
  const router = useRouter();

  // Form state
  const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
  const [tour, setTour] = useState<TourDetails>(DEFAULT_TOUR);
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [customDiscount, setCustomDiscount] = useState(0);

  // API state
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Debounced values for API calls
  const debouncedDate = useDebounce(tour.date, 500);
  const debouncedTime = useDebounce(tour.start_time, 500);
  const debouncedDuration = useDebounce(tour.duration_hours, 500);
  const debouncedPartySize = useDebounce(tour.party_size, 500);
  const debouncedDiscount = useDebounce(customDiscount, 500);

  // Fetch availability when date/time changes
  const fetchAvailability = useCallback(async () => {
    if (!debouncedDate || !debouncedTime || !debouncedDuration || !debouncedPartySize) {
      return;
    }

    setIsLoadingAvailability(true);
    try {
      const response = await fetch('/api/admin/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: debouncedDate,
          startTime: debouncedTime,
          durationHours: debouncedDuration,
          partySize: debouncedPartySize,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAvailability(result.data);
        // Auto-select first available vehicle if none selected
        if (selectedVehicles.length === 0 && result.data.vehicles) {
          const firstAvailable = result.data.vehicles.find((v: { available: boolean }) => v.available);
          if (firstAvailable) {
            setSelectedVehicles([firstAvailable.id]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [debouncedDate, debouncedTime, debouncedDuration, debouncedPartySize, selectedVehicles.length]);

  // Fetch pricing when relevant fields change
  const fetchPricing = useCallback(async () => {
    if (!debouncedDate || !debouncedDuration || !debouncedPartySize) {
      return;
    }

    setIsLoadingPricing(true);
    try {
      const response = await fetch('/api/admin/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: debouncedDate,
          duration_hours: debouncedDuration,
          party_size: debouncedPartySize,
          vehicle_ids: selectedVehicles.length > 0 ? selectedVehicles : undefined,
          custom_discount: debouncedDiscount > 0 ? debouncedDiscount : undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPricing(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setIsLoadingPricing(false);
    }
  }, [debouncedDate, debouncedDuration, debouncedPartySize, selectedVehicles, debouncedDiscount]);

  // Effect for availability
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Effect for pricing
  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Update handlers
  const handleCustomerChange = (updates: Partial<CustomerInfo>) => {
    setCustomer(prev => ({ ...prev, ...updates }));
    // Clear related errors
    Object.keys(updates).forEach(key => {
      if (errors[key]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  };

  const handleTourChange = (updates: Partial<TourDetails>) => {
    setTour(prev => ({ ...prev, ...updates }));
    // Reset vehicle selection if date changes
    if ('date' in updates || 'start_time' in updates) {
      setSelectedVehicles([]);
      setSelectedDriver(null);
    }
    // Clear related errors
    Object.keys(updates).forEach(key => {
      if (errors[key]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  };

  // Validation
  const validateForm = (): boolean => {
    const customerErrors = validateCustomer(customer);
    const tourErrors = validateTour(tour);
    const allErrors = { ...customerErrors, ...tourErrors };

    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  // Submit handler
  const handleSave = async (saveMode: SaveMode) => {
    setSubmitError('');
    setSuccessMessage('');

    if (!validateForm()) {
      setSubmitError('Please fix the errors above');
      return;
    }

    if (!pricing) {
      setSubmitError('Please wait for pricing to calculate');
      return;
    }

    setIsSaving(true);

    try {
      // Use custom/negotiated price if set, otherwise use calculated price
      const finalTotal = tour.custom_price != null ? tour.custom_price : pricing.total;
      const finalDeposit = tour.custom_price != null ? Math.round(tour.custom_price * 50) / 100 : pricing.deposit;

      const response = await fetch('/api/admin/bookings/console/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveMode,
          customer,
          tour,
          vehicles: selectedVehicles,
          driver_id: selectedDriver,
          pricing: {
            total_price: finalTotal,
            deposit_amount: finalDeposit,
            breakdown: pricing.breakdown,
            custom_discount: customDiscount > 0 ? customDiscount : undefined,
            custom_price_override: tour.custom_price,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { booking, invoice_sent } = result.data;
        const modeLabels: Record<SaveMode, string> = {
          draft: 'saved as draft',
          create: 'created',
          create_and_invoice: invoice_sent ? 'created and invoice sent' : 'created (invoice failed to send)',
        };

        setSuccessMessage(
          `Booking ${booking.booking_number} ${modeLabels[saveMode]}!`
        );

        // Redirect after short delay
        setTimeout(() => {
          router.push(`/admin/bookings/${booking.id}`);
        }, 1500);
      } else {
        setSubmitError(result.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Failed to save booking:', error);
      setSubmitError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#1E3A5F] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Internal Booking Console</h1>
            <p className="text-blue-200 text-sm">Create bookings during phone calls</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/bookings')}
            className="text-white hover:text-blue-200 font-semibold"
          >
            ← Back to Bookings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold flex items-center gap-2">
              <span className="text-xl">✓</span> {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold flex items-center gap-2">
              <span className="text-xl">⚠️</span> {submitError}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Customer & Tour Info */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-6">
            <CustomerPanel
              customer={customer}
              tour={tour}
              errors={errors}
              onCustomerChange={handleCustomerChange}
              onTourChange={handleTourChange}
            />
          </div>

          {/* Right Panel - Availability, Pricing, Assignments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <AvailabilityPanel
                availability={availability}
                isLoading={isLoadingAvailability}
                tour={tour}
              />
            </div>

            {/* Vehicle & Driver Selection */}
            {availability && (
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <VehicleSelector
                  vehicles={availability.vehicles}
                  selectedVehicles={selectedVehicles}
                  partySize={tour.party_size}
                  onSelectionChange={setSelectedVehicles}
                />

                <DriverSelector
                  drivers={availability.drivers}
                  selectedDriver={selectedDriver}
                  onSelectionChange={setSelectedDriver}
                />
              </div>
            )}

            {/* Pricing */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <PricingCalculator
                pricing={pricing}
                isLoading={isLoadingPricing}
                customDiscount={customDiscount}
                onCustomDiscountChange={setCustomDiscount}
                customPriceOverride={tour.custom_price}
              />
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 rounded-lg font-bold text-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : '📝 Save as Draft'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('create')}
                  disabled={isSaving || !pricing}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors"
                >
                  {isSaving ? 'Creating...' : '✓ Create Booking'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('create_and_invoice')}
                  disabled={isSaving || !pricing}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors"
                >
                  {isSaving ? 'Creating...' : '📧 Create & Send Invoice'}
                </button>
              </div>

              <p className="mt-4 text-sm text-gray-500 text-center">
                Invoice includes payment link for 50% deposit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
