'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

export default function ClientPortalPage() {
  const [lookupValue, setLookupValue] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-detect lookup type based on input
  const detectLookupType = (value: string): 'email' | 'phone' | 'booking' => {
    const trimmed = value.trim();
    if (trimmed.includes('@')) return 'email';
    // If mostly digits (allowing for formatting like dashes, parens, spaces)
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 11) return 'phone';
    return 'booking';
  };

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const lookupType = detectLookupType(lookupValue);
      const body: Record<string, string> = {
        last_name: lastName.trim(),
        lookup_method: lookupType,
      };

      if (lookupType === 'email') {
        body.email = lookupValue.toLowerCase().trim();
      } else if (lookupType === 'phone') {
        body.phone = lookupValue.replace(/\D/g, '');
      } else {
        body.booking_number = lookupValue.toUpperCase().trim();
      }

      const response = await fetch(`/api/client/booking-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(`/client-portal/${data.data.booking_id}`);
      } else {
        setError(data.error?.message || 'Booking not found. Please check your details and try again.');
        setLoading(false);
      }
    } catch (err) {
      logger.error('Lookup error', { error: err });
      setError('Unable to look up booking. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-emerald-600 text-white py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-light tracking-tight">
            Client Portal
          </h1>
          <p className="text-emerald-100 mt-2 text-sm">
            Access your booking details and payments
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          {/* Back Link */}
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to portals
          </Link>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Find Your Booking
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter your email, phone number, or booking number to access your tour details.
          </p>

          <form onSubmit={handleLookup}>
            <div className="mb-5">
              <label
                htmlFor="lookupValue"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email, Phone, or Booking Number
              </label>
              <input
                id="lookupValue"
                type="text"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-colors"
                placeholder="john@example.com or (509) 555-0123"
              />
            </div>

            <div className="mb-5">
              <label 
                htmlFor="lastName" 
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-colors"
                placeholder="Your last name"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-5 text-sm font-medium border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-white font-semibold transition-colors ${
                loading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? 'Looking up...' : 'Find My Booking'}
            </button>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-2">
            Need help finding your booking?
          </p>
          <a 
            href="tel:+15092008000" 
            className="text-emerald-600 font-medium hover:underline"
          >
            Call (509) 200-8000
          </a>
        </div>
      </main>
    </div>
  );
}







