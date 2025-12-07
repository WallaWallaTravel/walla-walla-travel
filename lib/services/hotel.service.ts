/**
 * Hotel Service
 * Handles hotel and lodging location business logic
 */

import { BaseService } from './base.service';

interface Hotel {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  website?: string;
  type: string;
  description?: string;
  amenities?: string[];
  display_order: number;
}

export class HotelService extends BaseService {
  protected get serviceName(): string {
    return 'HotelService';
  }

  /**
   * List all active hotels
   */
  async list(): Promise<Hotel[]> {
    this.log('Listing hotels');

    const result = await this.query(
      `SELECT 
        id, name, slug, address, city, state, zip_code,
        phone, website, type, description, amenities, display_order
      FROM hotels
      WHERE is_active = TRUE
      ORDER BY display_order ASC, name ASC`,
      []
    );

    return result.rows;
  }
}

export const hotelService = new HotelService();




