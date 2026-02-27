'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BusinessInfo {
  id: number;
  name: string;
  business_type: string;
  city: string;
  state: string;
}

const BUSINESS_TYPE_ICONS: Record<string, string> = {
  winery: '🍷',
  restaurant: '🍽️',
  hotel: '🏨',
  boutique: '🛍️',
  gallery: '🎨',
  activity: '🎯',
  catering: '🍴',
  service: '🔧',
  other: '📍',
};

export default function PartnerInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { token } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/partner-invite/${token}`);
        const data = await response.json();

        if (data.valid && data.business) {
          setBusiness(data.business);
        } else {
          const errorMessage = typeof data.error === 'object' && data.error?.message
            ? data.error.message
            : (data.error || 'Invalid invitation link');
          setError(errorMessage);
        }
      } catch (_err) {
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    // Client-side validation
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!email.trim()) errors.push('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email');
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/partner-invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=account-created');
        }, 3000);
      } else {
        setFormErrors([data.error || 'Failed to create account']);
      }
    } catch (_err) {
      setFormErrors(['An error occurred. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2d4a6f]"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Walla Walla Travel!</h1>
          <p className="text-slate-600 mb-4">
            Your partner account has been created successfully.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting you to login...
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="text-[#1E3A5F] hover:underline font-medium"
            >
              Click here if not redirected
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Partner Invitation</h1>
          <p className="text-slate-600">
            You&apos;ve been invited to join Walla Walla Travel as a partner
          </p>
        </div>

        {/* Business Card */}
        {business && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {BUSINESS_TYPE_ICONS[business.business_type] || '📍'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{business.name}</h2>
                <p className="text-slate-500">
                  {business.city}, {business.state} · <span className="capitalize">{business.business_type}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-emerald-900 mb-3">Partner Benefits</h3>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              Featured in AI-powered winery recommendations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              Included in curated wine tour itineraries
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              Access to the Partner Portal for managing your profile
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              Share your unique story with visitors
            </li>
          </ul>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Create Your Account</h3>

          {formErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <ul className="text-sm text-red-700 space-y-1">
                {formErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg font-semibold hover:bg-[#2d4a6f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1E3A5F] hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Questions? Contact us at{' '}
          <a href="mailto:info@wallawalla.travel" className="text-[#1E3A5F] hover:underline">
            info@wallawalla.travel
          </a>
        </p>
      </div>
    </div>
  );
}
