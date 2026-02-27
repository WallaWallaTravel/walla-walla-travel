'use client';

import { useState } from 'react';
import PhoneInput from '@/components/ui/PhoneInput';

interface GuestRegistrationGateProps {
  children: React.ReactNode;
  guestToken: string | null;
  isRegistered: boolean;
  guestName: string | null;
  loading: boolean;
  onRegister: (data: { name: string; email: string; phone?: string }) => Promise<void>;
}

export default function GuestRegistrationGate({
  children,
  guestToken,
  isRegistered,
  guestName,
  loading,
  onRegister,
}: GuestRegistrationGateProps) {
  const [name, setName] = useState(guestName || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No guest token = coordinator view, pass through
  if (!guestToken) {
    return <>{children}</>;
  }

  // Still loading guest identity
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Already registered, show children
  if (isRegistered) {
    return <>{children}</>;
  }

  // Show registration form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await onRegister({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome to Your Trip
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Please confirm your details to get started.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="reg-phone"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Phone / Text Number{' '}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <PhoneInput
              id="reg-phone"
              value={phone}
              onChange={(value) => setPhone(value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              We may text you day-of updates about your trip.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              submitting
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            {submitting ? 'Confirming...' : 'Continue to My Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
