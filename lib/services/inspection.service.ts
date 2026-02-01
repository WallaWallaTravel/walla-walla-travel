/**
 * Inspection Service
 *
 * @module lib/services/inspection.service
 * @description Handles vehicle inspections for FMCSA/DOT compliance.
 * Manages pre-trip, post-trip, and Driver Vehicle Inspection Reports (DVIR).
 *
 * @compliance FMCSA Part 396.11 - Driver vehicle inspection report(s)
 *
 * @features
 * - Pre-trip inspection checklists
 * - Post-trip DVIRs with defect reporting
 * - Defect severity classification (none/minor/critical)
 * - Electronic signature capture
 * - Fuel level tracking
 * - Integration with notification service for critical defects
 */

import { BaseService } from './base.service';
import { ConflictError, BadRequestError } from '@/lib/api/middleware/error-handler';

interface InspectionData {
  items: Record<string, boolean>;
  signature?: string;
  notes?: string;
  fuelLevel?: string;
  defectsFound?: boolean;
  defectSeverity?: 'none' | 'minor' | 'critical';
  defectDescription?: string;
}

export interface Inspection {
  id: number;
  driver_id: number;
  vehicle_id: number;
  time_card_id: number;
  type: 'pre_trip' | 'post_trip' | 'dvir';
  start_mileage?: number;
  end_mileage?: number;
  inspection_data: InspectionData;
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
      status: 'complete',
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

    return this.withTransaction(async (_db) => {
      // Create inspection
      const inspection = await this.insert<Inspection>('inspections', {
        driver_id: driverId,
        vehicle_id: data.vehicleId,
        time_card_id: timeCard.id,
        type: 'post_trip',
        status: 'complete',
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
    const params: unknown[] = [driverId];
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

  // ==========================================================================
  // Historical Entry Methods
  // ==========================================================================

  /**
   * Create a historical inspection entry from paper form data
   * Used for digitizing paper inspection records for compliance history
   */
  async createHistoricalInspection(data: {
    driverId: number;
    vehicleId: number;
    type: 'pre_trip' | 'post_trip' | 'dvir';
    originalDocumentDate: string; // ISO date string from paper form
    startMileage?: number;
    endMileage?: number;
    inspectionData: InspectionData;
    enteredBy: number; // Admin user ID
    historicalSource: string; // 'paper_form', 'excel_import', etc.
    entryNotes?: string;
    documentUrl?: string; // URL to scanned document in storage
  }): Promise<Inspection> {
    this.log('Creating historical inspection entry', {
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      originalDate: data.originalDocumentDate,
    });

    // Verify driver exists
    const driver = await this.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [data.driverId, 'driver']
    );

    if (!driver) {
      throw new BadRequestError(`Driver with ID ${data.driverId} not found`);
    }

    // Verify vehicle exists
    const vehicle = await this.queryOne<{ id: number }>(
      'SELECT id FROM vehicles WHERE id = $1',
      [data.vehicleId]
    );

    if (!vehicle) {
      throw new BadRequestError(`Vehicle with ID ${data.vehicleId} not found`);
    }

    // Check for duplicate entry (same driver, vehicle, type, date)
    const existing = await this.queryOne(
      `SELECT id FROM inspections
       WHERE driver_id = $1
         AND vehicle_id = $2
         AND type = $3
         AND original_document_date = $4
         AND is_historical_entry = true
       LIMIT 1`,
      [data.driverId, data.vehicleId, data.type, data.originalDocumentDate]
    );

    if (existing) {
      throw new ConflictError(
        `Historical inspection already exists for this driver/vehicle/date combination`
      );
    }

    // Create the historical inspection
    const inspection = await this.insert<Inspection>('inspections', {
      driver_id: data.driverId,
      vehicle_id: data.vehicleId,
      time_card_id: null, // Historical entries may not have linked time cards
      type: data.type,
      status: 'complete',
      start_mileage: data.startMileage || null,
      end_mileage: data.endMileage || null,
      inspection_data: JSON.stringify(data.inspectionData.items || {}),
      issues_description: data.inspectionData.notes || null,
      defects_found: data.inspectionData.defectsFound || false,
      defect_severity: data.inspectionData.defectSeverity || 'none',
      defect_description: data.inspectionData.defectDescription || null,
      // Historical entry fields
      is_historical_entry: true,
      historical_source: data.historicalSource,
      entered_by: data.enteredBy,
      entry_date: new Date(),
      entry_notes: data.entryNotes || null,
      original_document_date: data.originalDocumentDate,
      created_at: new Date(data.originalDocumentDate), // Use original date for sorting
    });

    this.log(`Historical inspection created: ${inspection.id}`, {
      originalDate: data.originalDocumentDate,
      source: data.historicalSource,
    });

    return inspection;
  }

  /**
   * Get historical inspections for review
   */
  async getHistoricalInspections(filters?: {
    driverId?: number;
    vehicleId?: number;
    startDate?: string;
    endDate?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }) {
    this.log('Getting historical inspections', { filters });

    const conditions = ['i.is_historical_entry = true'];
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters?.driverId) {
      paramCount++;
      conditions.push(`i.driver_id = $${paramCount}`);
      params.push(filters.driverId);
    }

    if (filters?.vehicleId) {
      paramCount++;
      conditions.push(`i.vehicle_id = $${paramCount}`);
      params.push(filters.vehicleId);
    }

    if (filters?.startDate) {
      paramCount++;
      conditions.push(`i.original_document_date >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      conditions.push(`i.original_document_date <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters?.source) {
      paramCount++;
      conditions.push(`i.historical_source = $${paramCount}`);
      params.push(filters.source);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      SELECT
        i.*,
        d.name as driver_name,
        v.vehicle_number,
        v.make,
        v.model,
        e.name as entered_by_name
      FROM inspections i
      LEFT JOIN users d ON i.driver_id = d.id
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN users e ON i.entered_by = e.id
      WHERE ${whereClause}
      ORDER BY i.original_document_date DESC, i.created_at DESC
    `;

    return this.paginate<Inspection>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }

  /**
   * Link a historical inspection to a time card
   */
  async linkToTimeCard(inspectionId: number, timeCardId: number): Promise<Inspection | null> {
    this.log('Linking inspection to time card', { inspectionId, timeCardId });

    // Verify the time card exists
    const timeCard = await this.queryOne<{ id: number; driver_id: number }>(
      'SELECT id, driver_id FROM time_cards WHERE id = $1',
      [timeCardId]
    );

    if (!timeCard) {
      throw new BadRequestError(`Time card with ID ${timeCardId} not found`);
    }

    // Verify the inspection exists and matches the driver
    const inspection = await this.queryOne<{ id: number; driver_id: number }>(
      'SELECT id, driver_id FROM inspections WHERE id = $1',
      [inspectionId]
    );

    if (!inspection) {
      throw new BadRequestError(`Inspection with ID ${inspectionId} not found`);
    }

    if (inspection.driver_id !== timeCard.driver_id) {
      throw new BadRequestError('Inspection and time card must be for the same driver');
    }

    return this.update<Inspection>('inspections', inspectionId, {
      time_card_id: timeCardId,
      updated_at: new Date(),
    });
  }

  /**
   * Get inspection statistics for compliance reporting
   */
  async getInspectionStats(filters?: {
    driverId?: number;
    vehicleId?: number;
    startDate?: string;
    endDate?: string;
    includeHistorical?: boolean;
  }): Promise<{
    totalInspections: number;
    preTrips: number;
    postTrips: number;
    defectsFound: number;
    criticalDefects: number;
    historicalEntries: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters?.driverId) {
      paramCount++;
      conditions.push(`driver_id = $${paramCount}`);
      params.push(filters.driverId);
    }

    if (filters?.vehicleId) {
      paramCount++;
      conditions.push(`vehicle_id = $${paramCount}`);
      params.push(filters.vehicleId);
    }

    if (filters?.startDate) {
      paramCount++;
      conditions.push(`COALESCE(original_document_date, DATE(created_at)) >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      conditions.push(`COALESCE(original_document_date, DATE(created_at)) <= $${paramCount}`);
      params.push(filters.endDate);
    }

    if (filters?.includeHistorical === false) {
      conditions.push('is_historical_entry = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const stats = await this.queryOne<{
      total_inspections: number;
      pre_trips: number;
      post_trips: number;
      defects_found: number;
      critical_defects: number;
      historical_entries: number;
    }>(
      `SELECT
        COUNT(*)::int as total_inspections,
        COUNT(*) FILTER (WHERE type = 'pre_trip')::int as pre_trips,
        COUNT(*) FILTER (WHERE type = 'post_trip')::int as post_trips,
        COUNT(*) FILTER (WHERE defects_found = true)::int as defects_found,
        COUNT(*) FILTER (WHERE defect_severity = 'critical')::int as critical_defects,
        COUNT(*) FILTER (WHERE is_historical_entry = true)::int as historical_entries
      FROM inspections
      ${whereClause}`,
      params
    );

    return {
      totalInspections: stats?.total_inspections || 0,
      preTrips: stats?.pre_trips || 0,
      postTrips: stats?.post_trips || 0,
      defectsFound: stats?.defects_found || 0,
      criticalDefects: stats?.critical_defects || 0,
      historicalEntries: stats?.historical_entries || 0,
    };
  }
}

// Export singleton instance
export const inspectionService = new InspectionService();




