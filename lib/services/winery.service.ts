import { BaseService } from './base.service';
import { z } from 'zod';

// ============================================================================
// Types (Using aliases to match actual schema)
// ============================================================================

export interface Winery {
  id: number;
  name: string;
  slug: string;
  region: string; // Maps from 'city'
  description: string;
  long_description?: string; // Maps from 'short_description'
  wine_styles: string[]; // Maps from 'specialties'
  tasting_fee: number;
  tasting_fee_waived?: string; // Computed from 'tasting_fee_waived_with_purchase'
  reservation_required: boolean;
  hours?: string; // Computed from 'hours_of_operation' JSON
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number; // Maps from 'average_rating'
  review_count?: number;
  features: string[]; // Maps from 'amenities'
  image_url?: string; // Maps from 'cover_photo_url'
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // New structured data fields
  experience_tags: string[];
  min_group_size?: number;
  max_group_size?: number;
  booking_advance_days_min?: number;
  booking_advance_days_max?: number;
  cancellation_policy?: string;
  pet_policy?: string;

  // Data provenance fields
  data_source?: string;
  source_url?: string;
  verified: boolean;
  verified_by?: number;
  verified_at?: Date;
  last_data_refresh?: Date;
}

export interface WinerySummary {
  id: number;
  name: string;
  slug: string;
  region: string;
  description: string;
  wine_styles: string[];
  tasting_fee: number;
  reservation_required: boolean;
  rating?: number;
  image_url?: string;
  hero_image_url?: string;
  experience_tags: string[];
  features: string[];
  max_group_size?: number;
  verified: boolean;
}

export interface WineryInsiderTip {
  id: number;
  winery_id: number;
  tip_type: string;
  title?: string;
  content: string;
  created_by?: number;
  data_source?: string;
  verified: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Schemas
// ============================================================================

export const CreateWinerySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  city: z.string().default('Walla Walla'),
  description: z.string().min(1, 'Description is required'),
  short_description: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  tasting_fee: z.number().min(0).default(0),
  tasting_fee_waived_with_purchase: z.boolean().default(true),
  reservation_required: z.boolean().default(false),
  hours_of_operation: z.any().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  amenities: z.array(z.string()).default([]),
  cover_photo_url: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateWinerySchema = CreateWinerySchema.partial();

// ============================================================================
// SQL Column Mappings
// ============================================================================

// Aliased columns for consistent interface
const SUMMARY_COLUMNS = `
  id,
  name,
  slug,
  COALESCE(city, 'Walla Walla Valley') as region,
  COALESCE(description, short_description, '') as description,
  COALESCE(specialties, ARRAY[]::text[]) as wine_styles,
  COALESCE(tasting_fee, 0)::numeric as tasting_fee,
  COALESCE(reservation_required, false) as reservation_required,
  average_rating as rating,
  cover_photo_url as image_url,
  COALESCE(experience_tags, ARRAY[]::text[]) as experience_tags,
  COALESCE(amenities, ARRAY[]::text[]) as features,
  max_group_size,
  COALESCE(verified, false) as verified
`;

// Basic columns that definitely exist in the wineries table
// Used as fallback if extended columns cause errors
const BASIC_DETAIL_COLUMNS = `
  id,
  name,
  slug,
  COALESCE(city, 'Walla Walla Valley') as region,
  COALESCE(description, '') as description,
  short_description as long_description,
  COALESCE(specialties, ARRAY[]::text[]) as wine_styles,
  COALESCE(tasting_fee, 0)::numeric as tasting_fee,
  CASE WHEN tasting_fee_waived_with_purchase THEN 'Waived with purchase' ELSE NULL END as tasting_fee_waived,
  COALESCE(reservation_required, false) as reservation_required,
  hours_of_operation::text as hours,
  address,
  phone,
  website,
  email,
  average_rating as rating,
  review_count,
  COALESCE(amenities, ARRAY[]::text[]) as features,
  cover_photo_url as image_url,
  latitude::float,
  longitude::float,
  COALESCE(is_active, true) as is_active,
  created_at,
  updated_at,
  -- Provide defaults for optional columns that may not exist
  ARRAY[]::text[] as experience_tags,
  NULL::integer as min_group_size,
  NULL::integer as max_group_size,
  NULL::integer as booking_advance_days_min,
  NULL::integer as booking_advance_days_max,
  NULL::text as cancellation_policy,
  NULL::text as pet_policy,
  NULL::text as data_source,
  NULL::text as source_url,
  false as verified,
  NULL::integer as verified_by,
  NULL::timestamp as verified_at,
  NULL::timestamp as last_data_refresh
`;

// Extended columns - only used if all columns exist in the database
const DETAIL_COLUMNS = `
  id,
  name,
  slug,
  COALESCE(city, 'Walla Walla Valley') as region,
  COALESCE(description, '') as description,
  short_description as long_description,
  COALESCE(specialties, ARRAY[]::text[]) as wine_styles,
  COALESCE(tasting_fee, 0)::numeric as tasting_fee,
  CASE WHEN tasting_fee_waived_with_purchase THEN 'Waived with purchase' ELSE NULL END as tasting_fee_waived,
  COALESCE(reservation_required, false) as reservation_required,
  hours_of_operation::text as hours,
  address,
  phone,
  website,
  email,
  average_rating as rating,
  review_count,
  COALESCE(amenities, ARRAY[]::text[]) as features,
  cover_photo_url as image_url,
  latitude::float,
  longitude::float,
  COALESCE(is_active, true) as is_active,
  created_at,
  updated_at,
  COALESCE(experience_tags, ARRAY[]::text[]) as experience_tags,
  min_group_size,
  max_group_size,
  booking_advance_days_min,
  booking_advance_days_max,
  cancellation_policy,
  pet_policy,
  data_source,
  source_url,
  COALESCE(verified, false) as verified,
  verified_by,
  verified_at,
  last_data_refresh
`;

// ============================================================================
// Service
// ============================================================================

class WineryService extends BaseService {
  protected get serviceName(): string {
    return 'WineryService';
  }

  /**
   * Get all active wineries (summary view)
   */
  async getAll(options?: {
    reservationRequired?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<WinerySummary[]> {
    let query = `
      SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE COALESCE(is_active, true) = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.reservationRequired !== undefined) {
      query += ` AND COALESCE(reservation_required, false) = $${paramIndex}`;
      params.push(options.reservationRequired);
      paramIndex++;
    }

    if (options?.search) {
      query += ` AND (
        name ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        $${paramIndex + 1} = ANY(specialties)
      )`;
      params.push(`%${options.search}%`, options.search);
      paramIndex += 2;
    }

    query += ` ORDER BY average_rating DESC NULLS LAST, name ASC`;

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.query<WinerySummary>(query, params);
    return result.rows;
  }

  /**
   * Get winery by slug
   * Uses a fallback approach: tries extended columns first, then basic columns if that fails
   */
  async getBySlug(slug: string): Promise<Winery | null> {
    try {
      // Try the full query with all extended columns
      const result = await this.query<Winery>(
        `SELECT ${DETAIL_COLUMNS} FROM wineries WHERE slug = $1 AND COALESCE(is_active, true) = true`,
        [slug]
      );
      return result.rows[0] || null;
    } catch (error) {
      // If the query fails (likely due to missing columns), try with basic columns
      console.warn('Winery detail query failed, falling back to basic columns:', error);
      try {
        const result = await this.query<Winery>(
          `SELECT ${BASIC_DETAIL_COLUMNS} FROM wineries WHERE slug = $1 AND COALESCE(is_active, true) = true`,
          [slug]
        );
        return result.rows[0] || null;
      } catch (fallbackError) {
        console.error('Winery basic query also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Get winery by ID
   * Uses a fallback approach: tries extended columns first, then basic columns if that fails
   */
  async getById(id: number): Promise<Winery | null> {
    try {
      const result = await this.query<Winery>(
        `SELECT ${DETAIL_COLUMNS} FROM wineries WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      // If the query fails (likely due to missing columns), try with basic columns
      console.warn('Winery getById query failed, falling back to basic columns:', error);
      try {
        const result = await this.query<Winery>(
          `SELECT ${BASIC_DETAIL_COLUMNS} FROM wineries WHERE id = $1`,
          [id]
        );
        return result.rows[0] || null;
      } catch (fallbackError) {
        console.error('Winery basic getById query also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Create a new winery
   */
  async create(data: z.infer<typeof CreateWinerySchema>): Promise<Winery> {
    const result = await this.query<Winery>(
      `INSERT INTO wineries (
        name, slug, city, description, short_description,
        specialties, tasting_fee, tasting_fee_waived_with_purchase, reservation_required,
        hours_of_operation, address, phone, website, email, amenities, cover_photo_url,
        latitude, longitude, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()
      ) RETURNING ${DETAIL_COLUMNS}`,
      [
        data.name,
        data.slug,
        data.city,
        data.description,
        data.short_description,
        data.specialties,
        data.tasting_fee,
        data.tasting_fee_waived_with_purchase,
        data.reservation_required,
        data.hours_of_operation,
        data.address,
        data.phone,
        data.website,
        data.email,
        data.amenities,
        data.cover_photo_url,
        data.latitude,
        data.longitude,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update a winery
   */
  async updateWinery(id: number, data: z.infer<typeof UpdateWinerySchema>): Promise<Winery | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.query<Winery>(
      `UPDATE wineries SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${DETAIL_COLUMNS}`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete a winery
   */
  async deleteWinery(id: number): Promise<boolean> {
    const result = await this.query(
      `UPDATE wineries SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get wineries by IDs (for itinerary display)
   */
  async getByIds(ids: number[]): Promise<WinerySummary[]> {
    if (ids.length === 0) return [];

    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE id = ANY($1) AND COALESCE(is_active, true) = true
      ORDER BY array_position($1, id)`,
      [ids]
    );
    return result.rows;
  }

  /**
   * Search wineries by wine style
   */
  async getByWineStyle(style: string): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE $1 = ANY(specialties) AND COALESCE(is_active, true) = true
      ORDER BY average_rating DESC NULLS LAST`,
      [style]
    );
    return result.rows;
  }

  /**
   * Get featured wineries (marked as featured in database)
   */
  async getFeatured(limit: number = 6): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE COALESCE(is_active, true) = true
        AND COALESCE(is_featured, false) = true
      ORDER BY average_rating DESC NULLS LAST
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get featured wineries with hero images from media library
   * This pulls the actual uploaded hero photos instead of using cover_photo_url
   *
   * Priority for featured photo (after migration 061 is applied):
   * 1. Admin override from WWT internal media (featured_photo_override_id)
   * 2. Partner's hero photo from Smart Directory (winery_media.section = 'hero')
   * 3. Legacy cover_photo_url fallback
   */
  async getFeaturedWithHeroImages(limit: number = 6): Promise<(WinerySummary & { hero_image_url?: string; featured_photo_override_id?: number | null })[]> {
    // Check if the featured_photo_override_id column exists
    const columnCheck = await this.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wineries' AND column_name = 'featured_photo_override_id'
      ) as exists`
    );
    const hasOverrideColumn = columnCheck.rows[0]?.exists ?? false;

    // Build query based on whether the override column exists
    const overrideSelect = hasOverrideColumn ? 'w.featured_photo_override_id,' : 'NULL::integer as featured_photo_override_id,';
    const overrideCoalesce = hasOverrideColumn
      ? `-- Priority 1: Admin override from WWT internal media
          (SELECT ml.file_path FROM media_library ml
           WHERE ml.id = w.featured_photo_override_id AND ml.is_active = true),`
      : '';

    const result = await this.query<WinerySummary & { hero_image_url?: string; featured_photo_override_id?: number | null }>(
      `SELECT
        w.id,
        w.name,
        w.slug,
        COALESCE(w.city, 'Walla Walla Valley') as region,
        COALESCE(w.description, w.short_description, '') as description,
        COALESCE(w.specialties, ARRAY[]::text[]) as wine_styles,
        COALESCE(w.tasting_fee, 0)::numeric as tasting_fee,
        COALESCE(w.reservation_required, false) as reservation_required,
        w.average_rating as rating,
        ${overrideSelect}
        COALESCE(
          ${overrideCoalesce}
          -- Priority 2: Partner's hero photo from Smart Directory
          (SELECT ml.file_path
           FROM winery_media wm
           JOIN media_library ml ON wm.media_id = ml.id
           WHERE wm.winery_id = w.id
             AND wm.section = 'hero'
             AND ml.is_active = true
           ORDER BY wm.is_primary DESC, wm.display_order ASC
           LIMIT 1),
          -- Priority 3: Legacy cover_photo_url
          w.cover_photo_url
        ) as image_url,
        (SELECT ml.file_path
         FROM winery_media wm
         JOIN media_library ml ON wm.media_id = ml.id
         WHERE wm.winery_id = w.id
           AND wm.section = 'hero'
           AND ml.is_active = true
         ORDER BY wm.is_primary DESC, wm.display_order ASC
         LIMIT 1) as hero_image_url,
        COALESCE(w.experience_tags, ARRAY[]::text[]) as experience_tags,
        COALESCE(w.amenities, ARRAY[]::text[]) as features,
        w.max_group_size,
        COALESCE(w.verified, false) as verified
      FROM wineries w
      WHERE COALESCE(w.is_active, true) = true
        AND COALESCE(w.is_featured, false) = true
      ORDER BY w.average_rating DESC NULLS LAST
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get count of wineries
   */
  async getCount(options?: { reservationRequired?: boolean }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM wineries WHERE COALESCE(is_active, true) = true`;
    const params: unknown[] = [];

    if (options?.reservationRequired !== undefined) {
      query += ` AND COALESCE(reservation_required, false) = $1`;
      params.push(options.reservationRequired);
    }

    const result = await this.query<{ count: string }>(query, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  // ============================================================================
  // New Methods for Structured Data Filtering
  // ============================================================================

  /**
   * Search wineries by experience tag
   */
  async getByExperienceTag(tag: string): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE $1 = ANY(experience_tags) AND COALESCE(is_active, true) = true
      ORDER BY average_rating DESC NULLS LAST`,
      [tag]
    );
    return result.rows;
  }

  /**
   * Get wineries suitable for a group size
   */
  async getByGroupSize(groupSize: number): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE COALESCE(is_active, true) = true
        AND (min_group_size IS NULL OR min_group_size <= $1)
        AND (max_group_size IS NULL OR max_group_size >= $1)
      ORDER BY average_rating DESC NULLS LAST`,
      [groupSize]
    );
    return result.rows;
  }

  /**
   * Get verified wineries only
   */
  async getVerified(limit?: number): Promise<WinerySummary[]> {
    let query = `
      SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE COALESCE(is_active, true) = true AND verified = true
      ORDER BY average_rating DESC NULLS LAST
    `;
    const params: unknown[] = [];

    if (limit) {
      query += ` LIMIT $1`;
      params.push(limit);
    }

    const result = await this.query<WinerySummary>(query, params);
    return result.rows;
  }

  /**
   * Get unverified wineries (for admin review)
   */
  async getUnverified(): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT ${SUMMARY_COLUMNS}
      FROM wineries
      WHERE COALESCE(is_active, true) = true AND COALESCE(verified, false) = false
      ORDER BY updated_at DESC`
    );
    return result.rows;
  }

  /**
   * Mark a winery as verified
   */
  async markVerified(id: number, userId: number): Promise<Winery | null> {
    const result = await this.query<Winery>(
      `UPDATE wineries
       SET verified = true, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${DETAIL_COLUMNS}`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  // ============================================================================
  // Insider Tips Methods
  // ============================================================================

  /**
   * Get insider tips for a winery
   */
  async getInsiderTips(wineryId: number): Promise<WineryInsiderTip[]> {
    const result = await this.query<WineryInsiderTip>(
      `SELECT * FROM winery_insider_tips
       WHERE winery_id = $1
       ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
      [wineryId]
    );
    return result.rows;
  }

  /**
   * Get featured insider tips across all wineries
   */
  async getFeaturedInsiderTips(limit: number = 10): Promise<WineryInsiderTip[]> {
    const result = await this.query<WineryInsiderTip>(
      `SELECT * FROM winery_insider_tips
       WHERE is_featured = true AND verified = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Add an insider tip for a winery
   */
  async addInsiderTip(data: {
    winery_id: number;
    tip_type: string;
    title?: string;
    content: string;
    created_by?: number;
    data_source?: string;
  }): Promise<WineryInsiderTip> {
    const result = await this.query<WineryInsiderTip>(
      `INSERT INTO winery_insider_tips (winery_id, tip_type, title, content, created_by, data_source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.winery_id, data.tip_type, data.title, data.content, data.created_by, data.data_source]
    );
    return result.rows[0];
  }
}

export const wineryService = new WineryService();
