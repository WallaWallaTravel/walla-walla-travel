'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { CompetitiveAdvantage, CreateAdvantageInput, AdvantageCategory, AdvantageImportance } from '@/types/competitors';

export default function CompetitiveAdvantagesPage() {
  const [advantages, setAdvantages] = useState<CompetitiveAdvantage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<AdvantageCategory | 'all'>('all');

  const [newAdvantage, setNewAdvantage] = useState<CreateAdvantageInput>({
    title: '',
    description: '',
    category: 'service',
    importance: 'high',
    supporting_evidence: '',
    marketing_message: '',
    use_in_proposals: true,
    use_on_website: true,
  });

  const fetchAdvantages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/marketing/competitors/advantages');
      if (!response.ok) throw new Error('Failed to fetch advantages');
      const data = await response.json();
      setAdvantages(data.advantages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load advantages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvantages();
  }, [fetchAdvantages]);

  const handleAddAdvantage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvantage.title || !newAdvantage.description) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/marketing/competitors/advantages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdvantage),
      });

      if (!response.ok) throw new Error('Failed to add advantage');

      await fetchAdvantages();
      setShowAddModal(false);
      setNewAdvantage({
        title: '',
        description: '',
        category: 'service',
        importance: 'high',
        supporting_evidence: '',
        marketing_message: '',
        use_in_proposals: true,
        use_on_website: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add advantage');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: AdvantageCategory) => {
    const icons: Record<AdvantageCategory, string> = {
      service: '🎯',
      pricing: '💰',
      experience: '✨',
      technology: '💻',
      expertise: '🎓',
      location: '📍',
      vehicle: '🚐',
      partnership: '🤝',
      other: '📋',
    };
    return icons[category];
  };

  const getImportanceColor = (importance: AdvantageImportance) => {
    const colors: Record<AdvantageImportance, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[importance];
  };

  const filteredAdvantages = filter === 'all'
    ? advantages
    : advantages.filter(a => a.category === filter);

  const categories: AdvantageCategory[] = [
    'service', 'pricing', 'experience', 'technology', 'expertise', 'location', 'vehicle', 'partnership', 'other'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <Link href="/admin/marketing/competitors" className="hover:text-purple-600">Competitors</Link>
              <span>/</span>
              <span>Advantages</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Competitive Advantages</h1>
            <p className="text-gray-600 mt-1">Document and leverage your unique differentiators</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center gap-2"
          >
            <span>+</span> Add Advantage
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">✕</button>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All ({advantages.length})
          </button>
          {categories.map(cat => {
            const count = advantages.filter(a => a.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === cat ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        {/* Advantages Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredAdvantages.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No advantages documented yet</h3>
            <p className="text-gray-500 mb-4">Start documenting what makes you different from competitors</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
            >
              Add Your First Advantage
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredAdvantages.map(advantage => (
              <div key={advantage.id} className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${getImportanceColor(advantage.importance)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(advantage.category)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{advantage.title}</h3>
                      <span className="text-xs text-gray-500 capitalize">{advantage.category}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(advantage.importance)}`}>
                    {advantage.importance}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{advantage.description}</p>

                {advantage.supporting_evidence && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Evidence</p>
                    <p className="text-sm text-gray-700">{advantage.supporting_evidence}</p>
                  </div>
                )}

                {advantage.marketing_message && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs font-medium text-purple-700 uppercase mb-1">Marketing Message</p>
                    <p className="text-sm text-gray-700 italic">&ldquo;{advantage.marketing_message}&rdquo;</p>
                  </div>
                )}

                <div className="flex gap-2 text-xs">
                  {advantage.use_in_proposals && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">📄 Use in Proposals</span>
                  )}
                  {advantage.use_on_website && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded">🌐 Show on Website</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{advantages.length}</p>
            <p className="text-sm text-gray-500">Total Advantages</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-red-600">
              {advantages.filter(a => a.importance === 'critical').length}
            </p>
            <p className="text-sm text-gray-500">Critical Differentiators</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">
              {advantages.filter(a => a.use_in_proposals).length}
            </p>
            <p className="text-sm text-gray-500">Used in Proposals</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">
              {advantages.filter(a => a.use_on_website).length}
            </p>
            <p className="text-sm text-gray-500">Shown on Website</p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Competitive Advantage</h2>
            <form onSubmit={handleAddAdvantage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newAdvantage.title}
                  onChange={(e) => setNewAdvantage({ ...newAdvantage, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="e.g., Local ownership and expertise"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={newAdvantage.description}
                  onChange={(e) => setNewAdvantage({ ...newAdvantage, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  rows={3}
                  placeholder="Describe what makes this a competitive advantage..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                  <select
                    value={newAdvantage.category}
                    onChange={(e) => setNewAdvantage({ ...newAdvantage, category: e.target.value as AdvantageCategory })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Importance</label>
                  <select
                    value={newAdvantage.importance}
                    onChange={(e) => setNewAdvantage({ ...newAdvantage, importance: e.target.value as AdvantageImportance })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Supporting Evidence</label>
                <textarea
                  value={newAdvantage.supporting_evidence}
                  onChange={(e) => setNewAdvantage({ ...newAdvantage, supporting_evidence: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  rows={2}
                  placeholder="What proof do you have? Customer feedback, data, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Marketing Message</label>
                <input
                  type="text"
                  value={newAdvantage.marketing_message}
                  onChange={(e) => setNewAdvantage({ ...newAdvantage, marketing_message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600"
                  placeholder="How would you communicate this to customers?"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAdvantage.use_in_proposals}
                    onChange={(e) => setNewAdvantage({ ...newAdvantage, use_in_proposals: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include in proposals</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAdvantage.use_on_website}
                    onChange={(e) => setNewAdvantage({ ...newAdvantage, use_on_website: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show on website</span>
                </label>
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
                  {saving ? 'Adding...' : 'Add Advantage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
