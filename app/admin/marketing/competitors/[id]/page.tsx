'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import type {
  Competitor,
  CompetitorPricing,
  CompetitorSwot,
  CompetitorChange,
  SwotCategory,
  CreateSwotInput,
  PriorityLevel,
} from '@/types/competitors';

interface CompetitorDetail {
  competitor: Competitor;
  pricing: CompetitorPricing[];
  swot: CompetitorSwot[];
  recentChanges: CompetitorChange[];
}

export default function CompetitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitorId = params.id as string;

  const [data, setData] = useState<CompetitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'swot' | 'changes'>('overview');
  const [showAddSwotModal, setShowAddSwotModal] = useState(false);
  const [swotCategory, setSwotCategory] = useState<SwotCategory>('strength');
  const [newSwot, setNewSwot] = useState({ title: '', description: '', impact_level: 'medium' });
  const [saving, setSaving] = useState(false);

  // AI Analysis state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    overallThreat?: string;
    competitivePosition?: string;
    keyStrengths?: string[];
    keyWeaknesses?: string[];
    recommendedCounterStrategies?: string[];
    opportunities?: string[];
  } | null>(null);
  const [swotSuggestions, setSwotSuggestions] = useState<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/marketing/competitors/${competitorId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/marketing/competitors');
          return;
        }
        throw new Error('Failed to fetch competitor');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitor');
    } finally {
      setLoading(false);
    }
  }, [competitorId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSwot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSwot.title) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/marketing/competitors/${competitorId}/swot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: swotCategory,
          title: newSwot.title,
          description: newSwot.description,
          impact_level: newSwot.impact_level,
        } as Omit<CreateSwotInput, 'competitor_id'>),
      });

      if (!response.ok) throw new Error('Failed to add SWOT item');

      await fetchData();
      setShowAddSwotModal(false);
      setNewSwot({ title: '', description: '', impact_level: 'medium' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add SWOT item');
    } finally {
      setSaving(false);
    }
  };

  // AI Analysis functions
  const runAIAnalysis = async () => {
    try {
      setAiAnalyzing(true);
      setError(null);
      const response = await fetch('/api/admin/marketing/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'competitor',
          competitor_id: parseInt(competitorId),
        }),
      });

      if (!response.ok) throw new Error('AI analysis failed');

      const result = await response.json();
      setAiAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const getSwotSuggestions = async () => {
    try {
      setAiAnalyzing(true);
      setError(null);
      const response = await fetch('/api/admin/marketing/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'swot_suggestions',
          competitor_id: parseInt(competitorId),
        }),
      });

      if (!response.ok) throw new Error('Failed to get SWOT suggestions');

      const result = await response.json();
      setSwotSuggestions(result.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get SWOT suggestions');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    return colors[priority];
  };

  const getSwotColor = (category: SwotCategory) => {
    const colors: Record<SwotCategory, string> = {
      strength: 'bg-green-50 border-green-200',
      weakness: 'bg-red-50 border-red-200',
      opportunity: 'bg-blue-50 border-blue-200',
      threat: 'bg-orange-50 border-orange-200',
    };
    return colors[category];
  };

  const getSwotIcon = (category: SwotCategory) => {
    const icons: Record<SwotCategory, string> = {
      strength: '💪',
      weakness: '⚠️',
      opportunity: '🎯',
      threat: '🔥',
    };
    return icons[category];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800">{error || 'Competitor not found'}</p>
            <Link href="/admin/marketing/competitors" className="mt-4 inline-block text-orange-600 hover:text-orange-700">
              ← Back to Competitors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { competitor, pricing, swot, recentChanges } = data;

  // Group SWOT items by category
  const swotGrouped = {
    strength: swot.filter(s => s.category === 'strength'),
    weakness: swot.filter(s => s.category === 'weakness'),
    opportunity: swot.filter(s => s.category === 'opportunity'),
    threat: swot.filter(s => s.category === 'threat'),
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
            <span>/</span>
            <Link href="/admin/marketing/competitors" className="hover:text-purple-600">Competitors</Link>
            <span>/</span>
            <span>{competitor.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{competitor.name}</h1>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getPriorityColor(competitor.priority_level)}`}>
                  {competitor.priority_level} priority
                </span>
              </div>
              <p className="text-gray-600">{competitor.description}</p>
              <a
                href={competitor.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                {competitor.website_url} ↗
              </a>
            </div>

            <div className="text-right text-sm text-gray-500">
              <p>Last checked: {competitor.last_checked_at
                ? format(new Date(competitor.last_checked_at), 'MMM d, yyyy h:mm a')
                : 'Never'}</p>
              <p>Type: {competitor.competitor_type?.replace('_', ' ') || 'Tour operator'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          {(['overview', 'pricing', 'swot', 'changes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'changes' && recentChanges.filter(c => c.status === 'new').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {recentChanges.filter(c => c.status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Business Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Pricing Model</dt>
                  <dd className="text-gray-900">{competitor.pricing_model || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Minimum Booking</dt>
                  <dd className="text-gray-900">{competitor.min_booking || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Vehicle Types</dt>
                  <dd className="text-gray-900">
                    {competitor.vehicle_types?.join(', ') || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Check Frequency</dt>
                  <dd className="text-gray-900">{competitor.check_frequency?.replace('_', ' ') || 'Daily'}</dd>
                </div>
              </dl>
            </div>

            {/* Monitoring Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">What We Monitor</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${competitor.monitor_pricing ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-gray-700">Pricing changes</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${competitor.monitor_promotions ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-gray-700">Promotions</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${competitor.monitor_packages ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-gray-700">New packages</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded ${competitor.monitor_content ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-gray-700">Content changes</span>
                </label>
              </div>
            </div>

            {/* Recent Changes Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                <button onClick={() => setActiveTab('changes')} className="text-sm text-orange-600 hover:text-orange-700">
                  View All →
                </button>
              </div>
              {recentChanges.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No changes detected yet</p>
              ) : (
                <div className="space-y-2">
                  {recentChanges.slice(0, 3).map(change => (
                    <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{change.title}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(change.detected_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        change.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {change.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">AI Competitive Analysis</h3>
                <button
                  onClick={runAIAnalysis}
                  disabled={aiAnalyzing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      Run AI Analysis
                    </>
                  )}
                </button>
              </div>

              {aiAnalysis ? (
                <div className="space-y-4">
                  {/* Overall Threat */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Overall Threat Level:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      aiAnalysis.overallThreat === 'high' ? 'bg-red-100 text-red-700' :
                      aiAnalysis.overallThreat === 'medium' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {aiAnalysis.overallThreat?.toUpperCase()}
                    </span>
                  </div>

                  {/* Competitive Position */}
                  {aiAnalysis.competitivePosition && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Competitive Position</h4>
                      <p className="text-gray-900">{aiAnalysis.competitivePosition}</p>
                    </div>
                  )}

                  {/* Key Strengths & Weaknesses */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {aiAnalysis.keyStrengths && aiAnalysis.keyStrengths.length > 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="text-sm font-medium text-green-800 mb-2">Key Strengths</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.keyStrengths.map((s, i) => (
                            <li key={i} className="text-sm text-green-900 flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiAnalysis.keyWeaknesses && aiAnalysis.keyWeaknesses.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="text-sm font-medium text-red-800 mb-2">Key Weaknesses</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.keyWeaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-red-900 flex items-start gap-2">
                              <span className="text-red-600">•</span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Counter Strategies */}
                  {aiAnalysis.recommendedCounterStrategies && aiAnalysis.recommendedCounterStrategies.length > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-800 mb-2">Recommended Counter-Strategies</h4>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendedCounterStrategies.map((s, i) => (
                          <li key={i} className="text-sm text-purple-900 flex items-start gap-2">
                            <span className="text-purple-600 font-semibold">{i + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {aiAnalysis.opportunities && aiAnalysis.opportunities.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Opportunities</h4>
                      <ul className="space-y-1">
                        {aiAnalysis.opportunities.map((o, i) => (
                          <li key={i} className="text-sm text-blue-900 flex items-start gap-2">
                            <span className="text-blue-600">→</span>
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">Click &ldquo;Run AI Analysis&rdquo; to get strategic insights about this competitor.</p>
                  <p className="text-sm">Analysis includes threat assessment, strengths/weaknesses, and counter-strategies.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Known Pricing</h3>
            {pricing.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pricing data recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Price</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Comparable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pricing.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-gray-700 capitalize">{p.pricing_type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{p.pricing_name}</td>
                        <td className="px-4 py-3 text-gray-900 text-right font-semibold">
                          {p.price_amount ? `$${p.price_amount}` : '-'}
                          {p.price_unit && <span className="text-gray-500">/{p.price_unit}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.price_notes || '-'}</td>
                        <td className="px-4 py-3">
                          {p.comparable_to_nw_touring && (
                            <span className="text-xs text-orange-600">{p.nw_touring_equivalent || 'Yes'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'swot' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">SWOT Analysis</h3>
              <div className="flex gap-2">
                <button
                  onClick={getSwotSuggestions}
                  disabled={aiAnalyzing}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {aiAnalyzing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      <span>AI Suggestions</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddSwotModal(true)}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* AI SWOT Suggestions Panel */}
            {swotSuggestions && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                    <span>🤖</span> AI-Generated SWOT Suggestions
                  </h4>
                  <button
                    onClick={() => setSwotSuggestions(null)}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-sm text-purple-700 mb-4">
                  Click any suggestion to add it to your SWOT analysis.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Suggested Strengths */}
                  {swotSuggestions.strengths.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-800 mb-2">💪 Suggested Strengths</h5>
                      <ul className="space-y-1">
                        {swotSuggestions.strengths.map((s, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setSwotCategory('strength');
                              setNewSwot({ title: s, description: '', impact_level: 'medium' });
                              setShowAddSwotModal(true);
                            }}
                            className="text-sm text-green-900 bg-white rounded p-2 cursor-pointer hover:bg-green-100 transition-colors"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Suggested Weaknesses */}
                  {swotSuggestions.weaknesses.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-800 mb-2">⚠️ Suggested Weaknesses</h5>
                      <ul className="space-y-1">
                        {swotSuggestions.weaknesses.map((w, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setSwotCategory('weakness');
                              setNewSwot({ title: w, description: '', impact_level: 'medium' });
                              setShowAddSwotModal(true);
                            }}
                            className="text-sm text-red-900 bg-white rounded p-2 cursor-pointer hover:bg-red-100 transition-colors"
                          >
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Suggested Opportunities */}
                  {swotSuggestions.opportunities.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-800 mb-2">🎯 Suggested Opportunities (for us)</h5>
                      <ul className="space-y-1">
                        {swotSuggestions.opportunities.map((o, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setSwotCategory('opportunity');
                              setNewSwot({ title: o, description: '', impact_level: 'medium' });
                              setShowAddSwotModal(true);
                            }}
                            className="text-sm text-blue-900 bg-white rounded p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Suggested Threats */}
                  {swotSuggestions.threats.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-orange-800 mb-2">🔥 Suggested Threats (to us)</h5>
                      <ul className="space-y-1">
                        {swotSuggestions.threats.map((t, i) => (
                          <li
                            key={i}
                            onClick={() => {
                              setSwotCategory('threat');
                              setNewSwot({ title: t, description: '', impact_level: 'medium' });
                              setShowAddSwotModal(true);
                            }}
                            className="text-sm text-orange-900 bg-white rounded p-2 cursor-pointer hover:bg-orange-100 transition-colors"
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {(['strength', 'weakness', 'opportunity', 'threat'] as SwotCategory[]).map(category => (
                <div key={category} className={`rounded-xl p-4 border ${getSwotColor(category)}`}>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    {getSwotIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}s
                  </h4>
                  {swotGrouped[category].length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No items yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {swotGrouped[category].map(item => (
                        <li key={item.id} className="bg-white rounded-lg p-3">
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => {
                      setSwotCategory(category);
                      setShowAddSwotModal(true);
                    }}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    + Add {category}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="space-y-4">
            {recentChanges.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <p className="text-gray-500">No changes have been detected for this competitor yet.</p>
              </div>
            ) : (
              recentChanges.map(change => (
                <div key={change.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{change.title}</h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(change.detected_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {change.threat_level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          change.threat_level === 'high' ? 'bg-red-100 text-red-700' :
                          change.threat_level === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {change.threat_level} threat
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        change.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        change.status === 'actioned' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {change.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700">{change.description}</p>
                  {change.ai_analysis && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs font-medium text-purple-700 uppercase mb-1">AI Analysis</p>
                      <p className="text-sm text-gray-700">{change.ai_analysis}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add SWOT Modal */}
      {showAddSwotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add {swotCategory.charAt(0).toUpperCase() + swotCategory.slice(1)}
            </h2>
            <form onSubmit={handleAddSwot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                <select
                  value={swotCategory}
                  onChange={(e) => setSwotCategory(e.target.value as SwotCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="strength">Strength</option>
                  <option value="weakness">Weakness</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="threat">Threat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
                <input
                  type="text"
                  value={newSwot.title}
                  onChange={(e) => setNewSwot({ ...newSwot, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="Brief title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  value={newSwot.description}
                  onChange={(e) => setNewSwot({ ...newSwot, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  rows={3}
                  placeholder="More details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Impact Level</label>
                <select
                  value={newSwot.impact_level}
                  onChange={(e) => setNewSwot({ ...newSwot, impact_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSwotModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
