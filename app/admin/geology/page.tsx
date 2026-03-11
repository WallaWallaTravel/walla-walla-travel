/**
 * Geology Admin Dashboard
 *
 * Central hub for the geologist to manage all geology content.
 * Shows stats, recent activity, and quick actions.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface GeologyStats {
  totalTopics: number;
  publishedTopics: number;
  totalFacts: number;
  totalSites: number;
  totalTours: number;
  totalGuidance: number;
  chatMessages: number;
}

interface RecentTopic {
  id: number;
  title: string;
  topic_type: string;
  is_published: boolean;
  updated_at: string;
}

interface RecentFact {
  id: number;
  fact_text: string;
  fact_type: string | null;
  is_featured: boolean;
  created_at: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getGeologyStats(): Promise<GeologyStats> {
  try {
    const [
      topicsResult,
      publishedResult,
      factsResult,
      sitesResult,
      toursResult,
      guidanceResult,
      chatResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM geology_topics').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM geology_topics WHERE is_published = true').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query('SELECT COUNT(*) as count FROM geology_facts').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM geology_sites WHERE is_published = true').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query('SELECT COUNT(*) as count FROM geology_tours WHERE is_active = true').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query('SELECT COUNT(*) as count FROM geology_ai_guidance WHERE is_active = true').catch(
        () => ({ rows: [{ count: 0 }] })
      ),
      query('SELECT COUNT(*) as count FROM geology_chat_messages').catch(() => ({
        rows: [{ count: 0 }],
      })),
    ]);

    return {
      totalTopics: parseInt(topicsResult.rows[0]?.count || '0'),
      publishedTopics: parseInt(publishedResult.rows[0]?.count || '0'),
      totalFacts: parseInt(factsResult.rows[0]?.count || '0'),
      totalSites: parseInt(sitesResult.rows[0]?.count || '0'),
      totalTours: parseInt(toursResult.rows[0]?.count || '0'),
      totalGuidance: parseInt(guidanceResult.rows[0]?.count || '0'),
      chatMessages: parseInt(chatResult.rows[0]?.count || '0'),
    };
  } catch (error) {
    logger.error('[Geology Dashboard] Error fetching stats', { error });
    return {
      totalTopics: 0,
      publishedTopics: 0,
      totalFacts: 0,
      totalSites: 0,
      totalTours: 0,
      totalGuidance: 0,
      chatMessages: 0,
    };
  }
}

async function getRecentTopics(): Promise<RecentTopic[]> {
  try {
    const result = await query<RecentTopic>(`
      SELECT id, title, topic_type, is_published, updated_at
      FROM geology_topics
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function getRecentFacts(): Promise<RecentFact[]> {
  try {
    const result = await query<RecentFact>(`
      SELECT id, fact_text, fact_type, is_featured, created_at
      FROM geology_facts
      ORDER BY created_at DESC
      LIMIT 5
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  href,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'stone';
  href?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    stone: 'bg-stone-100 text-stone-600',
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

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

function PublishBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
      Draft
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function GeologyDashboardPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const [stats, recentTopics, recentFacts] = await Promise.all([
    getGeologyStats(),
    getRecentTopics(),
    getRecentFacts(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geology Content Manager</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {session.user.name.split(' ')[0]}. Create and manage educational content about Walla Walla geology.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/geology/facts/new"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            + Quick Fact
          </Link>
          <Link
            href="/admin/geology/topics/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
          >
            + New Topic
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Topics"
          value={stats.totalTopics}
          subtitle={`${stats.publishedTopics} published`}
          icon="📚"
          color="blue"
          href="/admin/geology/topics"
        />
        <StatCard
          title="Quick Facts"
          value={stats.totalFacts}
          subtitle="Shareable highlights"
          icon="💡"
          color="amber"
          href="/admin/geology/facts"
        />
        <StatCard
          title="Sites"
          value={stats.totalSites}
          subtitle="Geological locations"
          icon="📍"
          color="green"
          href="/admin/geology/sites"
        />
        <StatCard
          title="AI Guidance"
          value={stats.totalGuidance}
          subtitle="Training rules active"
          icon="🧠"
          color="purple"
          href="/admin/geology/ai-guidance"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Tours"
          value={stats.totalTours}
          subtitle="Bookable experiences"
          icon="🚐"
          color="rose"
        />
        <StatCard
          title="Chat Messages"
          value={stats.chatMessages}
          subtitle="AI guide conversations"
          icon="💬"
          color="stone"
        />
      </div>

      {/* Getting Started Guide — shown when content is sparse */}
      {stats.totalTopics === 0 && stats.totalFacts === 0 && (
        <div className="bg-[#722F37]/5 border border-[#722F37]/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Getting Started</h2>
          <p className="text-sm text-gray-700 mb-4">
            This is where you build the geology content that powers the public website and the AI geology guide.
            Here&apos;s a suggested workflow:
          </p>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-semibold text-[#722F37]">1.</span>
              <span><strong>Topics</strong> — Write in-depth articles about Walla Walla geology (Ice Age Floods, basalt, terroir, etc.)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[#722F37]">2.</span>
              <span><strong>Quick Facts</strong> — Add memorable, shareable facts visitors will love</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[#722F37]">3.</span>
              <span><strong>Sites</strong> — Document the physical locations where geology is visible</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[#722F37]">4.</span>
              <span><strong>AI Guidance</strong> — Train the AI guide on tone, key themes, and terminology</span>
            </li>
          </ol>
          <p className="text-sm text-gray-600 mt-4">
            Everything starts as a <strong>Draft</strong>. When you&apos;re happy with it, click <strong>Publish</strong> to make it live.
          </p>
        </div>
      )}

      {/* Content Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Topics</h2>
            <Link href="/admin/geology/topics" className="text-sm text-[#722F37] hover:text-[#5a252c]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTopics.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p className="text-4xl mb-3">📚</p>
                <p className="font-medium">No topics yet</p>
                <Link
                  href="/admin/geology/topics/new"
                  className="mt-2 inline-block text-[#722F37] hover:text-[#5a252c] text-sm"
                >
                  Create your first topic
                </Link>
              </div>
            ) : (
              recentTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/admin/geology/topics/${topic.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{topic.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <TopicTypeBadge type={topic.topic_type} />
                        <span className="text-xs text-gray-400">
                          {new Date(topic.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <PublishBadge isPublished={topic.is_published} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Facts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Facts</h2>
            <Link href="/admin/geology/facts" className="text-sm text-[#722F37] hover:text-[#5a252c]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentFacts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p className="text-4xl mb-3">💡</p>
                <p className="font-medium">No facts yet</p>
                <Link
                  href="/admin/geology/facts/new"
                  className="mt-2 inline-block text-[#722F37] hover:text-[#5a252c] text-sm"
                >
                  Add your first fact
                </Link>
              </div>
            ) : (
              recentFacts.map((fact) => (
                <Link
                  key={fact.id}
                  href={`/admin/geology/facts/${fact.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-gray-900 line-clamp-2">{fact.fact_text}</p>
                    {fact.is_featured && (
                      <span className="flex-shrink-0 text-amber-500" title="Featured">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {fact.fact_type && (
                      <span className="text-xs text-gray-500 capitalize">{fact.fact_type}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(fact.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/geology/ai-guidance"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl">🧠</span>
            <div>
              <p className="font-medium text-gray-900">Train AI Guide</p>
              <p className="text-sm text-gray-500">Set tone, themes, and terminology</p>
            </div>
          </Link>

          <Link
            href="/admin/geology/sites"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📍</span>
            <div>
              <p className="font-medium text-gray-900">Add Site</p>
              <p className="text-sm text-gray-500">Viewpoints, formations, and more</p>
            </div>
          </Link>

          <div
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75 cursor-default"
            title="Tours management coming soon"
          >
            <span className="text-2xl">🚐</span>
            <div>
              <p className="font-medium text-gray-700">Tours</p>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
          </div>

          <Link
            href="/geology"
            target="_blank"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
          >
            <span className="text-2xl">👁️</span>
            <div>
              <p className="font-medium text-gray-900">Preview Public Site</p>
              <p className="text-sm text-gray-500">See what visitors see</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
