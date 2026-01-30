/**
 * Experience Request Service
 *
 * @module lib/services/experience-request.service
 * @description Handles concierge-style experience requests
 * Users submit requests, staff coordinates with wineries behind the scenes
 * Keeps users on wallawalla.travel instead of redirecting to external systems
 */

import { z } from 'zod';
import { BaseService } from './base.service';
import { crmSyncService } from './crm-sync.service';
import { crmTaskAutomationService } from './crm-task-automation.service';

// ============================================================================
// Types
// ============================================================================

export interface ExperienceRequest {
  id: number;
  request_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  party_size: number;
  preferred_date: string;
  alternate_date: string | null;
  preferred_time: string | null;
  winery_ids: number[];
  experience_type: string;
  special_requests: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  occasion: string | null;
  brand: string;
  source: string;
  source_session_id: string | null;
  status: string;
  assigned_to: number | null;
  internal_notes: string | null;
  last_contacted_at: Date | null;
  follow_up_date: string | null;
  converted_booking_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export type ExperienceRequestStatus =
  | 'new'
  | 'contacted'
  | 'in_progress'
  | 'confirmed'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type ExperienceBrand = 'wwt' | 'nwtc' | 'hcwt';

export type ExperienceSource =
  | 'website'
  | 'chatgpt'
  | 'phone'
  | 'email'
  | 'referral';

// ============================================================================
// Validation Schemas
// ============================================================================

// Occasions that are EXCLUDED for brand protection (especially Herding Cats)
const EXCLUDED_OCCASIONS = [
  'bachelorette',
  'bachelor',
  'party',
  'celebration',
  'pub_crawl',
  'bar_hop',
];

export const CreateExperienceRequestSchema = z.object({
  contact_name: z.string().min(2, 'Name must be at least 2 characters'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional(),
  party_size: z.number().int().min(1).max(50),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  alternate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_time: z.enum(['morning', 'afternoon', 'flexible']).optional(),
  winery_ids: z.array(z.number().int()).optional().default([]),
  experience_type: z.enum(['wine_tour', 'private_tasting', 'group_event', 'corporate']).optional().default('wine_tour'),
  special_requests: z.string().max(2000).optional(),
  dietary_restrictions: z.string().max(500).optional(),
  accessibility_needs: z.string().max(500).optional(),
  occasion: z.string().max(100)
    .refine(
      (val) => !val || !EXCLUDED_OCCASIONS.some(exc => val.toLowerCase().includes(exc)),
      'We specialize in wine appreciation experiences. For party-style events, please contact local party bus services.'
    )
    .optional(),
  brand: z.enum(['wwt', 'nwtc', 'hcwt']).optional().default('wwt'),
  source: z.enum(['website', 'chatgpt', 'phone', 'email', 'referral']).optional().default('website'),
  source_session_id: z.string().max(100).optional(),
});

export type CreateExperienceRequestData = z.infer<typeof CreateExperienceRequestSchema>;

export const UpdateExperienceRequestSchema = z.object({
  status: z.enum(['new', 'contacted', 'in_progress', 'confirmed', 'declined', 'completed', 'cancelled']).optional(),
  assigned_to: z.number().int().optional(),
  internal_notes: z.string().max(5000).optional(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  last_contacted_at: z.string().optional(),
});

export type UpdateExperienceRequestData = z.infer<typeof UpdateExperienceRequestSchema>;

// ============================================================================
// Service Implementation
// ============================================================================

export class ExperienceRequestService extends BaseService {
  protected get serviceName(): string {
    return 'ExperienceRequestService';
  }

  /**
   * Create a new experience request
   */
  async create(data: CreateExperienceRequestData): Promise<ExperienceRequest> {
    this.log('Creating experience request', {
      email: data.contact_email,
      date: data.preferred_date,
      brand: data.brand,
    });

    const result = await this.insert<ExperienceRequest>('experience_requests', {
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone || null,
      party_size: data.party_size,
      preferred_date: data.preferred_date,
      alternate_date: data.alternate_date || null,
      preferred_time: data.preferred_time || null,
      winery_ids: data.winery_ids || [],
      experience_type: data.experience_type || 'wine_tour',
      special_requests: data.special_requests || null,
      dietary_restrictions: data.dietary_restrictions || null,
      accessibility_needs: data.accessibility_needs || null,
      occasion: data.occasion || null,
      brand: data.brand || 'wwt',
      source: data.source || 'website',
      source_session_id: data.source_session_id || null,
      status: 'new',
    });

    this.log(`Experience request created: ${result.request_number}`);

    // Sync to CRM (async, don't block experience request creation)
    this.syncExperienceRequestToCrm(result).catch((err) => {
      this.log('Failed to sync experience request to CRM', { error: err, requestId: result.id });
    });

    return result;
  }

  /**
   * Sync experience request to CRM
   * Creates a CRM contact and a lead task for follow-up
   */
  private async syncExperienceRequestToCrm(request: ExperienceRequest): Promise<void> {
    // Find or create CRM contact
    let contact = await crmSyncService['queryOne']<{ id: number; email: string }>(
      `SELECT id, email FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      [request.contact_email]
    );

    if (!contact) {
      // Create new contact as a lead
      contact = await crmSyncService['queryOne']<{ id: number; email: string }>(
        `INSERT INTO crm_contacts (
          email, name, phone, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail,
          notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'lead', 'warm', 'experience_request', $5, $6, NOW(), NOW())
        RETURNING id, email`,
        [
          request.contact_email,
          request.contact_name,
          request.contact_phone || null,
          request.experience_type === 'corporate' ? 'corporate' : 'individual',
          request.source,
          `Experience Request ${request.request_number}: ${request.party_size} guests for ${request.preferred_date}`,
        ]
      );

      this.log('Created CRM contact for experience request', { contactId: contact?.id, requestId: request.id });
    } else {
      // Update existing contact's notes
      await crmSyncService['query'](
        `UPDATE crm_contacts
         SET notes = COALESCE(notes || E'\\n\\n---\\n', '') || $1,
             last_contacted_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [
          `[Experience Request ${request.request_number}] ${request.party_size} guests for ${request.preferred_date}`,
          contact.id,
        ]
      );

      this.log('Updated existing CRM contact for experience request', { contactId: contact.id, requestId: request.id });
    }

    if (!contact) return;

    // Log the request as a CRM activity
    await crmSyncService.logActivity({
      contactId: contact.id,
      activityType: 'note',
      subject: `Experience Request: ${request.experience_type}`,
      body: this.formatExperienceRequestDetails(request),
    });

    // Create follow-up task for the new lead
    await crmTaskAutomationService.onNewLead({
      contactId: contact.id,
      customerName: request.contact_name,
      source: 'experience_request',
    });
  }

  /**
   * Format experience request details for CRM activity body
   */
  private formatExperienceRequestDetails(request: ExperienceRequest): string {
    const lines = [
      `Request #: ${request.request_number}`,
      `Name: ${request.contact_name}`,
      `Email: ${request.contact_email}`,
    ];

    if (request.contact_phone) lines.push(`Phone: ${request.contact_phone}`);
    lines.push(`Party Size: ${request.party_size}`);
    lines.push(`Date: ${request.preferred_date}`);
    if (request.alternate_date) lines.push(`Alt Date: ${request.alternate_date}`);
    if (request.preferred_time) lines.push(`Time: ${request.preferred_time}`);
    lines.push(`Type: ${request.experience_type}`);
    if (request.occasion) lines.push(`Occasion: ${request.occasion}`);
    if (request.special_requests) lines.push(`Special Requests: ${request.special_requests}`);
    if (request.dietary_restrictions) lines.push(`Dietary: ${request.dietary_restrictions}`);
    lines.push(`Source: ${request.source}`);

    return lines.join('\n');
  }

  /**
   * Get experience request by ID
   */
  async getById(id: number): Promise<ExperienceRequest | null> {
    return this.queryOne<ExperienceRequest>(
      'SELECT * FROM experience_requests WHERE id = $1',
      [id]
    );
  }

  /**
   * Get experience request by request number
   */
  async findByRequestNumber(requestNumber: string): Promise<ExperienceRequest | null> {
    return this.queryOne<ExperienceRequest>(
      'SELECT * FROM experience_requests WHERE request_number = $1',
      [requestNumber]
    );
  }

  /**
   * List experience requests with filters
   */
  async findMany(filters: {
    status?: ExperienceRequestStatus;
    brand?: ExperienceBrand;
    source?: ExperienceSource;
    assignedTo?: number;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ requests: ExperienceRequest[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.brand) {
      conditions.push(`brand = $${paramIndex++}`);
      params.push(filters.brand);
    }

    if (filters.source) {
      conditions.push(`source = $${paramIndex++}`);
      params.push(filters.source);
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      params.push(filters.assignedTo);
    }

    if (filters.fromDate) {
      conditions.push(`preferred_date >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      conditions.push(`preferred_date <= $${paramIndex++}`);
      params.push(filters.toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM experience_requests ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get paginated data
    const requests = await this.queryMany<ExperienceRequest>(
      `SELECT * FROM experience_requests ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return { requests, total };
  }

  /**
   * Get pending/new requests that need attention
   */
  async findPendingQueue(): Promise<ExperienceRequest[]> {
    return this.queryMany<ExperienceRequest>(
      `SELECT * FROM experience_requests
       WHERE status IN ('new', 'contacted', 'in_progress')
       ORDER BY
         CASE status
           WHEN 'new' THEN 1
           WHEN 'contacted' THEN 2
           WHEN 'in_progress' THEN 3
         END,
         preferred_date ASC,
         created_at ASC`
    );
  }

  /**
   * Get requests with upcoming follow-up dates
   */
  async findFollowUps(days: number = 7): Promise<ExperienceRequest[]> {
    return this.queryMany<ExperienceRequest>(
      `SELECT * FROM experience_requests
       WHERE follow_up_date IS NOT NULL
         AND follow_up_date <= CURRENT_DATE + $1
         AND status NOT IN ('completed', 'cancelled', 'declined')
       ORDER BY follow_up_date ASC`,
      [days]
    );
  }

  /**
   * Update an experience request
   */
  async updateRequest(
    id: number,
    data: UpdateExperienceRequestData
  ): Promise<ExperienceRequest | null> {
    const updates: Record<string, unknown> = {};

    if (data.status !== undefined) updates.status = data.status;
    if (data.assigned_to !== undefined) updates.assigned_to = data.assigned_to;
    if (data.internal_notes !== undefined) updates.internal_notes = data.internal_notes;
    if (data.follow_up_date !== undefined) updates.follow_up_date = data.follow_up_date;
    if (data.last_contacted_at !== undefined) updates.last_contacted_at = new Date(data.last_contacted_at);

    if (Object.keys(updates).length === 0) {
      return this.getById(id);
    }

    return this.update<ExperienceRequest>('experience_requests', id, updates);
  }

  /**
   * Mark request as contacted
   */
  async markContacted(id: number, notes?: string): Promise<ExperienceRequest | null> {
    return this.updateRequest(id, {
      status: 'contacted',
      last_contacted_at: new Date().toISOString(),
      internal_notes: notes,
    });
  }

  /**
   * Convert request to booking
   */
  async convertToBooking(id: number, bookingId: number): Promise<ExperienceRequest | null> {
    const result = await this.query<ExperienceRequest>(
      `UPDATE experience_requests
       SET status = 'confirmed',
           converted_booking_id = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, bookingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get analytics by brand
   */
  async getAnalyticsByBrand(fromDate?: string, toDate?: string): Promise<{
    brand: string;
    total: number;
    converted: number;
    conversion_rate: number;
  }[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (fromDate) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.queryMany<{
      brand: string;
      total: number;
      converted: number;
      conversion_rate: number;
    }>(
      `SELECT
         brand,
         COUNT(*) as total,
         COUNT(CASE WHEN converted_booking_id IS NOT NULL THEN 1 END) as converted,
         ROUND(
           COUNT(CASE WHEN converted_booking_id IS NOT NULL THEN 1 END)::numeric /
           NULLIF(COUNT(*), 0) * 100,
           2
         ) as conversion_rate
       FROM experience_requests
       ${whereClause}
       GROUP BY brand
       ORDER BY total DESC`,
      params
    );
  }
}

// Export singleton instance
export const experienceRequestService = new ExperienceRequestService();
