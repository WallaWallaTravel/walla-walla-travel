'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TouchButton,
  MobileCard,
  MobileCardGrid,
  StatusIndicator,
  AlertBanner,
  AlertStack,
} from '@/components/mobile';

interface TodayStatus {
  isClockedIn: boolean;
  clockInTime?: string;
  driverName?: string;
  vehicleNumber?: string;
  drivingHours: number;
  onDutyHours: number;
  preTripCompleted: boolean;
  weeklyHours: number;
}

interface ComplianceAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  action?: string;
  onAction?: () => void;
}

export default function UnifiedDashboard() {
  const router = useRouter();
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    isClockedIn: false,
    drivingHours: 0,
    onDutyHours: 0,
    preTripCompleted: false,
    weeklyHours: 0,
  });
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId] = useState(1); // Default to driver 1 (Owner) - will add user selection later

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load today's status
      const todayResponse = await fetch(`/api/time-clock/today?driverId=${driverId}`);
      const todayData = await todayResponse.json();

      if (todayData.success) {
        const status = todayData.status;
        
        setTodayStatus({
          isClockedIn: status.isClockedIn,
          clockInTime: status.timeCard?.clock_in_time 
            ? new Date(status.timeCard.clock_in_time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
          driverName: status.timeCard?.driver_name,
          vehicleNumber: status.timeCard?.vehicle_number,
          drivingHours: status.timeCard?.hours_worked || 0,
          onDutyHours: status.timeCard?.hours_worked || 0,
          preTripCompleted: status.hasPreTrip,
          weeklyHours: status.weeklyHours || 0,
        });

        // Convert API alerts to dashboard alerts
        const dashboardAlerts: ComplianceAlert[] = (status.alerts || []).map((alert: any) => ({
          type: alert.type,
          message: alert.message,
        }));

        // Add welcome message if no alerts
        if (dashboardAlerts.length === 0 && !status.isClockedIn) {
          dashboardAlerts.push({
            type: 'info',
            message: 'Good morning! Ready to start your day?',
          });
        }

        setAlerts(dashboardAlerts);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setAlerts([{
        type: 'error',
        message: 'Failed to load dashboard data',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Walla Walla Travel</h1>
          <p className="text-gray-600 mt-1">{getCurrentDate()}</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{getCurrentTime()}</p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <AlertStack>
            {alerts.map((alert, index) => (
              <AlertBanner
                key={index}
                type={alert.type}
                message={alert.message}
                action={alert.action}
                onAction={alert.onAction}
              />
            ))}
          </AlertStack>
        )}

        {/* Today's Status */}
        <MobileCard title="Today's Status" variant="elevated">
          {todayStatus.isClockedIn ? (
            <div className="space-y-3">
              <StatusIndicator status="in-progress" label="Clocked In" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-semibold">{todayStatus.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-semibold">{todayStatus.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Clock In:</span>
                  <span className="font-semibold">{todayStatus.clockInTime}</span>
                </div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Driving Hours:</span>
                  <span className="font-semibold">
                    {todayStatus.drivingHours.toFixed(1)} / 10.0 hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">On-Duty Hours:</span>
                  <span className="font-semibold">
                    {todayStatus.onDutyHours.toFixed(1)} / 15.0 hrs
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <StatusIndicator status="pending" label="Not Clocked In" />
              <p className="text-gray-600 mt-2">Start your day by clocking in</p>
            </div>
          )}
        </MobileCard>

        {/* Quick Actions */}
        <MobileCard title="Quick Actions" variant="elevated">
          <MobileCardGrid>
            {!todayStatus.isClockedIn ? (
              <TouchButton
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/time-clock/clock-in')}
              >
                🕐 Clock In
              </TouchButton>
            ) : (
              <TouchButton
                variant="danger"
                size="large"
                fullWidth
                onClick={() => router.push('/time-clock/clock-out')}
              >
                🕐 Clock Out
              </TouchButton>
            )}

            <TouchButton
              variant={todayStatus.preTripCompleted ? 'success' : 'primary'}
              size="large"
              fullWidth
              onClick={() => router.push('/inspections/pre-trip')}
            >
              {todayStatus.preTripCompleted ? '✓ Pre-Trip Done' : '📋 Pre-Trip Inspection'}
            </TouchButton>

            <TouchButton
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => router.push('/inspections/post-trip')}
            >
              📋 Post-Trip Inspection
            </TouchButton>

            <TouchButton
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => router.push('/time-clock/hos-dashboard')}
            >
              📊 HOS Dashboard
            </TouchButton>
          </MobileCardGrid>
        </MobileCard>

        {/* Compliance Overview */}
        <MobileCard title="Compliance Status" variant="elevated">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Today's Inspection</span>
              <StatusIndicator
                status={todayStatus.preTripCompleted ? 'complete' : 'pending'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">HOS Compliance</span>
              <StatusIndicator 
                status={todayStatus.drivingHours >= 10 ? 'error' : todayStatus.drivingHours >= 9 ? 'warning' : 'complete'} 
                label="Within Limits" 
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">150-Mile Exemption</span>
              <StatusIndicator status="complete" label="0/8 days" />
            </div>
          </div>
        </MobileCard>

        {/* Weekly Summary */}
        <MobileCard title="This Week" variant="bordered">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Hours:</span>
              <span className="font-semibold">{todayStatus.weeklyHours.toFixed(1)} / 60.0 hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Today:</span>
              <span className="font-semibold">{todayStatus.drivingHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-semibold">{Math.max(0, 60 - todayStatus.weeklyHours).toFixed(1)} hrs</span>
            </div>
          </div>
        </MobileCard>

        {/* Company Info */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Walla Walla Travel</p>
          <p>USDOT #3603851</p>
        </div>
      </div>
    </div>
  );
}
