'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface ClickStat {
  property_id: number;
  property_name: string;
  property_slug: string;
  total_clicks: number;
  last_click_at: string;
}

interface PlatformBreakdown {
  platform: string;
  click_count: number;
}

interface ClickTrend {
  date: string;
  click_count: number;
}

interface AnalyticsData {
  total_clicks: number;
  click_stats: ClickStat[];
  platform_breakdown: PlatformBreakdown[];
  click_trends: ClickTrend[];
}

const DATE_RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LodgingAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.set('start_date', customStartDate);
        params.set('end_date', customEndDate);
      } else if (dateRange !== 'custom') {
        params.set('days', dateRange);
        // Calculate start_date for the API
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - parseInt(dateRange, 10));
        params.set('start_date', start.toISOString().split('T')[0]);
        params.set('end_date', now.toISOString().split('T')[0]);
      }

      const response = await fetch(`/api/admin/lodging/analytics?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch analytics', { error });
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (dateRange !== 'custom' || (customStartDate && customEndDate)) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, dateRange, customStartDate, customEndDate]);

  const maxTrendCount = analytics
    ? Math.max(...analytics.click_trends.map((t) => t.click_count), 1)
    : 1;

  const maxPlatformCount = analytics
    ? Math.max(...analytics.platform_breakdown.map((p) => p.click_count), 1)
    : 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/lodging')}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
        >
          &larr; Back to Lodging
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Lodging Analytics</h1>
        <p className="text-slate-500 mt-1">
          Track booking redirect clicks and property engagement
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setDateRange(range.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === range.value
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {range.label}
          </button>
        ))}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
            <span className="text-slate-500 text-sm">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading analytics...</div>
      ) : !analytics ? (
        <div className="p-8 text-center text-slate-500">No analytics data available.</div>
      ) : (
        <div className="space-y-6">
          {/* Total Clicks Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500 mb-1">Total Clicks</p>
            <p className="text-4xl font-bold text-slate-900">{analytics.total_clicks.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">
              {dateRange === 'custom'
                ? `${customStartDate} to ${customEndDate}`
                : `Last ${dateRange} days`}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Properties */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Properties</h2>
              {analytics.click_stats.length === 0 ? (
                <p className="text-sm text-slate-500">No click data available for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase py-2 pr-4">Property</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase py-2 px-2">Clicks</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase py-2 pl-2">Last Click</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.click_stats.map((stat) => (
                        <tr key={stat.property_id} className="hover:bg-slate-50">
                          <td className="py-2.5 pr-4">
                            <button
                              onClick={() => router.push(`/admin/lodging/${stat.property_id}`)}
                              className="text-sm font-medium text-[#1E3A5F] hover:text-[#2d4a6f]"
                            >
                              {stat.property_name}
                            </button>
                          </td>
                          <td className="text-right text-sm font-medium text-slate-900 py-2.5 px-2">
                            {stat.total_clicks}
                          </td>
                          <td className="text-right text-xs text-slate-500 py-2.5 pl-2">
                            {stat.last_click_at ? formatDateTime(stat.last_click_at) : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Platform Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Platform Breakdown</h2>
              {analytics.platform_breakdown.length === 0 ? (
                <p className="text-sm text-slate-500">No platform data available.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.platform_breakdown.map((platform) => {
                    const percentage = Math.round((platform.click_count / maxPlatformCount) * 100);
                    return (
                      <div key={platform.platform}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {platform.platform}
                          </span>
                          <span className="text-sm text-slate-500">
                            {platform.click_count} clicks
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-[#1E3A5F] h-2.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Click Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Click Trend (Daily)</h2>
            {analytics.click_trends.length === 0 ? (
              <p className="text-sm text-slate-500">No trend data available for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-48 min-w-[600px]">
                  {analytics.click_trends.map((trend) => {
                    const height = Math.max((trend.click_count / maxTrendCount) * 100, 2);
                    return (
                      <div
                        key={trend.date}
                        className="flex-1 flex flex-col items-center justify-end group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          {formatDate(trend.date)}: {trend.click_count} clicks
                        </div>
                        <div
                          className="w-full bg-[#1E3A5F] rounded-t transition-all hover:bg-[#2d4a6f]"
                          style={{ height: `${height}%`, minHeight: '2px' }}
                        />
                        {/* Show date label for every 7th bar */}
                        {analytics.click_trends.indexOf(trend) % 7 === 0 && (
                          <span className="text-xs text-slate-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                            {formatDate(trend.date)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
