'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TouchButton,
  MobileCard,
  MobileCardGrid,
  StatusIndicator,
  AlertBanner,
  AlertStack
} from '@/components/mobile';
import { logger } from '@/lib/logger';

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
  const [driverId, setDriverId] = useState<number | null>(null);

  const loadDashboardData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const todayResponse = await fetch(`/api/time-clock/today?driverId=${id}`);
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

        const dashboardAlerts: ComplianceAlert[] = (status.alerts || []).map((alert: { type: string; message: string }) => ({
          type: alert.type,
          message: alert.message,
        }));

        if (dashboardAlerts.length === 0 && !status.isClockedIn) {
          dashboardAlerts.push({
            type: 'info',
            message: 'Good morning! Ready to start your day?',
          });
        }

        setAlerts(dashboardAlerts);
      }
    } catch (err) {
      logger.error('Error loading dashboard', { error: err });
      setAlerts([{
        type: 'error',
        message: 'Failed to load dashboard data',
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const authenticate = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login?error=unauthorized');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'driver' && data.user?.role !== 'admin') {
          router.push('/login?error=forbidden');
          return;
        }
        const id = data.user.id;
        setDriverId(id);
        loadDashboardData(id);
      } catch {
        router.push('/login?error=unauthorized');
      }
    };

    authenticate();
  }, [router, loadDashboardData]);

  // Refresh every 30 seconds once authenticated
  useEffect(() => {
    if (!driverId) return;
    const interval = setInterval(() => loadDashboardData(driverId), 30000);
    return () => clearInterval(interval);
  }, [driverId, loadDashboardData]);

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
          <p className="mt-4 text-gray-800">Loading dashboard...</p>
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
          <p className="text-gray-800 mt-1">{getCurrentDate()}</p>
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
              <StatusIndicator status="active" label="Clocked In" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-800">Driver:</span>
                  <span className="font-semibold">{todayStatus.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800">Vehicle:</span>
                  <span className="font-semibold">{todayStatus.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800">Clock In:</span>
                  <span className="font-semibold">{todayStatus.clockInTime}</span>
                </div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-800">Driving Hours:</span>
                  <span className="font-semibold">
                    {todayStatus.drivingHours.toFixed(1)} / 10.0 hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-800">On-Duty Hours:</span>
                  <span className="font-semibold">
                    {todayStatus.onDutyHours.toFixed(1)} / 15.0 hrs
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <StatusIndicator status="pending" label="Not Clocked In" />
              <p className="text-gray-800 mt-2">Start your day by clocking in</p>
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
                Clock In
              </TouchButton>
            ) : (
              <TouchButton
                variant="danger"
                size="large"
                fullWidth
                onClick={() => router.push('/time-clock/clock-out')}
              >
                Clock Out
              </TouchButton>
            )}

            <TouchButton
              variant={todayStatus.preTripCompleted ? 'success' : 'primary'}
              size="large"
              fullWidth
              onClick={() => router.push('/inspections/pre-trip')}
            >
              {todayStatus.preTripCompleted ? 'Pre-Trip Done' : 'Pre-Trip Inspection'}
            </TouchButton>

            <TouchButton
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => router.push('/inspections/post-trip')}
            >
              Post-Trip Inspection
            </TouchButton>

            <TouchButton
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => router.push('/time-clock/hos-dashboard')}
            >
              HOS Dashboard
            </TouchButton>
          </MobileCardGrid>
        </MobileCard>

        {/* Compliance Overview */}
        <MobileCard title="Compliance Status" variant="elevated">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Today&apos;s Inspection</span>
              <StatusIndicator
                status={todayStatus.preTripCompleted ? 'completed' : 'pending'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">HOS Compliance</span>
              <StatusIndicator
                status={todayStatus.drivingHours >= 10 ? 'error' : todayStatus.drivingHours >= 9 ? 'warning' : 'completed'}
                label="Within Limits"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">150-Mile Exemption</span>
              <StatusIndicator status="completed" label="0/8 days" />
            </div>
          </div>
        </MobileCard>

        {/* Weekly Summary */}
        <MobileCard title="This Week" variant="bordered">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-800">Total Hours:</span>
              <span className="font-semibold">{todayStatus.weeklyHours.toFixed(1)} / 60.0 hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800">Today:</span>
              <span className="font-semibold">{todayStatus.drivingHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800">Remaining:</span>
              <span className="font-semibold">{Math.max(0, 60 - todayStatus.weeklyHours).toFixed(1)} hrs</span>
            </div>
          </div>
        </MobileCard>

        {/* Company Info */}
        <div className="text-center text-sm text-gray-700 py-4">
          <p>Walla Walla Travel</p>
          <p>USDOT #3603851</p>
        </div>
      </div>
    </div>
  );
}
