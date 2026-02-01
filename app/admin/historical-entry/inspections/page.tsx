'use client';

/**
 * Historical Inspection Entry Form
 *
 * Form for digitizing paper inspection records (pre-trip, post-trip, DVIR).
 * Captures all FMCSA-required inspection data with validation.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

// Standard FMCSA inspection checklist items
const INSPECTION_ITEMS = {
  exterior: [
    { key: 'tires_condition', label: 'Tires (condition, pressure, tread)' },
    { key: 'wheels_rims', label: 'Wheels and rims' },
    { key: 'lights_front', label: 'Headlights and front signals' },
    { key: 'lights_rear', label: 'Tail lights and brake lights' },
    { key: 'mirrors', label: 'Mirrors (condition, adjustment)' },
    { key: 'windshield_wipers', label: 'Windshield and wipers' },
    { key: 'body_damage', label: 'Body/exterior damage' },
    { key: 'doors_latches', label: 'Doors and latches' },
  ],
  interior: [
    { key: 'seatbelts', label: 'Seatbelts functional' },
    { key: 'horn', label: 'Horn' },
    { key: 'gauges', label: 'Dashboard gauges/warning lights' },
    { key: 'hvac', label: 'Heating/AC system' },
    { key: 'emergency_exit', label: 'Emergency exits functional' },
    { key: 'fire_extinguisher', label: 'Fire extinguisher present/charged' },
    { key: 'first_aid', label: 'First aid kit' },
    { key: 'emergency_triangles', label: 'Emergency reflective triangles' },
  ],
  mechanical: [
    { key: 'brakes', label: 'Brakes (parking and service)' },
    { key: 'steering', label: 'Steering system' },
    { key: 'fluid_levels', label: 'Fluid levels (oil, coolant, etc.)' },
    { key: 'exhaust', label: 'Exhaust system' },
    { key: 'suspension', label: 'Suspension' },
    { key: 'battery', label: 'Battery condition' },
  ],
};

type DefectSeverity = 'none' | 'minor' | 'critical';

export default function HistoricalInspectionEntryPage() {
  const _router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form values
  const [driverId, setDriverId] = useState<number | ''>('');
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [inspectionType, setInspectionType] = useState<'pre_trip' | 'post_trip' | 'dvir'>('pre_trip');
  const [originalDate, setOriginalDate] = useState('');
  const [startMileage, setStartMileage] = useState('');
  const [endMileage, setEndMileage] = useState('');
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [defectsFound, setDefectsFound] = useState(false);
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('none');
  const [defectDescription, setDefectDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');

  // Initialize checklist items
  useEffect(() => {
    const items: Record<string, boolean> = {};
    Object.values(INSPECTION_ITEMS).forEach((category) => {
      category.forEach((item) => {
        items[item.key] = true; // Default to checked (satisfactory)
      });
    });
    setChecklistItems(items);
  }, []);

  // Load drivers and vehicles
  useEffect(() => {
    async function loadData() {
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          fetch('/api/admin/users?role=driver'),
          fetch('/api/vehicles'),
        ]);

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDrivers(driversData.data || []);
        }

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setVehicles(vehiclesData.data || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const handleChecklistChange = (key: string, checked: boolean) => {
    setChecklistItems((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/historical/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: Number(driverId),
          vehicleId: Number(vehicleId),
          type: inspectionType,
          originalDocumentDate: originalDate,
          startMileage: startMileage ? Number(startMileage) : undefined,
          endMileage: endMileage ? Number(endMileage) : undefined,
          inspectionData: {
            items: checklistItems,
            notes,
            fuelLevel: fuelLevel || undefined,
            defectsFound,
            defectSeverity,
            defectDescription: defectsFound ? defectDescription : undefined,
          },
          historicalSource: 'paper_form',
          entryNotes: entryNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create inspection');
      }

      setSuccess(true);

      // Reset form for next entry
      setTimeout(() => {
        setSuccess(false);
        setOriginalDate('');
        setStartMileage('');
        setEndMileage('');
        setDefectsFound(false);
        setDefectSeverity('none');
        setDefectDescription('');
        setNotes('');
        setEntryNotes('');
        setFuelLevel('');
        // Reset checklist to all checked
        const items: Record<string, boolean> = {};
        Object.values(INSPECTION_ITEMS).forEach((category) => {
          category.forEach((item) => {
            items[item.key] = true;
          });
        });
        setChecklistItems(items);
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
        <h1 className="text-3xl font-bold text-gray-900">Enter Historical Inspection</h1>
        <p className="text-gray-600 mt-2">
          Digitize a paper inspection form for compliance records
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
              Inspection record created successfully! Ready for next entry.
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Document Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Original Document Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Date on the paper form</p>
            </div>

            {/* Inspection Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Inspection Type <span className="text-red-500">*</span>
              </label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value as typeof inspectionType)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pre_trip">Pre-Trip Inspection</option>
                <option value="post_trip">Post-Trip Inspection</option>
                <option value="dvir">DVIR (Driver Vehicle Inspection Report)</option>
              </select>
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

            {/* Vehicle */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Mileage */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Start Mileage</label>
              <input
                type="number"
                value={startMileage}
                onChange={(e) => setStartMileage(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Odometer reading"
              />
            </div>

            {/* End Mileage */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">End Mileage</label>
              <input
                type="number"
                value={endMileage}
                onChange={(e) => setEndMileage(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Odometer reading (post-trip)"
              />
            </div>
          </div>
        </div>

        {/* Inspection Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspection Checklist</h2>
          <p className="text-sm text-gray-600 mb-4">
            Check each item that was marked satisfactory on the paper form. Uncheck items that were
            not inspected or had issues.
          </p>

          <div className="space-y-6">
            {/* Exterior */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Exterior</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.exterior.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checklistItems[item.key] || false}
                      onChange={(e) => handleChecklistChange(item.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interior */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Interior / Safety Equipment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.interior.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checklistItems[item.key] || false}
                      onChange={(e) => handleChecklistChange(item.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mechanical */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Mechanical</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.mechanical.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checklistItems[item.key] || false}
                      onChange={(e) => handleChecklistChange(item.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Defects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Defects</h2>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={defectsFound}
                onChange={(e) => setDefectsFound(e.target.checked)}
                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">
                Defects were reported on this inspection
              </span>
            </label>

            {defectsFound && (
              <div className="ml-6 space-y-4 border-l-2 border-red-200 pl-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Defect Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectSeverity}
                    onChange={(e) => setDefectSeverity(e.target.value as DefectSeverity)}
                    required
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="minor">Minor - Vehicle can operate</option>
                    <option value="critical">Critical - Vehicle out of service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Defect Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={defectDescription}
                    onChange={(e) => setDefectDescription(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the defects as written on the paper form..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Fuel Level</label>
              <select
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Not recorded</option>
                <option value="full">Full</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="empty">Empty/Low</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Notes from Paper Form
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any notes written on the original inspection form..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Entry Notes</label>
            <textarea
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes about this data entry (e.g., 'handwriting unclear on mileage', 'date partially obscured')..."
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
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Inspection Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
