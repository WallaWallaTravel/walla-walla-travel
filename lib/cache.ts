/**
 * Caching Layer
 * Strategic caching for performance optimization
 * Uses Next.js built-in caching with revalidation
 */

import { unstable_cache } from 'next/cache';
import { query } from './db';

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TAGS = {
  wineries: 'wineries',
  restaurants: 'restaurants',
  systemSettings: 'system-settings',
  pricingRules: 'pricing-rules',
  brands: 'brands',
  vehicles: 'vehicles',
  rateConfig: 'rate-config',
} as const;

const CACHE_DURATIONS = {
  short: 60,        // 1 minute
  medium: 300,      // 5 minutes
  long: 1800,       // 30 minutes
  veryLong: 3600,   // 1 hour
  day: 86400,       // 24 hours
} as const;

// ============================================================================
// Cached Queries
// ============================================================================

/**
 * Get all active wineries (cached for 1 hour)
 * Perfect for dropdown menus and selection lists
 */
export const getCachedWineries = unstable_cache(
  async () => {
    const result = await query(`
      SELECT 
        id, 
        name, 
        slug, 
        tasting_fee, 
        address, 
        phone, 
        website,
        is_featured
      FROM wineries 
      WHERE is_active = true
      ORDER BY is_featured DESC, name ASC
    `);
    return result.rows;
  },
  ['wineries-active'],
  {
    revalidate: CACHE_DURATIONS.veryLong,
    tags: [CACHE_TAGS.wineries],
  }
);

/**
 * Get active restaurants (cached for 1 hour)
 */
export const getCachedRestaurants = unstable_cache(
  async () => {
    const result = await query(`
      SELECT 
        id, 
        name, 
        cuisine_type, 
        phone, 
        email,
        accepts_pre_orders,
        minimum_order_value
      FROM restaurants 
      WHERE is_active = true
      ORDER BY name ASC
    `);
    return result.rows;
  },
  ['restaurants-active'],
  {
    revalidate: CACHE_DURATIONS.veryLong,
    tags: [CACHE_TAGS.restaurants],
  }
);

/**
 * Get system settings (cached for 5 minutes)
 * These change rarely but need to be fresh
 */
export const getCachedSystemSettings = unstable_cache(
  async () => {
    const result = await query(`
      SELECT setting_key, setting_value, data_type
      FROM system_settings
    `);
    
    // Convert to key-value object
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      const value = row.setting_value;
      settings[row.setting_key] = 
        row.data_type === 'number' ? parseFloat(value) :
        row.data_type === 'boolean' ? value === 'true' :
        value;
    }
    
    return settings;
  },
  ['system-settings'],
  {
    revalidate: CACHE_DURATIONS.medium,
    tags: [CACHE_TAGS.systemSettings],
  }
);

/**
 * Get pricing rules (cached for 30 minutes)
 */
export const getCachedPricingRules = unstable_cache(
  async () => {
    const result = await query(`
      SELECT * 
      FROM pricing_rules 
      WHERE is_active = true
      ORDER BY priority DESC
    `);
    return result.rows;
  },
  ['pricing-rules-active'],
  {
    revalidate: CACHE_DURATIONS.long,
    tags: [CACHE_TAGS.pricingRules],
  }
);

/**
 * Get all brands (cached for 1 hour)
 */
export const getCachedBrands = unstable_cache(
  async () => {
    const result = await query(`
      SELECT 
        id, 
        brand_code, 
        brand_name, 
        display_name, 
        tagline, 
        website_url,
        active
      FROM brands 
      WHERE active = true
      ORDER BY display_name ASC
    `);
    return result.rows;
  },
  ['brands-active'],
  {
    revalidate: CACHE_DURATIONS.veryLong,
    tags: [CACHE_TAGS.brands],
  }
);

/**
 * Get available vehicles (cached for 30 minutes)
 */
export const getCachedVehicles = unstable_cache(
  async () => {
    const result = await query(`
      SELECT 
        id, 
        make, 
        model, 
        type, 
        capacity, 
        license_plate,
        is_active
      FROM vehicles 
      WHERE is_active = true
      ORDER BY capacity ASC
    `);
    return result.rows;
  },
  ['vehicles-active'],
  {
    revalidate: CACHE_DURATIONS.long,
    tags: [CACHE_TAGS.vehicles],
  }
);

/**
 * Get rate configuration (cached for 1 hour)
 */
export const getCachedRateConfig = unstable_cache(
  async () => {
    const result = await query(`
      SELECT 
        rate_type,
        party_size_min,
        party_size_max,
        day_type,
        hourly_rate,
        minimum_hours
      FROM rate_config 
      WHERE is_active = true
      ORDER BY rate_type, party_size_min, day_type
    `);
    return result.rows;
  },
  ['rate-config'],
  {
    revalidate: CACHE_DURATIONS.veryLong,
    tags: [CACHE_TAGS.rateConfig],
  }
);

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate cache by tag
 * Call this when data changes
 */
export async function invalidateCache(tag: keyof typeof CACHE_TAGS) {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS[tag]);
}

/**
 * Invalidate multiple cache tags
 */
export async function invalidateCaches(tags: Array<keyof typeof CACHE_TAGS>) {
  const { revalidateTag } = await import('next/cache');
  for (const tag of tags) {
    revalidateTag(CACHE_TAGS[tag]);
  }
}

/**
 * Invalidate all caches
 * Use sparingly - only for major data changes
 */
export async function invalidateAllCaches() {
  const { revalidateTag } = await import('next/cache');
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag);
  }
}

// ============================================================================
// Query-Level Caching Wrapper
// ============================================================================

/**
 * Create a cached query function
 * For custom queries that need caching
 */
export function createCachedQuery<T>(
  queryFn: () => Promise<T>,
  cacheKey: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
) {
  return unstable_cache(
    queryFn,
    cacheKey,
    {
      revalidate: options.revalidate || CACHE_DURATIONS.medium,
      tags: options.tags || [],
    }
  );
}

// ============================================================================
// Usage Examples (for reference)
// ============================================================================

/*

// Example 1: Use cached data in API route
import { getCachedWineries } from '@/lib/cache';

export async function GET() {
  const wineries = await getCachedWineries();
  return Response.json({ wineries });
}

// Example 2: Invalidate cache when data changes
import { invalidateCache } from '@/lib/cache';

export async function POST(request: Request) {
  // ... create new winery ...
  await invalidateCache('wineries'); // Refresh cache
  return Response.json({ success: true });
}

// Example 3: Create custom cached query
import { createCachedQuery } from '@/lib/cache';

const getCachedTopBookings = createCachedQuery(
  async () => {
    return await query('SELECT * FROM bookings ORDER BY total_price DESC LIMIT 10');
  },
  ['top-bookings'],
  { revalidate: 300, tags: ['bookings'] }
);

// Example 4: Use in service layer
export class WineryService extends BaseService {
  async getActiveWineries() {
    // Use cached version
    return await getCachedWineries();
  }
}

*/

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Log cache hit/miss for monitoring
 * (For debugging and optimization)
 */
export function logCacheMetrics(
  cacheKey: string,
  hit: boolean,
  duration: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Cache ${hit ? 'HIT' : 'MISS'}] ${cacheKey} (${duration}ms)`
    );
  }
}


