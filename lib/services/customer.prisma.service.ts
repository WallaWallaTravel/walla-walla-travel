import { logger } from '@/lib/logger';
/**
 * Customer Prisma Service
 *
 * Type-safe customer management using Prisma ORM.
 * Replaces the raw SQL customer.service.ts for maintainable, type-safe operations.
 */

import { PrismaBaseService, PaginationOptions } from './prisma-base.service';
import { prisma, Prisma, customers } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export type Customer = customers;

export type CustomerWithRelations = Prisma.customersGetPayload<{
  include: {
    bookings: { select: { id: true; booking_number: true; tour_date: true; status: true } };
    payments: { select: { id: true; amount: true; status: true; created_at: true } };
  };
}>;

export interface CreateCustomerInput {
  email: string;
  name: string;
  phone?: string;
  emailMarketingConsent?: boolean;
  smsMarketingConsent?: boolean;
  stripeCustomerId?: string;
  preferredWineries?: string[];
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  emailMarketingConsent?: boolean;
  smsMarketingConsent?: boolean;
  stripeCustomerId?: string;
  preferredWineries?: string[];
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  vipStatus?: boolean;
}

export interface CustomerListFilters extends PaginationOptions {
  vipOnly?: boolean;
  hasBookings?: boolean;
  search?: string;
  minTotalSpent?: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

class CustomerPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'CustomerService';
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Find or create customer by email
   * This is the primary entry point for customer creation during booking
   */
  async findOrCreate(input: CreateCustomerInput): Promise<Customer> {
    this.log('Finding or creating customer', { email: input.email });

    // Check if customer exists (case-insensitive)
    const existing = await this.db.customers.findFirst({
      where: {
        email: {
          equals: input.email,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      this.log(`Customer exists: ${existing.id}, updating info`);

      // Update customer info with new data
      return this.db.customers.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          phone: input.phone || existing.phone,
          updated_at: new Date(),
        },
      });
    }

    // Create new customer
    this.log('Creating new customer', { email: input.email });

    const customer = await this.db.customers.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone || null,
        email_marketing_consent: input.emailMarketingConsent || false,
        sms_marketing_consent: input.smsMarketingConsent || false,
        preferred_wineries: input.preferredWineries || [],
        dietary_restrictions: input.dietaryRestrictions || null,
        accessibility_needs: input.accessibilityNeeds || null,
        stripe_customer_id: input.stripeCustomerId || null,
        total_bookings: 0,
        total_spent: new Prisma.Decimal(0),
      },
    });

    this.log(`Customer created: ${customer.id}`);
    return customer;
  }

  /**
   * Get customer by ID
   */
  async getById(id: number): Promise<Customer | null> {
    return this.db.customers.findUnique({
      where: { id },
    });
  }

  /**
   * Get customer by ID with relations
   */
  async getByIdWithRelations(id: number): Promise<CustomerWithRelations | null> {
    return this.db.customers.findUnique({
      where: { id },
      include: {
        bookings: {
          select: {
            id: true,
            booking_number: true,
            tour_date: true,
            status: true,
          },
          orderBy: { tour_date: 'desc' },
          take: 10,
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get customer by email
   */
  async getByEmail(email: string): Promise<Customer | null> {
    return this.db.customers.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
  }

  /**
   * Get customer by Stripe customer ID
   */
  async getByStripeId(stripeCustomerId: string): Promise<Customer | null> {
    return this.db.customers.findFirst({
      where: { stripe_customer_id: stripeCustomerId },
    });
  }

  /**
   * Update customer
   */
  async update(id: number, input: UpdateCustomerInput): Promise<Customer> {
    return this.db.customers.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone,
        email_marketing_consent: input.emailMarketingConsent,
        sms_marketing_consent: input.smsMarketingConsent,
        stripe_customer_id: input.stripeCustomerId,
        preferred_wineries: input.preferredWineries,
        dietary_restrictions: input.dietaryRestrictions,
        accessibility_needs: input.accessibilityNeeds,
        vip_status: input.vipStatus,
        updated_at: new Date(),
      },
    });
  }

  // ============================================================================
  // Statistics Updates
  // ============================================================================

  /**
   * Update customer statistics after booking
   * Called when a booking is confirmed
   */
  async updateStatistics(
    customerId: number,
    bookingAmount: number,
    bookingDate: Date | string
  ): Promise<void> {
    this.log('Updating customer statistics', { customerId, bookingAmount });

    await this.db.customers.update({
      where: { id: customerId },
      data: {
        total_bookings: { increment: 1 },
        total_spent: { increment: bookingAmount },
        last_booking_date: new Date(bookingDate),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Update Stripe customer ID
   */
  async updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<Customer> {
    return this.db.customers.update({
      where: { id },
      data: {
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Update customer rating (average of their reviews/feedback)
   */
  async updateAverageRating(customerId: number, rating: number): Promise<Customer> {
    return this.db.customers.update({
      where: { id: customerId },
      data: {
        average_rating: new Prisma.Decimal(rating),
        updated_at: new Date(),
      },
    });
  }

  // ============================================================================
  // List and Search
  // ============================================================================

  /**
   * List customers with filters and pagination
   */
  async list(filters?: CustomerListFilters) {
    const where: Prisma.customersWhereInput = {};

    if (filters?.vipOnly) {
      where.vip_status = true;
    }

    if (filters?.hasBookings) {
      where.total_bookings = { gt: 0 };
    }

    if (filters?.minTotalSpent) {
      where.total_spent = { gte: filters.minTotalSpent };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    const { skip, take } = this.getPaginationParams(filters || {});

    const [data, total] = await Promise.all([
      this.db.customers.findMany({
        where,
        orderBy: filters?.orderBy || { name: 'asc' },
        skip,
        take,
      }),
      this.db.customers.count({ where }),
    ]);

    return this.createPaginatedResponse(data, total, filters || {});
  }

  /**
   * Get top customers by total spent
   */
  async getTopBySpent(limit: number = 10): Promise<Customer[]> {
    return this.db.customers.findMany({
      where: { total_spent: { gt: 0 } },
      orderBy: { total_spent: 'desc' },
      take: limit,
    });
  }

  /**
   * Get VIP customers
   */
  async getVipCustomers(): Promise<Customer[]> {
    return this.db.customers.findMany({
      where: { vip_status: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get customers with upcoming bookings
   */
  async getWithUpcomingBookings(): Promise<CustomerWithRelations[]> {
    return this.db.customers.findMany({
      where: {
        bookings: {
          some: {
            tour_date: { gte: new Date() },
            status: { in: ['confirmed', 'pending'] },
          },
        },
      },
      include: {
        bookings: {
          where: {
            tour_date: { gte: new Date() },
            status: { in: ['confirmed', 'pending'] },
          },
          select: {
            id: true,
            booking_number: true,
            tour_date: true,
            status: true,
          },
          orderBy: { tour_date: 'asc' },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            created_at: true,
          },
          take: 0, // Don't fetch payments
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ============================================================================
  // Stats
  // ============================================================================

  /**
   * Get customer statistics
   */
  async getStats(): Promise<{
    totalCustomers: number;
    vipCount: number;
    totalRevenue: number;
    avgSpentPerCustomer: number;
    newThisMonth: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totals, vipCount, newThisMonth] = await Promise.all([
      this.db.customers.aggregate({
        _count: { id: true },
        _sum: { total_spent: true },
        _avg: { total_spent: true },
      }),
      this.db.customers.count({ where: { vip_status: true } }),
      this.db.customers.count({
        where: { created_at: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalCustomers: totals._count.id || 0,
      vipCount,
      totalRevenue: totals._sum.total_spent?.toNumber() || 0,
      avgSpentPerCustomer: totals._avg.total_spent?.toNumber() || 0,
      newThisMonth,
    };
  }
}

// Export singleton instance
export const customerPrismaService = new CustomerPrismaService();
