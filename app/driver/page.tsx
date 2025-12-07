'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Driver Portal Login
 * 
 * Entry point for NW Touring & Concierge drivers.
 * This will eventually be at drivers.nwtouring.com
 * 
 * Drivers would bookmark this URL for daily access.
 */

function DriverLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'forbidden') {
      setError('You do not have permission to access the driver portal');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/driver-portal/dashboard');
        router.refresh();
      } else {
        setError(data.error?.message || 'Invalid credentials');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - NW Touring branding */}
      <header className="bg-[#B87333] py-4">
        <div className="max-w-md mx-auto px-4 flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-[#B87333] text-sm font-bold">NW</span>
          </div>
          <div>
            <span className="text-white font-medium">NW Touring & Concierge</span>
            <span className="text-orange-100 text-sm ml-2">Drivers</span>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#B87333] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Driver Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Access your tours and schedule</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#B87333] focus:ring-2 focus:ring-[#B87333]/20 focus:outline-none transition-colors"
                placeholder="driver@nwtouring.com"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-[#B87333] focus:ring-2 focus:ring-[#B87333]/20 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-colors ${
                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#B87333] hover:bg-[#a5632b]'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-slate-400">
        <p>Need help? Contact dispatch at (509) 200-8000</p>
      </footer>
    </div>
  );
}

export default function DriverLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <DriverLoginContent />
    </Suspense>
  );
}
