'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface OrganizerUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization_name?: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/organizer-portal/dashboard', icon: 'house' },
  { label: 'My Events', href: '/organizer-portal/events', icon: 'calendar' },
  { label: 'Create Event', href: '/organizer-portal/events/new', icon: 'plus' },
  { label: 'Profile', href: '/organizer-portal/profile', icon: 'user' },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const cls = className || 'w-5 h-5';
  switch (name) {
    case 'house':
      return (
        <svg className={cls} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L10 4l7 6.5M5 9.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V9.5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={cls} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v2m8-2v2M3 7h14M4 4h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
      );
    case 'plus':
      return (
        <svg className={cls} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12m6-6H4" />
        </svg>
      );
    case 'user':
      return (
        <svg className={cls} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 10a3 3 0 100-6 3 3 0 000 6zm-6 8a6 6 0 0112 0H4z" />
        </svg>
      );
    default:
      return null;
  }
}

function SidebarSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </nav>
      </div>
      <div className="flex-1">
        <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />
        <div className="p-6 space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<OrganizerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login?portal=organizer');
          return;
        }
        const data = await res.json();
        if (data.role !== 'organizer' && data.role !== 'admin') {
          router.replace('/login?portal=organizer');
          return;
        }
        setUser(data);
      } catch {
        router.replace('/login?portal=organizer');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with redirect regardless
    }
    router.replace('/login?portal=organizer');
  }

  if (loading) {
    return <SidebarSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Logo / Brand */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-[#8B1538]">Walla Walla Events</h1>
          {user.organization_name && (
            <p className="text-sm text-gray-600 mt-0.5 truncate">{user.organization_name}</p>
          )}
          {!user.organization_name && user.name && (
            <p className="text-sm text-gray-600 mt-0.5 truncate">{user.name}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Portal navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/organizer-portal/dashboard' && pathname.startsWith(item.href) && item.href !== '/organizer-portal/events/new');
            const isDashboardActive = item.href === '/organizer-portal/dashboard' && pathname === '/organizer-portal/dashboard';
            const isNewActive = item.href === '/organizer-portal/events/new' && pathname === '/organizer-portal/events/new';
            const isEventsActive = item.href === '/organizer-portal/events' && pathname.startsWith('/organizer-portal/events') && !pathname.includes('/new');
            const active = isDashboardActive || isNewActive || (item.href === '/organizer-portal/events' ? isEventsActive : isActive) || (item.href === '/organizer-portal/profile' && pathname === '/organizer-portal/profile');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[#8B1538]/10 text-[#8B1538] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#8B1538]/10 flex items-center justify-center text-[#8B1538] font-medium text-sm">
              {user.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-700 hover:bg-gray-50 rounded-lg"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[#8B1538]">Walla Walla Events</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
