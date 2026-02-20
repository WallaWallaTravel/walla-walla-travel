import { BaseService } from './base.service';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface LodgingProperty {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  address?: string;
  city: string;
  state: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  short_description?: string;
  amenities: string[];
  property_features: string[];
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  min_stay_nights: number;
  price_range_min?: number;
  price_range_max?: number;
  booking_url?: string;
  booking_platform?: string;
  affiliate_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  cover_image_url?: string;
  images: string[];
  check_in_time?: string;
  check_out_time?: string;
  cancellation_policy?: string;
  pet_policy?: string;
  is_verified: boolean;
  verified_by?: number;
  verified_at?: Date;
  is_featured: boolean;
  is_active: boolean;
  hotel_partner_id?: number;
  brand_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface LodgingPropertySummary {
  id: number;
  name: string;
  slug: string;
  property_type: string;
  city: string;
  short_description?: string;
  amenities: string[];
  bedrooms?: number;
  max_guests?: number;
  price_range_min?: number;
  price_range_max?: number;
  cover_image_url?: string;
  pet_policy?: string;
  is_verified: boolean;
  is_featured: boolean;
}

export interface LodgingAvailability {
  id: number;
  property_id: number;
  date: string;
  status: string;
  nightly_rate?: number;
  min_stay?: number;
  notes?: string;
}

// ============================================================================
// Schemas
// ============================================================================

export const propertyTypeSchema = z.enum([
  'hotel', 'str', 'bnb', 'vacation_rental', 'boutique_hotel', 'resort',
]);

export const CreateLodgingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  property_type: propertyTypeSchema,
  address: z.string().optional(),
  city: z.string().default('Walla Walla'),
  state: z.string().default('WA'),
  zip_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  amenities: z.array(z.string()).default([]),
  property_features: z.array(z.string()).default([]),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().positive().optional(),
  max_guests: z.number().int().positive().optional(),
  min_stay_nights: z.number().int().min(1).default(1),
  price_range_min: z.number().min(0).optional(),
  price_range_max: z.number().min(0).optional(),
  booking_url: z.string().url().optional(),
  booking_platform: z.string().optional(),
  affiliate_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  images: z.array(z.string()).default([]),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  cancellation_policy: z.string().optional(),
  pet_policy: z.string().optional(),
  hotel_partner_id: z.number().int().positive().optional(),
});

export const UpdateLodgingSchema = CreateLodgingSchema.partial();

// ============================================================================
// SQL Column Mappings
// ============================================================================

const SUMMARY_COLUMNS = `
  id,
  name,
  slug,
  property_type,
  COALESCE(city, 'Walla Walla') as city,
  short_description,
  COALESCE(amenities, ARRAY[]::text[]) as amenities,
  bedrooms,
  max_guests,
  price_range_min::float,
  price_range_max::float,
  cover_image_url,
  pet_policy,
  COALESCE(is_verified, false) as is_verified,
  COALESCE(is_featured, false) as is_featured
`;

const DETAIL_COLUMNS = `
  id,
  name,
  slug,
  property_type,
  address,
  COALESCE(city, 'Walla Walla') as city,
  COALESCE(state, 'WA') as state,
  zip_code,
  latitude::float,
  longitude::float,
  COALESCE(description, '') as description,
  short_description,
  COALESCE(amenities, ARRAY[]::text[]) as amenities,
  COALESCE(property_features, ARRAY[]::text[]) as property_features,
  bedrooms,
  bathrooms::float,
  max_guests,
  COALESCE(min_stay_nights, 1) as min_stay_nights,
  price_range_min::float,
  price_range_max::float,
  booking_url,
  booking_platform,
  affiliate_code,
  phone,
  email,
  website,
  cover_image_url,
  COALESCE(images, ARRAY[]::text[]) as images,
  check_in_time,
  check_out_time,
  cancellation_policy,
  pet_policy,
  COALESCE(is_verified, false) as is_verified,
  verified_by,
  verified_at,
  COALESCE(is_featured, false) as is_featured,
  COALESCE(is_active, true) as is_active,
  hotel_partner_id,
  COALESCE(brand_id, 1) as brand_id,
  created_at,
  updated_at
`;

// ============================================================================
// Service
// ============================================================================

class LodgingService extends BaseService {
  protected get serviceName(): string {
    return 'LodgingService';
  }

  /**
   * Get all active lodging properties (summary view)
   */
  async getAll(options?: {
    propertyType?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    maxGuests?: number;
    amenities?: string[];
    petFriendly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<LodgingPropertySummary[]> {
    let sql = `
      SELECT ${SUMMARY_COLUMNS}
      FROM lodging_properties
      WHERE COALESCE(is_active, true) = true
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.propertyType) {
      sql += ` AND property_type = $${paramIndex}`;
      params.push(options.propertyType);
      paramIndex++;
    }

    if (options?.search) {
      sql += ` AND (
        name ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        short_description ILIKE $${paramIndex} OR
        city ILIKE $${paramIndex}
      )`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    if (options?.minPrice !== undefined) {
      sql += ` AND price_range_min >= $${paramIndex}`;
      params.push(options.minPrice);
      paramIndex++;
    }

    if (options?.maxPrice !== undefined) {
      sql += ` AND price_range_max <= $${paramIndex}`;
      params.push(options.maxPrice);
      paramIndex++;
    }

    if (options?.bedrooms !== undefined) {
      sql += ` AND bedrooms >= $${paramIndex}`;
      params.push(options.bedrooms);
      paramIndex++;
    }

    if (options?.maxGuests !== undefined) {
      sql += ` AND max_guests >= $${paramIndex}`;
      params.push(options.maxGuests);
      paramIndex++;
    }

    if (options?.amenities && options.amenities.length > 0) {
      sql += ` AND amenities && $${paramIndex}`;
      params.push(options.amenities);
      paramIndex++;
    }

    if (options?.petFriendly) {
      sql += ` AND pet_policy IS NOT NULL AND pet_policy != 'no_pets'`;
    }

    sql += ` ORDER BY is_featured DESC, is_verified DESC, name ASC`;

    if (options?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.query<LodgingPropertySummary>(sql, params);
    return result.rows;
  }

  /**
   * Get lodging property by slug
   */
  async getBySlug(slug: string): Promise<LodgingProperty | null> {
    const result = await this.query<LodgingProperty>(
      `SELECT ${DETAIL_COLUMNS} FROM lodging_properties WHERE slug = $1 AND COALESCE(is_active, true) = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Get lodging property by ID
   */
  async getById(id: number): Promise<LodgingProperty | null> {
    const result = await this.query<LodgingProperty>(
      `SELECT ${DETAIL_COLUMNS} FROM lodging_properties WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get verified lodging properties
   */
  async getVerified(limit?: number): Promise<LodgingPropertySummary[]> {
    let sql = `
      SELECT ${SUMMARY_COLUMNS}
      FROM lodging_properties
      WHERE COALESCE(is_active, true) = true AND is_verified = true
      ORDER BY is_featured DESC, name ASC
    `;
    const params: unknown[] = [];

    if (limit) {
      sql += ` LIMIT $1`;
      params.push(limit);
    }

    const result = await this.query<LodgingPropertySummary>(sql, params);
    return result.rows;
  }

  /**
   * Get featured lodging properties
   */
  async getFeatured(limit: number = 6): Promise<LodgingPropertySummary[]> {
    const result = await this.query<LodgingPropertySummary>(
      `SELECT ${SUMMARY_COLUMNS}
       FROM lodging_properties
       WHERE COALESCE(is_active, true) = true AND COALESCE(is_featured, false) = true
       ORDER BY name ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Create a new lodging property
   */
  async create(data: z.infer<typeof CreateLodgingSchema>): Promise<LodgingProperty> {
    const result = await this.query<LodgingProperty>(
      `INSERT INTO lodging_properties (
        name, slug, property_type, address, city, state, zip_code,
        latitude, longitude, description, short_description,
        amenities, property_features, bedrooms, bathrooms,
        max_guests, min_stay_nights, price_range_min, price_range_max,
        booking_url, booking_platform, affiliate_code,
        phone, email, website,
        cover_image_url, images,
        check_in_time, check_out_time, cancellation_policy, pet_policy,
        hotel_partner_id, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, true, NOW(), NOW()
      ) RETURNING ${DETAIL_COLUMNS}`,
      [
        data.name, data.slug, data.property_type,
        data.address, data.city, data.state, data.zip_code,
        data.latitude, data.longitude,
        data.description, data.short_description,
        data.amenities, data.property_features,
        data.bedrooms, data.bathrooms,
        data.max_guests, data.min_stay_nights,
        data.price_range_min, data.price_range_max,
        data.booking_url, data.booking_platform, data.affiliate_code,
        data.phone, data.email, data.website,
        data.cover_image_url, data.images,
        data.check_in_time, data.check_out_time,
        data.cancellation_policy, data.pet_policy,
        data.hotel_partner_id,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update a lodging property
   */
  async updateProperty(id: number, data: z.infer<typeof UpdateLodgingSchema>): Promise<LodgingProperty | null> {
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

    const result = await this.query<LodgingProperty>(
      `UPDATE lodging_properties SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${DETAIL_COLUMNS}`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Mark a property as verified
   */
  async verify(id: number, userId: number): Promise<LodgingProperty | null> {
    const result = await this.query<LodgingProperty>(
      `UPDATE lodging_properties
       SET is_verified = true, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${DETAIL_COLUMNS}`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete a lodging property
   */
  async deactivate(id: number): Promise<boolean> {
    const result = await this.query(
      `UPDATE lodging_properties SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get count of active properties
   */
  async getCount(options?: { propertyType?: string }): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM lodging_properties WHERE COALESCE(is_active, true) = true`;
    const params: unknown[] = [];

    if (options?.propertyType) {
      sql += ` AND property_type = $1`;
      params.push(options.propertyType);
    }

    const result = await this.query<{ count: string }>(sql, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Get all property slugs (for static generation)
   */
  async getAllSlugs(): Promise<string[]> {
    const result = await this.query<{ slug: string }>(
      `SELECT slug FROM lodging_properties WHERE COALESCE(is_active, true) = true ORDER BY name ASC`
    );
    return result.rows.map(r => r.slug);
  }

  // ============================================================================
  // Availability Methods (for STRs)
  // ============================================================================

  /**
   * Get availability for a property within a date range
   */
  async getAvailability(propertyId: number, startDate: string, endDate: string): Promise<LodgingAvailability[]> {
    const result = await this.query<LodgingAvailability>(
      `SELECT id, property_id, date::text, status, nightly_rate::float, min_stay, notes
       FROM lodging_availability
       WHERE property_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [propertyId, startDate, endDate]
    );
    return result.rows;
  }

  /**
   * Set availability for a property on specific dates
   */
  async setAvailability(propertyId: number, entries: Array<{
    date: string;
    status: string;
    nightly_rate?: number;
    min_stay?: number;
    notes?: string;
  }>): Promise<LodgingAvailability[]> {
    const results: LodgingAvailability[] = [];

    for (const entry of entries) {
      const result = await this.query<LodgingAvailability>(
        `INSERT INTO lodging_availability (property_id, date, status, nightly_rate, min_stay, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (property_id, date)
         DO UPDATE SET status = $3, nightly_rate = $4, min_stay = $5, notes = $6
         RETURNING id, property_id, date::text, status, nightly_rate::float, min_stay, notes`,
        [propertyId, entry.date, entry.status, entry.nightly_rate, entry.min_stay, entry.notes]
      );
      if (result.rows[0]) {
        results.push(result.rows[0]);
      }
    }

    return results;
  }

  // ============================================================================
  // Admin Methods
  // ============================================================================

  /**
   * Get all properties including inactive (for admin)
   */
  async listAll(options?: {
    propertyType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: LodgingProperty[]; total: number; limit: number; offset: number; hasMore: boolean }> {
    let baseQuery = `SELECT ${DETAIL_COLUMNS} FROM lodging_properties WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options?.propertyType) {
      baseQuery += ` AND property_type = $${paramIndex}`;
      params.push(options.propertyType);
      paramIndex++;
    }

    if (options?.search) {
      baseQuery += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    baseQuery += ` ORDER BY created_at DESC`;

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    return this.paginate<LodgingProperty>(baseQuery, params, limit, offset);
  }
}

export const lodgingService = new LodgingService();
