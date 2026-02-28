/**
 * Workflow Service
 * 
 * Business logic for driver daily workflows and client notes
 */

import { BaseService } from './base.service';

export interface Workflow {
  id: number;
  driver_id: number;
  workflow_date: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClientNote {
  id: number;
  workflow_id: number;
  driver_id: number;
  client_name: string;
  visit_time: string;
  pickup_location?: string;
  dropoff_location?: string;
  passenger_count: number;
  notes?: string;
  special_requests?: string;
  created_at: Date;
}

export interface CreateClientNoteData {
  workflowId: number;
  driverId: number;
  clientName: string;
  visitTime: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  passengerCount?: number;
  notes?: string;
  specialRequests?: string;
}

export class WorkflowService extends BaseService {
  protected get serviceName(): string {
    return 'WorkflowService';
  }

  /**
   * Create or update workflow for a driver on a specific date
   */
  async createOrUpdate(driverId: number, workflowDate?: string): Promise<Workflow> {
    const date = workflowDate || new Date().toISOString().split('T')[0];
    this.log(`Creating/updating workflow for driver ${driverId} on ${date}`);

    const sql = `
      INSERT INTO workflows (driver_id, workflow_date) 
      VALUES ($1, $2) 
      ON CONFLICT (driver_id, workflow_date) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP 
      RETURNING *
    `;

    const result = await this.query<Workflow>(sql, [driverId, date]);
    return result.rows[0];
  }

  /**
   * Get workflow by driver and date
   */
  async getByDriverAndDate(driverId: number, date: string): Promise<Workflow | null> {
    this.log(`Getting workflow for driver ${driverId} on ${date}`);

    return this.queryOne<Workflow>(
      'SELECT * FROM workflows WHERE driver_id = $1 AND workflow_date = $2',
      [driverId, date]
    );
  }

  /**
   * Get today's workflow for a driver
   */
  async getTodayWorkflow(driverId: number): Promise<Workflow | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDriverAndDate(driverId, today);
  }

  /**
   * Create client note
   */
  async createClientNote(data: CreateClientNoteData): Promise<ClientNote> {
    this.log('Creating client note', { 
      workflowId: data.workflowId, 
      clientName: data.clientName 
    });

    return this.insert<ClientNote>('client_notes', {
      workflow_id: data.workflowId,
      driver_id: data.driverId,
      client_name: data.clientName,
      visit_time: data.visitTime,
      pickup_location: data.pickupLocation || null,
      dropoff_location: data.dropoffLocation || null,
      passenger_count: data.passengerCount || 1,
      notes: data.notes || null,
      special_requests: data.specialRequests || null,
      created_at: new Date(),
    });
  }

  /**
   * Get client notes for a workflow
   */
  async getClientNotes(workflowId: number): Promise<ClientNote[]> {
    this.log(`Getting client notes for workflow ${workflowId}`);

    return this.queryMany<ClientNote>(
      'SELECT * FROM client_notes WHERE workflow_id = $1 ORDER BY visit_time ASC',
      [workflowId]
    );
  }

  /**
   * Get workflow with client notes
   */
  async getWorkflowWithNotes(driverId: number, date: string): Promise<{
    workflow: Workflow | null;
    clientNotes: ClientNote[];
  }> {
    const workflow = await this.getByDriverAndDate(driverId, date);
    
    if (!workflow) {
      return { workflow: null, clientNotes: [] };
    }

    const clientNotes = await this.getClientNotes(workflow.id);

    return { workflow, clientNotes };
  }

  /**
   * List workflows for a driver with pagination
   */
  async listByDriver(
    driverId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    this.log('Listing workflows for driver', { driverId, filters });

    const conditions = ['driver_id = $1'];
    const params: unknown[] = [driverId];
    let paramCount = 1;

    if (filters?.startDate) {
      paramCount++;
      conditions.push(`workflow_date >= $${paramCount}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      conditions.push(`workflow_date <= $${paramCount}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      SELECT * FROM workflows
      WHERE ${whereClause}
      ORDER BY workflow_date DESC
    `;

    return this.paginate<Workflow>(
      baseQuery,
      params,
      filters?.limit || 50,
      filters?.offset || 0
    );
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
