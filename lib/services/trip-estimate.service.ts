/**
 * Trip Estimate Service
 *
 * @module lib/services/trip-estimate.service
 * @description Handles all trip estimate (Quick Tally) business logic.
 * Supports lightweight cost estimation and deposit collection before
 * building a full trip proposal.
 */

import { BaseService } from './base.service';
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { tripProposalService } from './trip-proposal.service';
import {
  TripEstimate,
  TripEstimateFull,
  TripEstimateItem,
  TripEstimateStatus,
  CreateTripEstimateInput,
  UpdateTripEstimateInput,
  CreateTripEstimateItemInput,
  CreateTripEstimateSchema,
  UpdateTripEstimateSchema,
  CreateTripEstimateItemSchema,
} from '@/lib/types/trip-estimate';

// ============================================================================
// Trip Estimate Service
// ============================================================================

export class TripEstimateService extends BaseService {
  protected get serviceName(): string {
    return 'TripEstimateService';
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new trip estimate with optional line items
   */
  async create(data: CreateTripEstimateInput, userId?: number): Promise<TripEstimateFull> {
    this.log('Creating trip estimate', {
      customerName: data.customer_name,
      customerEmail: data.customer_email,
    });

    return await this.withTransaction(async () => {
      // Validate input
      const validated = CreateTripEstimateSchema.parse(data);

      // Generate estimate number
      const estimateNumber = await this.generateEstimateNumber();

      // Calculate valid_until if not provided (30 days default)
      const validUntil = validated.valid_until || this.calculateValidUntil(30);

      // Calculate subtotal from items
      let subtotal = 0;
      if (validated.items && validated.items.length > 0) {
        for (const item of validated.items) {
          const itemTotal = item.total_price ?? (item.quantity ?? 1) * (item.unit_price ?? 0);
          subtotal += itemTotal;
        }
      }

      // Create the estimate
      const estimate = await this.insert<TripEstimate>('trip_estimates', {
        estimate_number: estimateNumber,
        status: 'draft',
        customer_name: validated.customer_name,
        customer_email: validated.customer_email || null,
        customer_phone: validated.customer_phone || null,
        trip_type: validated.trip_type || 'wine_tour',
        trip_title: validated.trip_title || null,
        trip_description: validated.trip_description || null,
        start_date: validated.start_date || null,
        end_date: validated.end_date || null,
        party_size: validated.party_size || 2,
        subtotal,
        deposit_amount: validated.deposit_amount || 0,
        deposit_reason: validated.deposit_reason || null,
        valid_until: validUntil,
        brand_id: validated.brand_id || null,
        created_by: userId || null,
      });

      // Create line items
      const items: TripEstimateItem[] = [];
      if (validated.items && validated.items.length > 0) {
        for (let i = 0; i < validated.items.length; i++) {
          const itemData = validated.items[i];
          const validatedItem = CreateTripEstimateItemSchema.parse(itemData);
          const itemTotal = validatedItem.total_price ?? (validatedItem.quantity ?? 1) * (validatedItem.unit_price ?? 0);

          const item = await this.insert<TripEstimateItem>('trip_estimate_items', {
            trip_estimate_id: estimate.id,
            category: validatedItem.category,
            description: validatedItem.description || null,
            quantity: validatedItem.quantity ?? 1,
            unit_label: validatedItem.unit_label || null,
            unit_price: validatedItem.unit_price ?? 0,
            total_price: itemTotal,
            notes: validatedItem.notes || null,
            sort_order: validatedItem.sort_order ?? i,
          });
          items.push(item);
        }
      }

      this.log('Trip estimate created', {
        estimateId: estimate.id,
        estimateNumber: estimate.estimate_number,
        itemCount: items.length,
      });

      return { ...estimate, items };
    });
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Get estimate by ID
   */
  async getById(id: number): Promise<TripEstimate | null> {
    return this.findById<TripEstimate>('trip_estimates', id);
  }

  /**
   * Get estimate by estimate number
   */
  async getByNumber(estimateNumber: string): Promise<TripEstimate | null> {
    return this.queryOne<TripEstimate>(
      'SELECT * FROM trip_estimates WHERE estimate_number = $1',
      [estimateNumber]
    );
  }

  /**
   * Get estimate with all items
   */
  async getFullDetails(id: number): Promise<TripEstimateFull | null> {
    const estimate = await this.findById<TripEstimate>('trip_estimates', id);
    if (!estimate) return null;

    const items = await this.queryMany<TripEstimateItem>(
      'SELECT * FROM trip_estimate_items WHERE trip_estimate_id = $1 ORDER BY sort_order ASC, id ASC',
      [id]
    );

    return { ...estimate, items };
  }

  /**
   * List estimates with filters
   */
  async list(filters: {
    status?: TripEstimateStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ estimates: TripEstimate[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(
        customer_name ILIKE $${paramIndex} OR
        customer_email ILIKE $${paramIndex} OR
        estimate_number ILIKE $${paramIndex} OR
        trip_title ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const total = await this.queryCount(
      `SELECT COUNT(*) as count FROM trip_estimates ${whereClause}`,
      params
    );

    // Get paginated data
    const estimates = await this.queryMany<TripEstimate>(
      `SELECT * FROM trip_estimates ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return { estimates, total };
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update estimate fields and optionally replace items
   */
  async updateEstimate(id: number, data: UpdateTripEstimateInput): Promise<TripEstimateFull> {
    this.log('Updating trip estimate', { id });

    const estimate = await this.getById(id);
    if (!estimate) {
      throw new NotFoundError('Trip estimate not found');
    }

    if (estimate.status !== 'draft') {
      throw new ValidationError('Only draft estimates can be edited');
    }

    return await this.withTransaction(async () => {
      const validated = UpdateTripEstimateSchema.parse(data);

      // Separate items from other fields
      const { items: itemsData, ...estimateFields } = validated;

      // Build update object for estimate fields
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(estimateFields)) {
        if (value !== undefined) {
          updateData[key] = value === '' ? null : value;
        }
      }

      // If items are provided, replace them and recalculate subtotal
      if (itemsData !== undefined) {
        // Delete existing items
        await this.query('DELETE FROM trip_estimate_items WHERE trip_estimate_id = $1', [id]);

        // Insert new items
        let subtotal = 0;
        for (let i = 0; i < itemsData.length; i++) {
          const itemData = itemsData[i];
          const validatedItem = CreateTripEstimateItemSchema.parse(itemData);
          const itemTotal = validatedItem.total_price ?? (validatedItem.quantity ?? 1) * (validatedItem.unit_price ?? 0);
          subtotal += itemTotal;

          await this.insert('trip_estimate_items', {
            trip_estimate_id: id,
            category: validatedItem.category,
            description: validatedItem.description || null,
            quantity: validatedItem.quantity ?? 1,
            unit_label: validatedItem.unit_label || null,
            unit_price: validatedItem.unit_price ?? 0,
            total_price: itemTotal,
            notes: validatedItem.notes || null,
            sort_order: validatedItem.sort_order ?? i,
          });
        }

        updateData.subtotal = subtotal;
      }

      // Update estimate if there are changes
      if (Object.keys(updateData).length > 0) {
        await this.update('trip_estimates', id, updateData);
      }

      // Return full updated estimate
      const updated = await this.getFullDetails(id);
      if (!updated) {
        throw new NotFoundError('Trip estimate not found after update');
      }

      this.log('Trip estimate updated', { estimateId: id });
      return updated;
    });
  }

  /**
   * Update estimate status with validation
   */
  async updateStatus(
    id: number,
    status: TripEstimateStatus,
    metadata?: Record<string, unknown>
  ): Promise<TripEstimate> {
    this.log('Updating trip estimate status', { id, status });

    const estimate = await this.getById(id);
    if (!estimate) {
      throw new NotFoundError('Trip estimate not found');
    }

    this.validateStatusTransition(estimate.status, status);

    const updateData: Record<string, unknown> = { status };

    // Handle deposit payment
    if (status === 'deposit_paid') {
      updateData.deposit_paid = true;
      updateData.deposit_paid_at = new Date().toISOString();
      if (metadata?.payment_intent_id) {
        updateData.payment_intent_id = metadata.payment_intent_id;
      }
    }

    const updated = await this.update<TripEstimate>('trip_estimates', id, updateData);
    if (!updated) {
      throw new NotFoundError('Trip estimate not found');
    }

    this.log('Trip estimate status updated', { estimateId: id, status });
    return updated;
  }

  // ==========================================================================
  // CALCULATE
  // ==========================================================================

  /**
   * Recalculate subtotal from items
   */
  async calculateTotals(id: number): Promise<{ subtotal: number }> {
    const result = await this.queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(total_price), 0) as total FROM trip_estimate_items WHERE trip_estimate_id = $1',
      [id]
    );

    const subtotal = parseFloat(result?.total || '0');

    await this.update('trip_estimates', id, { subtotal });

    return { subtotal };
  }

  // ==========================================================================
  // CONVERT TO PROPOSAL
  // ==========================================================================

  /**
   * Convert a paid estimate to a trip proposal (draft)
   */
  async convertToProposal(
    id: number,
    userId?: number
  ): Promise<{ proposal_id: number; proposal_number: string }> {
    this.log('Converting trip estimate to proposal', { id });

    const estimate = await this.getFullDetails(id);
    if (!estimate) {
      throw new NotFoundError('Trip estimate not found');
    }

    if (estimate.status !== 'deposit_paid') {
      throw new ValidationError('Only estimates with paid deposits can be converted to proposals');
    }

    if (estimate.trip_proposal_id) {
      throw new ValidationError('This estimate has already been converted to a proposal');
    }

    // Create trip proposal from estimate data
    const proposal = await tripProposalService.create(
      {
        customer_name: estimate.customer_name,
        customer_email: estimate.customer_email || undefined,
        customer_phone: estimate.customer_phone || undefined,
        trip_type: estimate.trip_type,
        trip_title: estimate.trip_title || undefined,
        party_size: estimate.party_size,
        start_date: estimate.start_date || new Date().toISOString().split('T')[0],
        end_date: estimate.end_date || undefined,
        brand_id: estimate.brand_id || undefined,
        introduction: estimate.trip_description || undefined,
        deposit_percentage: estimate.subtotal > 0
          ? Math.round((estimate.deposit_amount / estimate.subtotal) * 100)
          : 50,
      },
      userId
    );

    // Link estimate to proposal and mark as converted
    await this.update('trip_estimates', id, {
      trip_proposal_id: proposal.id,
      status: 'converted',
    });

    // Mark the proposal's deposit as paid since it was collected via the estimate
    await this.query(
      `UPDATE trip_proposals
       SET deposit_paid = true,
           deposit_paid_at = $2,
           deposit_amount = $3
       WHERE id = $1`,
      [proposal.id, estimate.deposit_paid_at, estimate.deposit_amount]
    );

    this.log('Trip estimate converted to proposal', {
      estimateId: id,
      proposalId: proposal.id,
      proposalNumber: proposal.proposal_number,
    });

    return {
      proposal_id: proposal.id,
      proposal_number: proposal.proposal_number,
    };
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete a draft estimate
   */
  async deleteEstimate(id: number): Promise<void> {
    const estimate = await this.getById(id);
    if (!estimate) {
      throw new NotFoundError('Trip estimate not found');
    }

    if (estimate.status !== 'draft') {
      throw new ValidationError('Only draft estimates can be deleted');
    }

    // Items are cascade-deleted via FK constraint
    await this.delete('trip_estimates', id);
    this.log('Trip estimate deleted', { estimateId: id });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async generateEstimateNumber(): Promise<string> {
    const result = await this.queryOne<{ estimate_number: string }>(
      'SELECT generate_trip_estimate_number() as estimate_number'
    );
    return result?.estimate_number || `TE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  }

  private calculateValidUntil(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private validateStatusTransition(current: TripEstimateStatus, next: TripEstimateStatus): void {
    const validTransitions: Record<TripEstimateStatus, TripEstimateStatus[]> = {
      draft: ['sent'],
      sent: ['viewed', 'deposit_paid'],
      viewed: ['deposit_paid', 'sent'], // Can resend
      deposit_paid: ['converted'],
      converted: [], // Final state
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new ValidationError(`Cannot transition from '${current}' to '${next}'`);
    }
  }
}

// Export singleton
export const tripEstimateService = new TripEstimateService();
