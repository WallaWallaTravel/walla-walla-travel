'use client';

/**
 * Historical Time Card Entry Form
 *
 * Form for digitizing paper time sheets and driver work records.
 * Captures shift times, vehicle assignments, and links to bookings.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
}

export default function HistoricalTimeCardEntryPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form values
  const [driverId, setDriverId] = useState<number | ''>('');
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [bookingId, setBookingId] = useState<number | ''>('');
  const [originalDate, setOriginalDate] = useState('');
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [drivingHours, setDrivingHours] = useState('');
  const [onDutyHours, setOnDutyHours] = useState('');
  const [entryNotes, setEntryNotes] = useState('');

  // Load drivers, vehicles, and bookings
  useEffect(() => {
    async function loadData() {
      try {
        const [driversRes, vehiclesRes, bookingsRes] = await Promise.all([
          fetch('/api/admin/users?role=driver'),
          fetch('/api/vehicles'),
          fetch('/api/admin/bookings?status=completed&limit=100'),
        ]);

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDrivers(driversData.data || []);
        }

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setVehicles(vehiclesData.data || []);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.data || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  // Calculate hours when times change
  useEffect(() => {
    if (originalDate && clockInTime && clockOutTime) {
      const clockIn = new Date(`${originalDate}T${clockInTime}`);
      const clockOut = new Date(`${originalDate}T${clockOutTime}`);

      // Handle overnight shifts
      if (clockOut < clockIn) {
        clockOut.setDate(clockOut.getDate() + 1);
      }

      const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      if (hours > 0 && hours < 24) {
        setOnDutyHours(hours.toFixed(1));
      }
    }
  }, [originalDate, clockInTime, clockOutTime]);

  // Filter bookings based on selected date
  const filteredBookings = bookings.filter((booking) => {
    if (!originalDate) return true;
    return booking.tour_date === originalDate;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Build ISO datetime strings
    const clockInDateTime = `${originalDate}T${clockInTime}:00`;
    let clockOutDateTime = `${originalDate}T${clockOutTime}:00`;

    // Handle overnight shifts
    const clockIn = new Date(clockInDateTime);
    const clockOut = new Date(clockOutDateTime);
    if (clockOut < clockIn) {
      const nextDay = new Date(originalDate);
      nextDay.setDate(nextDay.getDate() + 1);
      clockOutDateTime = `${nextDay.toISOString().split('T')[0]}T${clockOutTime}:00`;
    }

    try {
      const response = await fetch('/api/admin/historical/time-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: Number(driverId),
          vehicleId: vehicleId ? Number(vehicleId) : undefined,
          originalDocumentDate: originalDate,
          clockInTime: clockInDateTime,
          clockOutTime: clockOutDateTime,
          workReportingLocation: workLocation || undefined,
          drivingHours: drivingHours ? Number(drivingHours) : undefined,
          onDutyHours: onDutyHours ? Number(onDutyHours) : undefined,
          bookingId: bookingId ? Number(bookingId) : undefined,
          historicalSource: 'paper_form',
          entryNotes: entryNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create time card');
      }

      setSuccess(true);

      // Reset form for next entry
      setTimeout(() => {
        setSuccess(false);
        setOriginalDate('');
        setClockInTime('');
        setClockOutTime('');
        setDrivingHours('');
        setOnDutyHours('');
        setWorkLocation('');
        setBookingId('');
        setEntryNotes('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/historical-entry"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Historical Entry
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Enter Historical Time Card</h1>
        <p className="text-gray-600 mt-2">
          Digitize a paper time sheet or driver work record
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-800 font-medium">
              Time card record created successfully! Ready for next entry.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shift Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Document Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Date from the paper time sheet</p>
            </div>

            {/* Driver */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clock In Time */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Clock In Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Clock Out Time */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Clock Out Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                For overnight shifts, this will be treated as the next day
              </p>
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Vehicle</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select vehicle (optional)...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Reporting Location */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Work Reporting Location
              </label>
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Office, Walla Walla, Customer pickup"
              />
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hours Tracking</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driving Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Driving Hours</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={drivingHours}
                onChange={(e) => setDrivingHours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Time spent driving"
              />
              <p className="text-xs text-gray-500 mt-1">Hours behind the wheel only</p>
            </div>

            {/* On-Duty Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Total On-Duty Hours
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={onDutyHours}
                onChange={(e) => setOnDutyHours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-calculated from times"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total shift time (auto-calculated if blank)
              </p>
            </div>
          </div>
        </div>

        {/* Link to Booking */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Link to Booking</h2>
          <p className="text-sm text-gray-600 mb-4">
            Optionally link this time card to a specific tour booking. This helps track which tours
            this shift covered.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Related Booking</label>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No linked booking</option>
              {filteredBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_number} - {booking.customer_name} ({booking.tour_date})
                </option>
              ))}
            </select>
            {originalDate && filteredBookings.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No completed bookings found for {originalDate}
              </p>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Entry Notes</label>
            <textarea
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes about this data entry (e.g., 'time unclear - estimated from tour schedule', 'paper damaged')..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/historical-entry"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              isSubmitting
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Time Card Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
