/**
 * Proposal Service (Template-Based)
 *
 * @module lib/services/proposal.service
 * @description Manages wine tour proposals with template-based creation using proposal-utils.
 * This is the template-focused proposal service that uses default text from the database.
 *
 * @see proposal-service.ts for the comprehensive proposal management service with
 * Zod validation, status transitions, and statistics.
 *
 * @deprecated Consider using proposal-service.ts for new features. This service
 * is maintained for backwards compatibility with existing template-based workflows.
 *
 * @requires BaseService - Database operations abstraction
 * @requires proposal-utils - Proposal number generation, pricing calculations, validation
 *
 * @example
 * ```typescript
 * import { proposalService } from '@/lib/services/proposal.service';
 *
 * // Create a new proposal with templates
 * const proposal = await proposalService.create({
 *   client_name: 'Jane Smith',
 *   client_email: 'jane@example.com',
 *   tour_date: '2026-03-15',
 *   party_size: 6,
 *   wineries: [{ winery_id: 1, duration: 90 }]
 * });
 * ```
 */

import { BaseService } from './base.service';
import { prisma } from '@/lib/prisma';
import {
  ProposalData,
  generateProposalNumber,
  calculateProposalTotals,
  validateProposalData,
} from '@/lib/proposals/proposal-utils';
import { BadRequestError } from '@/lib/api/middleware/error-handler';

interface _ProposalRow {
  id: number;
  proposal_number: string;
  uuid: string;
  client_name: string;
  client_email: string;
  status: string;
  total: number;
  created_at: Date;
}

interface ListProposalsParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ProposalService extends BaseService {
  protected get serviceName(): string {
    return 'ProposalService';
  }

  /**
   * List proposals with filtering and pagination
   */
  async list(params: ListProposalsParams = {}) {
    const {
      status = 'all',
      search,
      limit = 50,
      offset = 0
    } = params;

    this.log('Listing proposals', { status, search, limit, offset });

    // Build WHERE conditions
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let paramCount = 0;

    if (status && status !== 'all') {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (search) {
      paramCount++;
      conditions.push(`(client_name ILIKE $${paramCount} OR client_email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Get proposals
    paramCount++;
    const limitParam = paramCount;
    values.push(limit);

    paramCount++;
    const offsetParam = paramCount;
    values.push(offset);

    const proposalsQuery = `
      SELECT 
        id, proposal_number, uuid, client_name, client_email, client_phone,
        client_company, proposal_title, status, total, valid_until,
        created_at, updated_at, sent_at, viewed_at, accepted_at,
        view_count, service_items
      FROM proposals
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const proposals = await this.query(proposalsQuery, values);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM proposals WHERE ${whereClause}`;
    const countResult = await this.query<{ count: string }>(countQuery, values.slice(0, -2)); // Remove limit/offset
    const total = parseInt(countResult.rows[0].count);

    return {
      proposals: proposals.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Create a new proposal
   */
  async create(data: ProposalData) {
    this.log('Creating proposal', { client_email: data.client_email });

    // Validate data
    const errors = validateProposalData(data);
    if (errors.length > 0) {
      throw new BadRequestError(`Validation failed: ${errors.join(', ')}`);
    }

    // Calculate totals
    const totals = calculateProposalTotals(data);

    // Generate proposal number
    const proposalNumber = generateProposalNumber();

    // Get default text
    const templateRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      'SELECT * FROM proposal_text_templates WHERE template_name = $1',
      'default'
    );
    const defaults = templateRows[0] || {
      title: 'Walla Walla Wine Country Experience',
      introduction: 'Thank you for your interest in Walla Walla Travel! We are excited to create a memorable wine country experience for you and your guests.',
      wine_tour_description: 'Visit 3 premier wineries in the Walla Walla Valley. Your private guide will provide insights into the region\'s rich wine-making heritage while ensuring a comfortable and memorable experience.',
      transfer_description: 'Professional transportation service with experienced drivers and comfortable, well-maintained vehicles.',
      wait_time_description: 'Professional wait time service while you attend meetings, events, or other activities.',
      terms_and_conditions: 'A 50% deposit is required to confirm your booking. The remaining balance is due 48 hours after your tour concludes. Cancellations 45+ days before: 100% refund of deposit. Cancellations 21-44 days before: 50% refund of deposit. Cancellations within 21 days: No refund.',
      cancellation_policy: 'Cancellations 45+ days before: 100% refund of deposit. 21-44 days before: 50% refund of deposit. Within 21 days: No refund.',
      footer_notes: 'Looking forward to hosting you!'
    };

    // Merge with defaults
    const proposalTitle = data.proposal_title || defaults.title;
    const introduction = data.introduction || defaults.introduction;
    const wineTourDescription = data.wine_tour_description || defaults.wine_tour_description;
    const transferDescription = data.transfer_description || defaults.transfer_description;
    const waitTimeDescription = data.wait_time_description || defaults.wait_time_description;
    const cancellationPolicy = data.cancellation_policy || defaults.cancellation_policy;
    const footerNotes = data.footer_notes || defaults.footer_notes;
    const termsAndConditions = defaults.terms_and_conditions;

    // Insert proposal
    const result = await this.query(
      `INSERT INTO proposals (
        proposal_number, brand_id, client_name, client_email, client_phone, client_company,
        proposal_title, introduction, wine_tour_description, transfer_description,
        wait_time_description, special_notes, cancellation_policy, footer_notes,
        terms_and_conditions, service_items, additional_services, subtotal,
        discount_percentage, discount_reason, discount_amount, total,
        include_gratuity_request, suggested_gratuity_percentage, gratuity_optional,
        valid_until, status, modules, corporate_details, multi_day_itinerary,
        b2b_details, special_event_details, group_coordination
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33
      ) RETURNING id, proposal_number, uuid` as const,
      [
        proposalNumber,
        data.brand_id || 1, // Default to Walla Walla Travel (ID 1)
        data.client_name,
        data.client_email,
        data.client_phone,
        data.client_company || null,
        proposalTitle,
        introduction,
        wineTourDescription,
        transferDescription,
        waitTimeDescription,
        data.special_notes || null,
        cancellationPolicy,
        footerNotes,
        termsAndConditions,
        JSON.stringify(data.service_items),
        JSON.stringify(data.additional_services || []),
        totals.subtotal,
        data.discount_percentage || 0,
        data.discount_reason || null,
        totals.discountAmount,
        totals.total,
        data.include_gratuity_request !== false,
        data.suggested_gratuity_percentage || 18,
        data.gratuity_optional !== false,
        data.valid_until,
        'draft',
        JSON.stringify(data.modules || {}),
        data.corporate_details ? JSON.stringify(data.corporate_details) : null,
        data.multi_day_itinerary ? JSON.stringify(data.multi_day_itinerary) : null,
        data.b2b_details ? JSON.stringify(data.b2b_details) : null,
        data.special_event_details ? JSON.stringify(data.special_event_details) : null,
        data.group_coordination ? JSON.stringify(data.group_coordination) : null
      ]
    );

    const proposal = result.rows[0] as { id: number; proposal_number: string; uuid: string };

    // Log activity
    await prisma.$queryRawUnsafe(
      `INSERT INTO proposal_activity_log (proposal_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      proposal.id,
      'created',
      `Proposal created: ${proposalNumber}`,
      null
    );

    this.log(`Proposal created: ${proposalNumber}`);

    return {
      id: proposal.id,
      proposal_number: proposal.proposal_number,
      uuid: proposal.uuid
    };
  }
}

export const proposalService = new ProposalService();




