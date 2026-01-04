/**
 * Driver Prisma Service
 *
 * Type-safe driver operations using Prisma ORM.
 * Replaces the raw SQL driver.service.ts for maintainable, type-safe operations.
 */

import { PrismaBaseService } from './prisma-base.service';
import { Prisma, users } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export type Driver = Pick<
  users,
  'id' | 'email' | 'name' | 'role' | 'phone' | 'created_at' | 'last_login'
>;

export interface DriverTour {
  booking_id: number;
  booking_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  tour_date: Date | null;
  pickup_time: Date | string | null;
  party_size: number | null;
  status: string | null;
  special_requests: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  driver_notes: string | null;
  vehicle_id: number | null;
  itinerary_id: number | null;
  stops: Array<{
    id: number;
    winery_name: string;
    arrival_time: Date | null;
    departure_time: Date | null;
    duration_minutes: number | null;
    address: string;
    phone: string | null;
  }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

class DriverPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'DriverService';
  }

  // ============================================================================
  // Driver Listing
  // ============================================================================

  /**
   * List all active drivers
   */
  async listActive(): Promise<Driver[]> {
    this.log('Listing active drivers');

    const drivers = await this.db.users.findMany({
      where: {
        is_active: true,
        role: { in: ['driver', 'admin', 'owner'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        created_at: true,
        last_login: true,
      },
      orderBy: [
        // Sort by role priority: owner, admin, driver
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    // Re-sort by role priority since Prisma doesn't support CASE ordering
    return drivers.sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, driver: 2 };
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get all drivers (active and inactive)
   */
  async listAll(): Promise<Driver[]> {
    return this.db.users.findMany({
      where: {
        role: { in: ['driver', 'admin', 'owner'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        created_at: true,
        last_login: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ============================================================================
  // Tour Queries
  // ============================================================================

  /**
   * Get driver's tours for a specific date
   */
  async getToursByDate(driverId: number, date: string): Promise<DriverTour[]> {
    this.log('Getting driver tours', { driverId, date });

    const bookings = await this.db.bookings.findMany({
      where: {
        driver_id: driverId,
        tour_date: new Date(date),
      },
      include: {
        itineraries: {
          include: {
            itinerary_stops: {
              include: {
                wineries: true,
              },
              orderBy: { stop_order: 'asc' },
            },
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    return bookings.map((b) => this.mapBookingToDriverTour(b));
  }

  /**
   * Get driver's tours for today
   */
  async getTodayTours(driverId: number): Promise<DriverTour[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getToursByDate(driverId, today);
  }

  /**
   * Get a single tour by booking ID for a driver
   */
  async getTourById(bookingId: number, driverId?: number): Promise<DriverTour | null> {
    this.log('Getting tour by ID', { bookingId, driverId });

    const where: Prisma.bookingsWhereInput = { id: bookingId };
    if (driverId) {
      where.driver_id = driverId;
    }

    const booking = await this.db.bookings.findFirst({
      where,
      include: {
        itineraries: {
          include: {
            itinerary_stops: {
              include: {
                wineries: true,
              },
              orderBy: { stop_order: 'asc' },
            },
          },
        },
      },
    });

    if (!booking) return null;

    return this.mapBookingToDriverTour(booking);
  }

  /**
   * Get driver's upcoming tours (from today onwards)
   */
  async getUpcomingTours(
    driverId: number,
    daysAhead: number = 30,
    limit: number = 50
  ): Promise<DriverTour[]> {
    const cappedDays = Math.min(daysAhead, 90);
    const cappedLimit = Math.min(limit, 100);

    this.log('Getting upcoming driver tours', { driverId, daysAhead: cappedDays, limit: cappedLimit });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + cappedDays);

    const bookings = await this.db.bookings.findMany({
      where: {
        driver_id: driverId,
        tour_date: {
          gte: today,
          lte: endDate,
        },
        status: { notIn: ['cancelled', 'rejected'] },
      },
      include: {
        itineraries: {
          include: {
            itinerary_stops: {
              include: {
                wineries: true,
              },
              orderBy: { stop_order: 'asc' },
            },
          },
        },
      },
      orderBy: [{ tour_date: 'asc' }, { start_time: 'asc' }],
      take: cappedLimit,
    });

    return bookings.map((b) => this.mapBookingToDriverTour(b));
  }

  /**
   * Get driver's past tours
   */
  async getPastTours(
    driverId: number,
    daysBack: number = 30,
    limit: number = 50
  ): Promise<DriverTour[]> {
    const cappedDays = Math.min(daysBack, 90);
    const cappedLimit = Math.min(limit, 100);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - cappedDays);

    const bookings = await this.db.bookings.findMany({
      where: {
        driver_id: driverId,
        tour_date: {
          gte: startDate,
          lt: today,
        },
      },
      include: {
        itineraries: {
          include: {
            itinerary_stops: {
              include: {
                wineries: true,
              },
              orderBy: { stop_order: 'asc' },
            },
          },
        },
      },
      orderBy: [{ tour_date: 'desc' }, { start_time: 'desc' }],
      take: cappedLimit,
    });

    return bookings.map((b) => this.mapBookingToDriverTour(b));
  }

  // ============================================================================
  // Driver Stats
  // ============================================================================

  /**
   * Get driver's tour statistics
   */
  async getStats(
    driverId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTours: number;
    completedTours: number;
    cancelledTours: number;
    upcomingTours: number;
    totalGuests: number;
  }> {
    const where: Prisma.bookingsWhereInput = { driver_id: driverId };

    if (startDate || endDate) {
      where.tour_date = {};
      if (startDate) where.tour_date.gte = startDate;
      if (endDate) where.tour_date.lte = endDate;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, byStatus, totalGuests, upcoming] = await Promise.all([
      this.db.bookings.count({ where }),
      this.db.bookings.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.db.bookings.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { party_size: true },
      }),
      this.db.bookings.count({
        where: {
          driver_id: driverId,
          tour_date: { gte: today },
          status: { notIn: ['cancelled', 'rejected'] },
        },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status || 'unknown'] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalTours: total,
      completedTours: statusCounts['completed'] || 0,
      cancelledTours: statusCounts['cancelled'] || 0,
      upcomingTours: upcoming,
      totalGuests: totalGuests._sum.party_size || 0,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Map a Prisma booking result to DriverTour format
   */
  private mapBookingToDriverTour(booking: Prisma.bookingsGetPayload<{
    include: {
      itineraries: {
        include: {
          itinerary_stops: {
            include: { wineries: true };
          };
        };
      };
    };
  }>): DriverTour {
    const itinerary = booking.itineraries[0];

    const stops =
      itinerary?.itinerary_stops.map((stop) => ({
        id: stop.id,
        winery_name: stop.wineries?.name || 'Unknown Winery',
        arrival_time: stop.arrival_time,
        departure_time: stop.departure_time,
        duration_minutes: stop.duration_minutes,
        address: stop.wineries?.address || '',
        phone: stop.wineries?.phone || null,
      })) || [];

    return {
      booking_id: booking.id,
      booking_number: booking.booking_number,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      tour_date: booking.tour_date,
      pickup_time: booking.start_time,
      party_size: booking.party_size,
      status: booking.status,
      special_requests: booking.special_requests,
      pickup_location: itinerary?.pickup_location || booking.pickup_location,
      dropoff_location: itinerary?.dropoff_location || booking.dropoff_location,
      driver_notes: itinerary?.driver_notes || null,
      vehicle_id: booking.vehicle_id,
      itinerary_id: itinerary?.id || null,
      stops,
    };
  }
}

// Export singleton instance
export const driverPrismaService = new DriverPrismaService();
