'use client';

import { useState, useEffect } from 'react';

interface ProfileData {
  organization_name: string;
  contact_name: string;
  contact_phone: string;
  website: string;
  description: string;
  logo_url: string;
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-900 mb-1">
      {children}
    </label>
  );
}

export default function OrganizerProfilePage() {
  const [form, setForm] = useState<ProfileData>({
    organization_name: '',
    contact_name: '',
    contact_phone: '',
    website: '',
    description: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/organizer/profile');
        if (res.ok) {
          const data = await res.json();
          const profile = data.profile || data;
          setForm({
            organization_name: profile.organization_name || '',
            contact_name: profile.contact_name || '',
            contact_phone: profile.contact_phone || '',
            website: profile.website || '',
            description: profile.description || '',
            logo_url: profile.logo_url || '',
          });
        } else {
          setError('Failed to load profile.');
        }
      } catch {
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear messages on change
    if (success) setSuccess('');
    if (error) setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/organizer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess('Profile updated successfully.');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update profile.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton />;
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-sm';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Profile</h1>
        <p className="text-gray-600 mt-1">Manage your organization details and contact information.</p>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l3 3 7-7" />
          </svg>
          <p className="text-emerald-800 text-sm">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <Label htmlFor="organization_name">Organization Name</Label>
            <input
              type="text"
              id="organization_name"
              name="organization_name"
              value={form.organization_name}
              onChange={handleChange}
              className={inputCls}
              placeholder="Your organization or business name"
              aria-label="Organization name"
            />
          </div>

          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <input
              type="text"
              id="contact_name"
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              className={inputCls}
              placeholder="Primary contact person"
              aria-label="Contact name"
            />
          </div>

          <div>
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              className={inputCls}
              placeholder="(509) 555-0123"
              aria-label="Contact phone"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <input
              type="url"
              id="website"
              name="website"
              value={form.website}
              onChange={handleChange}
              className={inputCls}
              placeholder="https://yourwebsite.com"
              aria-label="Website URL"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={inputCls}
              placeholder="Tell us about your organization"
              aria-label="Organization description"
            />
          </div>

          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <input
              type="url"
              id="logo_url"
              name="logo_url"
              value={form.logo_url}
              onChange={handleChange}
              className={inputCls}
              placeholder="https://example.com/logo.png"
              aria-label="Logo URL"
            />
            <p className="text-xs text-gray-600 mt-1">Paste a direct link to your organization logo</p>
          </div>
        </div>

        <div className="mt-6 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-6 py-2.5 font-medium transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
