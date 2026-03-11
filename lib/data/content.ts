/**
 * Content Management Helper
 *
 * @module lib/data/content
 * @description Fetches content from the CMS database with fallback to hardcoded values.
 * This allows content to be edited through the admin UI while maintaining reliability
 * if database content is not available.
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface PageContentItem {
  page_slug: string;
  section_key: string;
  content_type: 'text' | 'html' | 'json' | 'number';
  content: string;
  metadata: Record<string, unknown>;
}

export interface CollectionItem {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  content: Record<string, unknown>;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
}

// ============================================================================
// Hardcoded Fallback Defaults
// ============================================================================

const HOMEPAGE_DEFAULTS: Record<string, string> = {
  hero_headline: 'Your Guide to Walla Walla Wine Country',
  hero_subheadline: '120+ wineries. Personalized recommendations. Unforgettable experiences.',
  stats_wineries: '120',
  stats_districts: '6',
  stats_varietals: '40',
  stats_experience: '25',
};

const ABOUT_DEFAULTS: Record<string, string> = {
  intro_title: 'Your Local Guide to Walla Walla Wine Country',
  intro_paragraph: "We're not just another travel website. We're your neighbors, your friends, and your personal guides to everything that makes Walla Walla special.",
  mission_statement: 'To help visitors discover the authentic Walla Walla wine country experience through expert local knowledge and genuine hospitality.',
};

const PAGE_DEFAULTS: Record<string, Record<string, string>> = {
  homepage: HOMEPAGE_DEFAULTS,
  about: ABOUT_DEFAULTS,
};

const NEIGHBORHOODS_DEFAULTS: CollectionItem[] = [
  {
    slug: 'downtown',
    title: 'Downtown',
    subtitle: 'Urban Wine District',
    description: 'The heart of Walla Walla wine tasting, with over 30 tasting rooms within walking distance.',
    content: { highlights: ['Walk to 30+ tasting rooms', 'Historic architecture', 'World-class restaurants', 'Local shops and galleries'], wineryCount: 30 },
    image_url: null,
    icon: null,
    sort_order: 1,
  },
  {
    slug: 'airport',
    title: 'Airport District',
    subtitle: 'Pioneer Wine Territory',
    description: "Where it all began. Home to legendary wineries including L'Ecole No 41, Woodward Canyon, and Pepper Bridge.",
    content: { highlights: ['Historic wineries', 'Scenic vineyard views', 'Intimate tasting experiences', 'Rich winemaking heritage'], wineryCount: 15 },
    image_url: null,
    icon: null,
    sort_order: 2,
  },
  {
    slug: 'southside',
    title: 'Southside',
    subtitle: 'Artisan Wine Country',
    description: 'A diverse collection of boutique wineries showcasing innovative winemaking and unique varietals.',
    content: { highlights: ['Boutique producers', 'Innovative wines', 'Relaxed atmosphere', 'Hidden gems'], wineryCount: 20 },
    image_url: null,
    icon: null,
    sort_order: 3,
  },
  {
    slug: 'westside',
    title: 'Westside',
    subtitle: 'Scenic Wine Route',
    description: 'Stunning views and exceptional wines along the western edge of the valley.',
    content: { highlights: ['Mountain views', 'Award-winning estates', 'Picnic-friendly grounds', 'Photography opportunities'], wineryCount: 12 },
    image_url: null,
    icon: null,
    sort_order: 4,
  },
  {
    slug: 'rocks-district',
    title: 'The Rocks District',
    subtitle: 'AVA Excellence',
    description: "America's first AVA based on soil type. Known for distinctive wines shaped by ancient river cobbles.",
    content: { highlights: ['Unique terroir', 'Syrah excellence', 'Geologic significance', 'Premium estates'], wineryCount: 10 },
    image_url: null,
    icon: null,
    sort_order: 5,
  },
  {
    slug: 'sevein',
    title: 'SeVein',
    subtitle: 'Seven Hills Excellence',
    description: 'Premium wineries in the Seven Hills area, known for exceptional Cabernet Sauvignon and Merlot.',
    content: { highlights: ['Premium Cabernet', 'Established vineyards', 'Elegant estates', 'Stunning landscapes'], wineryCount: 8 },
    image_url: null,
    icon: null,
    sort_order: 6,
  },
];

const COLLECTION_DEFAULTS: Record<string, CollectionItem[]> = {
  neighborhoods: NEIGHBORHOODS_DEFAULTS,
};

// ============================================================================
// Content Fetching Functions
// ============================================================================

/**
 * Get a single content value for a page section
 * Falls back to hardcoded default if database content not found
 */
export async function getPageContent<T = string>(
  pageSlug: string,
  sectionKey: string
): Promise<T> {
  try {
    const result = await query<PageContentItem>(
      `SELECT content, content_type FROM page_content WHERE page_slug = $1 AND section_key = $2`,
      [pageSlug, sectionKey]
    );

    if (result.rows.length > 0) {
      const { content, content_type } = result.rows[0];

      // Parse based on content type
      switch (content_type) {
        case 'number':
          return parseFloat(content) as T;
        case 'json':
          return JSON.parse(content) as T;
        default:
          return content as T;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch page content from DB, using fallback', {
      pageSlug,
      sectionKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Fallback to hardcoded default
  const fallback = PAGE_DEFAULTS[pageSlug]?.[sectionKey];
  if (fallback !== undefined) {
    return fallback as T;
  }

  // If no fallback exists, return empty string or 0 for numbers
  logger.warn('No fallback found for content', { pageSlug, sectionKey });
  return '' as T;
}

/**
 * Get all content sections for a page
 */
export async function getAllPageContent(pageSlug: string): Promise<Record<string, string>> {
  try {
    const result = await query<PageContentItem>(
      `SELECT section_key, content, content_type FROM page_content WHERE page_slug = $1`,
      [pageSlug]
    );

    if (result.rows.length > 0) {
      const content: Record<string, string> = {};
      for (const row of result.rows) {
        content[row.section_key] = row.content;
      }
      return content;
    }
  } catch (error) {
    logger.warn('Failed to fetch all page content from DB, using fallback', {
      pageSlug,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Fallback to hardcoded defaults
  return PAGE_DEFAULTS[pageSlug] || {};
}

/**
 * Get collection items
 * Falls back to hardcoded defaults if database content not found
 */
export async function getCollectionItems(collectionType: string): Promise<CollectionItem[]> {
  try {
    const result = await query<CollectionItem & { is_active: boolean }>(
      `SELECT slug, title, subtitle, description, content, image_url, icon, sort_order
       FROM content_collections
       WHERE collection_type = $1 AND is_active = true
       ORDER BY sort_order, title`,
      [collectionType]
    );

    if (result.rows.length > 0) {
      return result.rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        image_url: row.image_url,
        icon: row.icon,
        sort_order: row.sort_order,
      }));
    }
  } catch (error) {
    logger.warn('Failed to fetch collection from DB, using fallback', {
      collectionType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Fallback to hardcoded defaults
  return COLLECTION_DEFAULTS[collectionType] || [];
}

/**
 * Get a single collection item by slug
 */
export async function getCollectionItem(
  collectionType: string,
  slug: string
): Promise<CollectionItem | null> {
  try {
    const result = await query<CollectionItem>(
      `SELECT slug, title, subtitle, description, content, image_url, icon, sort_order
       FROM content_collections
       WHERE collection_type = $1 AND slug = $2 AND is_active = true`,
      [collectionType, slug]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        image_url: row.image_url,
        icon: row.icon,
        sort_order: row.sort_order,
      };
    }
  } catch (error) {
    logger.warn('Failed to fetch collection item from DB, using fallback', {
      collectionType,
      slug,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Fallback to hardcoded defaults
  return COLLECTION_DEFAULTS[collectionType]?.find((item) => item.slug === slug) || null;
}

// ============================================================================
// Convenience Functions for Common Content
// ============================================================================

/**
 * Get homepage hero content
 */
export async function getHomepageHero(): Promise<{
  headline: string;
  subheadline: string;
}> {
  const [headline, subheadline] = await Promise.all([
    getPageContent<string>('homepage', 'hero_headline'),
    getPageContent<string>('homepage', 'hero_subheadline'),
  ]);

  return { headline, subheadline };
}

/**
 * Get homepage stats
 */
export async function getHomepageStats(): Promise<{
  wineries: number;
  districts: number;
  varietals: number;
  experience: number;
}> {
  const [wineries, districts, varietals, experience] = await Promise.all([
    getPageContent<number>('homepage', 'stats_wineries'),
    getPageContent<number>('homepage', 'stats_districts'),
    getPageContent<number>('homepage', 'stats_varietals'),
    getPageContent<number>('homepage', 'stats_experience'),
  ]);

  return {
    wineries: Number(wineries) || 120,
    districts: Number(districts) || 6,
    varietals: Number(varietals) || 40,
    experience: Number(experience) || 25,
  };
}

/**
 * Get neighborhoods for display
 */
export async function getNeighborhoods(): Promise<CollectionItem[]> {
  return getCollectionItems('neighborhoods');
}
