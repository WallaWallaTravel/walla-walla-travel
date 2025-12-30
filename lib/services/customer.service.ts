import { logger } from '@/lib/logger';
/**
 * Customer Service
 * 
 * Business logic for customer management
 */

import { BaseService } from './base.service';

export interface Customer {
  id: number;
  email: string;
  name: string;
  phone?: string;
  total_bookings: number;
  total_spent: number;
  email_marketing_consent: boolean;
  sms_marketing_consent: boolean;
  last_booking_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCustomerData {
  email: string;
  name: string;
  phone?: string;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
}

export class CustomerService extends BaseService {
  protected get serviceName(): string {
    return 'CustomerService';
  }

  /**
   * Find or create customer by email
   */
  async findOrCreate(data: CreateCustomerData): Promise<Customer> {
    this.log('Finding or creating customer', { email: data.email });

    // Check if customer exists
    const existing = await this.queryOne<Customer>(
      'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
      [data.email]
    );

    if (existing) {
      // Update customer info if provided
      this.log(`Customer exists: ${existing.id}, updating info`);
      
      return await this.update<Customer>('customers', existing.id, {
        name: data.name,
        phone: data.phone || existing.phone,
        updated_at: new Date(),
      }) as Customer;
    }

    // Create new customer
    this.log('Creating new customer', { email: data.email });
    
    const customer = await this.insert<Customer>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      email_marketing_consent: data.email_marketing_consent || false,
      sms_marketing_consent: data.sms_marketing_consent || false,
      total_bookings: 0,
      total_spent: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.log(`Customer created: ${customer.id}`);

    return customer;
  }

  /**
   * Update customer statistics after booking
   */
  async updateStatistics(
    customerId: number,
    bookingAmount: number,
    bookingDate: string
  ): Promise<void> {
    this.log('Updating customer statistics', { customerId, bookingAmount });

    await this.query(
      `UPDATE customers
       SET total_bookings = total_bookings + 1,
           total_spent = total_spent + $1,
           last_booking_date = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [bookingAmount, bookingDate, customerId]
    );
  }

  /**
   * Get customer by ID
   */
  async getById(id: number): Promise<Customer | null> {
    return this.queryOne<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
  }

  /**
   * Get customer by email
   */
  async getByEmail(email: string): Promise<Customer | null> {
    return this.queryOne<Customer>(
      'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
      [email]
    );
  }
}

// Export singleton instance
export const customerService = new CustomerService();




