/**
 * Winery Service
 * Handles winery-related business logic
 */

import { BaseService } from './base.service';
import { BadRequestError } from '@/lib/api/middleware/error-handler';

interface Winery {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  tasting_fee: number;
  reservation_required: boolean;
  specialties?: string[];
  description?: string;
  hours: any;
  average_visit_duration: number;
}

interface CreateWineryData {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tasting_fee?: number;
  average_visit_duration?: number;
}

export class WineryService extends BaseService {
  protected get serviceName(): string {
    return 'WineryService';
  }

  /**
   * List all wineries
   */
  async list(): Promise<Winery[]> {
    this.log('Listing wineries');

    const result = await this.query(
      `SELECT
        id, name, slug, address, city, state, zip_code,
        phone, email, website, tasting_fee, reservation_required,
        specialties, description, hours_of_operation,
        short_description, average_visit_duration
      FROM wineries
      ORDER BY name ASC`,
      []
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      phone: row.phone,
      email: row.email,
      website: row.website,
      tasting_fee: parseFloat(row.tasting_fee || '0'),
      reservation_required: row.reservation_required,
      specialties: row.specialties || [],
      description: row.description || row.short_description,
      hours: row.hours_of_operation,
      average_visit_duration: row.average_visit_duration || 60
    }));
  }

  /**
   * Create a new winery
   */
  async create(data: CreateWineryData): Promise<Winery> {
    this.log('Creating winery', { name: data.name });

    // Validate required fields
    if (!data.name || !data.address) {
      throw new BadRequestError('Name and address are required');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await this.query(
      `INSERT INTO wineries (
        name, slug, address, city, state, zip_code,
        tasting_fee, average_visit_duration,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
      RETURNING *`,
      [
        data.name,
        slug,
        data.address,
        data.city || 'Walla Walla',
        data.state || 'WA',
        data.zip_code || '',
        data.tasting_fee || 0,
        data.average_visit_duration || 75
      ]
    );

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      tasting_fee: parseFloat(row.tasting_fee || '0'),
      reservation_required: row.reservation_required || false,
      hours: row.hours_of_operation,
      average_visit_duration: row.average_visit_duration
    };
  }
}

export const wineryService = new WineryService();




