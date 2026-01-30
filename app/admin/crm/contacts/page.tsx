'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import type { CrmContactSummary, LifecycleStage, LeadTemperature } from '@/types/crm';

interface ContactsResponse {
  contacts: CrmContactSummary[];
  total: number;
  page: number;
  limit: number;
  stageCounts: Record<string, number>;
}

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  opportunity: 'Opportunity',
  customer: 'Customer',
  repeat_customer: 'Repeat Customer',
  lost: 'Lost',
};

const TEMPERATURE_COLORS: Record<LeadTemperature, { bg: string; text: string }> = {
  cold: { bg: 'bg-slate-100', text: 'text-slate-700' },
  warm: { bg: 'bg-amber-100', text: 'text-amber-700' },
  hot: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function CrmContactsPage() {
  const [contacts, setContacts] = useState<CrmContactSummary[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LifecycleStage | 'all'>('all');
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '' });
  const [isCreating, setIsCreating] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('lifecycle_stage', filter);

      const response = await fetch(`/api/admin/crm/contacts?${params.toString()}`);
      if (response.ok) {
        const data: ContactsResponse = await response.json();
        setContacts(data.contacts || []);
        setStageCounts(data.stageCounts || {});
        setTotal(data.total || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch contacts', { error });
    } finally {
      setIsLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.email) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (response.ok) {
        setShowNewContactModal(false);
        setNewContact({ name: '', email: '', phone: '', company: '' });
        fetchContacts();
      }
    } catch (error) {
      logger.error('Failed to create contact', { error });
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filterTabs: { key: LifecycleStage | 'all'; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: total },
    { key: 'lead', label: 'Leads', count: stageCounts.lead },
    { key: 'qualified', label: 'Qualified', count: stageCounts.qualified },
    { key: 'opportunity', label: 'Opportunities', count: stageCounts.opportunity },
    { key: 'customer', label: 'Customers', count: stageCounts.customer },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Link href="/admin/crm" className="hover:text-[#8B1538]">CRM</Link>
            <span>/</span>
            <span>Contacts</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        </div>
        <button
          onClick={() => setShowNewContactModal(true)}
          className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-medium transition-colors"
        >
          + New Contact
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
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
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <div className="text-4xl mb-4">📇</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No contacts found</h3>
          <p className="text-slate-600 mb-4">
            {search ? 'Try adjusting your search terms' : 'Get started by adding your first contact'}
          </p>
          {!search && (
            <button
              onClick={() => setShowNewContactModal(true)}
              className="px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg"
            >
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Temperature
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pipeline Value
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tasks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/crm/contacts/${contact.id}`} className="block">
                      <div className="font-medium text-slate-900 hover:text-[#8B1538]">
                        {contact.name}
                      </div>
                      <div className="text-sm text-slate-600">{contact.email}</div>
                      {contact.company && (
                        <div className="text-sm text-slate-500">{contact.company}</div>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      {LIFECYCLE_LABELS[contact.lifecycle_stage as LifecycleStage]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        TEMPERATURE_COLORS[contact.lead_temperature as LeadTemperature].bg
                      } ${TEMPERATURE_COLORS[contact.lead_temperature as LeadTemperature].text}`}
                    >
                      {contact.lead_temperature.charAt(0).toUpperCase() + contact.lead_temperature.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">
                      {formatCurrency(Number(contact.pipeline_value))}
                    </div>
                    {Number(contact.active_deals) > 0 && (
                      <div className="text-xs text-slate-500">{contact.active_deals} active deals</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatTimeAgo(contact.last_contacted_at)}
                  </td>
                  <td className="px-6 py-4">
                    {Number(contact.pending_tasks) > 0 ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {contact.pending_tasks} pending
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">New Contact</h2>
            </div>
            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewContactModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
