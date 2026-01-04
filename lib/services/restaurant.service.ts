import { logger } from '@/lib/logger';
/**
 * Restaurant Service
 * Handles restaurant business logic
 */

import { BaseService } from './base.service';

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  menu_url: string;
  is_partner: boolean;
  is_active: boolean;
}

export class RestaurantService extends BaseService {
  protected get serviceName(): string {
    return 'RestaurantService';
  }

  /**
   * List all active restaurants
   */
  async list(): Promise<Restaurant[]> {
    this.log('Listing restaurants');

    const result = await this.query<Restaurant>(
      `SELECT
        id, name, cuisine_type, address, phone, email,
        website, menu_url, is_partner, is_active
      FROM restaurants
      WHERE is_active = true
      ORDER BY name`,
      []
    );

    return result.rows;
  }
}

export const restaurantService = new RestaurantService();




