'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type {
  CompetitorWithChanges,
  CompetitorChangeWithName,
  CreateCompetitorInput,
  PriorityLevel,
} from '@/types/competitors';

export default function CompetitorMonitoring() {
  const [competitors, setCompetitors] = useState<CompetitorWithChanges[]>([]);
  const [changes, setChanges] = useState<CompetitorChangeWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [changesLoading, setChangesLoading] = useState(true);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorWithChanges | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new competitor
  const [newCompetitor, setNewCompetitor] = useState<CreateCompetitorInput>({
    name: '',
    website_url: '',
    description: '',
    priority_level: 'medium',
    monitor_pricing: true,
    monitor_promotions: true,
    monitor_packages: true,
    monitor_content: false,
  });

  // Fetch competitors
  const fetchCompetitors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/marketing/competitors');
      if (!response.ok) throw new Error('Failed to fetch competitors');
      const data = await response.json();
      setCompetitors(data.competitors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch changes
  const fetchChanges = useCallback(async () => {
    try {
      setChangesLoading(true);
      const response = await fetch('/api/admin/marketing/competitors/changes?limit=20');
      if (!response.ok) throw new Error('Failed to fetch changes');
      const data = await response.json();
      setChanges(data.changes);
    } catch (err) {
      console.error('Failed to load changes:', err);
    } finally {
      setChangesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
    fetchChanges();
  }, [fetchCompetitors, fetchChanges]);

  // Add new competitor
  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.name || !newCompetitor.website_url) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/marketing/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompetitor),
      });

      if (!response.ok) throw new Error('Failed to add competitor');

      const data = await response.json();
      setCompetitors([...competitors, { ...data.competitor, unreviewed_changes: 0 }]);
      setShowAddModal(false);
      setNewCompetitor({
        name: '',
        website_url: '',
        description: '',
        priority_level: 'medium',
        monitor_pricing: true,
        monitor_promotions: true,
        monitor_packages: true,
        monitor_content: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add competitor');
    } finally {
      setSaving(false);
    }
  };

  // Update change status
  const updateChangeStatus = async (changeId: number, status: string, actionTaken?: string) => {
    try {
      const response = await fetch(`/api/admin/marketing/competitors/changes/${changeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, action_taken: actionTaken }),
      });

      if (!response.ok) throw new Error('Failed to update change');

      // Refresh changes and competitors
      fetchChanges();
      fetchCompetitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update change');
    }
  };

  const getPriorityColor = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    return colors[priority] || colors.low;
  };

  const getChangeTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      pricing: '💰',
      promotion: '🎁',
      package: '📦',
      content: '📝',
      design: '🎨',
      new_offering: '🆕',
      discontinued: '❌',
    };
    return emojis[type] || '📋';
  };

  const getThreatColor = (threat: string | null) => {
    const colors: Record<string, string> = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-orange-600 bg-orange-50',
      low: 'text-yellow-600 bg-yellow-50',
      none: 'text-green-600 bg-green-50',
      opportunity: 'text-blue-600 bg-blue-50',
    };
    return colors[threat || 'none'] || colors.none;
  };

  const getSignificanceColor = (sig: string) => {
    const colors: Record<string, string> = {
      high: 'border-l-red-500',
      medium: 'border-l-yellow-500',
      low: 'border-l-gray-300',
    };
    return colors[sig] || colors.low;
  };

  const newChanges = changes.filter((c) => c.status === 'new');
  const filteredChanges = selectedCompetitor
    ? changes.filter((c) => c.competitor_id === selectedCompetitor.id)
    : changes;

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
              <span>Competitors</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Competitor Monitoring</h1>
            <p className="text-gray-600 mt-1">Track competitor pricing, promotions, and changes</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/marketing/competitors/comparison"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Price Comparison
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center gap-2"
            >
              <span>+</span> Add Competitor
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        )}

        {/* Alert Banner */}
        {newChanges.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-red-800">
                  {newChanges.length} New Competitor Change{newChanges.length !== 1 ? 's' : ''} Detected
                </p>
                <p className="text-sm text-red-600">
                  {newChanges.filter((c) => c.threat_level === 'high').length} high-threat changes
                  require attention
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCompetitor(null)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Review All
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Competitors List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Monitored Competitors</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="p-4 animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))
                ) : competitors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No competitors tracked yet.</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-2 text-orange-600 hover:text-orange-700"
                    >
                      Add your first competitor
                    </button>
                  </div>
                ) : (
                  competitors.map((competitor) => (
                    <div
                      key={competitor.id}
                      onClick={() =>
                        setSelectedCompetitor(
                          selectedCompetitor?.id === competitor.id ? null : competitor
                        )
                      }
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCompetitor?.id === competitor.id ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                        {competitor.unreviewed_changes > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {competitor.unreviewed_changes}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {competitor.description || competitor.website_url}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(competitor.priority_level)}`}
                        >
                          {competitor.priority_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {competitor.last_checked_at
                            ? format(new Date(competitor.last_checked_at), 'MMM d, h:mm a')
                            : 'Never checked'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Changes Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {selectedCompetitor ? `${selectedCompetitor.name} - Changes` : 'Recent Changes'}
              </h2>
              {selectedCompetitor && (
                <button
                  onClick={() => setSelectedCompetitor(null)}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  View All
                </button>
              )}
            </div>

            {changesLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))
            ) : filteredChanges.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No changes detected</h3>
                <p className="text-gray-500">
                  {selectedCompetitor
                    ? 'This competitor has no recent changes'
                    : 'All competitors are stable'}
                </p>
              </div>
            ) : (
              filteredChanges.map((change) => (
                <div
                  key={change.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 overflow-hidden ${getSignificanceColor(change.significance)}`}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getChangeTypeEmoji(change.change_type)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{change.competitor_name}</h3>
                          <p className="text-xs text-gray-500">
                            {format(new Date(change.detected_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {change.threat_level && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getThreatColor(change.threat_level)}`}
                          >
                            {change.threat_level === 'opportunity' ? 'opportunity' : `${change.threat_level} threat`}
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            change.status === 'new'
                              ? 'bg-blue-100 text-blue-700'
                              : change.status === 'reviewed'
                                ? 'bg-gray-100 text-gray-700'
                                : change.status === 'actioned'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {change.status}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-medium text-gray-900 mb-1">{change.title}</h4>
                    <p className="text-gray-700 mb-4">{change.description}</p>

                    {/* Before/After */}
                    {(change.previous_value || change.new_value) && (
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {change.previous_value && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs font-medium text-red-700 uppercase mb-1">
                              Before
                            </p>
                            <p className="text-sm text-gray-700">{change.previous_value}</p>
                          </div>
                        )}
                        {change.new_value && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs font-medium text-green-700 uppercase mb-1">
                              After
                            </p>
                            <p className="text-sm text-gray-700">{change.new_value}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {change.recommended_actions && change.recommended_actions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          🤖 AI Recommendations
                        </p>
                        <ul className="space-y-1">
                          {change.recommended_actions.map((action, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-700"
                            >
                              <span className="text-green-500 mt-0.5">✓</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {change.ai_analysis && (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs font-medium text-purple-700 uppercase mb-1">
                          Strategic Analysis
                        </p>
                        <p className="text-sm text-gray-700">{change.ai_analysis}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {change.status === 'new' && (
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => updateChangeStatus(change.id, 'reviewed')}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          ✅ Mark Reviewed
                        </button>
                        <button
                          onClick={() =>
                            updateChangeStatus(change.id, 'actioned', 'Action taken')
                          }
                          className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                        >
                          🎯 Take Action
                        </button>
                        <button
                          onClick={() => updateChangeStatus(change.id, 'dismissed')}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                        >
                          🚫 Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link
            href="/admin/marketing/competitors/comparison"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900">Price Comparison</h3>
            <p className="text-sm text-gray-500">Compare pricing across all competitors</p>
          </Link>
          <Link
            href="/admin/marketing/competitors/advantages"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">🏆</div>
            <h3 className="font-semibold text-gray-900">Our Advantages</h3>
            <p className="text-sm text-gray-500">Track your competitive differentiators</p>
          </Link>
          <Link
            href="/admin/marketing/competitors/positioning"
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">🗺️</div>
            <h3 className="font-semibold text-gray-900">Market Positioning</h3>
            <p className="text-sm text-gray-500">Visualize competitive landscape</p>
          </Link>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Competitor</h2>
            <form onSubmit={handleAddCompetitor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="Competitor name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={newCompetitor.website_url}
                  onChange={(e) =>
                    setNewCompetitor({ ...newCompetitor, website_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <input
                  type="text"
                  value={newCompetitor.description}
                  onChange={(e) =>
                    setNewCompetitor({ ...newCompetitor, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Priority</label>
                <select
                  value={newCompetitor.priority_level}
                  onChange={(e) =>
                    setNewCompetitor({
                      ...newCompetitor,
                      priority_level: e.target.value as PriorityLevel,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  What to Monitor
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCompetitor.monitor_pricing}
                      onChange={(e) =>
                        setNewCompetitor({ ...newCompetitor, monitor_pricing: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Pricing changes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCompetitor.monitor_promotions}
                      onChange={(e) =>
                        setNewCompetitor({ ...newCompetitor, monitor_promotions: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Promotions</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCompetitor.monitor_packages}
                      onChange={(e) =>
                        setNewCompetitor({ ...newCompetitor, monitor_packages: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">New packages</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCompetitor.monitor_content}
                      onChange={(e) =>
                        setNewCompetitor({ ...newCompetitor, monitor_content: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Content changes</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {saving ? 'Adding...' : 'Add Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
