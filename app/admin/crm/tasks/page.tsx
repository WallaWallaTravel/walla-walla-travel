'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import type { CrmTaskWithRelations, TaskPriority, TaskStatus } from '@/types/crm';

interface TasksResponse {
  tasks: CrmTaskWithRelations[];
  overdue: number;
  dueToday: number;
  upcoming: number;
}

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; badge: string }> = {
  low: { bg: 'bg-slate-50', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  high: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  urgent: { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-48"></div><div className="h-64 bg-slate-200 rounded"></div></div></div>}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<CrmTaskWithRelations[]>([]);
  const [counts, setCounts] = useState({ overdue: 0, dueToday: 0, upcoming: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>(
    searchParams.get('overdue') === 'true' ? 'overdue' :
    searchParams.get('due_today') === 'true' ? 'today' : 'all'
  );
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'normal', contact_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'overdue') params.set('overdue', 'true');
      else if (filter === 'today') params.set('due_today', 'true');
      else if (filter === 'upcoming') params.set('upcoming', 'true');
      else if (filter === 'completed') params.set('status', 'completed');

      const response = await fetch(`/api/admin/crm/tasks?${params.toString()}`);
      if (response.ok) {
        const data: TasksResponse = await response.json();
        setTasks(data.tasks || []);
        setCounts({
          overdue: data.overdue || 0,
          dueToday: data.dueToday || 0,
          upcoming: data.upcoming || 0,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch tasks', { error });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = async (task: CrmTaskWithRelations) => {
    try {
      const response = await fetch(`/api/admin/crm/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: task.status === 'completed' ? 'pending' : 'completed',
        }),
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to update task', { error });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const response = await fetch(`/api/admin/crm/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to delete task', { error });
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateStr);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue`, isOverdue: true };
    if (diffDays === 0) return { text: 'Today', isOverdue: false, isToday: true };
    if (diffDays === 1) return { text: 'Tomorrow', isOverdue: false };
    if (diffDays < 7) return { text: `In ${diffDays} days`, isOverdue: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false };
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All Tasks' },
    { key: 'overdue' as const, label: 'Overdue', count: counts.overdue, color: 'text-red-600' },
    { key: 'today' as const, label: 'Due Today', count: counts.dueToday, color: 'text-amber-600' },
    { key: 'upcoming' as const, label: 'Upcoming', count: counts.upcoming },
    { key: 'completed' as const, label: 'Completed' },
  ];

  // Group tasks
  const groupedTasks = tasks.reduce((acc, task) => {
    const dueInfo = formatDueDate(task.due_date);
    let group = 'upcoming';
    if (task.status === 'completed') group = 'completed';
    else if (dueInfo.isOverdue) group = 'overdue';
    else if (dueInfo.isToday) group = 'today';

    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, CrmTaskWithRelations[]>);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Link href="/admin/crm" className="hover:text-[#8B1538]">CRM</Link>
            <span>/</span>
            <span>Tasks</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-medium"
        >
          + New Task
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl border ${counts.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {counts.overdue}
          </div>
          <div className="text-sm text-slate-600">Overdue</div>
        </div>
        <div className={`p-4 rounded-xl border ${counts.dueToday > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-2xl font-bold ${counts.dueToday > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {counts.dueToday}
          </div>
          <div className="text-sm text-slate-600">Due Today</div>
        </div>
        <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
          <div className="text-2xl font-bold text-slate-600">{counts.upcoming}</div>
          <div className="text-sm text-slate-600">Upcoming (7 days)</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-[#8B1538] text-[#8B1538]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 ${tab.color || ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {filter === 'completed' ? 'No completed tasks' : 'No tasks found'}
          </h3>
          <p className="text-slate-600 mb-4">
            {filter === 'overdue' ? 'Great job! No overdue tasks.' :
             filter === 'today' ? 'Nothing due today.' :
             'Create a task to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {groupedTasks.overdue && groupedTasks.overdue.length > 0 && filter !== 'completed' && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                OVERDUE ({groupedTasks.overdue.length})
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                {groupedTasks.overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {groupedTasks.today && groupedTasks.today.length > 0 && filter !== 'completed' && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                TODAY ({groupedTasks.today.length})
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                {groupedTasks.today.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming/Other Section */}
          {groupedTasks.upcoming && groupedTasks.upcoming.length > 0 && filter !== 'completed' && (
            <div>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                UPCOMING ({groupedTasks.upcoming.length})
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                {groupedTasks.upcoming.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {groupedTasks.completed && groupedTasks.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                COMPLETED ({groupedTasks.completed.length})
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                {groupedTasks.completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    formatDueDate={formatDueDate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Task Modal Placeholder */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create Task</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Tasks are created from contact or deal pages. Please navigate to a contact first.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <Link
                  href="/admin/crm/contacts"
                  className="flex-1 px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg text-center"
                >
                  Go to Contacts
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Task Row Component
function TaskRow({
  task,
  onToggleComplete,
  onDelete,
  formatDueDate,
}: {
  task: CrmTaskWithRelations;
  onToggleComplete: (task: CrmTaskWithRelations) => void;
  onDelete: (id: number) => void;
  formatDueDate: (date: string) => { text: string; isOverdue?: boolean; isToday?: boolean };
}) {
  const dueInfo = formatDueDate(task.due_date);
  const priorityColors = PRIORITY_COLORS[task.priority as TaskPriority];

  return (
    <div className={`p-4 hover:bg-slate-50 ${priorityColors.bg}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => onToggleComplete(task)}
          className="mt-1 h-5 w-5 rounded border-slate-300 text-[#8B1538] focus:ring-[#8B1538]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors.badge}`}>
              {task.priority.toUpperCase()}
            </span>
            <span
              className={`text-xs font-medium ${
                dueInfo.isOverdue ? 'text-red-600' :
                dueInfo.isToday ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {dueInfo.text}
            </span>
          </div>
          <div className={`font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {task.title}
          </div>
          {(task.contact_name || task.deal_title) && (
            <div className="text-sm text-slate-600 mt-1">
              {task.contact_name && (
                <Link href={`/admin/crm/contacts/${task.contact_id}`} className="hover:text-[#8B1538]">
                  {task.contact_name}
                </Link>
              )}
              {task.contact_name && task.deal_title && ' • '}
              {task.deal_title && <span>{task.deal_title}</span>}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="text-slate-400 hover:text-red-600 p-1"
          title="Delete task"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
