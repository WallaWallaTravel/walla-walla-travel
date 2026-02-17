import { MetadataRoute } from 'next';
import { getAllWinerySlugs } from '@/lib/data/wineries';
import { getAllHistoryEraSlugs } from '@/lib/data/history';
import { getAllGuideSlugs } from '@/lib/data/guides';
import { getAllItinerarySlugs } from '@/lib/data/itineraries';
import { getAllNeighborhoodSlugs } from '@/lib/data/neighborhoods';
import { getAllBestOfCategorySlugs } from '@/lib/data/best-of-categories';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// Force dynamic rendering - sitemap needs fresh data
export const dynamic = 'force-dynamic';

/**
 * Dynamic Sitemap Generation
 *
 * Generates a sitemap.xml for search engines with:
 * - Static pages (home, wineries, about, etc.)
 * - Dynamic winery pages (fetched from database)
 * - Content pages (guides, itineraries, neighborhoods, best-of, geology)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wallawalla.travel';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/wineries`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/geology`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/itineraries`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/neighborhoods`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/best-of`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/plan-your-visit`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7, // E-E-A-T page - higher priority
    },
    {
      url: `${baseUrl}/inquiry`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cancellation-policy`,
      lastModified: new Date('2025-11-11'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5, // For developers and AI systems
    },
  ];

  // History pages (static data)
  const historyLanding: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/history`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  const historyPages: MetadataRoute.Sitemap = getAllHistoryEraSlugs().map((slug) => ({
    url: `${baseUrl}/history/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Guide pages (static data)
  const guidePages: MetadataRoute.Sitemap = getAllGuideSlugs().map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Itinerary pages (static data)
  const itineraryPages: MetadataRoute.Sitemap = getAllItinerarySlugs().map((slug) => ({
    url: `${baseUrl}/itineraries/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Neighborhood pages (static data)
  const neighborhoodPages: MetadataRoute.Sitemap = getAllNeighborhoodSlugs().map((slug) => ({
    url: `${baseUrl}/neighborhoods/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Best-of category pages (static data)
  const bestOfPages: MetadataRoute.Sitemap = getAllBestOfCategorySlugs().map((slug) => ({
    url: `${baseUrl}/best-of/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Dynamic winery pages
  let wineryPages: MetadataRoute.Sitemap = [];

  try {
    const winerySlugs = await getAllWinerySlugs();
    wineryPages = winerySlugs.map((slug) => ({
      url: `${baseUrl}/wineries/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    // If database is unavailable, return only static pages
    logger.error('Error fetching winery slugs for sitemap', { error });
  }

  // Dynamic geology topic pages
  let geologyPages: MetadataRoute.Sitemap = [];

  try {
    const result = await query<{ slug: string }>(
      'SELECT slug FROM geology_topics WHERE is_published = true ORDER BY display_order ASC'
    );
    geologyPages = result.rows.map((row) => ({
      url: `${baseUrl}/geology/${row.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    logger.error('Error fetching geology slugs for sitemap', { error });
  }

  return [
    ...staticPages,
    ...historyLanding,
    ...historyPages,
    ...guidePages,
    ...itineraryPages,
    ...neighborhoodPages,
    ...bestOfPages,
    ...wineryPages,
    ...geologyPages,
  ];
}
