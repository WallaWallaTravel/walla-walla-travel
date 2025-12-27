import { create } from 'zustand';

interface AnalyticsEvent {
  event: string;
  timestamp: number;
  properties?: Record<string, unknown>;
}

export interface AnalyticsState {
  events: AnalyticsEvent[];
  sessionId: string;

  // Actions
  trackSearch: (query: string, category: string, resultsCount: number) => void;
  trackFilterApplied: (filterType: string, filterValue: string) => void;
  trackWineryView: (wineryId: number, wineryName: string) => void;
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackPhoneClick: (wineryId: number, wineryName: string) => void;
  trackExternalLinkClick: (wineryId: number, wineryName: string, linkType: string) => void;
  trackReservationClick: (wineryId: number, wineryName: string) => void;
  trackWineryAdded: (wineryId: number, wineryName: string) => void;
}

// Generate a simple session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  events: [],
  sessionId: generateSessionId(),

  trackSearch: (query: string, category: string, resultsCount: number) => {
    const event: AnalyticsEvent = {
      event: 'search',
      timestamp: Date.now(),
      properties: {
        query,
        category,
        resultsCount,
      },
    };

    set({ events: [...get().events, event] });

    // Send to analytics endpoint in the background (optional)
    if (typeof window !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail - analytics shouldn't break the app
      });
    }
  },

  trackFilterApplied: (filterType: string, filterValue: string) => {
    const event: AnalyticsEvent = {
      event: 'filter_applied',
      timestamp: Date.now(),
      properties: {
        filterType,
        filterValue,
      },
    };

    set({ events: [...get().events, event] });

    if (typeof window !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail
      });
    }
  },

  trackWineryView: (wineryId: number, wineryName: string) => {
    const event: AnalyticsEvent = {
      event: 'winery_view',
      timestamp: Date.now(),
      properties: {
        wineryId,
        wineryName,
      },
    };

    set({ events: [...get().events, event] });

    if (typeof window !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail
      });
    }
  },

  trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
    const event: AnalyticsEvent = {
      event: eventName,
      timestamp: Date.now(),
      properties,
    };

    set({ events: [...get().events, event] });

    if (typeof window !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail
      });
    }
  },

  trackPhoneClick: (wineryId: number, wineryName: string) => {
    get().trackEvent('phone_click', { wineryId, wineryName });
  },

  trackExternalLinkClick: (wineryId: number, wineryName: string, linkType: string) => {
    get().trackEvent('external_link_click', { wineryId, wineryName, linkType });
  },

  trackReservationClick: (wineryId: number, wineryName: string) => {
    get().trackEvent('reservation_click', { wineryId, wineryName });
  },

  trackWineryAdded: (wineryId: number, wineryName: string) => {
    get().trackEvent('winery_added', { wineryId, wineryName });
  },
}));
