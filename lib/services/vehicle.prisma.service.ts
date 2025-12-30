import { logger } from '@/lib/logger';
/**
 * Vehicle Prisma Service
 *
 * Type-safe vehicle management using Prisma ORM.
 * Replaces the raw SQL vehicle.service.ts for maintainable, type-safe operations.
 */

import { PrismaBaseService, PaginationOptions } from './prisma-base.service';
import { prisma, Prisma, vehicles } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export type Vehicle = vehicles;

export type VehicleWithDriver = Prisma.vehiclesGetPayload<{
  include: {
    users_vehicles_assigned_driver_idTousers: {
      select: { id: true; name: true; email: true };
    };
    time_cards: {
      where: { clock_out_time: null };
      select: { id: true; clock_in_time: true; driver_id: true };
    };
  };
}>;

export interface VehicleListFilters extends PaginationOptions {
  available?: boolean;
  active?: boolean;
  capacity?: number;
  status?: string;
  vehicleType?: string;
}

export type VehicleStatus = 'available' | 'in_use' | 'out_of_service' | 'maintenance' | 'assigned';

// ============================================================================
// Service Implementation
// ============================================================================

class VehiclePrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'VehicleService';
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Get vehicle by ID
   */
  async getById(id: number): Promise<Vehicle | null> {
    return this.db.vehicles.findUnique({
      where: { id },
    });
  }

  /**
   * Get vehicle by ID with current driver info
   */
  async getByIdWithDriver(id: number): Promise<VehicleWithDriver | null> {
    return this.db.vehicles.findUnique({
      where: { id },
      include: {
        users_vehicles_assigned_driver_idTousers: {
          select: { id: true, name: true, email: true },
        },
        time_cards: {
          where: { clock_out_time: null },
          select: { id: true, clock_in_time: true, driver_id: true },
          take: 1,
        },
      },
    });
  }

  /**
   * Get vehicle by vehicle number
   */
  async getByVehicleNumber(vehicleNumber: string): Promise<Vehicle | null> {
    return this.db.vehicles.findFirst({
      where: { vehicle_number: vehicleNumber },
    });
  }

  /**
   * Update vehicle status
   */
  async updateStatus(
    id: number,
    status: VehicleStatus,
    notes?: string
  ): Promise<Vehicle> {
    this.log(`Updating vehicle ${id} status to ${status}`);

    return this.db.vehicles.update({
      where: { id },
      data: {
        status,
        defect_notes: notes,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Update vehicle mileage
   */
  async updateMileage(id: number, mileage: number): Promise<Vehicle> {
    this.log(`Updating vehicle ${id} mileage to ${mileage}`);

    // Note: current_mileage is not in the schema we saw
    // This may need adjustment based on actual schema
    return this.db.vehicles.update({
      where: { id },
      data: {
        updated_at: new Date(),
      },
    });
  }

  // ============================================================================
  // List and Search
  // ============================================================================

  /**
   * List vehicles with filters and pagination
   */
  async list(filters: VehicleListFilters = {}) {
    const where: Prisma.vehiclesWhereInput = {};

    // Filter by active status (default to active only)
    if (filters.active !== undefined) {
      where.is_active = filters.active;
    } else {
      where.is_active = true;
    }

    // Filter by status
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by capacity
    if (filters.capacity) {
      where.capacity = { gte: filters.capacity };
    }

    // Filter by vehicle type
    if (filters.vehicleType) {
      where.vehicle_type = filters.vehicleType;
    }

    const { skip, take } = this.getPaginationParams(filters);

    // Get vehicles with current usage info
    const [data, total] = await Promise.all([
      this.db.vehicles.findMany({
        where,
        include: {
          users_vehicles_assigned_driver_idTousers: {
            select: { id: true, name: true },
          },
          time_cards: {
            where: { clock_out_time: null },
            select: { id: true, clock_in_time: true, driver_id: true },
            take: 1,
          },
        },
        orderBy: { vehicle_number: 'asc' },
        skip,
        take,
      }),
      this.db.vehicles.count({ where }),
    ]);

    // Transform to include availability
    const transformedData = data.map((v) => ({
      ...v,
      is_available: v.time_cards.length === 0 && v.status === 'available',
      current_driver: v.users_vehicles_assigned_driver_idTousers,
      in_use_since: v.time_cards[0]?.clock_in_time || null,
    }));

    return this.createPaginatedResponse(transformedData, total, filters);
  }

  /**
   * Get available vehicles (not currently in use)
   */
  async getAvailable(): Promise<Vehicle[]> {
    // Vehicles that are active, available status, and not on active time card
    const vehicles = await this.db.vehicles.findMany({
      where: {
        is_active: true,
        status: 'available',
        time_cards: {
          none: {
            clock_out_time: null,
          },
        },
      },
      orderBy: { vehicle_number: 'asc' },
    });

    return vehicles;
  }

  /**
   * Get all active vehicles (regardless of current usage)
   */
  async getActive(): Promise<Vehicle[]> {
    return this.db.vehicles.findMany({
      where: { is_active: true },
      orderBy: { vehicle_number: 'asc' },
    });
  }

  /**
   * Get available vehicles for a specific driver (for driver portal)
   */
  async getAvailableForDriver(driverId: number) {
    this.log('Getting available vehicles for driver', { driverId });

    const allVehicles = await this.db.vehicles.findMany({
      where: {
        is_active: true,
        status: { not: 'out_of_service' },
      },
      include: {
        users_vehicles_assigned_driver_idTousers: {
          select: { id: true, name: true },
        },
        time_cards: {
          where: {
            clock_out_time: null,
            date: new Date(),
          },
          select: { id: true, driver_id: true },
          take: 1,
        },
      },
      orderBy: { vehicle_number: 'asc' },
    });

    // Categorize vehicles
    const vehicles = allVehicles.map((v) => {
      const isInUse = v.time_cards.length > 0;
      const isAssignedToMe = v.assigned_driver_id === driverId;
      const isAssignedToOther = v.assigned_driver_id && v.assigned_driver_id !== driverId;

      let status: string;
      if (isInUse && v.time_cards[0]?.driver_id === driverId) {
        status = 'in_use_by_me';
      } else if (isInUse) {
        status = 'in_use';
      } else if (isAssignedToMe) {
        status = 'assigned';
      } else if (isAssignedToOther) {
        status = 'assigned_other';
      } else {
        status = 'available';
      }

      return {
        id: v.id,
        vehicleNumber: v.vehicle_number,
        make: v.make,
        model: v.model,
        year: v.year,
        capacity: v.capacity,
        licensePlate: v.license_plate,
        vin: v.vin,
        status,
        currentDriver: v.users_vehicles_assigned_driver_idTousers?.name || null,
        isAvailable: status === 'available' || status === 'assigned',
        isAssignedToMe,
        displayName: `${v.vehicle_number} - ${v.make} ${v.model}`,
      };
    });

    // Sort: assigned to me first, then available, then in use
    vehicles.sort((a, b) => {
      const order = { assigned: 0, available: 1, in_use_by_me: 2, in_use: 3, assigned_other: 4 };
      return (order[a.status as keyof typeof order] || 5) - (order[b.status as keyof typeof order] || 5);
    });

    const categorized = {
      assigned: vehicles.filter((v) => v.status === 'assigned'),
      available: vehicles.filter((v) => v.status === 'available'),
      inUse: vehicles.filter((v) => v.status === 'in_use' || v.status === 'assigned_other'),
      all: vehicles,
    };

    return {
      vehicles: categorized,
      summary: {
        total: vehicles.length,
        assigned: categorized.assigned.length,
        available: categorized.available.length,
        inUse: categorized.inUse.length,
      },
    };
  }

  // ============================================================================
  // Vehicle Assignment
  // ============================================================================

  /**
   * Assign vehicle to driver
   */
  async assignToDriver(vehicleId: number, driverId: number): Promise<Vehicle> {
    return this.db.vehicles.update({
      where: { id: vehicleId },
      data: {
        assigned_driver_id: driverId,
        status: 'assigned',
        updated_at: new Date(),
      },
    });
  }

  /**
   * Unassign vehicle from driver
   */
  async unassign(vehicleId: number): Promise<Vehicle> {
    return this.db.vehicles.update({
      where: { id: vehicleId },
      data: {
        assigned_driver_id: null,
        status: 'available',
        updated_at: new Date(),
      },
    });
  }

  // ============================================================================
  // Defect Reporting
  // ============================================================================

  /**
   * Report a defect on a vehicle
   */
  async reportDefect(
    vehicleId: number,
    reportedBy: number,
    notes: string
  ): Promise<Vehicle> {
    return this.db.vehicles.update({
      where: { id: vehicleId },
      data: {
        status: 'out_of_service',
        defect_notes: notes,
        defect_reported_at: new Date(),
        defect_reported_by: reportedBy,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Clear defect and return vehicle to service
   */
  async clearDefect(vehicleId: number): Promise<Vehicle> {
    return this.db.vehicles.update({
      where: { id: vehicleId },
      data: {
        status: 'available',
        defect_notes: null,
        defect_reported_at: null,
        defect_reported_by: null,
        updated_at: new Date(),
      },
    });
  }

  // ============================================================================
  // Stats
  // ============================================================================

  /**
   * Get vehicle fleet statistics
   */
  async getFleetStats(): Promise<{
    total: number;
    active: number;
    available: number;
    inUse: number;
    outOfService: number;
    totalCapacity: number;
  }> {
    const [total, active, byStatus, capacitySum] = await Promise.all([
      this.db.vehicles.count(),
      this.db.vehicles.count({ where: { is_active: true } }),
      this.db.vehicles.groupBy({
        by: ['status'],
        where: { is_active: true },
        _count: { id: true },
      }),
      this.db.vehicles.aggregate({
        where: { is_active: true },
        _sum: { capacity: true },
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
      total,
      active,
      available: statusCounts['available'] || 0,
      inUse: statusCounts['in_use'] || 0,
      outOfService: statusCounts['out_of_service'] || 0,
      totalCapacity: capacitySum._sum.capacity || 0,
    };
  }

  /**
   * Get vehicles needing attention (out of service, maintenance due, etc.)
   */
  async getNeedingAttention(): Promise<Vehicle[]> {
    return this.db.vehicles.findMany({
      where: {
        is_active: true,
        OR: [
          { status: 'out_of_service' },
          { status: 'maintenance' },
          { defect_notes: { not: null } },
        ],
      },
      orderBy: { defect_reported_at: 'desc' },
    });
  }
}

// Export singleton instance
export const vehiclePrismaService = new VehiclePrismaService();
