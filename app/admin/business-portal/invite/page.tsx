'use client';

/**
 * Admin: Business Portal - Batch Invite
 * Send invite codes to multiple businesses at once
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhoneInput from '@/components/ui/PhoneInput';

interface BusinessInvite {
  name: string;
  business_types: string[];
  contact_email: string;
  contact_phone?: string;
}

const BUSINESS_TYPE_OPTIONS = [
  { value: 'winery', label: 'Winery', icon: '🍷' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel / Lodging', icon: '🏨' },
  { value: 'boutique', label: 'Boutique / Shop', icon: '🛍️' },
  { value: 'gallery', label: 'Gallery', icon: '🎨' },
  { value: 'activity', label: 'Activity / Experience', icon: '🎯' },
  { value: 'catering', label: 'Catering', icon: '🍴' },
  { value: 'service', label: 'Service', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export default function BusinessInvitePage() {
  const router = useRouter();
  const [invites, setInvites] = useState<BusinessInvite[]>([
    { name: '', business_types: ['winery'], contact_email: '', contact_phone: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [results, setResults] = useState<Array<{ success: boolean; business?: { name: string }; invite_token?: string; error?: string }>>([]);

  const addInviteRow = () => {
    setInvites([...invites, { name: '', business_types: ['winery'], contact_email: '', contact_phone: '' }]);
  };

  const removeInviteRow = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof BusinessInvite, value: string) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const toggleBusinessType = (index: number, type: string) => {
    const updated = [...invites];
    const current = updated[index].business_types;
    if (current.includes(type)) {
      // Don't allow removing the last type
      if (current.length > 1) {
        updated[index] = { ...updated[index], business_types: current.filter(t => t !== type) };
      }
    } else {
      updated[index] = { ...updated[index], business_types: [...current, type] };
    }
    setInvites(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validInvites = invites.filter(inv => inv.name && inv.contact_email);
    if (validInvites.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one business with name and email' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setResults([]);

    try {
      // Map business_types to include business_type (first element) for backward compat
      const mappedInvites = validInvites.map(inv => ({
        ...inv,
        business_type: inv.business_types[0],
        business_types: inv.business_types,
      }));
      const response = await fetch('/api/admin/business-portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses: mappedInvites })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invites');
      }

      const typedResults = (data.results || []) as Array<{ success: boolean; business?: { name: string }; invite_token?: string; error?: string }>;
      setResults(typedResults);
      setMessage({
        type: 'success',
        text: `Successfully sent ${typedResults.filter((r) => r.success).length} invite(s)!`
      });
      
      // Clear form
      setInvites([{ name: '', business_types: ['winery'], contact_email: '', contact_phone: '' }]);

    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send invites' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Send Business Invites</h1>
              <p className="text-sm text-gray-600">Invite businesses to join your curated directory</p>
            </div>
            <button
              onClick={() => router.push('/admin/business-portal')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Invite Results</h3>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className={`p-3 rounded border ${
                  result.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{result.business?.name || 'Unknown'}</div>
                      <div className="text-sm">
                        {result.success ? (
                          <>
                            ✓ Invited successfully
                            {result.invite_token && (
                              <span className="ml-2 font-mono bg-white px-2 py-1 rounded">
                                {result.invite_token}
                              </span>
                            )}
                          </>
                        ) : (
                          <>✗ {result.error}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Business Invites</h2>
            <p className="text-sm text-gray-600">
              Add businesses below. Each will receive a unique code via email to complete their profile.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {invites.map((invite, index) => (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={invite.name}
                        onChange={(e) => updateInvite(index, 'name', e.target.value)}
                        placeholder="e.g., Awesome Winery"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Type (multi-select) */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type(s) * <span className="font-normal text-gray-500">(select all that apply)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BUSINESS_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleBusinessType(index, opt.value)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              invite.business_types.includes(opt.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span>{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        value={invite.contact_email}
                        onChange={(e) => updateInvite(index, 'contact_email', e.target.value)}
                        placeholder="contact@business.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone (Optional)
                      </label>
                      <PhoneInput
                        value={invite.contact_phone || ''}
                        onChange={(value) => updateInvite(index, 'contact_phone', value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {invites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInviteRow(index)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700 p-2"
                      title="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button
            type="button"
            onClick={addInviteRow}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition font-medium"
          >
            + Add Another Business
          </button>

          {/* Submit */}
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending Invites...' : `Send ${invites.filter(i => i.name && i.contact_email).length} Invite(s)`}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/business-portal')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">📧 What Happens Next?</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>1. Each business receives an email with their unique invite code</p>
            <p>2. They visit {' '}
              <Link href="/contribute" className="underline font-medium">
                wallawalla.travel/contribute
              </Link>
              {' '}and enter their code
            </p>
            <p>3. They complete their profile through voice, text, and photo uploads</p>
            <p>4. You review their submission here and approve it for the directory</p>
          </div>
        </div>
      </main>
    </div>
  );
}





