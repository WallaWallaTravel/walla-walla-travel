'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// Types
interface Business {
  id: number;
  name: string;
  business_type: string;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  short_description?: string;
  status: 'imported' | 'approved' | 'invited' | 'active' | 'rejected';
  invite_token?: string;
  invited_at?: string;
  invitation_email_sent: boolean;
  created_at: string;
}

interface StatusCounts {
  imported: number;
  approved: number;
  invited: number;
  active: number;
  rejected: number;
}

type TabType = 'review' | 'import';
type StatusFilter = 'imported' | 'approved' | 'invited' | 'active' | 'rejected' | 'all';

// Constants
const STATUS_COLORS: Record<string, string> = {
  imported: 'bg-slate-100 text-slate-700',
  approved: 'bg-blue-100 text-blue-800',
  invited: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const BUSINESS_TYPE_ICONS: Record<string, string> = {
  winery: '🍷',
  restaurant: '🍽️',
  hotel: '🏨',
  boutique: '🛍️',
  gallery: '🎨',
  activity: '🎯',
  other: '📍',
};

// Import Preview Row Component
interface ImportRow {
  name: string;
  business_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  short_description?: string;
}

export default function AdminDirectoryPage() {
  const [tab, setTab] = useState<TabType>('review');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ imported: 0, approved: 0, invited: 0, active: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('imported');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Import state
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    duplicates: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  // Fetch businesses
  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const response = await fetch(`/api/admin/directory?stats=true${statusParam}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses);
        if (data.stats?.byStatus) {
          setStatusCounts(data.stats.byStatus);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch businesses', { error });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (tab === 'review') {
      fetchBusinesses();
    }
  }, [tab, fetchBusinesses]);

  // Selection handlers
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === businesses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(businesses.map(b => b.id)));
    }
  };

  // Action handlers
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;

    setActionLoading(action);
    try {
      const response = await fetch('/api/admin/directory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        fetchBusinesses();
      } else {
        const data = await response.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      logger.error('Bulk action failed', { error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSingleAction = async (id: number, action: 'approve' | 'reject' | 'restore' | 'delete') => {
    setActionLoading(`${action}-${id}`);
    try {
      if (action === 'delete') {
        const response = await fetch(`/api/admin/directory/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const data = await response.json();
          alert(data.error || 'Delete failed');
          return;
        }
      } else {
        const status = action === 'restore' ? 'imported' : action === 'approve' ? 'approved' : 'rejected';
        const response = await fetch(`/api/admin/directory/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          const data = await response.json();
          alert(data.error || 'Action failed');
          return;
        }
      }
      fetchBusinesses();
    } catch (error) {
      logger.error('Single action failed', { error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateLink = async (id: number) => {
    setActionLoading(`invite-${id}`);
    try {
      const response = await fetch(`/api/admin/directory/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link' }),
      });
      const data = await response.json();
      if (response.ok) {
        await navigator.clipboard.writeText(data.inviteUrl);
        alert('Invite link copied to clipboard!');
        fetchBusinesses();
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (error) {
      logger.error('Generate link failed', { error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async (id: number) => {
    setActionLoading(`email-${id}`);
    try {
      const response = await fetch(`/api/admin/directory/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email' }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.emailSent ? 'Invitation email sent!' : 'Link generated but email could not be sent (no email on file?)');
        fetchBusinesses();
      } else {
        alert(data.error || 'Failed to send email');
      }
    } catch (error) {
      logger.error('Send email failed', { error });
    } finally {
      setActionLoading(null);
    }
  };

  // Import handlers
  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        row[h] = values[j] || '';
      });

      // Map to our schema
      if (row.name || row.business_name) {
        rows.push({
          name: row.name || row.business_name,
          business_type: row.business_type || row.type || 'other',
          address: row.address,
          city: row.city || 'Walla Walla',
          state: row.state || 'WA',
          zip: row.zip || row.zipcode,
          phone: row.phone,
          email: row.email,
          website: row.website,
          short_description: row.short_description || row.description,
        });
      }
    }

    return rows;
  };

  const handlePreview = () => {
    setImportError(null);
    setImportResult(null);
    try {
      const rows = parseCSV(importText);
      if (rows.length === 0) {
        setImportError('No valid rows found. Make sure your CSV has headers and data rows.');
        return;
      }
      setImportPreview(rows);
    } catch (error) {
      setImportError('Failed to parse CSV. Please check the format.');
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;

    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch('/api/admin/directory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses: importPreview }),
      });
      const data = await response.json();
      if (response.ok) {
        setImportResult(data);
        setImportPreview([]);
        setImportText('');
      } else {
        setImportError(data.error || 'Import failed');
      }
    } catch (error) {
      setImportError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const totalCount = statusCounts.imported + statusCounts.approved + statusCounts.invited + statusCounts.active + statusCounts.rejected;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Business Directory</h1>
        <p className="text-slate-500 mt-1">
          Pre-populate and manage business listings for partner invitations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setTab('review')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'review'
              ? 'border-[#1E3A5F] text-[#1E3A5F]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Review Businesses
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100">{totalCount}</span>
        </button>
        <button
          onClick={() => setTab('import')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'import'
              ? 'border-[#1E3A5F] text-[#1E3A5F]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Import Businesses
        </button>
      </div>

      {/* Review Tab */}
      {tab === 'review' && (
        <>
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['all', 'imported', 'approved', 'invited', 'active', 'rejected'] as const).map((status) => {
              const count = status === 'all' ? totalCount : statusCounts[status];
              return (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setSelectedIds(new Set());
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={!!actionLoading}
                className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={!!actionLoading}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          )}

          {/* Businesses Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : businesses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {statusFilter === 'all'
                  ? 'No businesses yet. Import some to get started.'
                  : `No ${statusFilter} businesses.`}
              </div>
            ) : (
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === businesses.length && businesses.length > 0}
                        onChange={selectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Business</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businesses.map((business) => (
                    <tr key={business.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(business.id)}
                          onChange={() => toggleSelect(business.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{business.name}</div>
                        {business.short_description && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {business.short_description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <span>{BUSINESS_TYPE_ICONS[business.business_type] || '📍'}</span>
                          <span className="text-slate-600 capitalize text-sm">{business.business_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>{business.city}, {business.state}</div>
                        {business.address && (
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">{business.address}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {business.phone && <div className="text-slate-600">{business.phone}</div>}
                        {business.email && (
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">{business.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[business.status]}`}>
                          {business.status}
                        </span>
                        {business.invitation_email_sent && (
                          <span className="ml-1 text-xs text-slate-400">📧</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Status-specific actions */}
                          {business.status === 'imported' && (
                            <>
                              <button
                                onClick={() => handleSingleAction(business.id, 'approve')}
                                disabled={actionLoading === `approve-${business.id}`}
                                className="text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleSingleAction(business.id, 'reject')}
                                disabled={actionLoading === `reject-${business.id}`}
                                className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {business.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleGenerateLink(business.id)}
                                disabled={actionLoading === `invite-${business.id}`}
                                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              >
                                🔗 Link
                              </button>
                              {business.email && (
                                <button
                                  onClick={() => handleSendEmail(business.id)}
                                  disabled={actionLoading === `email-${business.id}`}
                                  className="text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50"
                                >
                                  📧 Email
                                </button>
                              )}
                            </>
                          )}
                          {business.status === 'invited' && (
                            <button
                              onClick={() => handleGenerateLink(business.id)}
                              disabled={actionLoading === `invite-${business.id}`}
                              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                            >
                              🔗 Copy Link
                            </button>
                          )}
                          {business.status === 'rejected' && (
                            <>
                              <button
                                onClick={() => handleSingleAction(business.id, 'restore')}
                                disabled={actionLoading === `restore-${business.id}`}
                                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Permanently delete this business?')) {
                                    handleSingleAction(business.id, 'delete');
                                  }
                                }}
                                disabled={actionLoading === `delete-${business.id}`}
                                className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Import Tab */}
      {tab === 'import' && (
        <div className="space-y-6">
          {/* CSV Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
            <p className="text-sm text-blue-800 mb-2">
              Paste your CSV with headers. Required columns: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">business_type</code>
            </p>
            <p className="text-xs text-blue-700">
              Optional: address, city, state, zip, phone, email, website, short_description
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Business types: winery, restaurant, hotel, boutique, gallery, activity, other
            </p>
          </div>

          {/* Import Text Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paste CSV Data
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`name,business_type,city,state,phone,email,website
"L'Ecole No. 41",winery,"Walla Walla",WA,"(509) 525-0940",info@lecole.com,https://lecole.com
"Whitehouse-Crawford",restaurant,"Walla Walla",WA,"(509) 525-2222",,`}
              className="w-full h-48 p-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={!importText.trim()}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50"
            >
              Preview
            </button>
            {importPreview.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2d4a6f] disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${importPreview.length} Businesses`}
              </button>
            )}
          </div>

          {/* Error */}
          {importError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
              {importError}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="font-medium text-emerald-900 mb-2">Import Complete</h3>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>✅ Imported: {importResult.imported}</li>
                {importResult.duplicates > 0 && <li>⏭️ Duplicates skipped: {importResult.duplicates}</li>}
                {importResult.errors.length > 0 && <li>❌ Errors: {importResult.errors.length}</li>}
              </ul>
              <button
                onClick={() => {
                  setTab('review');
                  setStatusFilter('imported');
                }}
                className="mt-3 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                → Review imported businesses
              </button>
            </div>
          )}

          {/* Preview Table */}
          {importPreview.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-medium text-slate-900">Preview ({importPreview.length} businesses)</h3>
              </div>
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <span>{BUSINESS_TYPE_ICONS[row.business_type] || '📍'}</span>
                          <span className="text-slate-600 capitalize text-sm">{row.business_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.city}, {row.state}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {row.phone || row.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 20 && (
                <div className="p-4 text-center text-slate-500 text-sm border-t border-slate-200">
                  ... and {importPreview.length - 20} more
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
