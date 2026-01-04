'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Announcement {
  id: number;
  title: string;
  message: string | null;
  link_text: string | null;
  link_url: string | null;
  type: 'info' | 'warning' | 'promo' | 'event';
  position: 'top' | 'homepage' | 'booking';
  background_color: string | null;
}

interface AnnouncementBannerProps {
  position?: 'top' | 'homepage' | 'booking';
}

// Default colors for each announcement type
const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'i',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '!',
  },
  promo: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: '*',
  },
  event: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '@',
  },
};

const STORAGE_KEY = 'dismissed_announcements';

function getDismissedIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Clean up expired dismissals (older than 7 days)
    const now = Date.now();
    const valid = Object.entries(parsed)
      .filter(([, timestamp]) => now - (timestamp as number) < 7 * 24 * 60 * 60 * 1000)
      .map(([id]) => parseInt(id, 10));
    return valid;
  } catch {
    return [];
  }
}

function dismissAnnouncement(id: number): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[id] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore localStorage errors
  }
}

export function AnnouncementBanner({ position = 'top' }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load dismissed IDs from localStorage
    setDismissedIds(getDismissedIds());

    // Fetch active announcements
    async function fetchAnnouncements() {
      try {
        const response = await fetch(`/api/announcements?position=${position}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, [position]);

  const handleDismiss = (id: number) => {
    dismissAnnouncement(id);
    setDismissedIds((prev) => [...prev, id]);
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  // Don't render anything while loading or if no visible announcements
  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAnnouncements.map((announcement) => {
        const styles = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
        const customBg = announcement.background_color
          ? { backgroundColor: announcement.background_color }
          : undefined;

        return (
          <div
            key={announcement.id}
            className={`relative border ${styles.border} ${customBg ? '' : styles.bg} ${styles.text} px-4 py-3`}
            style={customBg}
            role="alert"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Type indicator */}
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">
                  {styles.icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{announcement.title}</span>
                  {announcement.message && (
                    <span className="ml-2 opacity-90">{announcement.message}</span>
                  )}
                </div>

                {/* Link button */}
                {announcement.link_url && announcement.link_text && (
                  <Link
                    href={announcement.link_url}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium
                      bg-current/10 hover:bg-current/20 transition-colors`}
                  >
                    {announcement.link_text}
                  </Link>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(announcement.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-current/10 transition-colors"
                aria-label="Dismiss announcement"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
