'use client';

import React, { useState, useEffect } from 'react';
import { MobileCard, TouchButton, AlertBanner } from '@/components/mobile';
import type { ActiveShift, FleetVehicle } from '@/lib/types';

interface Statistics {
  shifts: {
    total_today: number;
    active: number;
    completed: number;
  };
  services: {
    total_today: number;
    active: number;
    completed: number;
  };
  revenue: {
    total_today: number;
    service_hours_today: number;
  };
  fleet: {
    total: number;
    available: number;
    in_use: number;
    out_of_service: number;
    utilization_rate: number;
  };
}

interface DashboardData {
  activeShifts: ActiveShift[];
  fleetStatus: FleetVehicle[];
  statistics: Statistics;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ActiveShift | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleAssignVehicle = (shift: ActiveShift) => {
    setSelectedShift(shift);
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <MobileCard>
            <p className="text-center text-gray-800">Loading dashboard...</p>
          </MobileCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <AlertBanner
            type="error"
            message={error}
            onDismiss={() => setError(null)}
          />
          <TouchButton onClick={() => fetchDashboard()} className="mt-4">
            Retry
          </TouchButton>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = data.statistics;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            <TouchButton variant="secondary" onClick={() => fetchDashboard()}>
              Refresh Now
            </TouchButton>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Shifts */}
          <MobileCard>
            <h3 className="text-sm font-medium text-gray-600">Active Shifts</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.shifts.active}</p>
            <p className="text-xs text-gray-600 mt-1">
              {stats.shifts.completed} completed today
            </p>
          </MobileCard>

          {/* Fleet Utilization */}
          <MobileCard>
            <h3 className="text-sm font-medium text-gray-600">Fleet Utilization</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.fleet.utilization_rate}%</p>
            <p className="text-xs text-gray-600 mt-1">
              {stats.fleet.in_use} of {stats.fleet.total} in use
            </p>
          </MobileCard>

          {/* Today's Revenue */}
          <MobileCard>
            <h3 className="text-sm font-medium text-gray-600">Today's Revenue</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {formatCurrency(stats.revenue.total_today)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {stats.revenue.service_hours_today.toFixed(1)} service hours
            </p>
          </MobileCard>

          {/* Active Services */}
          <MobileCard>
            <h3 className="text-sm font-medium text-gray-600">Active Services</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.services.active}</p>
            <p className="text-xs text-gray-600 mt-1">
              {stats.services.completed} completed today
            </p>
          </MobileCard>
        </div>

        {/* Active Shifts */}
        <MobileCard>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Shifts</h2>
          {data.activeShifts.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No active shifts</p>
          ) : (
            <div className="space-y-3">
              {data.activeShifts.map((shift) => (
                <div
                  key={shift.time_card_id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{shift.driver_name}</h3>
                      <p className="text-sm text-gray-600">{shift.driver_email}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="text-gray-600">Clocked in:</span>{' '}
                          <span className="font-medium">{formatTime(shift.clock_in_time)}</span>
                        </p>
                        {shift.vehicle_number ? (
                          <p>
                            <span className="text-gray-600">Vehicle:</span>{' '}
                            <span className="font-medium">
                              {shift.vehicle_number} ({shift.make} {shift.model})
                            </span>
                          </p>
                        ) : (
                          <p className="text-orange-600 font-medium">⚠️ No vehicle assigned</p>
                        )}
                        {shift.client_name && (
                          <>
                            <p>
                              <span className="text-gray-600">Client:</span>{' '}
                              <span className="font-medium">{shift.client_name}</span>
                            </p>
                            <p>
                              <span className="text-gray-600">Rate:</span>{' '}
                              <span className="font-medium">{formatCurrency(shift.hourly_rate || 0)}/hr</span>
                            </p>
                            {shift.service_status && (
                              <p>
                                <span className="text-gray-600">Status:</span>{' '}
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    shift.service_status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : shift.service_status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {shift.service_status}
                                </span>
                              </p>
                            )}
                            {shift.total_cost !== null && (
                              <p className="text-green-600 font-medium">
                                Total: {formatCurrency(shift.total_cost)} ({shift.service_hours?.toFixed(1)} hrs)
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {!shift.vehicle_id && (
                      <TouchButton
                        variant="primary"
                        onClick={() => handleAssignVehicle(shift)}
                        className="ml-4"
                      >
                        Assign Vehicle
                      </TouchButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </MobileCard>

        {/* Fleet Status */}
        <MobileCard>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Fleet Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.fleetStatus.map((vehicle) => (
              <div
                key={vehicle.vehicle_id}
                className={`border-2 rounded-lg p-3 ${
                  vehicle.availability_status === 'available'
                    ? 'border-green-500 bg-green-50'
                    : vehicle.availability_status === 'in_use'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{vehicle.vehicle_number}</h3>
                    <p className="text-sm text-gray-700">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Cap: {vehicle.capacity} | {vehicle.license_plate}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      vehicle.availability_status === 'available'
                        ? 'bg-green-600 text-white'
                        : vehicle.availability_status === 'in_use'
                        ? 'bg-blue-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {vehicle.availability_status}
                  </span>
                </div>
                {vehicle.current_driver_name && (
                  <div className="mt-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Driver:</span> {vehicle.current_driver_name}
                    </p>
                    {vehicle.current_client && (
                      <p className="text-gray-700">
                        <span className="font-medium">Client:</span> {vehicle.current_client}
                      </p>
                    )}
                  </div>
                )}
                {vehicle.defect_notes && (
                  <p className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                    ⚠️ {vehicle.defect_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Last Updated */}
        <p className="text-center text-sm text-gray-600">
          Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      </div>

      {/* Vehicle Assignment Modal */}
      {showAssignModal && selectedShift && (
        <VehicleAssignmentModal
          shift={selectedShift}
          availableVehicles={data.fleetStatus.filter(v => v.availability_status === 'available')}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedShift(null);
          }}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedShift(null);
            fetchDashboard(); // Refresh data
          }}
        />
      )}
    </div>
  );
}

// Vehicle Assignment Modal Component
function VehicleAssignmentModal({
  shift,
  availableVehicles,
  onClose,
  onSuccess
}: {
  shift: ActiveShift;
  availableVehicles: FleetVehicle[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('150.00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedVehicleId) {
      setError('Please select a vehicle');
      return;
    }

    if (!clientName.trim()) {
      setError('Please enter client name');
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid hourly rate');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/assign-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          timeCardId: shift.time_card_id,
          vehicleId: selectedVehicleId,
          clientName: clientName.trim(),
          hourlyRate: rate,
          notes: notes.trim() || undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to assign vehicle');
      }
    } catch (err) {
      console.error('Assignment error:', err);
      setError('Network error - please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <MobileCard>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assign Vehicle</h2>

          {error && (
            <AlertBanner
              type="error"
              message={error}
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}

          {/* Driver Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{shift.driver_name}</p>
            <p className="text-sm text-gray-600">{shift.driver_email}</p>
          </div>

          {/* Client Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter client name"
            />
          </div>

          {/* Hourly Rate */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate (USD) *
            </label>
            <input
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="150.00"
            />
          </div>

          {/* Vehicle Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vehicle *
            </label>
            {availableVehicles.length === 0 ? (
              <p className="text-gray-600 p-4 bg-yellow-50 rounded-lg">
                No vehicles currently available
              </p>
            ) : (
              <div className="space-y-2">
                {availableVehicles.map((vehicle) => (
                  <button
                    key={vehicle.vehicle_id}
                    onClick={() => setSelectedVehicleId(vehicle.vehicle_id)}
                    className={`w-full p-3 border-2 rounded-lg text-left transition ${
                      selectedVehicleId === vehicle.vehicle_id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{vehicle.vehicle_number}</p>
                        <p className="text-sm text-gray-700">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </p>
                        <p className="text-xs text-gray-600">
                          Capacity: {vehicle.capacity} | {vehicle.license_plate}
                        </p>
                      </div>
                      {selectedVehicleId === vehicle.vehicle_id && (
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Additional notes or instructions"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <TouchButton
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="primary"
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting || availableVehicles.length === 0}
            >
              {submitting ? 'Assigning...' : 'Assign Vehicle'}
            </TouchButton>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}
