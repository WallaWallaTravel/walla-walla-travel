'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthContext, AuthContextType } from './hooks/useHotelAuth';

/**
 * Partner Portal Layout
 *
 * Provides authentication context and navigation for hotel partners
 */

interface HotelPartner {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
}

export default function PartnerPortalLayout({ children }: { children: ReactNode }) {
  const [hotel, setHotel] = useState<HotelPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const storedHotel = localStorage.getItem('hotelPartner');
    if (storedHotel) {
      try {
        setHotel(JSON.parse(storedHotel));
      } catch {
        localStorage.removeItem('hotelPartner');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        setHotel(data.data);
        localStorage.setItem('hotelPartner', JSON.stringify(data.data));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setHotel(null);
    localStorage.removeItem('hotelPartner');
    router.push('/partner-portal/login');
  };

  // Public routes that don't require auth
  const publicRoutes = ['/partner-portal/login', '/partner-portal/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated and not on public route, show login
  if (!hotel && !isPublicRoute) {
    return (
      <AuthContext.Provider value={{ hotel, loading, login, logout }}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-[#E07A5F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Partner Portal</h1>
            <p className="text-slate-600 mb-6">Please log in to access the partner portal.</p>
            <Link
              href="/partner-portal/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // Public routes (login, register)
  if (isPublicRoute) {
    return (
      <AuthContext.Provider value={{ hotel, loading, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Authenticated layout
  return (
    <AuthContext.Provider value={{ hotel, loading, login, logout }}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/partner-portal/shared-tours" className="text-xl font-bold text-[#8B1538]">
                🍷 Partner Portal
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/partner-portal/shared-tours"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/partner-portal/shared-tours'
                      ? 'bg-[#E07A5F]/10 text-[#E07A5F]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Book Tours
                </Link>
                <Link
                  href="/partner-portal/shared-tours/bookings"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/partner-portal/shared-tours/bookings'
                      ? 'bg-[#E07A5F]/10 text-[#E07A5F]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  My Bookings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{hotel?.name}</p>
                <p className="text-xs text-slate-500">{hotel?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </AuthContext.Provider>
  );
}
