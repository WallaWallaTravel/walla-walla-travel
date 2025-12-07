/**
 * Inspection Service
 * 
 * Business logic for vehicle inspections (pre-trip, post-trip, DVIR)
 */

import { BaseService } from './base.service';
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/api/middleware/error-handler';

export interface Inspection {
  id: number;
  driver_id: number;
  vehicle_id: number;
  time_card_id: number;
  type: 'pre_trip' | 'post_trip' | 'dvir';
  start_mileage?: number;
  end_mileage?: number;
  inspection_data: any;
  issues_description?: string;
  defects_found: boolean;
  defect_severity: 'none' | 'minor' | 'critical';
  defect_description?: string;
  created_at: Date;
}

export interface CreatePreTripData {
  vehicleId: number;
  startMileage: number;
  inspectionData: {
    items: Record<string, boolean>;
    signature?: string;
    notes?: string;
  };
}

export interface CreatePostTripData {
  vehicleId: number;
  endMileage: number;
  inspectionData: {
    items: Record<string, boolean>;
    notes?: string;
    signature?: string;
    fuelLevel?: string;
    defectsFound: boolean;
    defectSeverity: 'none' | 'minor' | 'critical';
    defectDescription?: string;
  };
}

export class InspectionService extends BaseService {
  protected get serviceName(): string {
    return 'InspectionService';
  }

  /**
   * Create pre-trip inspection
   */
  async createPreTrip(driverId: number, data: CreatePreTripData): Promise<Inspection> {
    this.log('Creating pre-trip inspection', { driverId, vehicleId: data.vehicleId });

    // Get active time card
    const timeCard = await this.queryOne<{ id: number }>(
      'SELECT id FROM time_cards WHERE driver_id = $1 AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1',
      [driverId]
    );

    if (!timeCard) {
      throw new BadRequestError('No active shift found. You must be clocked in to complete pre-trip inspection.');
    }

    // Check if pre-trip already exists for this vehicle today
    const existingToday = await this.queryOne(
      `SELECT id FROM inspections 
       WHERE vehicle_id = $1 
         AND type = 'pre_trip'
         AND DATE(created_at AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
       LIMIT 1`,
      [data.vehicleId]
    );

    // Check if previous post-trip reported defects
    const lastPostTrip = await this.queryOne<{ defects_found: boolean; defect_severity: string }>(
      `SELECT defects_found, defect_severity 
       FROM inspections 
       WHERE vehicle_id = $1 AND type = 'post_trip'
       ORDER BY created_at DESC LIMIT 1`,
      [data.vehicleId]
    );

    const hadDefects = lastPostTrip?.defects_found && lastPostTrip.defect_severity !== 'none';

    // Block duplicate if no defects were reported
    if (existingToday && !hadDefects) {
      throw new ConflictError(
        'Pre-trip inspection not required. Another driver already completed pre-trip for this vehicle today.'
      );
    }

    // Create inspection
    const inspection = await this.insert<Inspection>('inspections', {
      driver_id: driverId,
      vehicle_id: data.vehicleId,
      time_card_id: timeCard.id,
      type: 'pre_trip',
      start_mileage: data.startMileage,
      inspection_data: JSON.stringify(data.inspectionData.items),
      issues_description: data.inspectionData.notes || null,
      defects_found: false,
      defect_severity: 'none',
      created_at: new Date(),
    });

    this.log(`Pre-trip inspection created: ${inspection.id}`);

    return inspection;
  }

  /**
   * Create post-trip inspection with critical defect workflow
   */
  async createPostTrip(driverId: number, data: CreatePostTripData): Promise<{
    inspection: Inspection;
    criticalDefect: boolean;
    vehicleOutOfService: boolean;
  }> {
    this.log('Creating post-trip inspection', { driverId, vehicleId: data.vehicleId });

    // Get active time card
    const timeCard = await this.queryOne<{ id: number }>(
      'SELECT id FROM time_cards WHERE driver_id = $1 AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1',
      [driverId]
    );

    if (!timeCard) {
      throw new BadRequestError('No active shift found. You must be clocked in to complete post-trip inspection.');
    }

    // Check if post-trip already exists for this shift
    const existing = await this.queryOne(
      'SELECT id FROM inspections WHERE time_card_id = $1 AND type = $2 LIMIT 1',
      [timeCard.id, 'post_trip']
    );

    if (existing) {
      throw new ConflictError('Post-trip inspection already completed for this shift');
    }

    return this.withTransaction(async (db) => {
      // Create inspection
      const inspection = await this.insert<Inspection>('inspections', {
        driver_id: driverId,
        vehicle_id: data.vehicleId,
        time_card_id: timeCard.id,
        type: 'post_trip',
        end_mileage: data.endMileage,
        inspection_data: JSON.stringify(data.inspectionData.items),
        issues_description: data.inspectionData.notes || null,
        defects_found: data.inspectionData.defectsFound,
        defect_severity: data.inspectionData.defectSeverity,
        defect_description: data.inspectionData.defectDescription || null,
        created_at: new Date(),
      });

      this.log(`Post-trip inspection created: ${inspection.id}`);

      let vehicleOutOfService = false;

      // Handle critical defects
      if (data.inspectionData.defectSeverity === 'critical') {
        this.log(`Critical defect detected for vehicle ${data.vehicleId}`);

        // Mark vehicle as out of service
        await this.update('vehicles', data.vehicleId, {
          status: 'out_of_service',
          defect_notes: data.inspectionData.defectDescription,
          defect_reported_at: new Date(),
          defect_reported_by: driverId,
        });

        vehicleOutOfService = true;

        // Notification will be handled by the route/controller
        this.log(`Vehicle ${data.vehicleId} marked OUT OF SERVICE`);
      }

      return {
        inspection,
        criticalDefect: data.inspectionData.defectSeverity === 'critical',
        vehicleOutOfService,
      };
    });
  }

  /**
   * Get inspection by ID
   */
  async getById(id: number): Promise<Inspection | null> {
    this.log(`Getting inspection ${id}`);

    const sql = `
      SELECT 
        i.*,
        json_build_object(
          'id', v.id,
          'vehicle_number', v.vehicle_number,
          'make', v.make,
          'model', v.model
        ) as vehicle,
        json_build_object(
          'id', u.id,
          'name', u.name
        ) as driver
      FROM inspections i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN users u ON i.driver_id = u.id
      WHERE i.id = $1
    `;

    return this.queryOne<Inspection>(sql, [id]);
  }

  /**
   * Get inspections for a driver
   */
  async getByDriver(
    driverId: number,
    filters?: {
      type?: string;
      vehicleId?: number;
      limit?: number;
      offset?: number;
    }
  ) {
    this.log('Getting inspections for driver', { driverId, filters });

    const conditions = ['i.driver_id = $1'];
    const params: any[] = [driverId];
    let paramCount = 1;

    if (filters?.type) {
      paramCount++;
      conditions.push(`i.type = $${paramCount}`);
      params.push(filters.type);
    }

    if (filters?.vehicleId) {
      paramCount++;
      conditions.push(`i.vehicle_id = $${paramCount}`);
      params.push(filters.vehicleId);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      SELECT 
        i.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM inspections i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
    `;

    return this.paginate<Inspection>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }

  /**
   * Check if pre-trip is required for a vehicle
   */
  async isPreTripRequired(vehicleId: number): Promise<{
    required: boolean;
    reason: string;
  }> {
    // Check if pre-trip exists today
    const existingToday = await this.queryOne(
      `SELECT id FROM inspections 
       WHERE vehicle_id = $1 
         AND type = 'pre_trip'
         AND DATE(created_at AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
       LIMIT 1`,
      [vehicleId]
    );

    // Check if previous post-trip reported defects
    const lastPostTrip = await this.queryOne<{ defects_found: boolean; defect_severity: string }>(
      `SELECT defects_found, defect_severity 
       FROM inspections 
       WHERE vehicle_id = $1 AND type = 'post_trip'
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId]
    );

    const hadDefects = lastPostTrip?.defects_found && lastPostTrip.defect_severity !== 'none';

    if (!existingToday) {
      return {
        required: true,
        reason: 'First shift of the day - pre-trip inspection required',
      };
    }

    if (hadDefects) {
      return {
        required: true,
        reason: 'Previous post-trip reported defects - verification required',
      };
    }

    return {
      required: false,
      reason: 'Pre-trip already completed for this vehicle today',
    };
  }

  /**
   * Get inspection history for a vehicle
   */
  async getVehicleHistory(
    vehicleId: number,
    filters?: {
      limit?: number;
      offset?: number;
    }
  ) {
    this.log('Getting vehicle inspection history', { vehicleId });

    const baseQuery = `
      SELECT 
        i.*,
        u.name as driver_name
      FROM inspections i
      LEFT JOIN users u ON i.driver_id = u.id
      WHERE i.vehicle_id = $1
      ORDER BY i.created_at DESC
    `;

    return this.paginate<Inspection>(
      baseQuery,
      [vehicleId],
      filters?.limit || 50,
      filters?.offset || 0
    );
  }
}

// Export singleton instance
export const inspectionService = new InspectionService();




