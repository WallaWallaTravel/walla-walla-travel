'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // State machine: 'loading' | 'invalid' | 'form' | 'success'
  const [pageState, setPageState] = useState<'loading' | 'invalid' | 'form' | 'success'>('loading');

  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/organizer/setup/validate?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          setPageState('form');
        } else {
          setPageState('invalid');
        }
      } catch {
        setPageState('invalid');
      }
    }
    validateToken();
  }, [token]);

  useEffect(() => {
    if (pageState === 'success') {
      const timer = setTimeout(() => {
        router.push('/login?portal=organizer');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pageState, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/organizer/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setPageState('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to set up account. The link may have expired.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 text-sm';

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mx-auto" />
              <div className="space-y-3 pt-4">
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Setup Link</h1>
            <p className="text-gray-600 text-sm mb-6">
              This setup link is invalid or has expired. Please contact the administrator for a new invitation.
            </p>
            <Link
              href="/"
              className="inline-block text-sm font-medium text-[#8B1538] hover:underline"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Account Set Up</h1>
            <p className="text-gray-600 text-sm mb-4">
              Your organizer account is ready. Redirecting you to the login page...
            </p>
            <Link
              href="/login?portal=organizer"
              className="inline-block text-sm font-medium text-[#8B1538] hover:underline"
            >
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Setup form state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#8B1538]">Walla Walla Events</h1>
            <h2 className="text-lg font-semibold text-gray-900 mt-2">Set Up Your Account</h2>
            <p className="text-gray-600 text-sm mt-1">Create a password to access your organizer portal.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Create a password"
                aria-label="Password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-600 mt-1">Must be at least 8 characters</p>
            </div>
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-900 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Confirm your password"
                aria-label="Confirm password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#8B1538] text-white hover:bg-[#722F37] rounded-lg px-4 py-2.5 font-medium transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Setting up...' : 'Set Up Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mx-auto" />
              <div className="space-y-3 pt-4">
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SetupForm />
    </Suspense>
  );
}
