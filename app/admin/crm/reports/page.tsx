'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface LeadSourceData {
  source: string;
  source_detail: string | null;
  total_leads: number;
  converted_to_customer: number;
  conversion_rate: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
}

interface TrendData {
  month: string;
  source: string;
  count: number;
}

interface ReportData {
  summary: {
    total_contacts: number;
    total_leads: number;
    total_customers: number;
    total_revenue: number;
    overall_conversion_rate: number;
  };
  by_source: LeadSourceData[];
  trends: TrendData[];
  top_sources_by_revenue: {
    source: string;
    total_revenue: number;
    customers: number;
  }[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${(value || 0).toFixed(1)}%`;
};

const SOURCE_LABELS: Record<string, string> = {
  booking_request: 'Booking Requests',
  experience_request: 'Experience Requests',
  website_contact: 'Contact Form',
  trip_proposal: 'Trip Proposals',
  corporate_request: 'Corporate Requests',
  booking: 'Direct Bookings',
  import: 'Imported',
  manual: 'Manual Entry',
  unknown: 'Unknown',
};

export default function LeadSourceReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | '12m'>('12m');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let params = '';
      const now = new Date();

      if (dateRange === '30d') {
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        params = `?from_date=${from.toISOString().split('T')[0]}`;
      } else if (dateRange === '90d') {
        const from = new Date(now);
        from.setDate(from.getDate() - 90);
        params = `?from_date=${from.toISOString().split('T')[0]}`;
      } else if (dateRange === '12m') {
        const from = new Date(now);
        from.setFullYear(from.getFullYear() - 1);
        params = `?from_date=${from.toISOString().split('T')[0]}`;
      }

      const response = await fetch(`/api/admin/crm/reports/lead-sources${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch lead source reports', { error });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Failed to load report data</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/crm" className="hover:text-[#8B1538]">CRM</Link>
            <span>/</span>
            <span>Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Source Analytics</h1>
          <p className="text-slate-600 mt-1">Understand where your customers come from</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          {[
            { value: '30d' as const, label: '30 Days' },
            { value: '90d' as const, label: '90 Days' },
            { value: '12m' as const, label: '12 Months' },
            { value: 'all' as const, label: 'All Time' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-[#8B1538] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{data.summary.total_contacts}</div>
          <div className="text-sm text-slate-600">Total Contacts</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{data.summary.total_leads}</div>
          <div className="text-sm text-slate-600">Active Leads</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{data.summary.total_customers}</div>
          <div className="text-sm text-slate-600">Customers</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">
            {formatPercent(data.summary.overall_conversion_rate)}
          </div>
          <div className="text-sm text-slate-600">Conversion Rate</div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8">
        <div className="text-sm font-medium text-green-700 mb-1">Total Revenue from CRM Contacts</div>
        <div className="text-3xl font-bold text-green-800">{formatCurrency(data.summary.total_revenue)}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Lead Sources Table */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Lead Sources Breakdown</h2>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Source</th>
                  <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Leads</th>
                  <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Conv.</th>
                  <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.by_source.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {SOURCE_LABELS[row.source] || row.source}
                      </div>
                      {row.source_detail && (
                        <div className="text-xs text-slate-500">{row.source_detail}</div>
                      )}
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className="font-medium text-slate-900">{row.total_leads}</span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-medium ${row.conversion_rate >= 20 ? 'text-green-600' : 'text-slate-700'}`}>
                        {formatPercent(row.conversion_rate)}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 text-slate-700">
                      {formatCurrency(row.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Sources by Revenue */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Sources by Revenue</h2>
          <div className="space-y-4">
            {data.top_sources_by_revenue.map((source, idx) => {
              const maxRevenue = data.top_sources_by_revenue[0]?.total_revenue || 1;
              const percentage = (source.total_revenue / maxRevenue) * 100;

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">
                      {SOURCE_LABELS[source.source] || source.source}
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(source.total_revenue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500">{source.customers} customers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lead Temperature Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Lead Temperature by Source</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Source</th>
                <th className="text-center text-xs font-semibold text-red-600 px-4 py-3">Hot</th>
                <th className="text-center text-xs font-semibold text-amber-600 px-4 py-3">Warm</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Cold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.by_source.slice(0, 8).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {SOURCE_LABELS[row.source] || row.source}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-medium">
                      {row.hot_leads}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium">
                      {row.warm_leads}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {row.cold_leads}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/crm" className="text-[#8B1538] hover:underline">
          ← Back to CRM Dashboard
        </Link>
        <Link href="/admin/crm/reports/pipeline" className="text-[#8B1538] hover:underline">
          Pipeline Velocity →
        </Link>
      </div>
    </div>
  );
}
