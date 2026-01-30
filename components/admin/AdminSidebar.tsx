'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number | string; // Number for counts, string for labels like "Soon"
  section?: string;
  dynamicBadge?: string; // Key to look up dynamic badge count
  requiredAccess?: string; // 'admin' = full admin only, 'geology' = geology admins, undefined = all roles
}

const NAV_ITEMS: NavItem[] = [
  // Overview (admin only) - reduced from 3 to 2 items
  { label: 'Dashboard', icon: '📊', href: '/admin/dashboard', section: 'Overview', requiredAccess: 'admin' },
  { label: 'Calendar', icon: '📆', href: '/admin/calendar', section: 'Overview', requiredAccess: 'admin' },

  // Sales Pipeline (formerly Operations) - consolidated from 7 to 4 items
  // Consultations, Corporate Requests, Reservations → merged into "Leads"
  // Proposals → replaced by Trip Proposals
  // Tour Offers → renamed to "Shared Tours", marked as coming soon
  { label: 'Leads', icon: '🎯', href: '/admin/leads', section: 'Sales Pipeline', dynamicBadge: 'pendingLeads', requiredAccess: 'admin' },
  { label: 'Trip Proposals', icon: '🗺️', href: '/admin/trip-proposals', section: 'Sales Pipeline', requiredAccess: 'admin' },
  { label: 'Bookings', icon: '📅', href: '/admin/bookings', section: 'Sales Pipeline', requiredAccess: 'admin' },
  { label: 'Shared Tours', icon: '🎫', href: '/admin/shared-tours', section: 'Sales Pipeline', badge: 'Soon', requiredAccess: 'admin' },

  // CRM (admin only) - unified customer relationship management
  { label: 'CRM', icon: '👤', href: '/admin/crm', section: 'CRM', requiredAccess: 'admin' },
  { label: 'Contacts', icon: '📇', href: '/admin/crm/contacts', section: 'CRM', requiredAccess: 'admin' },
  { label: 'Pipeline', icon: '📊', href: '/admin/crm/pipeline', section: 'CRM', requiredAccess: 'admin' },
  { label: 'Tasks', icon: '✅', href: '/admin/crm/tasks', section: 'CRM', dynamicBadge: 'overdueTasks', requiredAccess: 'admin' },

  // Financial (admin only) - reduced from 4 to 2 items
  // Rate Configuration, Payment Settings → moved to System > Settings
  { label: 'Invoices', icon: '💰', href: '/admin/invoices', section: 'Financial', requiredAccess: 'admin' },
  { label: 'Pricing', icon: '🧮', href: '/admin/pricing', section: 'Financial', requiredAccess: 'admin' },

  // Content (admin only) - unchanged
  { label: 'Business Portal', icon: '🏪', href: '/admin/business-portal', section: 'Content', requiredAccess: 'admin' },
  { label: 'Media Library', icon: '📸', href: '/admin/media', section: 'Content', requiredAccess: 'admin' },
  { label: 'Wine Directory', icon: '🍷', href: '/admin/wine-directory', section: 'Content', requiredAccess: 'admin' },

  // Geology (geology_admin and admin) - unchanged
  { label: 'Geology Dashboard', icon: '🪨', href: '/admin/geology', section: 'Geology', requiredAccess: 'geology' },
  { label: 'Topics', icon: '📚', href: '/admin/geology/topics', section: 'Geology', requiredAccess: 'geology' },
  { label: 'Quick Facts', icon: '💡', href: '/admin/geology/facts', section: 'Geology', requiredAccess: 'geology' },
  { label: 'Sites', icon: '📍', href: '/admin/geology/sites', section: 'Geology', requiredAccess: 'geology' },
  { label: 'AI Guidance', icon: '🤖', href: '/admin/geology/ai-guidance', section: 'Geology', requiredAccess: 'geology' },

  // Marketing (admin only) - reduced from 8 to 2 visible items
  // Other items (Analytics, A/B Testing, Social Media, Email, Content Calendar, Competitors)
  // are now sub-navigation inside Marketing Hub
  { label: 'Marketing Hub', icon: '📊', href: '/admin/marketing', section: 'Marketing', requiredAccess: 'admin' },
  { label: 'Leads', icon: '🎯', href: '/admin/marketing/leads', section: 'Marketing', requiredAccess: 'admin' },

  // Services section REMOVED - features live inside Trip Proposals
  // Additional Services, Lunch Orders → managed within Trip Proposals

  // Partners (admin only) - unchanged
  { label: 'Partners', icon: '🤝', href: '/admin/partners', section: 'Partners', requiredAccess: 'admin' },

  // System (admin only) - expanded to include moved config items
  { label: 'Users', icon: '👥', href: '/admin/users', section: 'System', requiredAccess: 'admin' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings', section: 'System', requiredAccess: 'admin' },
];

// Helper to check if user can access an item
function canAccessItem(item: NavItem, userRole: string | undefined): boolean {
  // If no requiredAccess, anyone with any role can see it
  if (!item.requiredAccess) return true;

  // Admin can access everything
  if (userRole === 'admin') return true;

  // Geology admin can access geology items
  if (item.requiredAccess === 'geology' && userRole === 'geology_admin') return true;

  // Staff can access some items (future expansion)
  if (item.requiredAccess === 'staff' && (userRole === 'staff' || userRole === 'admin')) return true;

  return false;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role);
        }
      } catch (error) {
        logger.error('Failed to fetch user role', { error });
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserRole();
  }, []);

  // Fetch dynamic badge counts
  useEffect(() => {
    async function fetchBadgeCounts() {
      try {
        // Fetch booking requests
        const response = await fetch('/api/booking-requests');
        if (response.ok) {
          const data = await response.json();
          setBadgeCounts(prev => ({
            ...prev,
            pendingReservations: data.pendingReservations || data.pendingCount || 0,
            pendingConsultations: data.pendingConsultations || 0,
          }));
        }

        // Fetch CRM task counts
        const crmResponse = await fetch('/api/admin/crm/tasks?overdue=true');
        if (crmResponse.ok) {
          const crmData = await crmResponse.json();
          setBadgeCounts(prev => ({
            ...prev,
            overdueTasks: crmData.overdue || 0,
          }));
        }
      } catch (error) {
        logger.error('Failed to fetch badge counts', { error });
      }
    }

    fetchBadgeCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and group items by section based on user role
  const sections: { [key: string]: NavItem[] } = {};
  NAV_ITEMS.filter(item => canAccessItem(item, userRole)).forEach(item => {
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

                      // Handle string badges (like "Soon")
                      if (typeof badgeValue === 'string') {
                        return (
                          <span className="bg-slate-400 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {badgeValue}
                          </span>
                        );
                      }

                      // Handle number badges (counts)
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
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role);
        }
      } catch (error) {
        logger.error('Failed to fetch user role', { error });
      }
    }
    fetchUserRole();
  }, []);

  // Show role-appropriate items on mobile
  // Full admins see Dashboard, Leads, Trip Proposals, Bookings
  // Geology admins see Geology Dashboard only
  const mobileItems = userRole === 'geology_admin'
    ? NAV_ITEMS.filter(item => item.label === 'Geology Dashboard')
    : NAV_ITEMS.filter(item =>
        ['Dashboard', 'Leads', 'Trip Proposals', 'Bookings'].includes(item.label) &&
        item.section !== 'Marketing' && // Exclude Marketing Leads
        canAccessItem(item, userRole)
      );

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      logger.error('Logout error', { error: err });
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
                {item.badge !== undefined && (
                  typeof item.badge === 'string' ? (
                    <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-slate-400 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {item.badge}
                    </div>
                  ) : item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#B87333] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )
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
