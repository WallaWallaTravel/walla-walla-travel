'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface Task {
  id: number;
  title: string;
  due_date: string;
  priority: string;
}

interface DraftProposal {
  id: number;
  proposal_number: string;
  customer_name: string;
  created_at: string;
  trip_type: string;
  party_size: number;
  draft_reminders_enabled: boolean;
}

interface UpcomingTrip {
  id: number;
  proposal_number: string;
  customer_name: string;
  start_date: string;
  trip_type: string;
}

interface AdminReminder {
  id: number;
  reminder_type: string;
  message: string;
}

interface DigestData {
  overdueTasks: Task[];
  todayTasks: Task[];
  draftProposals: DraftProposal[];
  upcomingTrips: UpcomingTrip[];
  triggeredReminders: AdminReminder[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const TRIP_TYPE_LABELS: Record<string, string> = {
  wine_tour: 'Wine Tour',
  wine_group: 'Wine Group',
  multi_day_wine: 'Multi-Day Wine',
  celebration: 'Celebration',
  corporate: 'Corporate',
  wedding: 'Wedding',
  anniversary: 'Anniversary',
  family: 'Family',
  romantic: 'Romantic',
  birthday: 'Birthday',
  custom: 'Custom',
  other: 'Other',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysOld(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/today');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error('Failed to fetch today data', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const completeTask = async (taskId: number) => {
    setActionLoading(`task-complete-${taskId}`);
    try {
      const res = await fetch(`/api/admin/crm/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok && data) {
        setData({
          ...data,
          overdueTasks: data.overdueTasks.filter(t => t.id !== taskId),
          todayTasks: data.todayTasks.filter(t => t.id !== taskId),
        });
        setSuccessMessage('Task completed');
      }
    } catch (err) {
      logger.error('Failed to complete task', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const snoozeTask = async (taskId: number) => {
    setActionLoading(`task-snooze-${taskId}`);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/admin/crm/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: tomorrow }),
      });
      if (res.ok && data) {
        setData({
          ...data,
          overdueTasks: data.overdueTasks.filter(t => t.id !== taskId),
          todayTasks: data.todayTasks.filter(t => t.id !== taskId),
        });
        setSuccessMessage('Task snoozed to tomorrow');
      }
    } catch (err) {
      logger.error('Failed to snooze task', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteDraft = async (draftId: number) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setActionLoading(`draft-delete-${draftId}`);
    try {
      const res = await fetch(`/api/admin/trip-proposals/${draftId}`, { method: 'DELETE' });
      if (res.ok && data) {
        setData({
          ...data,
          draftProposals: data.draftProposals.filter(d => d.id !== draftId),
        });
        setSuccessMessage('Draft deleted');
      }
    } catch (err) {
      logger.error('Failed to delete draft', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const dismissReminder = async (reminderId: number) => {
    setActionLoading(`reminder-${reminderId}`);
    try {
      const res = await fetch(`/api/admin/reminders/${reminderId}/dismiss`, {
        method: 'POST',
      });
      if (res.ok && data) {
        setData({
          ...data,
          triggeredReminders: data.triggeredReminders.filter(r => r.id !== reminderId),
        });
        setSuccessMessage('Reminder dismissed');
      }
    } catch (err) {
      logger.error('Failed to dismiss reminder', { error: err });
    } finally {
      setActionLoading(null);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-10 bg-slate-200 rounded w-48" />
              <div className="h-16 bg-slate-200 rounded-xl" />
              <div className="h-16 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = data &&
    data.overdueTasks.length === 0 &&
    data.todayTasks.length === 0 &&
    data.draftProposals.length === 0 &&
    data.upcomingTrips.length === 0 &&
    data.triggeredReminders.length === 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/admin/dashboard" className="hover:text-slate-700">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-700">Today&apos;s Priorities</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Priorities</h1>
            <p className="text-sm text-slate-600 mt-1">{dateStr}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${data.overdueTasks.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
            <p className="text-sm text-slate-600">Overdue</p>
            <p className={`text-2xl font-bold mt-1 ${data.overdueTasks.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {data.overdueTasks.length}
            </p>
          </div>
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${data.todayTasks.length > 0 ? 'border-amber-200' : 'border-slate-200'}`}>
            <p className="text-sm text-slate-600">Today</p>
            <p className={`text-2xl font-bold mt-1 ${data.todayTasks.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {data.todayTasks.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-600">Drafts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.draftProposals.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-sm text-slate-600">Trips This Week</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.upcomingTrips.length}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">&#x2705;</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">All caught up!</h3>
          <p className="text-sm text-slate-600">No pending tasks, drafts, or upcoming trips. Enjoy your day.</p>
        </div>
      )}

      {data && !isEmpty && (
        <div className="space-y-6">
          {/* Overdue Tasks */}
          {data.overdueTasks.length > 0 && (
            <section>
              <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded-r-lg mb-3">
                <h2 className="text-base font-semibold text-red-800">
                  OVERDUE TASKS ({data.overdueTasks.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data.overdueTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-red-700">Due {formatDate(task.due_date)}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => completeTask(task.id)}
                          disabled={actionLoading === `task-complete-${task.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => snoozeTask(task.id)}
                          disabled={actionLoading === `task-snooze-${task.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                          Snooze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Today's Tasks */}
          {data.todayTasks.length > 0 && (
            <section>
              <div className="bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded-r-lg mb-3">
                <h2 className="text-base font-semibold text-amber-800">
                  TODAY&apos;S TASKS ({data.todayTasks.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data.todayTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-amber-700">Due today</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => completeTask(task.id)}
                          disabled={actionLoading === `task-complete-${task.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => snoozeTask(task.id)}
                          disabled={actionLoading === `task-snooze-${task.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                          Snooze
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Draft Proposals */}
          {data.draftProposals.length > 0 && (
            <section>
              <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 rounded-r-lg mb-3">
                <h2 className="text-base font-semibold text-blue-800">
                  DRAFT PROPOSALS ({data.draftProposals.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data.draftProposals.map(draft => {
                    const daysOld = getDaysOld(draft.created_at);
                    const isUntitled = draft.customer_name === 'Untitled Draft' || !draft.customer_name;
                    return (
                      <div key={draft.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isUntitled ? 'italic text-slate-500' : 'text-slate-900'}`}>
                            {draft.customer_name || 'Untitled Draft'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-600">{daysOld} days old</span>
                            <span className="text-xs text-slate-500">{TRIP_TYPE_LABELS[draft.trip_type] || draft.trip_type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => router.push(`/admin/trip-proposals/${draft.id}`)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDraft(draft.id)}
                            disabled={actionLoading === `draft-delete-${draft.id}`}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Upcoming Trips */}
          {data.upcomingTrips.length > 0 && (
            <section>
              <div className="bg-green-50 border-l-4 border-green-500 px-4 py-3 rounded-r-lg mb-3">
                <h2 className="text-base font-semibold text-green-800">
                  UPCOMING TRIPS ({data.upcomingTrips.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data.upcomingTrips.map(trip => (
                    <div key={trip.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{trip.customer_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-green-700">{formatDate(trip.start_date)}</span>
                          <span className="text-xs text-slate-500">{TRIP_TYPE_LABELS[trip.trip_type] || trip.trip_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/admin/trip-proposals/${trip.id}`)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Admin Reminders */}
          {data.triggeredReminders.length > 0 && (
            <section>
              <div className="bg-purple-50 border-l-4 border-purple-500 px-4 py-3 rounded-r-lg mb-3">
                <h2 className="text-base font-semibold text-purple-800">
                  ADMIN REMINDERS ({data.triggeredReminders.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {data.triggeredReminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{reminder.message}</p>
                        <span className="text-xs text-slate-500">{reminder.reminder_type}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          disabled={actionLoading === `reminder-${reminder.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
