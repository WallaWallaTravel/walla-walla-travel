/**
 * AI Guidance List Page
 *
 * Manage AI guidance for the geology guide.
 * This is where the geologist can train and shape AI behavior.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Guidance {
  id: number;
  guidance_type: string;
  title: string | null;
  content: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getGuidance(): Promise<Guidance[]> {
  try {
    const result = await query<Guidance>(`
      SELECT id, guidance_type, title, content, priority, is_active, created_at, updated_at
      FROM geology_ai_guidance
      ORDER BY priority DESC, created_at ASC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function GuidanceTypeBadge({ type }: { type: string }) {
  const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
    personality: { label: 'Personality', color: 'bg-purple-100 text-purple-800', icon: '🎭' },
    key_themes: { label: 'Key Themes', color: 'bg-blue-100 text-blue-800', icon: '🎯' },
    common_questions: { label: 'Q&A', color: 'bg-green-100 text-green-800', icon: '❓' },
    corrections: { label: 'Corrections', color: 'bg-red-100 text-red-800', icon: '⚠️' },
    connections: { label: 'Connections', color: 'bg-amber-100 text-amber-800', icon: '🔗' },
    terminology: { label: 'Terminology', color: 'bg-cyan-100 text-cyan-800', icon: '📖' },
    emphasis: { label: 'Emphasis', color: 'bg-rose-100 text-rose-800', icon: '⭐' },
  };

  const { label, color, icon } = typeLabels[type] || {
    label: type,
    color: 'bg-gray-100 text-gray-800',
    icon: '📝',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function AIGuidancePage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const guidance = await getGuidance();

  // Group by type for organized display
  const groupedGuidance = guidance.reduce(
    (acc, item) => {
      const type = item.guidance_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, Guidance[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
              Geology
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">AI Guidance</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Train and shape how the AI geology guide responds to visitors
          </p>
        </div>
        <Link
          href="/admin/geology/ai-guidance/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
        >
          + Add Guidance
        </Link>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h3 className="font-medium text-blue-900">How AI Guidance Works</h3>
            <p className="mt-1 text-sm text-blue-800">
              The AI reads ALL your published content automatically. Use guidance entries to give it
              additional instructions on tone, common questions, corrections, and connections to
              emphasize. Higher priority entries are weighted more heavily.
            </p>
          </div>
        </div>
      </div>

      {/* Guidance List */}
      {guidance.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-12 text-center">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-lg font-medium text-gray-900">No guidance yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add guidance to shape how the AI responds to visitor questions.
          </p>
          <Link
            href="/admin/geology/ai-guidance/new"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
          >
            Add First Guidance
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedGuidance).map(([type, items]) => (
            <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <GuidanceTypeBadge type={type} />
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {!item.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                          {item.title && (
                            <span className="text-sm font-medium text-gray-900">
                              {item.title}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Priority: {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">
                          {item.content}
                        </p>
                      </div>
                      <Link
                        href={`/admin/geology/ai-guidance/${item.id}`}
                        className="text-[#722F37] hover:text-[#5a252c] text-sm font-medium whitespace-nowrap"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
