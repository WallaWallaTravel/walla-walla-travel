"use client";

/**
 * Admin: Business Portal Dashboard
 * Review submissions, detect discrepancies, approve content
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Business {
  id: number;
  name: string;
  business_type: string;
  status: string;
  completion_percentage: number;
  submitted_at?: string;
  invited_at?: string;
  last_activity_at?: string;
  contact_email?: string;
}

interface ProcessingStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export default function BusinessPortalAdminPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load businesses
      const bizResponse = await fetch('/api/admin/business-portal/businesses');
      if (bizResponse.ok) {
        const data = await bizResponse.json();
        setBusinesses(data.businesses || []);
      }

      // Load processing stats
      const statsResponse = await fetch('/api/admin/business-portal/process-jobs');
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setProcessingStats(data.stats);
      }

    } catch (error: unknown) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessJobs = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/business-portal/process-jobs', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Processing failed');

      const data = await response.json();
      setMessage({ type: 'success', text: data.message });
      loadData(); // Reload stats

    } catch (error: unknown) {
      console.error('Processing error:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Processing failed' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredBusinesses = businesses.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'submitted') return b.status === 'submitted';
    if (filter === 'in_progress') return b.status === 'in_progress';
    if (filter === 'invited') return b.status === 'invited';
    if (filter === 'approved') return b.status === 'approved';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'invited': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Portal Admin</h1>
              <p className="text-sm text-gray-600">Review submissions and curate content</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Processing Stats */}
        {processingStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Processing Queue</h2>
              <button
                onClick={handleProcessJobs}
                disabled={processing || processingStats.pending === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Process Jobs'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-800">{processingStats.pending}</div>
                <div className="text-sm text-yellow-600">Pending</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-800">{processingStats.processing}</div>
                <div className="text-sm text-blue-600">Processing</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-800">{processingStats.completed}</div>
                <div className="text-sm text-green-600">Completed (24h)</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-red-800">{processingStats.failed}</div>
                <div className="text-sm text-red-600">Failed (24h)</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'submitted', 'in_progress', 'invited', 'approved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Business List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No businesses found
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map(business => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{business.name}</div>
                      <div className="text-sm text-gray-500">{business.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {business.business_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(business.status)}`}>
                        {business.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${business.completion_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {business.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {business.last_activity_at 
                        ? new Date(business.last_activity_at).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/admin/business-portal/${business.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Start</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Invite a business:</strong> Create a new business and send them their unique code</p>
            <p>• <strong>Process jobs:</strong> Click &quot;Process Jobs&quot; to transcribe audio, extract data, and analyze photos</p>
            <p>• <strong>Review submissions:</strong> Click &quot;Review&quot; on any submitted business to check for discrepancies</p>
          </div>
          <button
            onClick={() => router.push('/admin/business-portal/invite')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Invite New Business
          </button>
        </div>
      </main>
    </div>
  );
}
