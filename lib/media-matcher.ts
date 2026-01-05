/**
 * Media Matcher - Smart Media Suggestions
 * Auto-links appropriate photos/videos to proposals and itineraries
 */

import { Pool } from 'pg';
import { getDbConfig } from './config/database';

interface Media {
  id: number;
  file_path: string;
  file_type: 'image' | 'video';
  title: string;
  description?: string;
  alt_text?: string;
  category: string;
  subcategory?: string;
  tags: string[];
  is_hero: boolean;
  thumbnail_path?: string;
  medium_path?: string;
  large_path?: string;
}

interface MediaSuggestion extends Media {
  relevance_score: number;
  reason: string;
  suggested_section: string; // 'hero', 'gallery', 'service_1', etc.
}

interface ServiceItem {
  id: string;
  service_type: string;
  selected_wineries?: Array<{ id: number; name: string }>;
}

/**
 * Get media for a specific winery
 */
export async function getWineryMedia(wineryId: number): Promise<Media[]> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.file_path,
        m.file_type,
        m.title,
        m.description,
        m.alt_text,
        m.category,
        m.subcategory,
        m.tags,
        m.is_hero,
        m.thumbnail_path,
        m.medium_path,
        m.large_path,
        wm.section,
        wm.is_primary,
        wm.display_order
      FROM media_library m
      JOIN winery_media wm ON m.id = wm.media_id
      WHERE wm.winery_id = $1
        AND m.is_active = TRUE
      ORDER BY wm.is_primary DESC, wm.display_order ASC`,
      [wineryId]
    );
    
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Get default media for a service type
 */
export async function getServiceTypeMedia(serviceType: string): Promise<Media[]> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.file_path,
        m.file_type,
        m.title,
        m.description,
        m.alt_text,
        m.category,
        m.subcategory,
        m.tags,
        m.is_hero,
        m.thumbnail_path,
        m.medium_path,
        m.large_path,
        stm.is_default
      FROM media_library m
      JOIN service_type_media stm ON m.id = stm.media_id
      WHERE stm.service_type = $1
        AND m.is_active = TRUE
      ORDER BY stm.is_default DESC, stm.display_order ASC`,
      [serviceType]
    );
    
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Get hero image for brand/location
 */
export async function getHeroImage(category: string = 'brand'): Promise<Media | null> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        id,
        file_path,
        file_type,
        title,
        description,
        alt_text,
        category,
        subcategory,
        tags,
        is_hero,
        thumbnail_path,
        medium_path,
        large_path
      FROM media_library
      WHERE category = $1
        AND is_hero = TRUE
        AND is_active = TRUE
      ORDER BY display_order ASC
      LIMIT 1`,
      [category]
    );
    
    return result.rows[0] || null;
  } finally {
    await pool.end();
  }
}

/**
 * Search media by tags
 */
export async function searchMediaByTags(tags: string[]): Promise<Media[]> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        id,
        file_path,
        file_type,
        title,
        description,
        alt_text,
        category,
        subcategory,
        tags,
        is_hero,
        thumbnail_path,
        medium_path,
        large_path
      FROM media_library
      WHERE tags && $1::text[]
        AND is_active = TRUE
      ORDER BY 
        CASE WHEN is_hero THEN 0 ELSE 1 END,
        display_order ASC`,
      [tags]
    );
    
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Suggest media for a proposal based on service items
 */
export async function suggestProposalMedia(serviceItems: ServiceItem[]): Promise<MediaSuggestion[]> {
  const suggestions: MediaSuggestion[] = [];
  
  // 1. Get hero image (highest priority)
  const heroImage = await getHeroImage('brand');
  if (heroImage) {
    suggestions.push({
      ...heroImage,
      relevance_score: 100,
      reason: 'Brand hero image',
      suggested_section: 'hero'
    });
  }
  
  // 2. Get media for each service
  for (let i = 0; i < serviceItems.length; i++) {
    const service = serviceItems[i];
    const serviceMedia = await getServiceTypeMedia(service.service_type);
    
    serviceMedia.forEach((media, index) => {
      suggestions.push({
        ...media,
        relevance_score: 90 - index * 5,
        reason: `Default image for ${service.service_type}`,
        suggested_section: `service_${i + 1}`
      });
    });
    
    // 3. Get winery media if it's a wine tour
    if (service.service_type === 'wine_tour' && service.selected_wineries) {
      for (const winery of service.selected_wineries) {
        const wineryMedia = await getWineryMedia(winery.id);
        
        wineryMedia.forEach((media, index) => {
          suggestions.push({
            ...media,
            relevance_score: 80 - index * 2,
            reason: `Photo of ${winery.name}`,
            suggested_section: `winery_${winery.id}`
          });
        });
      }
    }
  }
  
  // 4. Get general location/lifestyle images
  const lifestyleMedia = await searchMediaByTags(['walla-walla', 'lifestyle', 'wine']);
  lifestyleMedia.slice(0, 5).forEach((media, index) => {
    suggestions.push({
      ...media,
      relevance_score: 70 - index * 5,
      reason: 'Walla Walla lifestyle image',
      suggested_section: 'gallery'
    });
  });
  
  // Sort by relevance score
  return suggestions.sort((a, b) => b.relevance_score - a.relevance_score);
}

/**
 * Get media for client portal itinerary
 */
export async function getItineraryMedia(wineryIds: number[]): Promise<Map<number, Media[]>> {
  const mediaMap = new Map<number, Media[]>();
  
  for (const wineryId of wineryIds) {
    const media = await getWineryMedia(wineryId);
    mediaMap.set(wineryId, media);
  }
  
  return mediaMap;
}

/**
 * Track media usage
 */
export async function trackMediaUsage(
  mediaId: number,
  usedIn: 'proposal' | 'itinerary' | 'email' | 'website',
  entityId?: number
): Promise<void> {
  const pool = new Pool(getDbConfig());
  
  try {
    // Log usage
    await pool.query(
      `INSERT INTO media_usage_log (media_id, used_in, entity_id)
       VALUES ($1, $2, $3)`,
      [mediaId, usedIn, entityId]
    );
    
    // Increment view count
    await pool.query(
      `UPDATE media_library 
       SET view_count = view_count + 1 
       WHERE id = $1`,
      [mediaId]
    );
  } finally {
    await pool.end();
  }
}

/**
 * Get media by ID
 */
export async function getMediaById(mediaId: number): Promise<Media | null> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        id,
        file_path,
        file_type,
        title,
        description,
        alt_text,
        category,
        subcategory,
        tags,
        is_hero,
        thumbnail_path,
        medium_path,
        large_path
      FROM media_library
      WHERE id = $1 AND is_active = TRUE`,
      [mediaId]
    );
    
    return result.rows[0] || null;
  } finally {
    await pool.end();
  }
}

/**
 * Get all media for a category
 */
export async function getMediaByCategory(
  category: string,
  subcategory?: string
): Promise<Media[]> {
  const pool = new Pool(getDbConfig());
  
  try {
    let query = `
      SELECT 
        id,
        file_path,
        file_type,
        title,
        description,
        alt_text,
        category,
        subcategory,
        tags,
        is_hero,
        thumbnail_path,
        medium_path,
        large_path
      FROM media_library
      WHERE category = $1
        AND is_active = TRUE
    `;
    
    const params: (string | number)[] = [category];
    
    if (subcategory) {
      query += ` AND subcategory = $2`;
      params.push(subcategory);
    }
    
    query += ` ORDER BY is_hero DESC, display_order ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Get vehicle media
 */
export async function getVehicleMedia(vehicleId: number): Promise<Media[]> {
  const pool = new Pool(getDbConfig());
  
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.file_path,
        m.file_type,
        m.title,
        m.description,
        m.alt_text,
        m.category,
        m.subcategory,
        m.tags,
        m.is_hero,
        m.thumbnail_path,
        m.medium_path,
        m.large_path,
        vm.view_type,
        vm.is_primary
      FROM media_library m
      JOIN vehicle_media vm ON m.id = vm.media_id
      WHERE vm.vehicle_id = $1
        AND m.is_active = TRUE
      ORDER BY vm.is_primary DESC, vm.display_order ASC`,
      [vehicleId]
    );
    
    return result.rows;
  } finally {
    await pool.end();
  }
}

