/**
 * Geology Topics List Page
 *
 * View and manage all geology topics/articles.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  topic_type: string;
  difficulty: string;
  is_featured: boolean;
  is_published: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getTopics(): Promise<Topic[]> {
  try {
    const result = await query<Topic>(`
      SELECT id, slug, title, subtitle, topic_type, difficulty,
             is_featured, is_published, verified, created_at, updated_at
      FROM geology_topics
      ORDER BY display_order ASC, created_at DESC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function TopicTypeBadge({ type }: { type: string }) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    ice_age_floods: { label: 'Ice Age Floods', color: 'bg-blue-100 text-blue-800' },
    soil_types: { label: 'Soil Types', color: 'bg-amber-100 text-amber-800' },
    basalt: { label: 'Basalt', color: 'bg-gray-100 text-gray-800' },
    terroir: { label: 'Terroir', color: 'bg-purple-100 text-purple-800' },
    climate: { label: 'Climate', color: 'bg-sky-100 text-sky-800' },
    water: { label: 'Water', color: 'bg-cyan-100 text-cyan-800' },
    overview: { label: 'Overview', color: 'bg-green-100 text-green-800' },
    wine_connection: { label: 'Wine Connection', color: 'bg-rose-100 text-rose-800' },
  };

  const { label, color } = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    general: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[difficulty] || 'bg-gray-100 text-gray-800'}`}>
      {difficulty}
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function TopicsListPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const topics = await getTopics();

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
            <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Educational articles about Walla Walla geology
          </p>
        </div>
        <Link
          href="/admin/geology/topics/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
        >
          + New Topic
        </Link>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {topics.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-lg font-medium text-gray-900">No topics yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first topic to start building the geology knowledge base.
            </p>
            <Link
              href="/admin/geology/topics/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
            >
              Create First Topic
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {topic.is_featured && <span className="text-amber-500">★</span>}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{topic.title}</p>
                        {topic.subtitle && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{topic.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <TopicTypeBadge type={topic.topic_type} />
                  </td>
                  <td className="px-6 py-4">
                    <DifficultyBadge difficulty={topic.difficulty} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {topic.is_published ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Draft
                        </span>
                      )}
                      {topic.verified && (
                        <span className="text-green-600" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(topic.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/geology/topics/${topic.id}`}
                      className="text-[#722F37] hover:text-[#5a252c] text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
