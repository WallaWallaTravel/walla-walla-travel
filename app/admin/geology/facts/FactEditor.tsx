'use client';

/**
 * Fact Editor Component
 *
 * Client component for creating/editing geology facts.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id: number;
  title: string;
}

interface FactData {
  id?: number;
  fact_text: string;
  context: string | null;
  fact_type: string | null;
  topic_id: number | null;
  display_order: number;
  is_featured: boolean;
}

interface FactEditorProps {
  initialData?: FactData;
  isEditing?: boolean;
}

const FACT_TYPES = [
  { value: '', label: 'No type' },
  { value: 'statistic', label: 'Statistic' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'quote', label: 'Quote' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'mind_blowing', label: 'Mind-Blowing' },
  { value: 'wine_connection', label: 'Wine Connection' },
];

// ============================================================================
// Component
// ============================================================================

export function FactEditor({ initialData, isEditing = false }: FactEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Form state
  const [factText, setFactText] = useState(initialData?.fact_text || '');
  const [context, setContext] = useState(initialData?.context || '');
  const [factType, setFactType] = useState(initialData?.fact_type || '');
  const [topicId, setTopicId] = useState<string>(initialData?.topic_id?.toString() || '');
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order || 0);
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured || false);

  // Fetch topics for dropdown
  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch('/api/admin/geology/topics');
        if (res.ok) {
          const data = await res.json();
          setTopics(data.data.topics || []);
        }
      } catch {
        // Ignore - topics are optional
      }
    }
    fetchTopics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      fact_text: factText,
      context: context || null,
      fact_type: factType || null,
      topic_id: topicId ? parseInt(topicId) : null,
      display_order: displayOrder,
      is_featured: isFeatured,
    };

    try {
      const url = isEditing
        ? `/api/admin/geology/facts/${initialData?.id}`
        : '/api/admin/geology/facts';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save fact');
      }

      router.push('/admin/geology/facts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this fact?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/geology/facts/${initialData?.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete fact');
      }

      router.push('/admin/geology/facts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
            Geology
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/geology/facts" className="text-gray-500 hover:text-gray-700">
            Facts
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{isEditing ? 'Edit' : 'New'}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Fact' : 'New Fact'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fact Text */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fact Content</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fact Text *
              </label>
              <textarea
                value={factText}
                onChange={(e) => setFactText(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="The Ice Age Floods deposited over 200 feet of sediment..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Keep it memorable and concise. This is what visitors will see.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="Additional explanation or source information..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Additional context shown on expansion or for AI to reference.
              </p>
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Classification</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fact Type
              </label>
              <select
                value={factType}
                onChange={(e) => setFactType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              >
                {FACT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              >
                <option value="">No topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-[#722F37] border-gray-300 rounded focus:ring-[#722F37]"
                />
                <span className="text-sm font-medium text-gray-700">Featured fact</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete Fact
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/geology/facts"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !factText.trim()}
              className="px-6 py-2 bg-[#722F37] text-white rounded-lg text-sm font-medium hover:bg-[#5a252c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Fact'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
