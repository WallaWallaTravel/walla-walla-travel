'use client';

/**
 * Guidance Editor Component
 *
 * Client component for creating/editing AI guidance entries.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface GuidanceData {
  id?: number;
  guidance_type: string;
  title: string | null;
  content: string;
  priority: number;
  is_active: boolean;
}

interface GuidanceEditorProps {
  initialData?: GuidanceData;
  isEditing?: boolean;
}

const GUIDANCE_TYPES = [
  {
    value: 'personality',
    label: 'Personality & Tone',
    description: 'How should the AI present geological information? What voice should it use?',
    placeholder:
      'Be enthusiastic but accurate. Use analogies to make concepts accessible. Don\'t dumb things down - trust visitors are curious...',
  },
  {
    value: 'key_themes',
    label: 'Key Themes to Emphasize',
    description: 'What messages should come through consistently in AI responses?',
    placeholder:
      '1. The Missoula Floods were THE defining event\n2. Basalt + Loess + Caliche = Wine magic\n3. Every vineyard has a unique geological story...',
  },
  {
    value: 'common_questions',
    label: 'Common Questions & Ideal Answers',
    description: 'Train the AI on frequently asked questions and how to answer them.',
    placeholder:
      'Q: What makes Walla Walla soil special?\nA: The combination of ancient basalt floods, wind-blown loess deposits, and Ice Age flood sediments creates incredibly diverse soils...',
  },
  {
    value: 'corrections',
    label: 'Corrections & Misconceptions',
    description: 'What should the AI avoid saying or correct when visitors mention?',
    placeholder:
      "- Don't say \"volcanic soil\" - say \"basalt-derived\"\n- The floods weren't one event, they were repeated\n- Loess is NOT the same as silt...",
  },
  {
    value: 'connections',
    label: 'Wine-Geology Connections',
    description: 'How should the AI connect geological concepts to wine and taste?',
    placeholder:
      'When discussing basalt soils, mention how they create well-drained conditions that stress vines in a good way, concentrating flavors...',
  },
  {
    value: 'terminology',
    label: 'Terminology',
    description: 'Specific terms the AI should know how to explain.',
    placeholder:
      'Loess: Wind-blown silt deposits, not to be confused with regular silt. Pronounced "luss" or "lurss"...',
  },
  {
    value: 'emphasis',
    label: 'Points to Emphasize',
    description: 'Specific facts or ideas the AI should highlight when relevant.',
    placeholder:
      'This is one of the most geologically interesting wine regions in the world - always convey this sense of wonder...',
  },
];

// ============================================================================
// Component
// ============================================================================

export function GuidanceEditor({ initialData, isEditing = false }: GuidanceEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [guidanceType, setGuidanceType] = useState(initialData?.guidance_type || 'personality');
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [priority, setPriority] = useState(initialData?.priority || 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const selectedType = GUIDANCE_TYPES.find((t) => t.value === guidanceType) || GUIDANCE_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      guidance_type: guidanceType,
      title: title || null,
      content,
      priority,
      is_active: isActive,
    };

    try {
      const url = isEditing
        ? `/api/admin/geology/guidance/${initialData?.id}`
        : '/api/admin/geology/guidance';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save guidance');
      }

      router.push('/admin/geology/ai-guidance');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this guidance entry?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/geology/guidance/${initialData?.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete guidance');
      }

      router.push('/admin/geology/ai-guidance');
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
          <Link href="/admin/geology/ai-guidance" className="text-gray-500 hover:text-gray-700">
            AI Guidance
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{isEditing ? 'Edit' : 'New'}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Guidance' : 'New Guidance'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guidance Type</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={guidanceType}
                onChange={(e) => setGuidanceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              >
                {GUIDANCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">{selectedType.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                placeholder="Brief label for this guidance entry..."
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guidance Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent font-mono text-sm"
              placeholder={selectedType.placeholder}
            />
            <p className="mt-1 text-xs text-gray-500">
              Write naturally. This will be injected into the AI&apos;s system prompt.
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher priority entries are weighted more heavily (0-100).
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#722F37] border-gray-300 rounded focus:ring-[#722F37]"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="ml-6 text-xs text-gray-500">
                Only active guidance is used by the AI.
              </p>
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
                Delete Guidance
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/geology/ai-guidance"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-6 py-2 bg-[#722F37] text-white rounded-lg text-sm font-medium hover:bg-[#5a252c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Guidance'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
