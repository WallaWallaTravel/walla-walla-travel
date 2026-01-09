/**
 * Google Analytics 4 Client-Side Tracking
 *
 * Usage:
 * import { trackEvent, trackPageView } from '@/lib/analytics/ga4';
 *
 * trackEvent('booking_redirect', { winery_slug: 'sleight-of-hand' });
 */

// Type definitions for gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Check if GA4 is available
 */
export function isGA4Available(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Track a custom event in GA4
 *
 * @example
 * trackEvent('booking_redirect', { winery_slug: 'sleight-of-hand', winery_name: 'Sleight of Hand' });
 * trackEvent('chat_started');
 * trackEvent('winery_viewed', { winery_slug: 'leonetti-cellar' });
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isGA4Available()) {
    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GA4 Debug] Event: ${eventName}`, params);
    }
    return;
  }

  window.gtag?.('event', eventName, params);
}

/**
 * Track a page view (usually automatic with GA4, but useful for SPA navigation)
 */
export function trackPageView(url: string, title?: string): void {
  if (!isGA4Available()) return;

  window.gtag?.('event', 'page_view', {
    page_location: url,
    page_title: title,
  });
}

// Pre-defined event helpers for type safety and consistency

/**
 * Track when a user starts interacting with the AI chat
 */
export function trackChatStarted(source?: string): void {
  trackEvent('chat_started', source ? { source } : undefined);
}

/**
 * Track when a user views a winery detail page
 */
export function trackWineryViewed(winerySlug: string, wineryName: string): void {
  trackEvent('winery_viewed', {
    winery_slug: winerySlug,
    winery_name: wineryName,
  });
}

/**
 * Track when a user clicks to book a tasting (intent)
 */
export function trackBookingIntent(winerySlug: string, wineryName: string): void {
  trackEvent('booking_intent', {
    winery_slug: winerySlug,
    winery_name: wineryName,
  });
}

/**
 * Track when a user is redirected to external booking (via /go/[slug])
 */
export function trackBookingRedirect(
  winerySlug: string,
  wineryName: string,
  destination: string
): void {
  trackEvent('booking_redirect', {
    winery_slug: winerySlug,
    winery_name: wineryName,
    destination_url: destination,
  });
}

/**
 * Track when a user views a neighborhood page
 */
export function trackNeighborhoodViewed(neighborhoodSlug: string): void {
  trackEvent('neighborhood_viewed', {
    neighborhood_slug: neighborhoodSlug,
  });
}

/**
 * Track when a user views a "best of" listicle page
 */
export function trackBestOfViewed(category: string): void {
  trackEvent('best_of_viewed', {
    category,
  });
}

/**
 * Track search/filter interactions
 */
export function trackSearch(query: string, resultCount: number): void {
  trackEvent('search', {
    search_term: query,
    result_count: resultCount,
  });
}

/**
 * Track filter usage
 */
export function trackFilterUsed(filterType: string, filterValue: string): void {
  trackEvent('filter_used', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}
