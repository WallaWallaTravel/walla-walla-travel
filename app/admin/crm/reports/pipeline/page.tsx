'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface StageVelocity {
  stage_name: string;
  stage_color: string;
  sort_order: number;
  deals_in_stage: number;
  avg_days_in_stage: number;
  deals_moved_through: number;
}

interface HealthMetrics {
  total_open_deals: number;
  total_pipeline_value: number;
  deals_created_this_month: number;
  deals_won_this_month: number;
  deals_lost_this_month: number;
  win_rate: number;
  avg_deal_value: number;
}

interface StaleDeal {
  deal_id: number;
  deal_title: string;
  stage_name: string;
  days_in_stage: number;
  estimated_value: number;
  contact_name: string;
}

interface MonthlyFlow {
  month: string;
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  value_won: number;
}

interface PipelineData {
  time_to_close: {
    avg_days: number;
    deals_won: number;
    total_value: number;
  };
  stage_velocity: StageVelocity[];
  health_metrics: HealthMetrics;
  stale_deals: StaleDeal[];
  monthly_flow: MonthlyFlow[];
}

// ============================================================================
// Helpers
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStageColor = (color: string): string => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };
  return colors[color] || colors.slate;
};

// ============================================================================
// Component
// ============================================================================

export default function PipelineVelocityPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/crm/reports/pipeline-velocity');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch pipeline velocity data', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          <p className="text-slate-600">Failed to load pipeline velocity data</p>
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
            <Link href="/admin/crm/reports" className="hover:text-[#8B1538]">Reports</Link>
            <span>/</span>
            <span>Pipeline Velocity</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Velocity</h1>
          <p className="text-slate-600 mt-1">How fast deals move through your pipeline</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{data.health_metrics.total_open_deals}</div>
          <div className="text-sm text-slate-600">Open Deals</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(data.health_metrics.total_pipeline_value)}</div>
          <div className="text-sm text-slate-600">Pipeline Value</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{data.time_to_close.avg_days.toFixed(1)} days</div>
          <div className="text-sm text-slate-600">Avg Time to Close</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{data.health_metrics.win_rate}%</div>
          <div className="text-sm text-slate-600">Win Rate</div>
        </div>
      </div>

      {/* This Month Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="text-sm font-medium text-blue-700 mb-3">This Month</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-bold text-blue-800">{data.health_metrics.deals_created_this_month}</div>
            <div className="text-sm text-blue-600">Deals Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-700">{data.health_metrics.deals_won_this_month}</div>
            <div className="text-sm text-green-600">Deals Won</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-700">{data.health_metrics.deals_lost_this_month}</div>
            <div className="text-sm text-red-600">Deals Lost</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Stage Velocity */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Average Time in Each Stage</h2>
          <div className="space-y-3">
            {data.stage_velocity.map((stage, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-4 ${getStageColor(stage.stage_color)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className="text-lg font-bold">{stage.avg_days_in_stage.toFixed(1)} days</span>
                </div>
                <div className="flex items-center gap-4 text-sm opacity-75">
                  <span>{stage.deals_in_stage} deals currently</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stale Deals */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Deals at Risk
            <span className="text-sm font-normal text-slate-500 ml-2">(stale &gt; 14 days)</span>
          </h2>
          {data.stale_deals.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <span className="text-2xl">✅</span>
              <p className="text-green-700 mt-2">No stale deals - great job keeping things moving!</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Deal</th>
                    <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.stale_deals.slice(0, 5).map((deal) => (
                    <tr key={deal.deal_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-[200px]">
                          {deal.deal_title}
                        </div>
                        <div className="text-xs text-slate-500">{deal.contact_name}</div>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`font-medium ${deal.days_in_stage > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                          {Math.round(deal.days_in_stage)}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Flow Chart (Simple Table Version) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Deal Flow (Last 12 Months)</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Month</th>
                <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Created</th>
                <th className="text-center text-xs font-semibold text-green-600 px-4 py-3">Won</th>
                <th className="text-center text-xs font-semibold text-red-600 px-4 py-3">Lost</th>
                <th className="text-right text-xs font-semibold text-slate-600 px-4 py-3">Value Won</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.monthly_flow.map((month, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{month.month}</td>
                  <td className="text-center px-4 py-3 text-slate-700">{month.deals_created}</td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                      {month.deals_won}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-medium">
                      {month.deals_lost}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-slate-700">
                    {formatCurrency(month.value_won)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/crm/reports" className="text-[#8B1538] hover:underline">
          ← Lead Source Reports
        </Link>
        <Link href="/admin/crm" className="text-[#8B1538] hover:underline">
          Back to CRM Dashboard →
        </Link>
      </div>
    </div>
  );
}
