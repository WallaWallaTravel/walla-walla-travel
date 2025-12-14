'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Winery {
  id: number;
  name: string;
  city: string;
}

export default function InvitePartnerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    business_name: '',
    business_type: 'winery' as 'winery' | 'hotel' | 'restaurant' | 'activity' | 'other',
    winery_id: '',
    notes: '',
  });
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ setup_url: string } | null>(null);
  const [error, setError] = useState('');

  // Load wineries for linking
  useEffect(() => {
    async function fetchWineries() {
      try {
        const response = await fetch('/api/wineries?limit=500');
        if (response.ok) {
          const data = await response.json();
          setWineries(data.wineries || []);
        }
      } catch (error) {
        console.error('Failed to load wineries:', error);
      }
    }
    fetchWineries();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/partners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          winery_id: formData.winery_id ? parseInt(formData.winery_id) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess({ setup_url: data.setup_url });
      } else {
        setError(data.error?.message || data.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900 mb-2">Invitation Sent!</h1>
          <p className="text-emerald-700 mb-6">
            An invitation email has been sent to <strong>{formData.email}</strong> with instructions to set up their account.
          </p>
          
          <div className="bg-white rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-500 mb-2">Setup Link (also sent via email):</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={success.setup_url}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(success.setup_url)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({
                  email: '',
                  business_name: '',
                  business_type: 'winery',
                  winery_id: '',
                  notes: '',
                });
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Invite Another
            </button>
            <Link
              href="/admin/partners"
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              View All Partners
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/partners" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Partners
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Invite Partner</h1>
        <p className="text-slate-500 mt-1">
          Send an invitation to a local business to join the partner directory
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Business Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
                placeholder="contact@winery.com"
              />
              <p className="text-xs text-slate-400 mt-1">
                Invitation will be sent to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
                placeholder="Acme Winery"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Type *
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  business_type: e.target.value as typeof formData.business_type,
                  winery_id: e.target.value !== 'winery' ? '' : formData.winery_id,
                })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
              >
                <option value="winery">🍷 Winery</option>
                <option value="hotel">🏨 Hotel</option>
                <option value="restaurant">🍽️ Restaurant</option>
                <option value="activity">🎯 Activity</option>
                <option value="other">📍 Other</option>
              </select>
            </div>

            {formData.business_type === 'winery' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link to Existing Winery (optional)
                </label>
                <select
                  value={formData.winery_id}
                  onChange={(e) => setFormData({ ...formData, winery_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none"
                >
                  <option value="">-- Create new listing --</option>
                  {wineries.map((winery) => (
                    <option key={winery.id} value={winery.id}>
                      {winery.name} ({winery.city})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Link to an existing winery in the directory, or leave blank to create a new listing
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Internal Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#D9E2EC] focus:outline-none resize-none"
                placeholder="Any notes about this partner..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2d4a6f] transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
          <Link
            href="/admin/partners"
            className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}




