import { MetadataRoute } from 'next';
import { getAllWinerySlugs } from '@/lib/data/wineries';
import { logger } from '@/lib/logger';

// Force dynamic rendering - sitemap needs fresh data
export const dynamic = 'force-dynamic';

/**
 * Dynamic Sitemap Generation
 *
 * Generates a sitemap.xml for search engines with:
 * - Static pages (home, wineries, tours, etc.)
 * - Dynamic winery pages (fetched from database)
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
      url: `${baseUrl}/tours`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7, // E-E-A-T page - higher priority
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

  return [...staticPages, ...wineryPages];
}
