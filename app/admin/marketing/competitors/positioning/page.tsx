'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { CompetitorWithChanges, PriorityLevel } from '@/types/competitors';

export default function PositioningPage() {
  const [competitors, setCompetitors] = useState<CompetitorWithChanges[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/marketing/competitors');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setCompetitors(data.competitors.filter((c: CompetitorWithChanges) => c.competitor_type === 'tour_operator'));
      } catch {
        console.error('Failed to load competitors');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-gray-400',
    };
    return colors[priority];
  };

  // Mock positioning data - in reality this would come from pricing/service analysis
  const positioningData = [
    { name: 'NW Touring', price: 'Premium', service: 'Full-Service', x: 75, y: 85, isUs: true },
    { name: 'Black Tie Wine Tours', price: 'Premium', service: 'Traditional', x: 70, y: 60, isUs: false },
    { name: "d'Vine Wine Tour", price: 'Mid-Range', service: 'Value-Focused', x: 45, y: 75, isUs: false },
    { name: 'Tesla Winery Tours', price: 'Premium', service: 'Niche (Eco)', x: 80, y: 55, isUs: false },
    { name: 'The Touring Company', price: 'Mid-Range', service: 'Flexible', x: 55, y: 65, isUs: false },
    { name: 'Winery Tours WW', price: 'Budget', service: 'Basic', x: 30, y: 45, isUs: false },
    { name: 'Bacchus & Barley', price: 'Mid-Range', service: 'Unique (Dog)', x: 50, y: 50, isUs: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
            <span>/</span>
            <Link href="/admin/marketing/competitors" className="hover:text-purple-600">Competitors</Link>
            <span>/</span>
            <span>Market Positioning</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Market Positioning Map</h1>
          <p className="text-gray-600 mt-1">Visualize where you stand in the competitive landscape</p>
        </div>

        {/* Positioning Map */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Price vs. Service Level</h2>

          {loading ? (
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
          ) : (
            <div className="relative h-96 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-white">
              {/* Axis Labels */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-gray-500 font-medium" style={{ left: '-30px' }}>
                Service Level →
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm text-gray-500 font-medium" style={{ bottom: '-25px' }}>
                Price Point →
              </div>

              {/* Quadrant Labels */}
              <div className="absolute top-4 left-4 text-xs text-gray-400">Budget / Basic</div>
              <div className="absolute top-4 right-4 text-xs text-gray-400">Premium / Basic</div>
              <div className="absolute bottom-4 left-4 text-xs text-gray-400">Budget / Full-Service</div>
              <div className="absolute bottom-4 right-4 text-xs text-gray-400">Premium / Full-Service</div>

              {/* Grid Lines */}
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-0 right-0 border-t border-gray-200 border-dashed"></div>
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-gray-200 border-dashed"></div>
              </div>

              {/* Position Points */}
              {positioningData.map((item, idx) => (
                <div
                  key={idx}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${item.x}%`, top: `${100 - item.y}%` }}
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      item.isUs ? 'bg-orange-500 ring-4 ring-orange-200' : 'bg-blue-500'
                    } cursor-pointer`}
                  ></div>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded shadow-lg border border-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.price} • {item.service}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200"></div>
              <span className="text-sm text-gray-600">NW Touring (You)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-600">Competitors</span>
            </div>
          </div>
        </div>

        {/* Competitor List with Positioning Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Competitive Positioning Summary</h2>

          <div className="space-y-4">
            {/* NW Touring */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">NW Touring & Concierge</h3>
                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">YOUR POSITION</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Position:</strong> Premium full-service provider with local expertise
              </p>
              <p className="text-sm text-gray-600">
                <strong>Differentiation:</strong> All-inclusive pricing, owner-operated with deep local relationships,
                flexible customization, FMCSA-compliant operations
              </p>
            </div>

            {/* Competitors */}
            {competitors.slice(0, 6).map((competitor) => (
              <div key={competitor.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/admin/marketing/competitors/${competitor.id}`}
                    className="font-semibold text-gray-900 hover:text-orange-600"
                  >
                    {competitor.name}
                  </Link>
                  <span className={`w-3 h-3 rounded-full ${getPriorityColor(competitor.priority_level)}`}></span>
                </div>
                <p className="text-sm text-gray-600">
                  {competitor.description || 'No positioning notes available'}
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  {competitor.pricing_model && (
                    <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
                      {competitor.pricing_model}
                    </span>
                  )}
                  {competitor.min_booking && (
                    <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
                      Min: {competitor.min_booking}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Insights */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🎯 Positioning Opportunities</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Premium + Full-Service:</strong> Own the top-right quadrant with exceptional service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Local Expertise:</strong> Emphasize owner-operated, deep local knowledge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Transparent Pricing:</strong> All-inclusive vs. hidden fees competitors charge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Compliance Edge:</strong> Full FMCSA compliance differentiates from smaller operators</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">⚠️ Competitive Threats</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">!</span>
                <span><strong>Black Tie:</strong> 20+ years reputation, may compete on experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">!</span>
                <span><strong>d&apos;Vine:</strong> #1 TripAdvisor ranking, strong social proof</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">!</span>
                <span><strong>Budget operators:</strong> Price-sensitive customers may choose lower cost</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">!</span>
                <span><strong>Tesla Tours:</strong> Eco-conscious niche may attract premium customers</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
