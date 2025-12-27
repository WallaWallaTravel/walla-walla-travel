/**
 * Admin Knowledge Base Dashboard
 *
 * Manage businesses, content contributions, and view KB statistics
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface KBStats {
  totalBusinesses: number;
  verifiedBusinesses: number;
  totalContributions: number;
  pendingReview: number;
  indexedContent: number;
  chatSessions: number;
  draftBookings: number;
  depositsCollected: number;
}

interface RecentContribution {
  id: number;
  title: string;
  content_type: string;
  status: string;
  business_name: string;
  created_at: string;
}

interface RecentChatSession {
  id: string;
  visitor_id: string;
  message_count: number;
  started_at: string;
  itinerary_generated: boolean;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getKBStats(): Promise<KBStats> {
  try {
    const [
      businessesResult,
      verifiedResult,
      contributionsResult,
      pendingResult,
      indexedResult,
      sessionsResult,
      bookingsResult,
      depositsResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM kb_businesses').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM kb_businesses WHERE verified = true').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query('SELECT COUNT(*) as count FROM kb_contributions').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query("SELECT COUNT(*) as count FROM kb_contributions WHERE status = 'in_review'").catch(
        () => ({ rows: [{ count: 0 }] })
      ),
      query("SELECT COUNT(*) as count FROM kb_contributions WHERE status = 'indexed'").catch(
        () => ({ rows: [{ count: 0 }] })
      ),
      query('SELECT COUNT(*) as count FROM kb_chat_sessions').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query('SELECT COUNT(*) as count FROM kb_draft_bookings').catch(() => ({
        rows: [{ count: 0 }],
      })),
      query("SELECT COUNT(*) as count FROM kb_draft_bookings WHERE status = 'deposit_paid'").catch(
        () => ({ rows: [{ count: 0 }] })
      ),
    ]);

    return {
      totalBusinesses: parseInt(businessesResult.rows[0]?.count || '0'),
      verifiedBusinesses: parseInt(verifiedResult.rows[0]?.count || '0'),
      totalContributions: parseInt(contributionsResult.rows[0]?.count || '0'),
      pendingReview: parseInt(pendingResult.rows[0]?.count || '0'),
      indexedContent: parseInt(indexedResult.rows[0]?.count || '0'),
      chatSessions: parseInt(sessionsResult.rows[0]?.count || '0'),
      draftBookings: parseInt(bookingsResult.rows[0]?.count || '0'),
      depositsCollected: parseInt(depositsResult.rows[0]?.count || '0'),
    };
  } catch (error) {
    console.error('[KB Dashboard] Error fetching stats:', error);
    return {
      totalBusinesses: 0,
      verifiedBusinesses: 0,
      totalContributions: 0,
      pendingReview: 0,
      indexedContent: 0,
      chatSessions: 0,
      draftBookings: 0,
      depositsCollected: 0,
    };
  }
}

async function getRecentContributions(): Promise<RecentContribution[]> {
  try {
    const result = await query<RecentContribution>(`
      SELECT 
        c.id, c.title, c.content_type, c.status, c.created_at,
        b.name as business_name
      FROM kb_contributions c
      LEFT JOIN kb_businesses b ON c.business_id = b.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function getRecentChatSessions(): Promise<RecentChatSession[]> {
  try {
    const result = await query<RecentChatSession>(`
      SELECT id, visitor_id, message_count, started_at, itinerary_generated
      FROM kb_chat_sessions
      ORDER BY started_at DESC
      LIMIT 10
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
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    in_review: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    indexed: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    failed: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const typeIcons: Record<string, string> = {
    text: '📝',
    document: '📄',
    voice: '🎤',
    video: '🎬',
    image: '🖼️',
    url: '🔗',
  };

  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
      <span>{typeIcons[type] || '📎'}</span>
      <span className="capitalize">{type}</span>
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function KBDashboardPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const [stats, recentContributions, recentSessions] = await Promise.all([
    getKBStats(),
    getRecentContributions(),
    getRecentChatSessions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Knowledge Base</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage content, businesses, and monitor chat interactions
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/kb/businesses/new"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            + Add Business
          </Link>
          <Link
            href="/admin/kb/ingest"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + Add Content
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Businesses"
          value={stats.totalBusinesses}
          subtitle={`${stats.verifiedBusinesses} verified`}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Content Items"
          value={stats.totalContributions}
          subtitle={`${stats.indexedContent} indexed`}
          icon="📚"
          color="green"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          subtitle="Needs attention"
          icon="👀"
          color="amber"
        />
        <StatCard
          title="Chat Sessions"
          value={stats.chatSessions}
          subtitle={`${stats.draftBookings} draft bookings`}
          icon="💬"
          color="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Contributions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Contributions</h2>
            <Link href="/admin/kb/contributions" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentContributions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No contributions yet</p>
                <Link href="/admin/kb/ingest" className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
                  Add your first content →
                </Link>
              </div>
            ) : (
              recentContributions.map((contribution) => (
                <div key={contribution.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{contribution.title}</p>
                      <p className="text-sm text-gray-500">{contribution.business_name || 'Unknown business'}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <ContentTypeBadge type={contribution.content_type} />
                        <span className="text-xs text-gray-400">
                          {new Date(contribution.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={contribution.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Chat Sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Chat Sessions</h2>
            <Link href="/admin/kb/sessions" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No chat sessions yet</p>
                <p className="mt-1 text-sm">Sessions will appear when visitors use the chat</p>
              </div>
            ) : (
              recentSessions.map((session) => (
                <div key={session.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.visitor_id || 'Anonymous visitor'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                        <span>{session.message_count} messages</span>
                        <span>•</span>
                        <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {session.itinerary_generated && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Itinerary created
                      </span>
                    )}
                  </div>
                </div>
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
            href="/admin/kb/review"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">👀</span>
            <div>
              <p className="font-medium text-gray-900">Review Queue</p>
              <p className="text-sm text-gray-500">{stats.pendingReview} pending</p>
            </div>
          </Link>

          <Link
            href="/admin/kb/bookings"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium text-gray-900">Draft Bookings</p>
              <p className="text-sm text-gray-500">{stats.draftBookings} total</p>
            </div>
          </Link>

          <Link
            href="/admin/kb/analytics"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">View metrics</p>
            </div>
          </Link>

          <Link
            href="/kb/chat"
            target="_blank"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
          >
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-medium text-gray-900">Test Chat</p>
              <p className="text-sm text-gray-500">Try the assistant</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

