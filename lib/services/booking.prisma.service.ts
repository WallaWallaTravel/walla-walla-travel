import { logger } from '@/lib/logger';
/**
 * Booking Service (Prisma)
 *
 * Type-safe booking operations using Prisma ORM.
 * Replaces raw SQL with Prisma queries for compile-time safety.
 */

import { PrismaBaseService, PaginatedResponse, PaginationOptions } from './prisma-base.service';
import { prisma, Prisma, bookings } from '@/lib/prisma';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// Types & Interfaces
// ============================================================================

// Prisma-generated type for bookings
export type Booking = bookings;

// Booking with related data
export type BookingWithRelations = Prisma.bookingsGetPayload<{
  include: {
    customers: true;
    users_bookings_driver_idTousers: true;
    vehicles: true;
    booking_wineries: {
      include: {
        wineries: true;
      };
    };
    payments: true;
    booking_timeline: true;
  };
}>;

// Create booking input (validated)
export interface CreateBookingInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  tourDate: string;
  startTime: string;
  durationHours: number;
  totalPrice: number;
  depositPaid: number;
  pickupLocation: string;
  dropoffLocation?: string;
  specialRequests?: string;
  brandId?: number;
}

// Booking filter options
export interface BookingFilters {
  year?: number;
  month?: number;
  status?: string;
  customerId?: number;
  brandId?: number;
  driverId?: number;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateBookingSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(4).max(24),
  totalPrice: z.number().min(0),
  depositPaid: z.number().min(0),
  pickupLocation: z.string().min(1),
  dropoffLocation: z.string().optional(),
  specialRequests: z.string().optional(),
  brandId: z.number().int().positive().optional(),
});

// ============================================================================
// Booking Service
// ============================================================================

class BookingPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'BookingService';
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Get booking by ID
   */
  async getById(id: number): Promise<Booking | null> {
    this.log(`Getting booking ${id}`);

    try {
      return await this.db.bookings.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(error, 'getById');
    }
  }

  /**
   * Get booking by ID with relations
   */
  async getByIdWithRelations(id: number): Promise<BookingWithRelations | null> {
    this.log(`Getting booking ${id} with relations`);

    try {
      return await this.db.bookings.findUnique({
        where: { id },
        include: {
          customers: true,
          users_bookings_driver_idTousers: true,
          vehicles: true,
          booking_wineries: {
            include: {
              wineries: true,
            },
            orderBy: {
              visit_order: 'asc',
            },
          },
          payments: {
            orderBy: {
              created_at: 'desc',
            },
          },
          booking_timeline: {
            orderBy: {
              created_at: 'desc',
            },
            take: 20,
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'getByIdWithRelations');
    }
  }

  /**
   * Get booking by booking number
   */
  async getByNumber(bookingNumber: string): Promise<Booking> {
    this.log(`Getting booking by number: ${bookingNumber}`);

    const booking = await this.db.bookings.findUnique({
      where: { booking_number: bookingNumber },
    });

    if (!booking) {
      throw new NotFoundError(`Booking ${bookingNumber} not found`);
    }

    return booking;
  }

  /**
   * Get comprehensive booking details by booking number
   */
  async getFullBookingByNumber(bookingNumber: string) {
    this.log(`Getting full booking details: ${bookingNumber}`);

    const booking = await this.db.bookings.findUnique({
      where: { booking_number: bookingNumber },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            vip_status: true,
            dietary_restrictions: true,
            accessibility_needs: true,
          },
        },
        users_bookings_driver_idTousers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        vehicles: {
          select: {
            id: true,
            vehicle_number: true,
            make: true,
            model: true,
            license_plate: true,
            vehicle_type: true,
            capacity: true,
          },
        },
        booking_wineries: {
          include: {
            wineries: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                short_description: true,
                specialties: true,
                tasting_fee: true,
                address: true,
                city: true,
                phone: true,
                website: true,
                photos: true,
                amenities: true,
                average_rating: true,
              },
            },
          },
          orderBy: {
            visit_order: 'asc',
          },
        },
        payments: {
          orderBy: {
            created_at: 'desc',
          },
        },
        booking_timeline: {
          orderBy: {
            created_at: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!booking) {
      return null;
    }

    // Calculate permissions and deadlines
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const cancellationDeadline = new Date(tourDate);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 72);

    const finalPaymentDueDate = new Date(tourDate);
    finalPaymentDueDate.setHours(finalPaymentDueDate.getHours() - 48);

    const canModify = hoursUntilTour > 72 && !['cancelled', 'completed'].includes(booking.status);
    const canCancel = hoursUntilTour > 24 && !['cancelled', 'completed'].includes(booking.status);

    return {
      booking_number: booking.booking_number,
      status: booking.status,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: Number(booking.duration_hours),
      customer: booking.customers ? {
        id: booking.customers.id,
        name: booking.customers.name,
        email: booking.customers.email,
        phone: booking.customers.phone,
        vip_status: booking.customers.vip_status || false,
      } : {
        id: booking.customer_id,
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        vip_status: false,
      },
      party_size: booking.party_size,
      pickup_location: booking.pickup_location,
      dropoff_location: booking.dropoff_location,
      special_requests: booking.special_requests,
      dietary_restrictions: booking.customers?.dietary_restrictions || null,
      accessibility_needs: booking.customers?.accessibility_needs || null,
      wineries: booking.booking_wineries.map((bw: typeof booking.booking_wineries[number]) => ({
        id: bw.wineries.id,
        name: bw.wineries.name,
        slug: bw.wineries.slug,
        description: bw.wineries.short_description || bw.wineries.description,
        specialties: bw.wineries.specialties,
        tasting_fee: bw.wineries.tasting_fee ? Number(bw.wineries.tasting_fee) : null,
        address: bw.wineries.address,
        city: bw.wineries.city,
        phone: bw.wineries.phone,
        website: bw.wineries.website,
        photos: bw.wineries.photos,
        amenities: bw.wineries.amenities,
        average_rating: bw.wineries.average_rating ? Number(bw.wineries.average_rating) : null,
        visit_order: bw.visit_order,
        notes: bw.notes,
      })),
      driver: booking.users_bookings_driver_idTousers,
      vehicle: booking.vehicles,
      pricing: {
        base_price: Number(booking.base_price),
        gratuity: Number(booking.gratuity),
        taxes: Number(booking.taxes),
        total: Number(booking.total_price),
        deposit_paid: Number(booking.deposit_amount),
        deposit_paid_at: booking.deposit_paid_at,
        balance_due: Number(booking.final_payment_amount),
        balance_due_date: finalPaymentDueDate.toISOString().split('T')[0],
        balance_paid: booking.final_payment_paid,
        balance_paid_at: booking.final_payment_paid_at,
      },
      payments: booking.payments.map((p: typeof booking.payments[number]) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_type: p.payment_type,
        payment_method: p.payment_method,
        status: p.status,
        created_at: p.created_at,
      })),
      timeline: booking.booking_timeline.map((t: typeof booking.booking_timeline[number]) => ({
        id: t.id,
        event_type: t.event_type,
        description: t.event_description,
        data: t.event_data,
        created_at: t.created_at,
      })),
      permissions: {
        can_modify: canModify,
        can_cancel: canCancel,
        cancellation_deadline: cancellationDeadline.toISOString(),
      },
      cancellation: booking.status === 'cancelled' ? {
        cancelled_at: booking.cancelled_at,
        reason: booking.cancellation_reason,
      } : null,
      created_at: booking.created_at,
      completed_at: booking.completed_at,
    };
  }

  /**
   * Get upcoming bookings
   */
  async getUpcoming(limit: number = 10): Promise<Booking[]> {
    this.log(`Getting upcoming bookings, limit: ${limit}`);

    return this.db.bookings.findMany({
      where: {
        tour_date: {
          gte: new Date(),
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      orderBy: [
        { tour_date: 'asc' },
        { start_time: 'asc' },
      ],
      take: limit,
    });
  }

  /**
   * List bookings with filters and pagination
   */
  async list(
    filters: BookingFilters,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Booking>> {
    this.log('Listing bookings', filters);

    // Build where clause
    const where: Prisma.bookingsWhereInput = {};

    if (filters.year && filters.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      where.tour_date = {
        gte: startDate,
        lte: endDate,
      };
    } else {
      if (filters.startDate) {
        where.tour_date = { ...where.tour_date as object, gte: filters.startDate };
      }
      if (filters.endDate) {
        where.tour_date = { ...where.tour_date as object, lte: filters.endDate };
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customer_id = filters.customerId;
    }

    if (filters.brandId) {
      where.brand_id = filters.brandId;
    }

    if (filters.driverId) {
      where.driver_id = filters.driverId;
    }

    // Get total count
    const total = await this.db.bookings.count({ where });

    // Get paginated data
    const { skip, take } = this.getPaginationParams(pagination);

    const data = await this.db.bookings.findMany({
      where,
      orderBy: pagination.orderBy || [
        { tour_date: 'desc' },
        { start_time: 'desc' },
      ],
      skip,
      take,
      include: {
        customers: {
          select: {
            name: true,
            email: true,
          },
        },
        users_bookings_driver_idTousers: {
          select: {
            name: true,
          },
        },
        brands: {
          select: {
            brand_name: true,
          },
        },
      },
    });

    return this.createPaginatedResponse(data, total, pagination);
  }

  // ==========================================================================
  // Create Operations
  // ==========================================================================

  /**
   * Create a new booking
   */
  async create(input: CreateBookingInput): Promise<Booking> {
    this.log('Creating booking', {
      customerEmail: input.customerEmail,
      tourDate: input.tourDate,
    });

    // Validate input
    const validated = CreateBookingSchema.parse(input);

    return this.withTransaction(async (tx) => {
      // 1. Check availability
      await this.checkAvailability(validated.tourDate, validated.partySize, tx);

      // 2. Find or create customer
      const customer = await tx.customers.upsert({
        where: { email: validated.customerEmail.toLowerCase() },
        update: {
          name: validated.customerName,
          phone: validated.customerPhone,
          updated_at: new Date(),
        },
        create: {
          email: validated.customerEmail.toLowerCase(),
          name: validated.customerName,
          phone: validated.customerPhone,
        },
      });

      // 3. Generate booking number
      const bookingNumber = this.generateReferenceNumber('WWT');

      // 4. Calculate end time
      const [hours, minutes] = validated.startTime.split(':').map(Number);
      const endHours = hours + Math.floor(validated.durationHours);
      const endMinutes = minutes + Math.round((validated.durationHours % 1) * 60);
      const endTime = `${String(endHours % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      // 5. Create booking
      const booking = await tx.bookings.create({
        data: {
          booking_number: bookingNumber,
          customer_id: customer.id,
          customer_name: validated.customerName,
          customer_email: validated.customerEmail,
          customer_phone: validated.customerPhone,
          party_size: validated.partySize,
          tour_date: new Date(validated.tourDate),
          start_time: new Date(`1970-01-01T${validated.startTime}:00`),
          end_time: new Date(`1970-01-01T${endTime}:00`),
          duration_hours: validated.durationHours,
          pickup_location: validated.pickupLocation,
          dropoff_location: validated.dropoffLocation || validated.pickupLocation,
          special_requests: validated.specialRequests,
          base_price: validated.totalPrice,
          gratuity: 0,
          taxes: 0,
          total_price: validated.totalPrice,
          deposit_amount: validated.depositPaid,
          deposit_paid: validated.depositPaid > 0,
          deposit_paid_at: validated.depositPaid > 0 ? new Date() : null,
          final_payment_amount: validated.totalPrice - validated.depositPaid,
          final_payment_paid: false,
          status: validated.depositPaid > 0 ? 'confirmed' : 'pending',
          brand_id: validated.brandId,
        },
      });

      // 6. Create timeline entry
      await tx.booking_timeline.create({
        data: {
          booking_id: booking.id,
          event_type: 'booking_created',
          event_description: 'Booking created successfully',
          event_data: {
            booking_number: bookingNumber,
            customer_email: customer.email,
            total_price: validated.totalPrice,
            deposit_paid: validated.depositPaid,
          },
        },
      });

      // 7. Audit log
      await this.auditLog({
        actionType: 'booking_created',
        entityType: 'booking',
        entityId: booking.id,
        newState: {
          booking_number: bookingNumber,
          total_price: validated.totalPrice,
          deposit: validated.depositPaid,
        },
      });

      this.log('Booking created successfully', {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
      });

      return booking;
    });
  }

  // ==========================================================================
  // Update Operations
  // ==========================================================================

  /**
   * Update booking by ID
   */
  async update(id: number, data: Prisma.bookingsUpdateInput): Promise<Booking> {
    this.log(`Updating booking ${id}`);

    try {
      const booking = await this.db.bookings.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });

      return booking;
    } catch (error) {
      this.handlePrismaError(error, 'update');
    }
  }

  /**
   * Update booking status with validation
   */
  async updateStatus(id: number, status: string): Promise<Booking> {
    this.log(`Updating booking status: ${id} -> ${status}`);

    const booking = await this.getById(id);
    if (!booking) {
      throw new NotFoundError(`Booking ${id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, status);

    const previousState = { status: booking.status };

    const updated = await this.db.bookings.update({
      where: { id },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    // Audit log
    await this.auditLog({
      actionType: 'booking_status_change',
      entityType: 'booking',
      entityId: id,
      previousState,
      newState: { status },
    });

    return updated;
  }

  /**
   * Confirm booking
   */
  async confirm(id: number): Promise<Booking> {
    return this.updateStatus(id, 'confirmed');
  }

  /**
   * Cancel booking with business logic
   */
  async cancel(id: number, reason?: string): Promise<Booking> {
    this.log(`Cancelling booking ${id}`, { reason });

    const booking = await this.getById(id);
    if (!booking) {
      throw new NotFoundError(`Booking ${id} not found`);
    }

    if (booking.status === 'cancelled') {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.status === 'completed') {
      throw new ConflictError('Cannot cancel completed booking');
    }

    // Check cancellation deadline (24 hours before tour)
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilTour < 24) {
      throw new ConflictError(
        'Cancellation deadline has passed. Bookings must be cancelled at least 24 hours before tour date.'
      );
    }

    return this.withTransaction(async (tx) => {
      const previousState = {
        status: booking.status,
      };

      const updated = await tx.bookings.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Timeline entry
      await tx.booking_timeline.create({
        data: {
          booking_id: id,
          event_type: 'booking_cancelled',
          event_description: 'Booking cancelled',
          event_data: {
            reason,
            cancelled_at: new Date().toISOString(),
          },
        },
      });

      // Audit log
      await this.auditLog({
        actionType: 'booking_cancelled',
        entityType: 'booking',
        entityId: id,
        previousState,
        newState: { status: 'cancelled', reason },
      });

      this.log(`Booking ${id} cancelled successfully`);

      return updated;
    });
  }

  /**
   * Complete a booking
   */
  async complete(id: number): Promise<Booking> {
    this.log(`Completing booking ${id}`);

    const booking = await this.getById(id);
    if (!booking) {
      throw new NotFoundError(`Booking ${id} not found`);
    }

    if (booking.status !== 'confirmed') {
      throw new ConflictError('Only confirmed bookings can be completed');
    }

    return this.withTransaction(async (tx) => {
      const updated = await tx.bookings.update({
        where: { id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date(),
        },
      });

      await tx.booking_timeline.create({
        data: {
          booking_id: id,
          event_type: 'booking_completed',
          event_description: 'Tour completed successfully',
        },
      });

      return updated;
    });
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get booking statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.bookingsWhereInput = {};

    if (startDate) {
      where.tour_date = { gte: startDate };
    }
    if (endDate) {
      where.tour_date = { ...where.tour_date as object, lte: endDate };
    }

    const [totals, cancelled] = await Promise.all([
      this.db.bookings.aggregate({
        where,
        _count: true,
        _sum: {
          total_price: true,
        },
        _avg: {
          party_size: true,
        },
      }),
      this.db.bookings.count({
        where: {
          ...where,
          status: 'cancelled',
        },
      }),
    ]);

    return {
      totalBookings: totals._count,
      totalRevenue: Number(totals._sum.total_price || 0),
      averagePartySize: Number(totals._avg.party_size || 0),
      cancelledRate: totals._count > 0 ? cancelled / totals._count : 0,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Check if date/time is available
   */
  private async checkAvailability(
    date: string,
    partySize: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || this.db;

    // Check if date is in the past
    if (new Date(date) < new Date()) {
      throw new ValidationError('Cannot book tours in the past');
    }

    // Check max capacity for date
    const result = await db.bookings.aggregate({
      where: {
        tour_date: new Date(date),
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      _sum: {
        party_size: true,
      },
    });

    const currentCapacity = result._sum.party_size || 0;
    const maxCapacity = 50; // Example: max 50 guests per day

    if (currentCapacity + partySize > maxCapacity) {
      throw new ConflictError('Not enough capacity available for this date');
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}

// Export singleton instance
export const bookingPrismaService = new BookingPrismaService();
