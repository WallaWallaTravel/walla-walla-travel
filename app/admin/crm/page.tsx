'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import type { CrmDashboardStats, CrmActivityWithUser, CrmTaskWithRelations } from '@/types/crm';

interface PipelineStage {
  stage_id: number;
  stage_name: string;
  stage_color: string;
  sort_order: number;
  deal_count: number;
  total_value: number;
  is_won: boolean;
  is_lost: boolean;
}

interface DashboardData {
  stats: CrmDashboardStats;
  pipelineOverview: PipelineStage[];
  recentActivities: (CrmActivityWithUser & { contact_name?: string; deal_title?: string })[];
  upcomingTasks: (CrmTaskWithRelations & { contact_name?: string; deal_title?: string })[];
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: '📞',
  email: '📧',
  meeting: '🤝',
  note: '📝',
  proposal_sent: '📤',
  proposal_viewed: '👁️',
  payment_received: '💰',
  system: '⚙️',
  status_change: '🔄',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  normal: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

export default function CrmDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/crm/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      logger.error('Failed to fetch CRM dashboard', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateStr);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    if (diffDays === 0) return { text: 'Today', isOverdue: false };
    if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false };
  };

  const getStageColor = (color: string) => {
    const colors: Record<string, string> = {
      slate: 'bg-slate-100 border-slate-300',
      blue: 'bg-blue-100 border-blue-300',
      indigo: 'bg-indigo-100 border-indigo-300',
      purple: 'bg-purple-100 border-purple-300',
      amber: 'bg-amber-100 border-amber-300',
      green: 'bg-green-100 border-green-300',
      red: 'bg-red-100 border-red-300',
    };
    return colors[color] || colors.slate;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, pipelineOverview, recentActivities, upcomingTasks } = data;
  const activeStages = pipelineOverview.filter(s => !s.is_won && !s.is_lost);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM Dashboard</h1>
          <p className="text-slate-600 mt-1">Track leads, deals, and customer relationships</p>
        </div>
        <Link
          href="/admin/crm/contacts"
          className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-medium transition-colors"
        >
          + New Contact
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.newLeadsThisMonth}</div>
          <div className="text-sm text-slate-600">New Leads This Month</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{stats.hotLeads}</div>
          <div className="text-sm text-slate-600">Hot Leads</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pipelineValue)}</div>
          <div className="text-sm text-slate-600">Pipeline Value</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.wonValueThisMonth)}</div>
          <div className="text-sm text-slate-600">Won This Month</div>
        </div>
      </div>

      {/* Task Alerts */}
      {(stats.overdueTasks > 0 || stats.tasksDueToday > 0) && (
        <div className="mb-8">
          <div className="flex gap-4">
            {stats.overdueTasks > 0 && (
              <Link
                href="/admin/crm/tasks?overdue=true"
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 hover:bg-red-100 transition-colors"
              >
                <span className="font-semibold">{stats.overdueTasks}</span> overdue tasks
              </Link>
            )}
            {stats.tasksDueToday > 0 && (
              <Link
                href="/admin/crm/tasks?due_today=true"
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <span className="font-semibold">{stats.tasksDueToday}</span> tasks due today
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline Overview</h2>
          <Link href="/admin/crm/pipeline" className="text-[#8B1538] hover:underline text-sm">
            View Pipeline Board →
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {activeStages.map((stage) => (
            <div
              key={stage.stage_id}
              className={`flex-1 min-w-[120px] p-4 rounded-lg border ${getStageColor(stage.stage_color)}`}
            >
              <div className="text-sm font-medium text-slate-700 truncate">{stage.stage_name}</div>
              <div className="text-2xl font-bold text-slate-900">{stage.deal_count}</div>
              <div className="text-sm text-slate-600">{formatCurrency(stage.total_value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Upcoming Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Tasks</h2>
            <Link href="/admin/crm/tasks" className="text-[#8B1538] hover:underline text-sm">
              View All →
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {upcomingTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No upcoming tasks</div>
            ) : (
              upcomingTasks.slice(0, 5).map((task) => {
                const dueInfo = formatDueDate(task.due_date);
                return (
                  <div key={task.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        onChange={() => {
                          fetch(`/api/admin/crm/tasks/${task.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'completed' }),
                          }).then(() => fetchDashboard());
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority === 'urgent' && '⚠️ '}
                            {task.priority.toUpperCase()}
                          </span>
                          <span
                            className={`text-xs ${dueInfo.isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}
                          >
                            {dueInfo.text}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 truncate">{task.title}</div>
                        {task.contact_name && (
                          <div className="text-sm text-slate-600">{task.contact_name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No recent activity</div>
            ) : (
              recentActivities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{ACTIVITY_ICONS[activity.activity_type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900">
                        {activity.subject || activity.activity_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {activity.contact_name && (
                          <span className="font-medium">{activity.contact_name}</span>
                        )}
                        {activity.contact_name && activity.performed_by_name && ' • '}
                        {activity.performed_by_name}
                        {' • '}
                        {formatTimeAgo(activity.performed_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/crm/contacts"
          className="flex flex-col items-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-[#8B1538] hover:shadow-md transition-all"
        >
          <span className="text-3xl">📇</span>
          <span className="font-medium text-slate-900">Contacts</span>
          <span className="text-sm text-slate-500">{stats.totalContacts} total</span>
        </Link>
        <Link
          href="/admin/crm/pipeline"
          className="flex flex-col items-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-[#8B1538] hover:shadow-md transition-all"
        >
          <span className="text-3xl">📊</span>
          <span className="font-medium text-slate-900">Pipeline</span>
          <span className="text-sm text-slate-500">{stats.openDeals} active deals</span>
        </Link>
        <Link
          href="/admin/crm/tasks"
          className="flex flex-col items-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-[#8B1538] hover:shadow-md transition-all"
        >
          <span className="text-3xl">✅</span>
          <span className="font-medium text-slate-900">Tasks</span>
          <span className="text-sm text-slate-500">
            {stats.overdueTasks > 0 ? (
              <span className="text-red-600">{stats.overdueTasks} overdue</span>
            ) : (
              `${stats.tasksDueToday} due today`
            )}
          </span>
        </Link>
        <Link
          href="/admin/leads"
          className="flex flex-col items-center gap-2 p-6 bg-white border border-slate-200 rounded-xl hover:border-[#8B1538] hover:shadow-md transition-all"
        >
          <span className="text-3xl">🎯</span>
          <span className="font-medium text-slate-900">Leads</span>
          <span className="text-sm text-slate-500">View all inquiries</span>
        </Link>
      </div>
    </div>
  );
}
