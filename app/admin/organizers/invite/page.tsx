'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/ui/PhoneInput';

interface InviteForm {
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
}

interface InviteSuccess {
  setup_url: string;
  organizer_id: string;
  organization_name: string;
}

export default function InviteOrganizerPage() {
  const router = useRouter();
  const [form, setForm] = useState<InviteForm>({
    organization_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof InviteForm, string>>>({});
  const [success, setSuccess] = useState<InviteSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof InviteForm]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof InviteForm, string>> = {};

    if (!form.organization_name.trim()) {
      errors.organization_name = 'Organization name is required';
    }
    if (!form.contact_name.trim()) {
      errors.contact_name = 'Contact name is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (form.website.trim() && !/^https?:\/\/.+/.test(form.website.trim())) {
      errors.website = 'Website must start with http:// or https://';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch('/api/admin/organizers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: form.organization_name.trim(),
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          website: form.website.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send invitation');
      }

      const data = await res.json();
      setSuccess({
        setup_url: data.setup_url || data.setupUrl || '',
        organizer_id: data.organizer_id || data.id || '',
        organization_name: form.organization_name.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyUrl() {
    if (success?.setup_url) {
      navigator.clipboard.writeText(success.setup_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleInviteAnother() {
    setForm({
      organization_name: '',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      notes: '',
    });
    setSuccess(null);
    setError('');
    setFieldErrors({});
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Invitation Sent
          </h2>
          <p className="mt-2 text-gray-600">
            An invitation has been sent to{' '}
            <span className="font-medium text-gray-900">
              {success.organization_name}
            </span>
            .
          </p>

          {success.setup_url && (
            <div className="mt-6">
              <label
                htmlFor="setup-url"
                className="block text-sm font-medium text-gray-900 text-left mb-1.5"
              >
                Setup URL
              </label>
              <div className="flex gap-2">
                <input
                  id="setup-url"
                  type="text"
                  readOnly
                  value={success.setup_url}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 bg-gray-50 text-sm"
                  aria-label="Setup URL for the invited organizer"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-1.5 text-sm text-gray-600 text-left">
                Share this URL with the organizer to complete their account setup.
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={handleInviteAnother}
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2.5 font-medium transition-colors"
            >
              Invite Another
            </button>
            <button
              onClick={() => router.push('/admin/organizers')}
              className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 rounded-lg px-4 py-2.5 font-medium transition-colors"
            >
              View All Organizers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <button
        onClick={() => router.push('/admin/organizers')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Organizers
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Invite Event Organizer
        </h1>
        <p className="text-gray-600 mt-1">
          Send an invitation to a new event organizer to join the platform.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Organization Name */}
          <div>
            <label
              htmlFor="organization_name"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Organization Name <span className="text-red-600">*</span>
            </label>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              value={form.organization_name}
              onChange={handleChange}
              placeholder="Enter organization name"
              aria-label="Organization name"
              aria-invalid={!!fieldErrors.organization_name}
              aria-describedby={
                fieldErrors.organization_name
                  ? 'organization_name-error'
                  : undefined
              }
              className={`w-full px-3 py-2.5 rounded-lg border text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors ${
                fieldErrors.organization_name
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
            {fieldErrors.organization_name && (
              <p
                id="organization_name-error"
                className="mt-1 text-sm text-red-700"
              >
                {fieldErrors.organization_name}
              </p>
            )}
          </div>

          {/* Contact Name */}
          <div>
            <label
              htmlFor="contact_name"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Contact Name <span className="text-red-600">*</span>
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              required
              value={form.contact_name}
              onChange={handleChange}
              placeholder="Enter contact person name"
              aria-label="Contact name"
              aria-invalid={!!fieldErrors.contact_name}
              aria-describedby={
                fieldErrors.contact_name ? 'contact_name-error' : undefined
              }
              className={`w-full px-3 py-2.5 rounded-lg border text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors ${
                fieldErrors.contact_name
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
            {fieldErrors.contact_name && (
              <p id="contact_name-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.contact_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="organizer@example.com"
              aria-label="Email address"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className={`w-full px-3 py-2.5 rounded-lg border text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors ${
                fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Phone
            </label>
            <PhoneInput
              id="phone"
              name="phone"
              value={form.phone}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, phone: value }));
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }
                if (error) setError('');
              }}
              placeholder="(optional)"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors"
            />
          </div>

          {/* Website URL */}
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Website URL
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={form.website}
              onChange={handleChange}
              placeholder="https://example.com (optional)"
              aria-label="Website URL"
              aria-invalid={!!fieldErrors.website}
              aria-describedby={
                fieldErrors.website ? 'website-error' : undefined
              }
              className={`w-full px-3 py-2.5 rounded-lg border text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors ${
                fieldErrors.website
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
            {fieldErrors.website && (
              <p id="website-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.website}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Internal Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              placeholder="Notes for internal reference (optional)"
              aria-label="Internal notes"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 rounded-lg px-6 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </span>
            ) : (
              'Send Invitation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
