/**
 * Lodging Data Layer for Server Components
 *
 * Provides server-side data fetching for lodging pages.
 * Used by generateMetadata and generateStaticParams for SEO optimization.
 */

import { lodgingService, LodgingProperty, LodgingPropertySummary } from '@/lib/services/lodging.service';
import { cache } from 'react';

// ============================================================================
// Cached Data Fetching Functions
// ============================================================================

/**
 * Get all active lodging properties (cached per request)
 */
export const getLodgingProperties = cache(async (): Promise<LodgingPropertySummary[]> => {
  return lodgingService.getAll();
});

/**
 * Get a single lodging property by slug (cached per request)
 */
export const getLodgingBySlug = cache(async (slug: string): Promise<LodgingProperty | null> => {
  return lodgingService.getBySlug(slug);
});

/**
 * Get all lodging slugs for static generation
 */
export const getAllLodgingSlugs = cache(async (): Promise<string[]> => {
  return lodgingService.getAllSlugs();
});

/**
 * Get featured lodging properties
 */
export const getFeaturedLodging = cache(async (limit: number = 6): Promise<LodgingPropertySummary[]> => {
  return lodgingService.getFeatured(limit);
});

/**
 * Get total lodging property count
 */
export const getLodgingCount = cache(async (): Promise<number> => {
  return lodgingService.getCount();
});

// Re-export types
export type { LodgingProperty, LodgingPropertySummary };
