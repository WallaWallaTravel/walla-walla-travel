'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api-client'
import { VehicleSelector } from '@/components/mobile'

interface ClockStatus {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'already_clocked_in' | 'already_clocked_out';
  message: string;
  canClockIn: boolean;
  canClockOut: boolean;
  timeCard?: any;
  vehicle?: string;
  hoursWorked?: string;
  lastShift?: {
    clockIn: string;
    clockOut: string;
    totalHours: string;
    vehicle: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
  id: number;
}

interface AssignedVehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  current_mileage?: number;
}

interface StatusMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  suggestions?: string[];
}

export default function WorkflowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [vehicleDocs, setVehicleDocs] = useState<any>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isNonDrivingShift, setIsNonDrivingShift] = useState(false); // Track "No Vehicle" selection
  const [preTripCompleted, setPreTripCompleted] = useState(false);
  const [postTripCompleted, setPostTripCompleted] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkLocationPermission();
  }, []);

  async function checkLocationPermission() {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationEnabled(permission.state === 'granted');
      } catch (e) {
        console.log('Location permission check failed');
      }
    }
  }

  async function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
    if (!locationEnabled) return null;
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  }

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Load user profile
      const profileResult = await api.auth.getProfile();
      if (!profileResult.success) {
        router.push('/login');
        return;
      }
      setUser(profileResult.data);

      // Load clock status
      const statusResult = await fetch('/api/workflow/clock', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (statusResult.ok) {
        const statusData = await statusResult.json();
        if (statusData.success) {
          setClockStatus(statusData.data);
        }
      }

      // Load assigned vehicle
      const vehicleResult = await api.vehicle.getAssignedVehicle();
      if (vehicleResult.success) {
        setVehicle(vehicleResult.data);
        
        // Load vehicle documents
        if (vehicleResult.data?.id) {
          try {
            const docsResponse = await fetch(`/api/vehicles/documents?vehicleId=${vehicleResult.data.id}`, {
              method: 'GET',
              credentials: 'include',
            });
            
            if (docsResponse.ok) {
              const docsData = await docsResponse.json();
              if (docsData.success) {
                setVehicleDocs(docsData.grouped);
              }
            }
          } catch (error) {
            console.error('Failed to load vehicle documents:', error);
          }
        }
      }

      // Check if pre-trip inspection is completed for today
      const preTripResult = await fetch('/api/inspections/pre-trip', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (preTripResult.ok) {
        const preTripData = await preTripResult.json();
        if (preTripData.success && preTripData.data) {
          setPreTripCompleted(true);
        }
      }

      // Check if post-trip inspection is completed for today
      const postTripResult = await fetch('/api/inspections/post-trip', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (postTripResult.ok) {
        const postTripData = await postTripResult.json();
        if (postTripData.success && postTripData.data) {
          setPostTripCompleted(true);
        }
      }

    } catch (error) {
      console.error('Dashboard load error:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to load dashboard data',
        suggestions: ['Please refresh the page to try again']
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleClockIn() {
    // Show vehicle selector first
    setShowVehicleSelector(true);
  }

  async function handleVehicleSelected(vehicleId: number | null) {
    setSelectedVehicleId(vehicleId);
    setIsNonDrivingShift(vehicleId === null); // Track if user chose "No Vehicle"
    setShowVehicleSelector(false);
    setClockingIn(true);
    setStatusMessage(null);

    try {
      const location = await getLocation();

      const result = await api.workflow.clockIn({
        vehicleId: vehicleId || undefined, // Convert null to undefined for API
        location,
      });

      if (result.success) {
        const data = result.data;
        
        // Handle different response statuses
        if (data.status === 'already_clocked_in') {
          setStatusMessage({
            type: 'info',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'already_completed') {
          setStatusMessage({
            type: 'info',
            message: data.message,
            suggestions: [...(data.details ? [data.details] : []), ...data.suggestions],
          });
        } else if (data.status === 'no_vehicle' || data.status === 'vehicle_required') {
          setStatusMessage({
            type: 'warning',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'vehicle_in_use' || data.status === 'vehicle_inactive' || data.status === 'invalid_vehicle') {
          setStatusMessage({
            type: 'warning',
            message: data.message,
            suggestions: data.suggestions,
          });
          // Show vehicle selector again for user to pick a different vehicle
          setShowVehicleSelector(true);
        } else if (data.status === 'incomplete_previous') {
          setStatusMessage({
            type: 'warning',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'success') {
          setStatusMessage({
            type: 'success',
            message: data.message,
            suggestions: data.reminders,
          });
          setIsNonDrivingShift(false); // Reset after successful clock-in
          await loadDashboardData();
        } else {
          // Handle other statuses
          setStatusMessage({
            type: 'info',
            message: data.message || 'Clock in processed',
            suggestions: data.suggestions,
          });
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: result.error || 'Clock in failed',
          suggestions: ['Please try again or contact support'],
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'Failed to clock in',
        suggestions: ['Check your internet connection and try again'],
      });
    } finally {
      setClockingIn(false);
    }
  }

  async function handleClockOut() {
    setClockingOut(true);
    setStatusMessage(null);

    try {
      const signature = prompt('Enter your full name for digital signature:');
      if (!signature) {
        setClockingOut(false);
        return;
      }

      const location = await getLocation();

      const result = await api.workflow.clockOut({
        signature,
        location,
      });

      if (result.success) {
        const data = result.data;
        
        // Handle different response statuses
        if (data.status === 'already_clocked_out') {
          setStatusMessage({
            type: 'info',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'not_clocked_in') {
          setStatusMessage({
            type: 'warning',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'signature_required') {
          setStatusMessage({
            type: 'warning',
            message: data.message,
            suggestions: data.suggestions,
          });
        } else if (data.status === 'success') {
          // Show summary
          const summary = data.summary;
          const warnings = data.warnings || [];
          
          setStatusMessage({
            type: warnings.length > 0 ? 'warning' : 'success',
            message: `${data.message} - Total hours: ${summary.totalHours}`,
            suggestions: [...warnings, ...data.reminders],
          });
          // Reset inspection status for new shift
          setPreTripCompleted(false);
          setPostTripCompleted(false);
          await loadDashboardData();
        } else {
          setStatusMessage({
            type: 'info',
            message: data.message || 'Clock out processed',
            suggestions: data.suggestions,
          });
        }
      } else {
        // Handle error response
        if (result.errorId) {
          setStatusMessage({
            type: 'error',
            message: result.error || 'Clock out failed',
            suggestions: [
              `Error ID: ${result.errorId}`,
              'Contact support if this continues',
              result.supportContact || 'support@wallawallatravel.com'
            ],
          });
        } else {
          setStatusMessage({
            type: 'error',
            message: result.error || 'Clock out failed',
            suggestions: ['Please try again or contact support'],
          });
        }
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'Failed to clock out',
        suggestions: ['Check your internet connection and try again'],
      });
    } finally {
      setClockingOut(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
      }}>
        <div style={{ fontSize: '1.5rem', color: '#6b7280' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  const isClockedIn = clockStatus?.status === 'clocked_in';
  const canClockIn = clockStatus?.canClockIn ?? true;
  const canClockOut = clockStatus?.canClockOut ?? false;

  // Get status display text and color
  const getStatusDisplay = () => {
    if (!clockStatus) return { text: 'Unknown', color: '#6b7280', icon: '❓' };
    
    switch (clockStatus.status) {
      case 'clocked_in':
        return { 
          text: `On Duty (${clockStatus.hoursWorked || '0.0'} hrs)`, 
          color: '#10b981', 
          icon: '🟢' 
        };
      case 'not_clocked_in':
        return { text: 'Not Clocked In', color: '#6b7280', icon: '⭕' };
      case 'clocked_out':
        return { text: 'Day Complete', color: '#3b82f6', icon: '✅' };
      default:
        return { text: clockStatus.message, color: '#6b7280', icon: '🔄' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '1rem',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              margin: 0,
              color: '#1f2937' 
            }}>
              Welcome, {user?.name || 'Driver'}!
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          Current Status
        </h2>
        
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Status:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{statusDisplay.icon}</span>
              <span style={{ fontWeight: 600, color: statusDisplay.color }}>
                {statusDisplay.text}
              </span>
            </div>
          </div>

          {isClockedIn && vehicle && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#6b7280', fontWeight: 500 }}>Vehicle:</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                    🚐 {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})
                  </div>
                  {vehicle.vin && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      VIN: {vehicle.vin}
                    </div>
                  )}
                </div>
              </div>

              {clockStatus?.timeCard?.clock_in_time && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Clocked in:</span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>
                    {new Date(clockStatus.timeCard.clock_in_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              )}
            </>
          )}

          {clockStatus?.message && (
            <div style={{ 
              padding: '0.5rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#0369a1'
            }}>
              {clockStatus.message}
            </div>
          )}

          {clockStatus?.lastShift && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                Last Shift:
              </p>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                <p style={{ margin: '0.25rem 0' }}>
                  {clockStatus.lastShift.clockIn} - {clockStatus.lastShift.clockOut}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  Total: {clockStatus.lastShift.totalHours} hours
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  Vehicle: {clockStatus.lastShift.vehicle}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status messages */}
        {statusMessage && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: statusMessage.type === 'error' ? '#fee2e2' : 
                           statusMessage.type === 'warning' ? '#fef3c7' :
                           statusMessage.type === 'success' ? '#d1fae5' : '#e0f2fe',
            color: statusMessage.type === 'error' ? '#dc2626' : 
                   statusMessage.type === 'warning' ? '#d97706' :
                   statusMessage.type === 'success' ? '#059669' : '#0369a1',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}>
            <strong>{statusMessage.message}</strong>
            {statusMessage.suggestions && statusMessage.suggestions.length > 0 && (
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                {statusMessage.suggestions.map((suggestion, i) => (
                  <li key={i} style={{ marginTop: '0.25rem' }}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Clock In/Out Button */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}>
        {canClockIn && !isClockedIn ? (
          <>
            <button
              onClick={handleClockIn}
              disabled={clockingIn}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: clockingIn ? 'not-allowed' : 'pointer',
                opacity: clockingIn ? 0.7 : 1,
              }}
            >
              {clockingIn ? 'Clocking In...' : 'Clock In to Start Shift'}
            </button>
            {isNonDrivingShift ? (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: '#059669',
                textAlign: 'center',
                fontWeight: 600
              }}>
                🏢 Non-driving shift - No vehicle required
              </p>
            ) : !vehicle && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: '#d97706',
                textAlign: 'center'
              }}>
                ⚠️ No vehicle assigned - will need assignment from supervisor
              </p>
            )}
            {!locationEnabled && (
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.85rem', 
                color: '#6b7280',
                textAlign: 'center',
                fontStyle: 'italic' 
              }}>
                Location services disabled - enable for better tracking
              </p>
            )}
          </>
        ) : canClockOut ? (
          <>
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: clockingOut ? 'not-allowed' : 'pointer',
                opacity: clockingOut ? 0.7 : 1,
              }}
            >
              {clockingOut ? 'Clocking Out...' : 'Clock Out to End Shift'}
            </button>
            <p style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.85rem', 
              color: '#6b7280',
              textAlign: 'center',
              fontStyle: 'italic' 
            }}>
              Digital signature will be required
            </p>
          </>
        ) : (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              {clockStatus?.status === 'clocked_out' 
                ? 'Your shift is complete for today'
                : 'Clock status is being determined...'}
            </p>
          </div>
        )}
      </div>

      {/* Inspection Buttons */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          Vehicle Inspections
        </h2>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          {preTripCompleted ? (
            <button
              disabled={true}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: 0.9,
              }}
            >
              <span>✅ Pre-Trip Complete</span>
              <span style={{ fontSize: '0.85rem' }}>
                Already completed
              </span>
            </button>
          ) : (
            <Link href="/inspections/pre-trip" style={{ textDecoration: 'none' }}>
              <button
                disabled={!isClockedIn}
                title={!isClockedIn ? 'Clock in first to access inspections' : ''}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: isClockedIn ? '#3b82f6' : '#e5e7eb',
                  color: isClockedIn ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isClockedIn ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🔍 Pre-Trip Inspection</span>
                <span style={{ fontSize: '0.85rem' }}>
                  {!isClockedIn ? '🔒' : 'Required'}
                </span>
              </button>
            </Link>
          )}

          {postTripCompleted ? (
            <button
              disabled={true}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: 0.9,
              }}
            >
              <span>✅ Post-Trip & DVIR Complete</span>
              <span style={{ fontSize: '0.85rem' }}>
                Already completed
              </span>
            </button>
          ) : (
            <Link href="/inspections/post-trip" style={{ textDecoration: 'none' }}>
              <button
                disabled={!isClockedIn}
                title={!isClockedIn ? 'Clock in first to access inspections' : ''}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: isClockedIn ? '#8b5cf6' : '#e5e7eb',
                  color: isClockedIn ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isClockedIn ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>📝 Post-Trip Inspection & DVIR</span>
                <span style={{ fontSize: '0.85rem' }}>
                  {!isClockedIn ? '🔒' : 'Required'}
                </span>
              </button>
            </Link>
          )}
        </div>

        {!isClockedIn && (
          <p style={{ 
            marginTop: '0.75rem', 
            fontSize: '0.9rem', 
            color: '#6b7280',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            👆 Clock in to unlock inspection forms
          </p>
        )}
      </div>

      {/* Vehicle Documents */}
      {vehicle && (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
            📄 Vehicle Documents
          </h2>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {/* Registration */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  Registration
                </div>
                {vehicleDocs?.registration && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {vehicleDocs.registration.expiresInDays !== null && vehicleDocs.registration.expiresInDays > 0 && (
                      <span>Expires in {vehicleDocs.registration.expiresInDays} days</span>
                    )}
                    {vehicleDocs.registration.isExpired && (
                      <span style={{ color: '#ef4444' }}>⚠️ EXPIRED</span>
                    )}
                  </div>
                )}
              </div>
              {vehicleDocs?.registration?.url ? (
                <a 
                  href={vehicleDocs.registration.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  View PDF
                </a>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Not available</span>
              )}
            </div>

            {/* Insurance */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  Insurance Certificate
                </div>
                {vehicleDocs?.insurance && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {vehicleDocs.insurance.expiresInDays !== null && vehicleDocs.insurance.expiresInDays > 0 && (
                      <span>Expires in {vehicleDocs.insurance.expiresInDays} days</span>
                    )}
                    {vehicleDocs.insurance.isExpired && (
                      <span style={{ color: '#ef4444' }}>⚠️ EXPIRED</span>
                    )}
                  </div>
                )}
              </div>
              {vehicleDocs?.insurance?.url ? (
                <a 
                  href={vehicleDocs.insurance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  View PDF
                </a>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Not available</span>
              )}
            </div>

            {/* Inspection Records */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  DOT Inspection Records
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Last official inspection
                </div>
              </div>
              {vehicleDocs?.inspection?.url ? (
                <a 
                  href={vehicleDocs.inspection.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  View PDF
                </a>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Not available</span>
              )}
            </div>

            {/* Maintenance History */}
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  Maintenance History
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Service and repair records
                </div>
              </div>
              {vehicleDocs?.maintenance?.url ? (
                <a 
                  href={vehicleDocs.maintenance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  View PDF
                </a>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Not available</span>
              )}
            </div>
          </div>

          {(!vehicleDocs || Object.values(vehicleDocs).every(doc => !doc)) && (
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.9rem', 
              color: '#6b7280',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              📋 Documents will be uploaded by administration
            </p>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          Quick Links
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Link href="/vehicles" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              🚐 Vehicles
            </button>
          </Link>

          <Link href="/inspections/history" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              📋 History
            </button>
          </Link>

          <button 
            onClick={() => setStatusMessage({
              type: 'info',
              message: 'Schedule feature coming soon!',
              suggestions: ['Check with dispatch for your schedule']
            })}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📅 Schedule
          </button>

          <button 
            onClick={() => setStatusMessage({
              type: 'info',
              message: 'Profile settings coming soon!',
              suggestions: ['Contact admin to update your profile']
            })}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            👤 Profile
          </button>
        </div>
      </div>

      {/* Vehicle Selector Modal */}
      {showVehicleSelector && (
        <VehicleSelector
          onSelect={handleVehicleSelected}
          onCancel={() => {
            setShowVehicleSelector(false);
            setClockingIn(false);
            setIsNonDrivingShift(false); // Reset if canceled
          }}
          selectedVehicleId={selectedVehicleId}
        />
      )}
    </div>
  );
}