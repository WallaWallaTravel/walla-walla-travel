'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { PriceComparisonRow, PriorityLevel } from '@/types/competitors';

interface PriceComparisonResponse {
  nw_touring: PriceComparisonRow;
  competitors: PriceComparisonRow[];
  last_updated: string;
}

export default function PriceComparisonPage() {
  const [data, setData] = useState<PriceComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/marketing/competitors/comparison');
        if (!response.ok) throw new Error('Failed to fetch comparison data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    return colors[priority];
  };

  const formatPrice = (amount: number | null, unit: string | null) => {
    if (amount === null) return '-';
    if (unit === 'percent') return `${amount}%`;
    return `$${amount}${unit ? `/${unit}` : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Get all unique pricing types across all competitors
  const allPricingTypes = new Map<string, string>();
  [data.nw_touring, ...data.competitors].forEach((comp) => {
    comp.pricing?.forEach((p) => {
      allPricingTypes.set(p.name, p.type);
    });
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">
                Marketing
              </Link>
              <span>/</span>
              <Link href="/admin/marketing/competitors" className="hover:text-purple-600">
                Competitors
              </Link>
              <span>/</span>
              <span>Price Comparison</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Price Comparison Matrix</h1>
            <p className="text-gray-600 mt-1">Compare your pricing against competitors</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'table'
                  ? 'bg-orange-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setView('cards')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'cards'
                  ? 'bg-orange-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Card View
            </button>
          </div>
        </div>

        {view === 'table' ? (
          /* Table View */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">
                      Competitor
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Base Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Group Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Premium</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Group Discount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* NW Touring Row (highlighted) */}
                  <tr className="bg-orange-50">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-orange-50">
                      {data.nw_touring.competitor_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        YOU
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatPrice(
                        data.nw_touring.pricing?.find((p) => p.type === 'hourly_rate')?.amount ?? null,
                        data.nw_touring.pricing?.find((p) => p.type === 'hourly_rate')?.unit ?? null
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatPrice(
                        data.nw_touring.pricing?.find((p) => p.name.includes('Group'))?.amount ?? null,
                        data.nw_touring.pricing?.find((p) => p.name.includes('Group'))?.unit ?? null
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatPrice(
                        data.nw_touring.pricing?.find((p) => p.type === 'premium_package')?.amount ?? null,
                        data.nw_touring.pricing?.find((p) => p.type === 'premium_package')?.unit ?? null
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {data.nw_touring.pricing?.find((p) => p.type === 'group_discount')?.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">All-inclusive pricing</td>
                  </tr>

                  {/* Competitor Rows */}
                  {data.competitors.map((competitor) => {
                    const basePricing = competitor.pricing?.find(
                      (p) => p.type === 'hourly_rate' || p.type === 'per_person' || p.type === 'base_tour'
                    );
                    const groupPricing = competitor.pricing?.find(
                      (p) => p.name.toLowerCase().includes('group') || p.name.toLowerCase().includes('sprinter')
                    );
                    const premiumPricing = competitor.pricing?.find(
                      (p) => p.type === 'premium_package'
                    );
                    const groupDiscount = competitor.pricing?.find(
                      (p) => p.type === 'group_discount'
                    );

                    return (
                      <tr key={competitor.competitor_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                          <Link
                            href={`/admin/marketing/competitors/${competitor.competitor_id}`}
                            className="hover:text-orange-600"
                          >
                            {competitor.competitor_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(competitor.priority_level)}`}
                          >
                            {competitor.priority_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {basePricing ? formatPrice(basePricing.amount, basePricing.unit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {groupPricing ? formatPrice(groupPricing.amount, groupPricing.unit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {premiumPricing ? formatPrice(premiumPricing.amount, premiumPricing.unit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {groupDiscount?.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {basePricing?.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* NW Touring Card */}
            <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{data.nw_touring.competitor_name}</h3>
                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full font-medium">
                  YOUR PRICING
                </span>
              </div>
              <div className="space-y-3">
                {data.nw_touring.pricing?.map((pricing, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{pricing.name}</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(pricing.amount, pricing.unit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Cards */}
            {data.competitors.map((competitor) => (
              <div key={competitor.competitor_id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <Link
                    href={`/admin/marketing/competitors/${competitor.competitor_id}`}
                    className="font-bold text-gray-900 hover:text-orange-600"
                  >
                    {competitor.competitor_name}
                  </Link>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(competitor.priority_level)}`}
                  >
                    {competitor.priority_level}
                  </span>
                </div>
                <div className="space-y-3">
                  {competitor.pricing && competitor.pricing.length > 0 ? (
                    competitor.pricing.map((pricing, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{pricing.name}</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(pricing.amount, pricing.unit)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No pricing data available</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Understanding the Comparison</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Pricing Models</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <strong>Per Hour:</strong> Most common, allows flexibility
                </li>
                <li>
                  <strong>Per Person:</strong> Easier for customers to understand
                </li>
                <li>
                  <strong>Flat Rate:</strong> Simple, no surprises
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Hidden Costs to Watch</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <span className="text-red-600">⚠️</span> Some add 20% for fuel/gratuity
                </li>
                <li>
                  <span className="text-red-600">⚠️</span> Minimum hour requirements vary
                </li>
                <li>
                  <span className="text-green-600">✓</span> NW Touring: All-inclusive
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
