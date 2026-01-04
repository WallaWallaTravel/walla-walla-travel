import { logger } from '@/lib/logger';
/**
 * Proposal Service
 *
 * @module lib/services/proposal.service
 * @description Manages wine tour proposals from creation through conversion to booking.
 * Handles proposal lifecycle including drafting, sending, client responses (accept/decline/counter),
 * and conversion to confirmed bookings.
 *
 * @requires BaseService - Database operations abstraction
 * @requires proposal-utils - Proposal number generation, pricing calculations, validation
 *
 * @example
 * ```typescript
 * import { proposalService } from '@/lib/services/proposal.service';
 *
 * // Create a new proposal
 * const proposal = await proposalService.create({
 *   client_name: 'Jane Smith',
 *   client_email: 'jane@example.com',
 *   tour_date: '2026-03-15',
 *   party_size: 6,
 *   wineries: [{ winery_id: 1, duration: 90 }]
 * });
 *
 * // Send proposal to client
 * await proposalService.send(proposal.id);
 *
 * // Convert accepted proposal to booking
 * const booking = await proposalService.convertToBooking(proposal.id);
 * ```
 */

import { BaseService } from './base.service';
import { pool } from '@/lib/db';
import {
  ProposalData,
  generateProposalNumber,
  getDefaultProposalText,
  calculateProposalTotals,
  validateProposalData,
  logProposalActivity
} from '@/lib/proposals/proposal-utils';
import { BadRequestError } from '@/lib/api/middleware/error-handler';

interface ProposalRow {
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
    const defaults = await getDefaultProposalText(pool);

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
        proposal_number, client_name, client_email, client_phone, client_company,
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
        $31, $32
      ) RETURNING id, proposal_number, uuid` as const,
      [
        proposalNumber,
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
    await logProposalActivity(
      pool,
      proposal.id,
      'created',
      `Proposal created: ${proposalNumber}`
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




