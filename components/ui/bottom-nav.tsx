'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

export interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Mobile Bottom Navigation Component
 *
 * Features:
 * - Fixed to bottom of screen
 * - 56px minimum touch targets (WCAG compliant)
 * - Active state highlighting
 * - Badge support for notifications
 * - Smooth transitions
 * - Haptic feedback
 */
export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigation = (href: string) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    router.push(href);
  };

  if (!mounted) return null;

  return (
    <nav
      className={cn(
        // Fixed positioning
        'fixed bottom-0 left-0 right-0 z-50',
        // Styling
        'bg-white border-t-2 border-gray-200',
        'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
        // Safe area for notched devices
        'pb-safe',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                // Base styles
                'flex flex-col items-center justify-center',
                'min-w-[64px] h-full px-2',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
                // Touch target
                'relative',
                // Active state
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 active:text-blue-600'
              )}
            >
              {/* Icon with Badge */}
              <div className="relative">
                <div className={cn(
                  'text-2xl transition-transform duration-200',
                  isActive && 'scale-110'
                )}>
                  {item.icon}
                </div>

                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-xs font-semibold mt-1',
                  'transition-all duration-200',
                  isActive && 'font-bold'
                )}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Hook to get the bottom nav height for adding bottom padding to content
 */
export function useBottomNavHeight() {
  return 64; // 64px (h-16)
}

/**
 * Spacer component to prevent content from being hidden behind bottom nav
 */
export function BottomNavSpacer() {
  return <div className="h-16 w-full" />;
}
