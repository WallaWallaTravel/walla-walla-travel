'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INSIDER_TIP_TYPES } from '@/lib/config/content-types';

interface InsiderTip {
  id?: number;
  tip_type: string;
  title: string;
  content: string;
  is_featured: boolean;
  verified: boolean;
  created_at?: string;
}

interface TipTypeInfo {
  type: string;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  realExample?: string;
}

const TIP_TYPE_INFO: TipTypeInfo[] = [
  {
    type: INSIDER_TIP_TYPES.LOCALS_KNOW,
    label: 'What Locals Know',
    icon: '🏠',
    description: 'Secrets that only regulars know about',
    placeholder: 'The locals always ask for the barrel sample of our unreleased vintage...',
    realExample: 'Ask for the library list — we have bottles going back to 2003 that aren\'t on the regular menu.',
  },
  {
    type: INSIDER_TIP_TYPES.BEST_TIME,
    label: 'Best Time to Visit',
    icon: '⏰',
    description: 'When to come for the best experience',
    placeholder: 'Visit on Thursday afternoons when the winemaker leads tastings personally...',
    realExample: 'Friday afternoons from 2-4pm are magic — the winemaker often joins tastings and the light through the windows is incredible.',
  },
  {
    type: INSIDER_TIP_TYPES.WHAT_TO_ASK,
    label: 'What to Ask For',
    icon: '💬',
    description: 'Questions or requests visitors should make',
    placeholder: 'Ask to see the wine cave—we don\'t advertise it but love showing guests...',
    realExample: 'Ask about our single-vineyard Syrah — it\'s not on the tasting menu but we\'ll pour it if you ask.',
  },
  {
    type: INSIDER_TIP_TYPES.PAIRING,
    label: 'Food & Wine Pairing',
    icon: '🧀',
    description: 'Perfect pairings with your wines',
    placeholder: 'Our estate Syrah pairs perfectly with the aged gouda from next door...',
    realExample: 'Grab the charcuterie board from Olive and pick up our Tempranillo — they\'re neighbors and it shows.',
  },
  {
    type: INSIDER_TIP_TYPES.PHOTO_SPOT,
    label: 'Best Photo Spots',
    icon: '📸',
    description: 'Where to get that perfect shot',
    placeholder: 'The view from our upper deck at sunset is Instagram gold...',
    realExample: 'The arbor behind the tasting room at golden hour. Bring your camera.',
  },
  {
    type: INSIDER_TIP_TYPES.HIDDEN_GEM,
    label: 'Hidden Gems',
    icon: '💎',
    description: 'Off-menu items or secret spots',
    placeholder: 'We have a secret reserve list that we only share when asked...',
    realExample: 'There\'s a picnic table behind the barn with the best view of the Blue Mountains. Most people never find it.',
  },
  {
    type: INSIDER_TIP_TYPES.PRACTICAL,
    label: 'Practical Tips',
    icon: '📋',
    description: 'Parking, accessibility, logistics',
    placeholder: 'Park in the back lot for easier access to the tasting room...',
    realExample: 'We\'re dog-friendly with water bowls out front. Kids get grape juice in wine glasses — they love it.',
  },
];

export default function PartnerTipsPage() {
  const [tips, setTips] = useState<InsiderTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New tip form state
  const [newTip, setNewTip] = useState<Partial<InsiderTip>>({
    tip_type: INSIDER_TIP_TYPES.LOCALS_KNOW,
    title: '',
    content: '',
    is_featured: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTips() {
      try {
        const response = await fetch('/api/partner/tips');
        if (response.ok) {
          const data = await response.json();
          setTips(data.tips || []);
        }
      } catch (error) {
        console.error('Failed to load tips:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTips();
  }, []);

  async function handleSave() {
    if (!newTip.content || newTip.content.length < 20) {
      setMessage({ type: 'error', text: 'Please write at least 20 characters for your tip.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch('/api/partner/tips', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...newTip,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (editingId) {
          // Update existing tip in list
          setTips(prev => prev.map(t =>
            t.id === editingId ? { ...t, ...newTip, verified: false } : t
          ));
          setMessage({ type: 'success', text: 'Tip updated and submitted for review!' });
        } else {
          // Add new tip to list
          setTips(prev => [...prev, { ...newTip, id: data.id, verified: false } as InsiderTip]);
          setMessage({ type: 'success', text: 'Tip added and submitted for review!' });
        }

        // Reset form
        setNewTip({
          tip_type: INSIDER_TIP_TYPES.LOCALS_KNOW,
          title: '',
          content: '',
          is_featured: false,
        });
        setShowForm(false);
        setEditingId(null);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save tip' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this tip?')) return;

    try {
      const response = await fetch(`/api/partner/tips?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTips(prev => prev.filter(t => t.id !== id));
        setMessage({ type: 'success', text: 'Tip deleted.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete tip' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  }

  function startEdit(tip: InsiderTip) {
    setNewTip({
      tip_type: tip.tip_type,
      title: tip.title,
      content: tip.content,
      is_featured: tip.is_featured,
    });
    setEditingId(tip.id || null);
    setShowForm(true);
  }

  function cancelEdit() {
    setNewTip({
      tip_type: INSIDER_TIP_TYPES.LOCALS_KNOW,
      title: '',
      content: '',
      is_featured: false,
    });
    setEditingId(null);
    setShowForm(false);
  }

  function getTipTypeInfo(type: string): TipTypeInfo {
    return TIP_TYPE_INFO.find(t => t.type === type) || TIP_TYPE_INFO[0];
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const selectedTipType = getTipTypeInfo(newTip.tip_type || '');

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Insider Tips</h1>
      </div>

      {/* WHY THIS MATTERS - At the top! */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
            💎
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Why Share Your Secrets?</h2>
            <p className="text-slate-600 mt-2">
              This might feel counterintuitive—why give away your best stuff? But here&apos;s the thing:
              <strong> insider tips create loyalty.</strong> When visitors feel like they&apos;re getting
              special treatment, they become fans. They tell friends. They come back. They join wine clubs.
            </p>
            <div className="mt-4 p-3 bg-white/60 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Real example:</strong> &ldquo;Ask about our single-vineyard Syrah—it&apos;s not on the tasting
                menu but we&apos;ll pour it if you ask.&rdquo; <span className="text-amber-600">This tip alone has sold
                hundreds of cases because visitors feel special when they &ldquo;discover&rdquo; it.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {tips.length === 0
              ? 'No tips yet — add your first one below'
              : tips.length < 3
                ? `${tips.length} tip${tips.length > 1 ? 's' : ''} added — aim for at least 3`
                : `${tips.length} tips added — great job!`
            }
          </span>
          {tips.length >= 3 && <span className="text-emerald-500">✓</span>}
        </div>
        <Link
          href="/partner-portal/preview"
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          Preview how they look →
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add New Tip Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 w-full py-4 border-2 border-dashed border-amber-300 rounded-xl text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          <span className="font-medium">Add Insider Tip</span>
        </button>
      )}

      {/* New/Edit Tip Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? 'Edit Tip' : 'Add New Tip'}
            </h2>
            <button
              onClick={cancelEdit}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* Tip Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What kind of tip is this?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TIP_TYPE_INFO.map((tipType) => (
                <button
                  key={tipType.type}
                  type="button"
                  onClick={() => setNewTip({ ...newTip, tip_type: tipType.type })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    newTip.tip_type === tipType.type
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{tipType.icon}</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{tipType.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Real example for selected type */}
          {selectedTipType.realExample && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Example {selectedTipType.label.toLowerCase()}:</span>{' '}
                <span className="italic">&ldquo;{selectedTipType.realExample}&rdquo;</span>
              </p>
            </div>
          )}

          {/* Title (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-slate-400 font-normal">(optional — makes it scannable)</span>
            </label>
            <input
              type="text"
              value={newTip.title || ''}
              onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              placeholder="A short, catchy title for your tip..."
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Your Tip
            </label>
            <textarea
              value={newTip.content || ''}
              onChange={(e) => setNewTip({ ...newTip, content: e.target.value })}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none resize-none"
              placeholder={selectedTipType.placeholder}
            />
            <div className="flex justify-between mt-1 text-sm">
              <span className={newTip.content && newTip.content.length >= 20 ? 'text-emerald-600' : 'text-amber-600'}>
                {newTip.content && newTip.content.length >= 20 ? '✓ Ready to save' : `${20 - (newTip.content?.length || 0)} more characters needed`}
              </span>
              <span className="text-slate-400">{newTip.content?.length || 0}/500</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !newTip.content || newTip.content.length < 20}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingId ? 'Update Tip' : 'Add Tip'}
            </button>
          </div>
        </div>
      )}

      {/* Existing Tips */}
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-900">
          Your Tips {tips.length > 0 && <span className="text-slate-400 font-normal">({tips.length})</span>}
        </h2>

        {tips.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">💎</div>
            <p className="text-slate-600 font-medium">Share your first insider tip</p>
            <p className="text-slate-500 text-sm mt-1">
              What do you tell friends when they visit? That&apos;s your first tip.
            </p>
          </div>
        ) : (
          tips.map((tip) => {
            const typeInfo = getTipTypeInfo(tip.tip_type);
            return (
              <div
                key={tip.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-600">{typeInfo.label}</span>
                        {tip.verified ? (
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">Live</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">Pending</span>
                        )}
                      </div>
                      {tip.title && (
                        <h3 className="font-medium text-slate-900 mt-1">{tip.title}</h3>
                      )}
                      <p className="text-slate-600 mt-1">{tip.content}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(tip)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => tip.id && handleDelete(tip.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tip Ideas - Only show if they have less than 3 tips */}
      {tips.length < 3 && (
        <div className="mt-8 bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Need inspiration? Try these categories:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {TIP_TYPE_INFO.slice(0, 4).map((tipType) => (
              <button
                key={tipType.type}
                onClick={() => {
                  setNewTip({ ...newTip, tip_type: tipType.type });
                  setShowForm(true);
                }}
                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
              >
                <span>{tipType.icon}</span>
                <div>
                  <p className="font-medium text-slate-900">{tipType.label}</p>
                  <p className="text-xs text-slate-500">{tipType.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Celebration for 3+ tips */}
      {tips.length >= 3 && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-semibold text-emerald-900">You&apos;re sharing the good stuff!</h3>
          <p className="text-emerald-700 mt-1">
            {tips.length} insider tips will make visitors feel like VIPs.
          </p>
          <Link
            href="/partner-portal/preview"
            className="inline-block mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            See How They Look to Visitors →
          </Link>
        </div>
      )}
    </div>
  );
}
