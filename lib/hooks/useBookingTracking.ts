/**
 * Booking Tracking Hook
 *
 * Manages session/visitor IDs and provides tracking functions for:
 * - Abandoned cart recovery
 * - Conversion analytics
 * - Visitor behavior tracking
 *
 * Uses cookies for persistent visitor ID and sessionStorage for session ID.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TrackingData {
  email?: string;
  name?: string;
  phone?: string;
  tourDate?: string;
  startTime?: string;
  durationHours?: number;
  partySize?: number;
  pickupLocation?: string;
  selectedWineries?: number[];
  stepReached?: string;
  formData?: any;
  brandId?: number;
}

interface TrackingState {
  visitorId: string;
  sessionId: string;
  isInitialized: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create a visitor ID (stored in cookie for persistence)
 */
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';

  // Check for existing visitor ID in cookie
  const cookies = document.cookie.split(';');
  const visitorCookie = cookies.find((c) => c.trim().startsWith('ww_visitor='));

  if (visitorCookie) {
    return visitorCookie.split('=')[1]?.trim() || '';
  }

  // Create new visitor ID
  const newVisitorId = `v_${generateId()}`;

  // Set cookie with 1-year expiration
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `ww_visitor=${newVisitorId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

  return newVisitorId;
}

/**
 * Get or create a session ID (stored in sessionStorage)
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  const existingSessionId = sessionStorage.getItem('ww_session');

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = `s_${generateId()}`;
  sessionStorage.setItem('ww_session', newSessionId);

  return newSessionId;
}

/**
 * Get UTM parameters from URL
 */
function getUTMParams(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useBookingTracking() {
  const [state, setState] = useState<TrackingState>({
    visitorId: '',
    sessionId: '',
    isInitialized: false,
  });

  const lastTrackedDataRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTrackedRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();

    setState({
      visitorId,
      sessionId,
      isInitialized: true,
    });

    // Track session start (only once per session)
    if (!sessionTrackedRef.current) {
      sessionTrackedRef.current = true;
      trackSession(visitorId, sessionId);
    }
  }, []);

  /**
   * Track session start
   */
  const trackSession = async (visitorId: string, sessionId: string) => {
    try {
      const utmParams = getUTMParams();

      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session',
          visitorId,
          sessionId,
          referrer: document.referrer || undefined,
          landingPage: window.location.pathname,
          ...utmParams,
        }),
      });
    } catch (error) {
      // Silently fail - tracking should never break the user experience
      console.debug('Session tracking failed:', error);
    }
  };

  /**
   * Track a page view
   */
  const trackPageView = useCallback(
    async (pagePath?: string, pageTitle?: string) => {
      if (!state.isInitialized) return;

      try {
        await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pageview',
            sessionId: state.sessionId,
            visitorId: state.visitorId,
            pagePath: pagePath || window.location.pathname,
            pageTitle: pageTitle || document.title,
            referrer: document.referrer || undefined,
          }),
        });
      } catch (error) {
        console.debug('Page view tracking failed:', error);
      }
    },
    [state.isInitialized, state.sessionId, state.visitorId]
  );

  /**
   * Track booking attempt progress (debounced)
   */
  const trackBookingProgress = useCallback(
    async (data: TrackingData) => {
      if (!state.isInitialized) return;

      // Debounce tracking calls
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        // Avoid duplicate tracking
        const dataKey = JSON.stringify({ ...data, sessionId: state.sessionId });
        if (dataKey === lastTrackedDataRef.current) {
          return;
        }
        lastTrackedDataRef.current = dataKey;

        try {
          const utmParams = getUTMParams();

          await fetch('/api/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'booking',
              sessionId: state.sessionId,
              visitorId: state.visitorId,
              ...data,
              ...utmParams,
              referrer: document.referrer || undefined,
              landingPage: sessionStorage.getItem('ww_landing_page') || window.location.pathname,
            }),
          });
        } catch (error) {
          console.debug('Booking tracking failed:', error);
        }
      }, 500); // 500ms debounce
    },
    [state.isInitialized, state.sessionId, state.visitorId]
  );

  /**
   * Track booking started (user clicked "start booking")
   */
  const trackBookingStarted = useCallback(async () => {
    if (!state.isInitialized) return;

    try {
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'booking_started',
          sessionId: state.sessionId,
        }),
      });
    } catch (error) {
      console.debug('Booking started tracking failed:', error);
    }
  }, [state.isInitialized, state.sessionId]);

  /**
   * Mark booking as converted (completed)
   * Call this when booking is successfully created
   */
  const markConverted = useCallback(
    async (bookingId: number) => {
      if (!state.isInitialized) return;

      try {
        await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'converted',
            sessionId: state.sessionId,
            bookingId,
          }),
        });
      } catch (error) {
        console.debug('Conversion tracking failed:', error);
      }
    },
    [state.isInitialized, state.sessionId]
  );

  // Store landing page on first visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!sessionStorage.getItem('ww_landing_page')) {
        sessionStorage.setItem('ww_landing_page', window.location.pathname);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    visitorId: state.visitorId,
    sessionId: state.sessionId,
    isInitialized: state.isInitialized,
    trackPageView,
    trackBookingProgress,
    trackBookingStarted,
    markConverted,
  };
}

export default useBookingTracking;
