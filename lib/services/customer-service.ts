import { logger } from '@/lib/logger';
/**
 * Customer Service
 * Handles all customer-related business logic
 */

import { BaseService } from './base.service';
import { NotFoundError, ConflictError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export interface Customer {
  id: number;
  email: string;
  name: string;
  phone: string;
  vip_status: boolean;
  total_bookings: number;
  total_spent: number;
  last_booking_date?: string;
  created_at: string;
  updated_at: string;
}

export const CreateCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  vip_status: z.boolean().optional(),
});

// ============================================================================
// Customer Service
// ============================================================================

export class CustomerService extends BaseService {
  protected get serviceName(): string {
    return 'CustomerService';
  }

  /**
   * Create new customer
   */
  async createCustomer(data: z.infer<typeof CreateCustomerSchema>): Promise<Customer> {
    this.log('Creating customer', { email: data.email });

    // Check if email already exists
    const existingCheck = await this.exists('customers', 'LOWER(email) = LOWER($1)', [data.email]);
    if (existingCheck) {
      throw new ConflictError('Customer with this email already exists');
    }

    const customer = await this.insert<Customer>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone,
      vip_status: false,
      total_bookings: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.log('Customer created', { customerId: customer.id });
    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.findById<Customer>('customers', id);
    if (!customer) {
      throw new NotFoundError('Customer', id.toString());
    }
    return customer;
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return this.queryOne<Customer>(
      'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
      [email]
    );
  }

  /**
   * Get customer with booking history (single query)
   */
  async getCustomerWithHistory(id: number): Promise<any> {
    const result = await this.query(`
      SELECT 
        c.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', b.id,
              'booking_number', b.booking_number,
              'tour_date', b.tour_date,
              'party_size', b.party_size,
              'total_price', b.total_price,
              'status', b.status
            )
            ORDER BY b.tour_date DESC
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bookings
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer', id.toString());
    }

    return result.rows[0];
  }

  /**
   * Update customer
   */
  async updateCustomer(
    id: number,
    data: z.infer<typeof UpdateCustomerSchema>
  ): Promise<Customer> {
    // Check if customer exists
    const existsCheck = await this.exists('customers', 'id = $1', [id]);
    if (!existsCheck) {
      throw new NotFoundError('Customer', id.toString());
    }

    const updated = await this.update<Customer>('customers', id, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError('Customer', id.toString());
    }

    this.log('Customer updated', { customerId: id });
    return updated;
  }

  /**
   * List customers with filters
   */
  async findManyWithFilters(filters: {
    vipOnly?: boolean;
    minBookings?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
    const whereClause: string[] = [];
    const params: any[] = [];

    if (filters.vipOnly) {
      whereClause.push('vip_status = true');
    }

    if (filters.minBookings) {
      params.push(filters.minBookings);
      whereClause.push(`total_bookings >= $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      whereClause.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Count total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM customers ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get customers
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.query<Customer>(
      `SELECT * FROM customers 
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      customers: result.rows,
      total,
    };
  }
}

export const customerService = new CustomerService();
