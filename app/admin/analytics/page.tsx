'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FunnelData {
  total_started: number;
  reached_contact: number;
  reached_details: number;
  reached_payment: number;
  completed: number;
  conversion_rate: string;
  error?: string;
}

interface AbandonedData {
  total: number;
  with_email: number;
  emails_sent: number;
  recovered: number;
  recovery_rate: string;
  error?: string;
}

interface AbandonedCart {
  id: string;
  email: string;
  name: string;
  phone: string;
  tour_date: string;
  party_size: number;
  step_reached: string;
  last_activity_at: string;
  follow_up_sent_at: string | null;
}

interface VisitorData {
  total_sessions: number;
  unique_visitors: number;
  started_booking: number;
  avg_page_views: string;
  booking_start_rate: string;
  error?: string;
}

interface RevenueData {
  total_bookings: number;
  completed_bookings: number;
  total_revenue: string;
  completed_revenue: string;
  avg_booking_value: string;
  avg_party_size: string;
  error?: string;
}

interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  funnel?: FunnelData;
  abandoned?: AbandonedData;
  recentAbandoned?: AbandonedCart[];
  visitors?: VisitorData;
  revenue?: RevenueData;
  topReferrers?: { referrer: string; count: number }[];
  deviceBreakdown?: { device_type: string; count: number }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to load analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStepLabel = (step: string): string => {
    const labels: Record<string, string> = {
      started: 'Started',
      contact_info: 'Contact Info',
      tour_details: 'Tour Details',
      wineries: 'Wineries',
      payment: 'Payment',
      payment_pending: 'Payment Pending',
      completed: 'Completed'
    };
    return labels[step] || step;
  };

  const getStepColor = (step: string): string => {
    switch (step) {
      case 'started':
        return 'bg-gray-100 text-gray-800';
      case 'contact_info':
        return 'bg-blue-100 text-blue-800';
      case 'tour_details':
        return 'bg-purple-100 text-purple-800';
      case 'wineries':
        return 'bg-indigo-100 text-indigo-800';
      case 'payment':
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Analytics</h1>
            <p className="text-gray-600">
              {data?.startDate} to {data?.endDate}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-900 hover:text-gray-700 font-semibold"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Revenue Overview */}
        {data?.revenue && !data.revenue.error && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm font-semibold text-gray-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-600">${data.revenue.total_revenue}</div>
              <div className="text-sm text-gray-500">{data.revenue.total_bookings} bookings</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm font-semibold text-gray-600 mb-1">Completed Revenue</div>
              <div className="text-3xl font-bold text-blue-600">${data.revenue.completed_revenue}</div>
              <div className="text-sm text-gray-500">{data.revenue.completed_bookings} completed</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm font-semibold text-gray-600 mb-1">Avg Booking Value</div>
              <div className="text-3xl font-bold text-gray-900">${data.revenue.avg_booking_value}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm font-semibold text-gray-600 mb-1">Avg Party Size</div>
              <div className="text-3xl font-bold text-gray-900">{data.revenue.avg_party_size}</div>
              <div className="text-sm text-gray-500">guests per tour</div>
            </div>
          </div>
        )}

        {/* Booking Funnel */}
        {data?.funnel && !data.funnel.error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Booking Funnel</h2>
              <div className="text-2xl font-bold text-green-600">
                {data.funnel.conversion_rate}% Conversion
              </div>
            </div>

            <div className="relative">
              {/* Funnel visualization */}
              <div className="flex items-end justify-between gap-2 h-48">
                {[
                  { label: 'Started', value: data.funnel.total_started, color: 'bg-gray-400' },
                  { label: 'Contact Info', value: data.funnel.reached_contact, color: 'bg-blue-400' },
                  { label: 'Tour Details', value: data.funnel.reached_details, color: 'bg-purple-400' },
                  { label: 'Payment', value: data.funnel.reached_payment, color: 'bg-yellow-400' },
                  { label: 'Completed', value: data.funnel.completed, color: 'bg-green-500' }
                ].map((step, index) => {
                  const maxVal = data.funnel!.total_started || 1;
                  const height = Math.max(20, (step.value / maxVal) * 100);
                  return (
                    <div key={step.label} className="flex-1 flex flex-col items-center">
                      <div className="text-2xl font-bold text-gray-900 mb-2">{step.value}</div>
                      <div
                        className={`w-full ${step.color} rounded-t-lg transition-all`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-sm font-semibold text-gray-600 mt-2 text-center">
                        {step.label}
                      </div>
                      {index > 0 && (
                        <div className="text-xs text-gray-500">
                          {maxVal > 0
                            ? `${((step.value / maxVal) * 100).toFixed(0)}%`
                            : '0%'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Abandoned Cart Stats */}
          {data?.abandoned && !data.abandoned.error && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Abandoned Cart Recovery</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-red-700">Total Abandoned</div>
                  <div className="text-3xl font-bold text-red-600">{data.abandoned.total}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-blue-700">With Email</div>
                  <div className="text-3xl font-bold text-blue-600">{data.abandoned.with_email}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-yellow-700">Emails Sent</div>
                  <div className="text-3xl font-bold text-yellow-600">{data.abandoned.emails_sent}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-green-700">Recovered</div>
                  <div className="text-3xl font-bold text-green-600">
                    {data.abandoned.recovered}
                    <span className="text-lg ml-2">({data.abandoned.recovery_rate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visitor Stats */}
          {data?.visitors && !data.visitors.error && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Visitor Analytics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-indigo-700">Sessions</div>
                  <div className="text-3xl font-bold text-indigo-600">{data.visitors.total_sessions}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-700">Unique Visitors</div>
                  <div className="text-3xl font-bold text-purple-600">{data.visitors.unique_visitors}</div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-teal-700">Started Booking</div>
                  <div className="text-3xl font-bold text-teal-600">
                    {data.visitors.started_booking}
                    <span className="text-lg ml-2">({data.visitors.booking_start_rate}%)</span>
                  </div>
                </div>
                <div className="bg-cyan-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-cyan-700">Avg Page Views</div>
                  <div className="text-3xl font-bold text-cyan-600">{data.visitors.avg_page_views}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top Referrers */}
          {data?.topReferrers && data.topReferrers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Referrers</h2>
              <div className="space-y-3">
                {data.topReferrers.map((ref, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                        {ref.referrer}
                      </span>
                    </div>
                    <span className="text-gray-600 font-bold">{ref.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device Breakdown */}
          {data?.deviceBreakdown && data.deviceBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Device Breakdown</h2>
              <div className="space-y-3">
                {data.deviceBreakdown.map((device, index) => {
                  const total = data.deviceBreakdown!.reduce((sum, d) => sum + d.count, 0);
                  const percent = total > 0 ? ((device.count / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-2xl">
                        {device.device_type === 'mobile' ? '📱' : device.device_type === 'tablet' ? '📟' : '💻'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 capitalize">{device.device_type || 'Unknown'}</span>
                          <span className="text-gray-600 font-bold">{device.count} ({percent}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Abandoned Carts */}
        {data?.recentAbandoned && data.recentAbandoned.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-red-50 border-b-2 border-red-200">
              <h2 className="text-xl font-bold text-red-900">Recent Abandoned Carts</h2>
              <p className="text-red-700 text-sm">Customers who started but didn&apos;t complete booking</p>
            </div>
            <div className="divide-y divide-gray-200">
              {data.recentAbandoned.map((cart) => (
                <div key={cart.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-gray-900">{cart.name || 'Unknown'}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStepColor(cart.step_reached)}`}>
                          {getStepLabel(cart.step_reached)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {cart.email && <span className="mr-4">{cart.email}</span>}
                        {cart.phone && <span className="mr-4">{cart.phone}</span>}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {cart.party_size && <span className="mr-4">{cart.party_size} guests</span>}
                        {cart.tour_date && (
                          <span>Wanted: {new Date(cart.tour_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Last activity: {formatDate(cart.last_activity_at)}
                      </div>
                      {cart.follow_up_sent_at ? (
                        <span className="text-xs text-green-600 font-semibold">
                          Follow-up sent {formatDate(cart.follow_up_sent_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-600 font-semibold">
                          No follow-up sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!data?.funnel || data.funnel.error) &&
         (!data?.abandoned || data.abandoned.error) &&
         (!data?.visitors || data.visitors.error) &&
         (!data?.revenue || data.revenue.error) && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Analytics Data Yet</h2>
            <p className="text-gray-600">
              Analytics data will appear here once visitors start using the booking system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
