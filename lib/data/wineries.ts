/**
 * Winery Data Layer for Server Components
 *
 * This module provides server-side data fetching for winery pages.
 * Used by generateMetadata and generateStaticParams for SEO optimization.
 */

import { wineryService, Winery, WinerySummary } from '@/lib/services/winery.service';
import { cache } from 'react';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// ============================================================================
// Narrative Content Types
// ============================================================================

export interface WineryContent {
  content_type: string;
  title: string | null;
  content: string;
}

export interface InsiderTip {
  id: number;
  tip_type: string;
  title: string | null;
  content: string;
  is_featured: boolean;
}

export interface WineryNarrativeContent {
  originStory: WineryContent | null;
  philosophy: WineryContent | null;
  uniqueStory: WineryContent | null;
  insiderTips: InsiderTip[];
}

// ============================================================================
// Cached Data Fetching Functions
// ============================================================================

/**
 * Get all verified wineries (cached per request)
 * Only shows wineries that have been verified by partners or admin
 */
export const getWineries = cache(async (): Promise<WinerySummary[]> => {
  return wineryService.getVerified();
});

/**
 * Get a single winery by slug (cached per request)
 */
export const getWineryBySlug = cache(async (slug: string): Promise<Winery | null> => {
  return wineryService.getBySlug(slug);
});

/**
 * Get all winery slugs for static generation
 */
export const getAllWinerySlugs = cache(async (): Promise<string[]> => {
  const wineries = await wineryService.getAll();
  return wineries.map(w => w.slug);
});

/**
 * Get featured wineries (top rated)
 */
export const getFeaturedWineries = cache(async (limit: number = 6): Promise<WinerySummary[]> => {
  return wineryService.getFeatured(limit);
});

/**
 * Get total winery count
 */
export const getWineryCount = cache(async (): Promise<number> => {
  return wineryService.getCount();
});

/**
 * Get narrative content for a winery (origin story, philosophy, tips)
 * This is the "soul layer" - content that creates emotional connection
 */
export const getWineryNarrativeContent = cache(async (wineryId: number): Promise<WineryNarrativeContent> => {
  try {
    // Get narrative content from winery_content table
    const contentResult = await query<WineryContent>(
      `SELECT content_type, title, content
       FROM winery_content
       WHERE winery_id = $1
         AND content_type IN ('origin_story', 'philosophy', 'unique_story')
         AND LENGTH(content) > 50
       ORDER BY content_type`,
      [wineryId]
    );

    // Get verified insider tips (prioritize featured, limit to 6)
    const tipsResult = await query<InsiderTip>(
      `SELECT id, tip_type, title, content, is_featured
       FROM winery_insider_tips
       WHERE winery_id = $1
         AND verified = true
       ORDER BY is_featured DESC, created_at DESC
       LIMIT 6`,
      [wineryId]
    );

    const content = contentResult.rows;

    return {
      originStory: content.find(c => c.content_type === 'origin_story') || null,
      philosophy: content.find(c => c.content_type === 'philosophy') || null,
      uniqueStory: content.find(c => c.content_type === 'unique_story') || null,
      insiderTips: tipsResult.rows,
    };
  } catch (error) {
    // Return empty content if query fails (tables may not exist yet)
    logger.error('Error fetching narrative content', { error });
    return {
      originStory: null,
      philosophy: null,
      uniqueStory: null,
      insiderTips: [],
    };
  }
});

// Re-export types
export type { Winery, WinerySummary };
