'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: '/partner-portal/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    title: 'Business Info',
    items: [
      { href: '/partner-portal/profile', label: 'Business Profile', icon: '🏢' },
      { href: '/partner-portal/listing', label: 'Directory Listing', icon: '📝' },
      { href: '/partner-portal/media', label: 'Photos & Media', icon: '📷' },
    ],
  },
  {
    title: 'Your Content',
    items: [
      { href: '/partner-portal/story', label: 'Your Story', icon: '📖' },
      { href: '/partner-portal/tips', label: 'Insider Tips', icon: '💡' },
    ],
  },
  {
    items: [
      { href: '/partner-portal/analytics', label: 'Analytics', icon: '📈' },
    ],
  },
];

export function PartnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login?portal=partners');
      router.refresh();
    } catch (error) {
      logger.error('Logout error', { error });
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🤝</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Partner Portal</div>
            <div className="text-xs text-slate-500">Walla Walla Travel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-4">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <span className="text-base">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}







