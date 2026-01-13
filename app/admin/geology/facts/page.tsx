/**
 * Geology Facts List Page
 *
 * View and manage all geology facts.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Fact {
  id: number;
  fact_text: string;
  context: string | null;
  fact_type: string | null;
  topic_id: number | null;
  topic_title: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getFacts(): Promise<Fact[]> {
  try {
    const result = await query<Fact>(`
      SELECT f.id, f.fact_text, f.context, f.fact_type, f.topic_id,
             f.display_order, f.is_featured, f.created_at,
             t.title as topic_title
      FROM geology_facts f
      LEFT JOIN geology_topics t ON f.topic_id = t.id
      ORDER BY f.is_featured DESC, f.display_order ASC, f.created_at DESC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function FactTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;

  const typeLabels: Record<string, { label: string; color: string }> = {
    statistic: { label: 'Statistic', color: 'bg-blue-100 text-blue-800' },
    comparison: { label: 'Comparison', color: 'bg-purple-100 text-purple-800' },
    quote: { label: 'Quote', color: 'bg-amber-100 text-amber-800' },
    timeline: { label: 'Timeline', color: 'bg-green-100 text-green-800' },
    mind_blowing: { label: 'Mind-Blowing', color: 'bg-red-100 text-red-800' },
    wine_connection: { label: 'Wine Connection', color: 'bg-rose-100 text-rose-800' },
  };

  const { label, color } = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function FactsListPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const facts = await getFacts();

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
            <h1 className="text-2xl font-bold text-gray-900">Facts</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Quick, shareable geology facts and highlights
          </p>
        </div>
        <Link
          href="/admin/geology/facts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
        >
          + New Fact
        </Link>
      </div>

      {/* Facts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {facts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">💡</p>
            <p className="text-lg font-medium text-gray-900">No facts yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Add quick, memorable facts that visitors will remember.
            </p>
            <Link
              href="/admin/geology/facts/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
            >
              Create First Fact
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {facts.map((fact) => (
              <div key={fact.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {fact.is_featured && <span className="text-amber-500">★</span>}
                      <FactTypeBadge type={fact.fact_type} />
                      {fact.topic_title && (
                        <span className="text-xs text-gray-500">
                          in {fact.topic_title}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {fact.fact_text}
                    </p>
                    {fact.context && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                        {fact.context}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/geology/facts/${fact.id}`}
                    className="text-[#722F37] hover:text-[#5a252c] text-sm font-medium whitespace-nowrap"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
