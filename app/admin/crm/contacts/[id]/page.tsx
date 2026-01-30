'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import type {
  CrmContactSummary,
  CrmDealWithRelations,
  CrmActivityWithUser,
  CrmTaskWithRelations,
  LifecycleStage,
  LeadTemperature,
  ActivityType,
} from '@/types/crm';

interface ContactDetailData {
  contact: CrmContactSummary;
  deals: CrmDealWithRelations[];
  activities: CrmActivityWithUser[];
  tasks: CrmTaskWithRelations[];
}

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  opportunity: 'Opportunity',
  customer: 'Customer',
  repeat_customer: 'Repeat Customer',
  lost: 'Lost',
};

const TEMPERATURE_COLORS: Record<LeadTemperature, { bg: string; text: string; border: string }> = {
  cold: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  hot: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

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

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [data, setData] = useState<ContactDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'deals' | 'tasks'>('overview');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newActivity, setNewActivity] = useState<{ activity_type: ActivityType; subject: string; body: string }>({
    activity_type: 'note',
    subject: '',
    body: '',
  });
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'normal' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/crm/contacts/${contactId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 404) {
        router.push('/admin/crm/contacts');
      }
    } catch (error) {
      logger.error('Failed to fetch contact', { error });
    } finally {
      setIsLoading(false);
    }
  }, [contactId, router]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/crm/contacts/${contactId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity),
      });
      if (response.ok) {
        setShowActivityModal(false);
        setNewActivity({ activity_type: 'note', subject: '', body: '' });
        fetchContact();
      }
    } catch (error) {
      logger.error('Failed to log activity', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          contact_id: parseInt(contactId),
          assigned_to: 1, // TODO: Get from session
        }),
      });
      if (response.ok) {
        setShowTaskModal(false);
        setNewTask({ title: '', due_date: '', priority: 'normal' });
        fetchContact();
      }
    } catch (error) {
      logger.error('Failed to create task', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-48 mb-8"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-64 bg-slate-200 rounded-xl"></div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">Contact not found</p>
          <Link href="/admin/crm/contacts" className="text-[#8B1538] hover:underline mt-4 inline-block">
            ← Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  const { contact, deals, activities, tasks } = data;
  const tempColors = TEMPERATURE_COLORS[contact.lead_temperature as LeadTemperature];

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <Link href="/admin/crm" className="hover:text-[#8B1538]">CRM</Link>
          <span>/</span>
          <Link href="/admin/crm/contacts" className="hover:text-[#8B1538]">Contacts</Link>
          <span>/</span>
          <span className="text-slate-900">{contact.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${tempColors.bg} ${tempColors.text} border ${tempColors.border}`}>
                {contact.lead_temperature.charAt(0).toUpperCase() + contact.lead_temperature.slice(1)} Lead
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                {LIFECYCLE_LABELS[contact.lifecycle_stage as LifecycleStage]}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowActivityModal(true)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              📝 Log Activity
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg"
            >
              ✅ Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setNewActivity({ activity_type: 'call', subject: 'Phone call', body: '' });
            setShowActivityModal(true);
          }}
          className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100"
        >
          📞 Log Call
        </button>
        <button
          onClick={() => {
            setNewActivity({ activity_type: 'email', subject: 'Email', body: '' });
            setShowActivityModal(true);
          }}
          className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100"
        >
          📧 Log Email
        </button>
        <button
          onClick={() => {
            setNewActivity({ activity_type: 'meeting', subject: 'Meeting', body: '' });
            setShowActivityModal(true);
          }}
          className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100"
        >
          🤝 Log Meeting
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(['overview', 'activity', 'deals', 'tasks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-[#8B1538] text-[#8B1538]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
            {tab === 'deals' && deals.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100">{deals.length}</span>
            )}
            {tab === 'tasks' && tasks.filter(t => t.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                {tasks.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {activeTab === 'overview' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-slate-500">Email</dt>
                  <dd className="text-slate-900">
                    <a href={`mailto:${contact.email}`} className="hover:text-[#8B1538]">{contact.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Phone</dt>
                  <dd className="text-slate-900">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="hover:text-[#8B1538]">{contact.phone}</a>
                    ) : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Company</dt>
                  <dd className="text-slate-900">{contact.company || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Source</dt>
                  <dd className="text-slate-900">{contact.source || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Lead Score</dt>
                  <dd className="text-slate-900">{contact.lead_score}/100</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Last Contacted</dt>
                  <dd className="text-slate-900">{formatTimeAgo(contact.last_contacted_at)}</dd>
                </div>
              </dl>

              {contact.notes && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Notes</h3>
                  <p className="text-slate-900 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
              </div>
              {activities.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No activities recorded yet</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{ACTIVITY_ICONS[activity.activity_type]}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">{activity.subject || activity.activity_type}</div>
                          {activity.body && (
                            <div className="text-sm text-slate-600 mt-1">{activity.body}</div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            {activity.performed_by_name && <span>{activity.performed_by_name} • </span>}
                            {formatTimeAgo(activity.performed_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Deals</h2>
                <Link
                  href={`/admin/crm/pipeline?contact_id=${contactId}`}
                  className="text-sm text-[#8B1538] hover:underline"
                >
                  + Create Deal
                </Link>
              </div>
              {deals.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No deals yet</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/admin/crm/pipeline?deal_id=${deal.id}`}
                      className="block p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{deal.title}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-${deal.stage_color}-100 text-${deal.stage_color}-700`}>
                              {deal.stage_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">
                            {deal.estimated_value ? formatCurrency(deal.estimated_value) : '-'}
                          </div>
                          {deal.expected_close_date && (
                            <div className="text-xs text-slate-500">
                              Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="text-sm text-[#8B1538] hover:underline"
                >
                  + Add Task
                </button>
              </div>
              {tasks.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No tasks</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => {
                            fetch(`/api/admin/crm/tasks/${task.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: task.status === 'completed' ? 'pending' : 'completed' }),
                            }).then(() => fetchContact());
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <div className="flex-1">
                          <div className={`font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                            {task.assigned_user_name && ` • ${task.assigned_user_name}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Summary</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-slate-600">Pipeline Value</dt>
                <dd className="font-semibold text-slate-900">{formatCurrency(Number(contact.pipeline_value))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Active Deals</dt>
                <dd className="font-semibold text-slate-900">{contact.active_deals}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Won Deals</dt>
                <dd className="font-semibold text-green-600">{contact.won_deals}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Total Revenue</dt>
                <dd className="font-semibold text-green-600">{formatCurrency(Number(contact.won_value))}</dd>
              </div>
            </dl>
          </div>

          {/* Upcoming Tasks */}
          {tasks.filter(t => t.status === 'pending').length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-4">Pending Tasks</h3>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'pending').slice(0, 3).map((task) => (
                  <div key={task.id} className="text-sm">
                    <div className="font-medium text-slate-900">{task.title}</div>
                    <div className="text-xs text-slate-500">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Log Activity</h2>
            </div>
            <form onSubmit={handleLogActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newActivity.activity_type}
                  onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value as ActivityType })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={newActivity.body}
                  onChange={(e) => setNewActivity({ ...newActivity, body: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create Task</h2>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Task <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Follow up on proposal"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
