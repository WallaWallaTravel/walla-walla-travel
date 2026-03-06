'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MetricsChart } from '@/components/marketing/MetricsChart';
import type {
  EventAnalyticsOverview,
  EventAnalyticsDailyTrend,
  EventAnalyticsByEvent,
  EventAnalyticsByCoordinator,
  EventAnalyticsByCategory,
  EventAnalyticsBySource,
} from '@/lib/types/events';

type Tab = 'overview' | 'by-event' | 'by-coordinator' | 'by-category' | 'by-source';
type DayRange = 30 | 60 | 90;

export default function EventsAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState<DayRange>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview data
  const [overview, setOverview] = useState<EventAnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<EventAnalyticsDailyTrend[]>([]);

  // Tab data
  const [byEvent, setByEvent] = useState<EventAnalyticsByEvent[]>([]);
  const [byCoordinator, setByCoordinator] = useState<EventAnalyticsByCoordinator[]>([]);
  const [byCategory, setByCategory] = useState<EventAnalyticsByCategory[]>([]);
  const [bySource, setBySource] = useState<EventAnalyticsBySource[]>([]);

  // Search/sort for by-event
  const [eventSearch, setEventSearch] = useState('');
  const [eventSort, setEventSort] = useState<'impressions' | 'click_throughs' | 'click_through_rate'>('impressions');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/marketing/events-analytics?days=${days}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = await res.json();
      setOverview(json.data.overview);
      setTrends(json.data.trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchTabData = useCallback(async (t: Tab) => {
    if (t === 'overview') return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/marketing/events-analytics/${t.replace('_', '-')}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = await res.json();
      switch (t) {
        case 'by-event': setByEvent(json.data); break;
        case 'by-coordinator': setByCoordinator(json.data); break;
        case 'by-category': setByCategory(json.data); break;
        case 'by-source': setBySource(json.data); break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (tab !== 'overview') {
      fetchTabData(tab);
    }
  }, [tab, fetchTabData]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'by-event', label: 'By Event' },
    { key: 'by-coordinator', label: 'By Coordinator' },
    { key: 'by-category', label: 'By Category' },
    { key: 'by-source', label: 'By Source' },
  ];

  const filteredEvents = byEvent
    .filter(e => !eventSearch || e.event_title.toLowerCase().includes(eventSearch.toLowerCase()))
    .sort((a, b) => b[eventSort] - a[eventSort]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Link href="/admin/marketing" className="hover:text-gray-900">Marketing Hub</Link>
              <span>/</span>
              <span className="text-gray-900">Events Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Events Analytics</h1>
            <p className="text-gray-700 mt-1">Track event impressions, click-throughs, and traffic attribution</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && !loading && overview && (
          <>
            {/* Hero Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Total Impressions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview.impressions.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Total Click-Throughs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview.click_throughs.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-600">Overall CTR</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{overview.click_through_rate}%</p>
              </div>
              <div className="bg-[#1E3A5F] rounded-xl p-6 text-white">
                <p className="text-sm font-medium text-blue-200">Traffic Facilitated</p>
                <p className="text-3xl font-bold mt-1">{overview.traffic_facilitated.toLocaleString()}</p>
                <p className="text-xs text-blue-200 mt-1">outbound clicks this period</p>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              {([30, 60, 90] as DayRange[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    days === d
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Impressions vs Click-Throughs</h2>
              {trends.length > 0 ? (
                <TrendChart data={trends} />
              ) : (
                <p className="text-sm text-gray-600 py-8 text-center">No data for this period</p>
              )}
            </div>
          </>
        )}

        {/* By Event Tab */}
        {tab === 'by-event' && !loading && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4">
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearch}
                onChange={e => setEventSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
              />
              <select
                value={eventSort}
                onChange={e => setEventSort(e.target.value as typeof eventSort)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] outline-none"
              >
                <option value="impressions">Sort by Impressions</option>
                <option value="click_throughs">Sort by Clicks</option>
                <option value="click_through_rate">Sort by CTR</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">No data available</td></tr>
                  ) : filteredEvents.map((ev, i) => (
                    <tr key={ev.event_id} className={`border-b border-gray-50 ${i < 10 ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/admin/events/${ev.event_id}/edit`} className="hover:text-[#1E3A5F] hover:underline">
                          {ev.event_title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ev.category_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{ev.event_date}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{ev.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{ev.click_throughs.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{ev.click_through_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Coordinator Tab */}
        {tab === 'by-coordinator' && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Coordinator</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Events</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Traffic Value</th>
                </tr>
              </thead>
              <tbody>
                {byCoordinator.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">No data available</td></tr>
                ) : byCoordinator.map(c => (
                  <tr key={c.coordinator_name} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.coordinator_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.total_events}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{c.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{c.click_throughs.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{c.click_through_rate}%</td>
                    <td className="px-4 py-3 text-right font-medium text-[#1E3A5F]">{c.traffic_value.toLocaleString()} clicks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* By Category Tab */}
        {tab === 'by-category' && !loading && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Impressions & Clicks by Category</h2>
              {byCategory.length > 0 ? (
                <MetricsChart
                  data={byCategory.map(c => ({
                    label: c.category_name,
                    value: c.impressions,
                  }))}
                  type="bar"
                  height={220}
                  showValues
                />
              ) : (
                <p className="text-sm text-gray-600 py-8 text-center">No data available</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">No data available</td></tr>
                  ) : byCategory.map(c => (
                    <tr key={c.category_name} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.category_name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{c.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{c.click_throughs.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{c.click_through_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* By Source Tab */}
        {tab === 'by-source' && !loading && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
              {bySource.length > 0 ? (
                <MetricsChart
                  data={bySource.map(s => ({
                    label: s.source,
                    value: s.impressions + s.click_throughs,
                  }))}
                  type="donut"
                  height={200}
                  showLegend
                />
              ) : (
                <p className="text-sm text-gray-600 py-8 text-center">No data available</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">No data available</td></tr>
                  ) : bySource.map(s => (
                    <tr key={s.source} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.source}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{s.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{s.click_throughs.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{s.click_through_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Dual-line trend chart using SVG (impressions + click-throughs)
 */
function TrendChart({ data }: { data: EventAnalyticsDailyTrend[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.impressions, d.click_throughs)), 1);
  const chartWidth = 700;
  const chartHeight = 200;
  const padding = { top: 10, right: 20, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
  const yScale = (v: number) => padding.top + innerHeight - (v / maxVal) * innerHeight;

  const impressionPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.impressions)}`).join(' ');
  const clickPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.click_throughs)}`).join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  // Label every ~7th date
  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div>
      <svg width="100%" height={chartHeight + 10} viewBox={`0 0 ${chartWidth} ${chartHeight + 10}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {gridLines.map((pct, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yScale(maxVal * pct)}
              x2={chartWidth - padding.right}
              y2={yScale(maxVal * pct)}
              stroke="#E5E7EB"
              strokeDasharray={pct === 0 ? 'none' : '4'}
            />
            <text
              x={padding.left - 8}
              y={yScale(maxVal * pct) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#9CA3AF"
            >
              {Math.round(maxVal * pct)}
            </text>
          </g>
        ))}

        {/* Impression line */}
        <path d={impressionPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Click-through line */}
        <path d={clickPath} fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <text
              key={i}
              x={xScale(i)}
              y={chartHeight + 5}
              textAnchor="middle"
              fontSize={10}
              fill="#6B7280"
            >
              {dateLabel}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-2 justify-center">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
          <span className="text-gray-700">Impressions</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-0.5 bg-amber-500 rounded-full" />
          <span className="text-gray-700">Click-Throughs</span>
        </div>
      </div>
    </div>
  );
}
