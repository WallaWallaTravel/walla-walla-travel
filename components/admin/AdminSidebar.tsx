'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
  section?: string;
  dynamicBadge?: string; // Key to look up dynamic badge count
}

const NAV_ITEMS: NavItem[] = [
  // Overview
  { label: 'Dashboard', icon: '📊', href: '/admin/dashboard', section: 'Overview' },
  { label: 'Calendar', icon: '📆', href: '/admin/calendar', section: 'Overview' },
  { label: 'System Status', icon: '🖥️', href: '/admin/system-dashboard', section: 'Overview' },
  
  // Operations
  { label: 'Bookings', icon: '📅', href: '/admin/bookings', section: 'Operations' },
  { label: 'Reservations', icon: '🎨', href: '/admin/reservations', section: 'Operations', dynamicBadge: 'pendingReservations' },
  { label: 'Proposals', icon: '📄', href: '/admin/proposals', section: 'Operations' },
  { label: 'Tour Offers', icon: '🎫', href: '/admin/tour-offers', section: 'Operations' },
  { label: 'Corporate Requests', icon: '🏢', href: '/admin/corporate-requests', section: 'Operations' },
  
  // Financial
  { label: 'Invoices', icon: '💰', href: '/admin/invoices', section: 'Financial' },
  { label: 'Pricing Calculator', icon: '🧮', href: '/admin/pricing', section: 'Financial' },
  { label: 'Rate Configuration', icon: '💵', href: '/admin/rates', section: 'Financial' },
  { label: 'Payment Settings', icon: '💳', href: '/admin/payment-settings', section: 'Financial' },
  
  // Content
  { label: 'Business Portal', icon: '🏪', href: '/admin/business-portal', section: 'Content' },
  { label: 'Media Library', icon: '📸', href: '/admin/media', section: 'Content' },
  { label: 'Wine Directory', icon: '🍷', href: '/admin/wine-directory', section: 'Content' },
  
  // Marketing
  { label: 'Marketing Hub', icon: '📊', href: '/admin/marketing', section: 'Marketing' },
  { label: 'Analytics', icon: '📈', href: '/admin/marketing/analytics', section: 'Marketing' },
  { label: 'A/B Testing', icon: '🧪', href: '/admin/marketing/ab-testing', section: 'Marketing' },
  { label: 'Leads', icon: '🎯', href: '/admin/marketing/leads', section: 'Marketing' },
  { label: 'Social Media', icon: '📱', href: '/admin/marketing/social', section: 'Marketing' },
  { label: 'Email Campaigns', icon: '📧', href: '/admin/marketing/email', section: 'Marketing' },
  { label: 'Content Calendar', icon: '📅', href: '/admin/marketing/calendar', section: 'Marketing' },
  { label: 'Competitors', icon: '👁️', href: '/admin/marketing/competitors', section: 'Marketing' },
  
  // Services
  { label: 'Additional Services', icon: '➕', href: '/admin/additional-services', section: 'Services' },
  { label: 'Lunch Orders', icon: '🍽️', href: '/admin/lunch-orders', section: 'Services' },
  
  // Partners
  { label: 'Partners', icon: '🤝', href: '/admin/partners', section: 'Partners' },
  
  // System
  { label: 'Users', icon: '👥', href: '/admin/users', section: 'System' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings', section: 'System' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Fetch dynamic badge counts
  useEffect(() => {
    async function fetchBadgeCounts() {
      try {
        const response = await fetch('/api/booking-requests');
        if (response.ok) {
          const data = await response.json();
          setBadgeCounts(prev => ({
            ...prev,
            pendingReservations: data.pendingCount || 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      }
    }

    fetchBadgeCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group items by section
  const sections: { [key: string]: NavItem[] } = {};
  NAV_ITEMS.forEach(item => {
    const section = item.section || 'Other';
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(item);
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <button
          onClick={() => router.push('/')}
          className="text-left w-full hover:opacity-80 transition-opacity"
        >
          <h1 className="text-lg font-bold text-slate-900">
            Walla Walla Travel
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Admin Portal</p>
        </button>
      </div>

      {/* Portal Switcher */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">
          Switch Portal
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => router.push('/driver-portal/dashboard')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span className="text-base">🚗</span>
            <span>Driver Portal</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span className="text-base">🌐</span>
            <span>Main Website</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-3">
              {section}
            </h2>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#1E3A5F] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {(() => {
                      const badgeValue = item.dynamicBadge
                        ? badgeCounts[item.dynamicBadge]
                        : item.badge;
                      return badgeValue !== undefined && badgeValue > 0 && (
                        <span className="bg-[#B87333] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {badgeValue > 99 ? '99+' : badgeValue}
                        </span>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <span className="text-base">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * Mobile admin navigation (for small screens)
 */
export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Show only most important items on mobile
  const mobileItems = NAV_ITEMS.filter(item => 
    ['Dashboard', 'Bookings', 'Calendar', 'Settings'].includes(item.label)
  );

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/login');
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] h-full px-2 transition-all duration-200',
                isActive ? 'text-[#1E3A5F]' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <div className="relative">
                <span className={cn(
                  'text-xl transition-transform duration-200',
                  isActive && 'scale-110'
                )}>
                  {item.icon}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#B87333] text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium mt-1',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#1E3A5F] rounded-b-full" />
              )}
            </button>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center min-w-[64px] h-full px-2 transition-all duration-200 text-slate-500 hover:text-slate-700"
        >
          <span className="text-xl">🚪</span>
          <span className="text-xs font-medium mt-1">Logout</span>
        </button>
      </div>
    </nav>
  );
}
