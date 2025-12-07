'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/ui/bottom-nav';

/**
 * Conditional Navigation Component
 * 
 * Shows different navigation based on the current route:
 * - Driver Portal: Mobile bottom navigation
 * - Admin Portal: Sidebar navigation (handled by admin layout)
 * - Public/Customer: No persistent navigation
 */
export function ConditionalNavigation() {
  const pathname = usePathname();

  // Driver portal routes - show mobile bottom nav
  const isDriverRoute = 
    pathname.startsWith('/driver-portal') ||
    pathname.startsWith('/workflow') ||
    pathname.startsWith('/inspections') ||
    pathname.startsWith('/time-clock');

  // Admin portal routes - no nav here (handled by admin layout)
  const isAdminRoute = pathname.startsWith('/admin');

  // Public/customer routes - no persistent navigation
  const isPublicRoute = 
    pathname.startsWith('/book') ||
    pathname.startsWith('/client-portal') ||
    pathname.startsWith('/customer-portal') ||
    pathname.startsWith('/contribute') ||
    pathname.startsWith('/corporate-request') ||
    pathname.startsWith('/proposals') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/herding-cats') ||
    pathname.startsWith('/nw-touring') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/terms' ||
    pathname === '/cancellation-policy';

  // Show driver navigation for driver routes
  if (isDriverRoute) {
    const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
          // Ignore logout API errors
        });
      } catch (err) {
        console.error('Logout error:', String(err));
      } finally {
        window.location.href = '/login';
      }
    };

    return (
      <>
        <BottomNav
          items={[
            {
              label: 'Home',
              icon: '🏠',
              href: '/driver-portal/dashboard'
            },
            {
              label: 'Schedule',
              icon: '📅',
              href: '/driver-portal/schedule'
            },
            {
              label: 'Clock',
              icon: '⏰',
              href: '/time-clock/clock-in'
            },
            {
              label: 'Inspect',
              icon: '🔧',
              href: '/inspections/pre-trip'
            },
            {
              label: 'Logout',
              icon: '🚪',
              href: '/login',
              onClick: handleLogout
            }
          ]}
        />
      </>
    );
  }

  // No navigation for admin (handled by AdminLayout) or public routes
  return null;
}

/**
 * Spacer component - only shown for driver routes
 */
export function ConditionalNavSpacer() {
  const pathname = usePathname();

  const isDriverRoute = 
    pathname.startsWith('/driver-portal') ||
    pathname.startsWith('/workflow') ||
    pathname.startsWith('/inspections') ||
    pathname.startsWith('/time-clock');

  if (isDriverRoute) {
    return <div className="h-16 w-full" />;
  }

  return null;
}

