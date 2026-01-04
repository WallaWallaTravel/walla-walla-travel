import { logger } from '@/lib/logger';
/**
 * Proposal Service
 * Handles all proposal-related business logic
 * Consolidates proposal operations with optimized queries
 */

import { BaseService } from './base.service';
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export interface Proposal {
  id: number;
  proposal_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  party_size: number;
  tour_date: string;
  duration_hours: number;
  subtotal: number;
  taxes: number;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  valid_until: string;
  brand_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations (when included)
  activity_log?: ProposalActivity[];
  media?: ProposalMedia[];
  customer?: ProposalCustomer;
}

interface ProposalActivity {
  id: number;
  activity_type: string;
  notes: string | null;
  created_at: string;
}

interface ProposalMedia {
  id: number;
  media_type: string;
  url: string;
  created_at: string;
}

interface ProposalCustomer {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  vip_status: boolean;
}

export interface CreateProposalData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  tourDate: string;
  durationHours: number;
  subtotal: number;
  taxes: number;
  total: number;
  validUntil: string;
  brandId?: number;
  notes?: string;
}

// Validation schema
export const CreateProposalSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationHours: z.number().min(4).max(24),
  subtotal: z.number().min(0),
  taxes: z.number().min(0),
  total: z.number().min(0),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  brandId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Proposal Service
// ============================================================================

export class ProposalService extends BaseService {
  protected get serviceName(): string {
    return 'ProposalService';
  }

  // ==========================================================================
  // Create Operations
  // ==========================================================================

  /**
   * Create a new proposal
   */
  async createProposal(data: CreateProposalData): Promise<Proposal> {
    this.log('Creating proposal', {
      customerEmail: data.customerEmail,
      tourDate: data.tourDate,
    });

    return await this.withTransaction(async () => {
      // Validate data
      const validated = CreateProposalSchema.parse(data);

      // Get or create customer
      const customerId = await this.getOrCreateCustomer({
        email: validated.customerEmail,
        name: validated.customerName,
        phone: validated.customerPhone,
      });

      // Generate proposal number
      const proposalNumber = await this.generateProposalNumber();

      // Create proposal
      const proposal = await this.insert<Proposal>('proposals', {
        proposal_number: proposalNumber,
        customer_id: customerId,
        customer_name: validated.customerName,
        customer_email: validated.customerEmail,
        party_size: validated.partySize,
        tour_date: validated.tourDate,
        duration_hours: validated.durationHours,
        subtotal: validated.subtotal,
        taxes: validated.taxes,
        total: validated.total,
        status: 'draft',
        valid_until: validated.validUntil,
        brand_id: validated.brandId || null,
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      this.log('Proposal created successfully', {
        proposalId: proposal.id,
        proposalNumber: proposal.proposal_number,
      });

      return proposal;
    });
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Get proposal by ID
   */
  async getProposalById(id: number): Promise<Proposal> {
    this.log('Fetching proposal', { id });

    const proposal = await this.findById<Proposal>('proposals', id);

    if (!proposal) {
      throw new NotFoundError('Proposal', id.toString());
    }

    return proposal;
  }

  /**
   * Get proposal by proposal number
   */
  async getProposalByNumber(proposalNumber: string): Promise<Proposal> {
    this.log('Fetching proposal by number', { proposalNumber });

    const proposal = await this.queryOne<Proposal>(
      'SELECT * FROM proposals WHERE proposal_number = $1',
      [proposalNumber]
    );

    if (!proposal) {
      throw new NotFoundError('Proposal', proposalNumber);
    }

    return proposal;
  }

  /**
   * Get proposals with filters and pagination
   */
  async findManyWithFilters(filters: {
    status?: string;
    customerId?: number;
    brandId?: number;
    startDate?: string;
    endDate?: string;
    includeCustomer?: boolean;
    includeActivity?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: Proposal[]; total: number }> {
    this.log('Finding proposals with filters', filters);

    const whereClause: string[] = [];
    const params: unknown[] = [];

    // Build WHERE conditions
    if (filters.status) {
      params.push(filters.status);
      whereClause.push(`p.status = $${params.length}`);
    }

    if (filters.customerId) {
      params.push(filters.customerId);
      whereClause.push(`p.customer_id = $${params.length}`);
    }

    if (filters.brandId) {
      params.push(filters.brandId);
      whereClause.push(`p.brand_id = $${params.length}`);
    }

    if (filters.startDate) {
      params.push(filters.startDate);
      whereClause.push(`p.tour_date >= $${params.length}`);
    }

    if (filters.endDate) {
      params.push(filters.endDate);
      whereClause.push(`p.tour_date <= $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Build SELECT with optional relations
    let selectClause = 'p.*';
    let joinClause = '';

    if (filters.includeCustomer) {
      selectClause += `, 
        JSON_BUILD_OBJECT(
          'id', c.id,
          'email', c.email,
          'name', c.name,
          'phone', c.phone,
          'vip_status', c.vip_status
        ) as customer`;
      joinClause += `
        LEFT JOIN customers c ON p.customer_id = c.id`;
    }

    // Count total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM proposals p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get proposals
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const sql = `
      SELECT ${selectClause}
      FROM proposals p
      ${joinClause}
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.query<Proposal>(sql, params);

    return {
      proposals: result.rows,
      total,
    };
  }

  /**
   * Get full proposal details with all data (single query)
   */
  async getFullProposalDetails(id: number | string): Promise<Proposal | null> {
    this.log('Fetching full proposal details', { id });

    const isNumber = typeof id === 'number' || /^\d+$/.test(id as string);
    const whereClause = isNumber ? 'p.id = $1' : 'p.proposal_number = $1';

    const result = await this.query<Proposal>(
      `SELECT 
        p.*,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'email', c.email,
          'name', c.name,
          'phone', c.phone,
          'vip_status', c.vip_status
        ) as customer,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', pal.id,
              'activity_type', pal.activity_type,
              'notes', pal.notes,
              'created_at', pal.created_at
            )
          ) FILTER (WHERE pal.id IS NOT NULL),
          '[]'::json
        ) as activity_log
      FROM proposals p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN proposal_activity_log pal ON p.id = pal.proposal_id
      WHERE ${whereClause}
      GROUP BY p.id, c.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // ==========================================================================
  // Update Operations
  // ==========================================================================

  /**
   * Update proposal status
   */
  async updateStatus(
    id: number,
    status: Proposal['status']
  ): Promise<Proposal> {
    this.log('Updating proposal status', { id, status });

    const proposal = await this.getProposalById(id);
    
    // Validate status transition
    this.validateStatusTransition(proposal.status, status);

    const updated = await this.update<Proposal>('proposals', id, { 
      status,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError('Proposal', id.toString());
    }

    // Log activity
    await this.query(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, notes, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, 'status_change', `Status changed from ${proposal.status} to ${status}`]
    );

    this.log('Proposal status updated', {
      id,
      oldStatus: proposal.status,
      newStatus: status,
    });

    return updated;
  }

  /**
   * Update proposal (partial update)
   */
  async updateProposal(
    id: number,
    data: Partial<Proposal>
  ): Promise<Proposal> {
    this.log('Updating proposal', { id, fields: Object.keys(data) });

    // Check if proposal exists
    const existsCheck = await this.exists('proposals', 'id = $1', [id]);
    if (!existsCheck) {
      throw new NotFoundError('Proposal', id.toString());
    }

    const updated = await this.update<Proposal>('proposals', id, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    if (!updated) {
      throw new NotFoundError('Proposal', id.toString());
    }

    this.log('Proposal updated successfully', { id });

    return updated;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get or create customer
   */
  private async getOrCreateCustomer(data: {
    email: string;
    name: string;
    phone: string;
  }): Promise<number> {
    const existing = await this.queryOne<{ id: number }>(
      'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
      [data.email]
    );

    if (existing) {
      await this.query(
        'UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
        [data.name, data.phone, existing.id]
      );
      return existing.id;
    }

    const newCustomer = await this.insert<{ id: number }>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return newCustomer.id;
  }

  /**
   * Generate unique proposal number
   */
  private async generateProposalNumber(): Promise<string> {
    const prefix = 'PROP';
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `${prefix}-${year}-${timestamp}${random}`;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: Proposal['status'],
    newStatus: Proposal['status']
  ): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['sent', 'declined'],
      sent: ['viewed', 'accepted', 'declined', 'expired'],
      viewed: ['accepted', 'declined', 'expired'],
      accepted: [],
      declined: [],
      expired: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  // ==========================================================================
  // Business Logic
  // ==========================================================================

  /**
   * Get proposal statistics
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<{
    totalProposals: number;
    sentProposals: number;
    acceptedProposals: number;
    declinedProposals: number;
    conversionRate: number;
    averageValue: number;
  }> {
    const whereClause: string[] = [];
    const params: unknown[] = [];

    if (startDate) {
      params.push(startDate);
      whereClause.push(`created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      whereClause.push(`created_at <= $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const result = await this.query<{
      total_proposals: string;
      sent_proposals: string;
      accepted_proposals: string;
      declined_proposals: string;
      avg_value: string;
    }>(
      `SELECT 
        COUNT(*) as total_proposals,
        SUM(CASE WHEN status IN ('sent', 'viewed', 'accepted') THEN 1 ELSE 0 END) as sent_proposals,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_proposals,
        SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_proposals,
        AVG(total) as avg_value
       FROM proposals
       ${where}`,
      params
    );

    const row = result.rows[0];
    const sent = parseInt(row.sent_proposals, 10);
    const accepted = parseInt(row.accepted_proposals, 10);

    return {
      totalProposals: parseInt(row.total_proposals, 10),
      sentProposals: sent,
      acceptedProposals: accepted,
      declinedProposals: parseInt(row.declined_proposals, 10),
      conversionRate: sent > 0 ? accepted / sent : 0,
      averageValue: parseFloat(row.avg_value || '0'),
    };
  }
}

// Export singleton instance
export const proposalService = new ProposalService();
