import { logger } from '@/lib/logger';
/**
 * Vehicle Service
 * 
 * Business logic for vehicle operations
 */

import { BaseService } from './base.service';

export interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  capacity: number;
  current_mileage?: number;
  next_service_due?: string | null;
  last_service_date?: string | null;
  status: string;
  is_active: boolean;
  is_available: boolean;
  current_driver?: {
    id: number;
    name: string;
  };
}

export interface ListVehiclesFilters {
  available?: boolean;
  active?: boolean;
  capacity?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface VehicleDocument {
  id: number;
  vehicle_id: number;
  document_type: string;
  document_name: string;
  document_url: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export class VehicleService extends BaseService {
  protected get serviceName(): string {
    return 'VehicleService';
  }

  /**
   * List vehicles with filters and pagination
   */
  async list(filters: ListVehiclesFilters) {
    this.log('Listing vehicles', filters);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    // Filter by availability
    if (filters.available !== undefined) {
      paramCount++;
      // Check if vehicle is currently assigned to an active time card
      conditions.push(`
        (CASE WHEN EXISTS(
          SELECT 1 FROM time_cards tc
          WHERE tc.vehicle_id = v.id
            AND tc.clock_out_time IS NULL
        ) THEN false ELSE true END) = $${paramCount}
      `);
      params.push(filters.available);
    }

    // Filter by active status
    if (filters.active !== undefined) {
      paramCount++;
      conditions.push(`v.is_active = $${paramCount}`);
      params.push(filters.active);
    } else {
      // Default to active vehicles only
      paramCount++;
      conditions.push(`v.is_active = $${paramCount}`);
      params.push(true);
    }

    // Filter by capacity
    if (filters.capacity) {
      paramCount++;
      conditions.push(`v.capacity >= $${paramCount}`);
      params.push(filters.capacity);
    }

    // Filter by status
    if (filters.status) {
      paramCount++;
      conditions.push(`v.status = $${paramCount}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const baseQuery = `
      SELECT 
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.vin,
        v.license_plate,
        v.capacity,
        v.current_mileage,
        v.fuel_level,
        v.status,
        v.is_active,
        CASE 
          WHEN tc.id IS NOT NULL THEN false
          ELSE true
        END as is_available,
        v.last_service_date,
        v.next_service_due,
        v.insurance_expiry,
        v.registration_expiry,
        json_build_object(
          'id', u.id,
          'name', u.name
        ) as current_driver,
        tc.clock_in_time as in_use_since
      FROM vehicles v
      LEFT JOIN time_cards tc ON tc.vehicle_id = v.id 
        AND tc.clock_out_time IS NULL
      LEFT JOIN users u ON tc.driver_id = u.id
      ${whereClause}
      ORDER BY v.vehicle_number
    `;

    return this.paginate<Vehicle>(
      baseQuery,
      params,
      filters.limit || 50,
      filters.offset || 0
    );
  }

  /**
   * Get vehicle by ID
   */
  async getById(id: number): Promise<Vehicle | null> {
    this.log(`Getting vehicle ${id}`);

    const sql = `
      SELECT 
        v.*,
        CASE 
          WHEN tc.id IS NOT NULL THEN false
          ELSE true
        END as is_available,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email
        ) as current_driver,
        tc.clock_in_time as in_use_since
      FROM vehicles v
      LEFT JOIN time_cards tc ON tc.vehicle_id = v.id 
        AND tc.clock_out_time IS NULL
      LEFT JOIN users u ON tc.driver_id = u.id
      WHERE v.id = $1
    `;

    return this.queryOne<Vehicle>(sql, [id]);
  }

  /**
   * Get available vehicles
   */
  async getAvailable(): Promise<Vehicle[]> {
    this.log('Getting available vehicles');

    const sql = `
      SELECT v.*
      FROM vehicles v
      WHERE v.is_active = true
        AND v.status = 'available'
        AND NOT EXISTS (
          SELECT 1 FROM time_cards tc
          WHERE tc.vehicle_id = v.id
            AND tc.clock_out_time IS NULL
        )
      ORDER BY v.vehicle_number
    `;

    return this.queryMany<Vehicle>(sql);
  }

  /**
   * Get available vehicles for a specific driver (for driver portal)
   */
  async getAvailableForDriver(driverId: number) {
    this.log('Getting available vehicles for driver', { driverId });

    const result = await this.query(
      `SELECT 
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.capacity,
        v.license_plate,
        v.vin,
        v.is_active,
        v.status as vehicle_status,
        CASE 
          WHEN tc.id IS NOT NULL THEN 'in_use'
          WHEN v.status = 'assigned' AND tc.driver_id = $1 THEN 'assigned'
          WHEN v.status = 'assigned' THEN 'assigned_other'
          ELSE 'available'
        END as status,
        tc.driver_id as current_driver_id,
        d.name as current_driver_name
      FROM vehicles v
      LEFT JOIN time_cards tc ON v.id = tc.vehicle_id
        AND tc.clock_out_time IS NULL
        AND tc.date = CURRENT_DATE
      LEFT JOIN users d ON tc.driver_id = d.id
      WHERE v.is_active = true
        AND v.status != 'out_of_service'
      ORDER BY 
        CASE 
          WHEN tc.id IS NULL THEN 0
          WHEN tc.driver_id = $1 THEN 1
          ELSE 2
        END,
        v.vehicle_number`,
      [driverId]
    );

    // Format vehicles
    const vehicles = result.rows.map((vehicle: any) => ({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      capacity: vehicle.capacity,
      licensePlate: vehicle.license_plate,
      vin: vehicle.vin,
      status: vehicle.status,
      currentDriver: vehicle.current_driver_name,
      isAvailable: vehicle.status === 'available' || vehicle.status === 'assigned',
      isAssignedToMe: vehicle.status === 'assigned',
      displayName: `${vehicle.vehicle_number} - ${vehicle.make} ${vehicle.model}`
    }));

    // Categorize by status
    const categorized = {
      assigned: vehicles.filter((v: any) => v.status === 'assigned'),
      available: vehicles.filter((v: any) => v.status === 'available'),
      inUse: vehicles.filter((v: any) => v.status === 'in_use' || v.status === 'assigned_other'),
      all: vehicles
    };

    return {
      vehicles: categorized,
      summary: {
        total: vehicles.length,
        assigned: categorized.assigned.length,
        available: categorized.available.length,
        inUse: categorized.inUse.length
      }
    };
  }

  /**
   * Update vehicle status
   */
  async updateStatus(
    id: number,
    status: 'available' | 'in_use' | 'out_of_service' | 'maintenance',
    notes?: string
  ): Promise<Vehicle> {
    this.log(`Updating vehicle ${id} status to ${status}`);

    const updated = await this.update<Vehicle>('vehicles', id, {
      status,
      defect_notes: notes,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new Error(`Vehicle ${id} not found`);
    }

    return updated;
  }

  /**
   * Update vehicle mileage
   */
  async updateMileage(id: number, mileage: number): Promise<Vehicle> {
    this.log(`Updating vehicle ${id} mileage to ${mileage}`);

    const updated = await this.update<Vehicle>('vehicles', id, {
      current_mileage: mileage,
      updated_at: new Date(),
    });

    if (!updated) {
      throw new Error(`Vehicle ${id} not found`);
    }

    return updated;
  }

  /**
   * Check if vehicle needs service
   */
  async checkServiceDue(id: number): Promise<{
    serviceDue: boolean;
    daysUntilService: number;
    mileageUntilService: number;
  }> {
    const vehicle = await this.getById(id);
    if (!vehicle) {
      throw new Error(`Vehicle ${id} not found`);
    }

    const nextServiceDate = vehicle.next_service_due ? new Date(vehicle.next_service_due) : null;
    const today = new Date();
    
    const daysUntilService = nextServiceDate
      ? Math.ceil((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Assuming service every 5000 miles
    const mileageUntilService = vehicle.next_service_due
      ? Math.floor((vehicle.current_mileage || 0) / 5000) * 5000 + 5000 - (vehicle.current_mileage || 0)
      : 999;

    const serviceDue = daysUntilService <= 7 || mileageUntilService <= 500;

    return {
      serviceDue,
      daysUntilService,
      mileageUntilService,
    };
  }

  /**
   * Get documents for a vehicle
   */
  async getDocuments(vehicleId: number): Promise<VehicleDocument[]> {
    this.log(`Getting documents for vehicle ${vehicleId}`);

    const sql = `
      SELECT
        id,
        vehicle_id,
        document_type,
        document_name,
        document_url,
        expiry_date,
        created_at,
        updated_at
      FROM vehicle_documents
      WHERE vehicle_id = $1
      ORDER BY document_type, created_at DESC
    `;

    return this.queryMany<VehicleDocument>(sql, [vehicleId]);
  }
}

// Export singleton instance
export const vehicleService = new VehicleService();

