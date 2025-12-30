import { logger } from '@/lib/logger';
import { BaseService } from './base.service';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface Winery {
  id: number;
  name: string;
  slug: string;
  region: string;
  description: string;
  long_description?: string;
  wine_styles: string[];
  tasting_fee: number;
  tasting_fee_waived?: string;
  reservation_required: boolean;
  hours?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  review_count?: number;
  features: string[];
  image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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
}

// ============================================================================
// Schemas
// ============================================================================

export const CreateWinerySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  region: z.string().default('Walla Walla Valley'),
  description: z.string().min(1, 'Description is required'),
  long_description: z.string().optional(),
  wine_styles: z.array(z.string()).default([]),
  tasting_fee: z.number().min(0).default(0),
  tasting_fee_waived: z.string().optional(),
  reservation_required: z.boolean().default(false),
  hours: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  features: z.array(z.string()).default([]),
  image_url: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateWinerySchema = CreateWinerySchema.partial();

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
      SELECT 
        id, name, slug, region, description, 
        wine_styles, tasting_fee, reservation_required, 
        rating, image_url
      FROM wineries
      WHERE is_active = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.reservationRequired !== undefined) {
      query += ` AND reservation_required = $${paramIndex}`;
      params.push(options.reservationRequired);
      paramIndex++;
    }

    if (options?.search) {
      query += ` AND (
        name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR
        $${paramIndex + 1} = ANY(wine_styles)
      )`;
      params.push(`%${options.search}%`, options.search);
      paramIndex += 2;
    }

    query += ` ORDER BY rating DESC NULLS LAST, name ASC`;

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
   */
  async getBySlug(slug: string): Promise<Winery | null> {
    const result = await this.query<Winery>(
      `SELECT * FROM wineries WHERE slug = $1 AND is_active = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Get winery by ID
   */
  async getById(id: number): Promise<Winery | null> {
    const result = await this.query<Winery>(
      `SELECT * FROM wineries WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new winery
   */
  async create(data: z.infer<typeof CreateWinerySchema>): Promise<Winery> {
    const result = await this.query<Winery>(
      `INSERT INTO wineries (
        name, slug, region, description, long_description,
        wine_styles, tasting_fee, tasting_fee_waived, reservation_required,
        hours, address, phone, website, email, features, image_url,
        latitude, longitude, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()
      ) RETURNING *`,
      [
        data.name,
        data.slug,
        data.region,
        data.description,
        data.long_description,
        data.wine_styles,
        data.tasting_fee,
        data.tasting_fee_waived,
        data.reservation_required,
        data.hours,
        data.address,
        data.phone,
        data.website,
        data.email,
        data.features,
        data.image_url,
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
      `UPDATE wineries SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
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
      `SELECT 
        id, name, slug, region, description, 
        wine_styles, tasting_fee, reservation_required, 
        rating, image_url
      FROM wineries
      WHERE id = ANY($1) AND is_active = true
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
      `SELECT 
        id, name, slug, region, description, 
        wine_styles, tasting_fee, reservation_required, 
        rating, image_url
      FROM wineries
      WHERE $1 = ANY(wine_styles) AND is_active = true
      ORDER BY rating DESC NULLS LAST`,
      [style]
    );
    return result.rows;
  }

  /**
   * Get featured wineries (top rated)
   */
  async getFeatured(limit: number = 6): Promise<WinerySummary[]> {
    const result = await this.query<WinerySummary>(
      `SELECT 
        id, name, slug, region, description, 
        wine_styles, tasting_fee, reservation_required, 
        rating, image_url
      FROM wineries
      WHERE is_active = true AND rating IS NOT NULL
      ORDER BY rating DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get count of wineries
   */
  async getCount(options?: { reservationRequired?: boolean }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM wineries WHERE is_active = true`;
    const params: unknown[] = [];

    if (options?.reservationRequired !== undefined) {
      query += ` AND reservation_required = $1`;
      params.push(options.reservationRequired);
    }

    const result = await this.query<{ count: string }>(query, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}

export const wineryService = new WineryService();
