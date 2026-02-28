/**
 * Trip Proposal Service
 *
 * @module lib/services/trip-proposal.service
 * @description Handles all trip proposal business logic for comprehensive
 * multi-day trip planning with hotels, restaurants, wineries, and pricing.
 */

import { BaseService } from './base.service';
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { generateSecureString } from '@/lib/utils';
import { crmSyncService } from './crm-sync.service';
import { crmTaskAutomationService } from './crm-task-automation.service';
import {
  TripProposal,
  TripProposalFull,
  TripProposalDay,
  TripProposalStop,
  TripProposalGuest,
  TripProposalInclusion,
  TripProposalActivity,
  TripProposalStatus,
  PlanningPhase,
  CreateTripProposalInput,
  UpdateTripProposalInput,
  AddDayInput,
  AddStopInput,
  AddGuestInput,
  AddInclusionInput,
  TripProposalPricingBreakdown,
  CreateTripProposalSchema,
  UpdateTripProposalSchema,
  AddDaySchema,
  AddStopSchema,
  AddGuestSchema,
  AddInclusionSchema,
} from '@/lib/types/trip-proposal';

// ============================================================================
// Trip Proposal Service
// ============================================================================

export class TripProposalService extends BaseService {
  protected get serviceName(): string {
    return 'TripProposalService';
  }

  // ==========================================================================
  // CREATE Operations
  // ==========================================================================

  /**
   * Create a new trip proposal
   */
  async create(data: CreateTripProposalInput, userId?: number): Promise<TripProposal> {
    this.log('Creating trip proposal', {
      customerEmail: data.customer_email,
      startDate: data.start_date,
      partySize: data.party_size,
    });

    return await this.withTransaction(async () => {
      // Validate input
      const validated = CreateTripProposalSchema.parse(data);

      // Generate proposal number
      const proposalNumber = await this.generateProposalNumber();

      // Get or create customer
      let customerId: number | null = null;
      if (validated.customer_email) {
        customerId = await this.getOrCreateCustomer({
          email: validated.customer_email,
          name: validated.customer_name,
          phone: validated.customer_phone || '',
        });
      }

      // Calculate valid_until if not provided (30 days default)
      const validUntil = validated.valid_until || this.calculateValidUntil(30);

      // Generate access token for client-facing URL
      const accessToken = generateSecureString(64);

      // Create the proposal
      const proposal = await this.insert<TripProposal>('trip_proposals', {
        proposal_number: proposalNumber,
        status: 'draft',
        access_token: accessToken,
        planning_phase: 'proposal',
        customer_name: validated.customer_name,
        customer_email: validated.customer_email || null,
        customer_phone: validated.customer_phone || null,
        customer_company: validated.customer_company || null,
        customer_id: customerId,
        trip_type: validated.trip_type || 'wine_tour',
        trip_title: validated.trip_title || null,
        party_size: validated.party_size,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        brand_id: validated.brand_id || null,
        introduction: validated.introduction || null,
        special_notes: validated.special_notes || null,
        internal_notes: validated.internal_notes || null,
        valid_until: validUntil,
        discount_percentage: validated.discount_percentage || 0,
        discount_reason: validated.discount_reason || null,
        gratuity_percentage: validated.gratuity_percentage || 0,
        tax_rate: validated.tax_rate || 0.091,
        deposit_percentage: validated.deposit_percentage || 50,
        created_by: userId || null,
      });

      // Log activity
      await this.logActivity(proposal.id, 'created', 'Trip proposal created', {
        actor_type: 'staff',
        actor_user_id: userId,
      });

      // Create first day automatically
      await this.addDay(proposal.id, {
        date: validated.start_date,
        title: 'Day 1',
      });

      this.log('Trip proposal created', {
        proposalId: proposal.id,
        proposalNumber: proposal.proposal_number,
      });

      // Sync to CRM (async, don't block proposal creation)
      if (validated.customer_email) {
        crmSyncService.syncTripProposalToDeal({
          proposalId: proposal.id,
          proposalNumber: proposal.proposal_number,
          customerName: validated.customer_name,
          customerEmail: validated.customer_email,
          customerPhone: validated.customer_phone,
          customerCompany: validated.customer_company,
          partySize: validated.party_size,
          startDate: validated.start_date,
          brand: validated.brand_id ? undefined : 'walla_walla_travel', // Use brand if set
        }).catch((err) => {
          this.log('Failed to sync trip proposal to CRM', { error: err, proposalId: proposal.id });
        });
      }

      return proposal;
    });
  }

  /**
   * Add a day to the proposal
   */
  async addDay(proposalId: number, data: AddDayInput): Promise<TripProposalDay> {
    this.log('Adding day to proposal', { proposalId, date: data.date });

    // Validate
    const validated = AddDaySchema.parse(data);

    // Check proposal exists
    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    // Get next day number
    const maxDayResult = await this.queryOne<{ max_day: number }>(
      'SELECT COALESCE(MAX(day_number), 0) as max_day FROM trip_proposal_days WHERE trip_proposal_id = $1',
      [proposalId]
    );
    const dayNumber = (maxDayResult?.max_day || 0) + 1;

    const day = await this.insert<TripProposalDay>('trip_proposal_days', {
      trip_proposal_id: proposalId,
      day_number: dayNumber,
      date: validated.date,
      title: validated.title || `Day ${dayNumber}`,
      description: validated.description || null,
      notes: validated.notes || null,
      internal_notes: validated.internal_notes || null,
    });

    return day;
  }

  /**
   * Add a stop to a day
   */
  async addStop(dayId: number, data: AddStopInput): Promise<TripProposalStop> {
    this.log('Adding stop to day', { dayId, stopType: data.stop_type });

    // Validate
    const validated = AddStopSchema.parse(data);

    // Check day exists
    const dayExists = await this.exists('trip_proposal_days', 'id = $1', [dayId]);
    if (!dayExists) {
      throw new NotFoundError('TripProposalDay', dayId.toString());
    }

    // Get next stop order if not provided
    let stopOrder = validated.stop_order;
    if (stopOrder === undefined) {
      const maxOrderResult = await this.queryOne<{ max_order: number }>(
        'SELECT COALESCE(MAX(stop_order), -1) as max_order FROM trip_proposal_stops WHERE trip_proposal_day_id = $1',
        [dayId]
      );
      stopOrder = (maxOrderResult?.max_order ?? -1) + 1;
    }

    const stop = await this.insert<TripProposalStop>('trip_proposal_stops', {
      trip_proposal_day_id: dayId,
      stop_order: stopOrder,
      stop_type: validated.stop_type,
      winery_id: validated.winery_id || null,
      restaurant_id: validated.restaurant_id || null,
      hotel_id: validated.hotel_id || null,
      custom_name: validated.custom_name || null,
      custom_address: validated.custom_address || null,
      custom_description: validated.custom_description || null,
      scheduled_time: validated.scheduled_time || null,
      duration_minutes: validated.duration_minutes || null,
      per_person_cost: validated.per_person_cost || 0,
      flat_cost: validated.flat_cost || 0,
      cost_note: validated.cost_note || null,
      room_rate: validated.room_rate || 0,
      num_rooms: validated.num_rooms || 0,
      nights: validated.nights || 1,
      reservation_status: validated.reservation_status || 'pending',
      client_notes: validated.client_notes || null,
      internal_notes: validated.internal_notes || null,
      driver_notes: validated.driver_notes || null,
    });

    return stop;
  }

  /**
   * Add a guest to the proposal
   */
  async addGuest(proposalId: number, data: AddGuestInput): Promise<TripProposalGuest> {
    this.log('Adding guest to proposal', { proposalId, guestName: data.name });

    // Validate
    const validated = AddGuestSchema.parse(data);

    // Check proposal exists and get capacity limit
    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    // Atomic capacity-checked insert using CTE to prevent race conditions
    const maxGuests = proposal.max_guests;
    const result = await this.queryOne<TripProposalGuest>(
      `WITH capacity AS (
        SELECT COUNT(*) AS cnt FROM trip_proposal_guests WHERE trip_proposal_id = $1
      )
      INSERT INTO trip_proposal_guests (
        trip_proposal_id, name, email, phone, is_primary,
        dietary_restrictions, accessibility_needs, special_requests,
        room_assignment, is_registered, rsvp_status
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      FROM capacity
      WHERE $12::int IS NULL OR cnt < $12::int
      RETURNING *`,
      [
        proposalId,
        validated.name,
        validated.email || null,
        validated.phone || null,
        validated.is_primary || false,
        validated.dietary_restrictions || null,
        validated.accessibility_needs || null,
        validated.special_requests || null,
        validated.room_assignment || null,
        validated.is_registered || false,
        validated.rsvp_status || 'pending',
        maxGuests,
      ]
    );

    if (!result) {
      throw new ValidationError('Trip is at maximum capacity');
    }

    return result;
  }

  /**
   * Get the current guest count for a proposal
   */
  async getGuestCount(proposalId: number): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM trip_proposal_guests WHERE trip_proposal_id = $1',
      [proposalId]
    );
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Check if an email is already registered for a proposal (case-insensitive)
   */
  async isEmailRegistered(proposalId: number, email: string): Promise<boolean> {
    const result = await this.queryOne<{ id: number }>(
      'SELECT id FROM trip_proposal_guests WHERE trip_proposal_id = $1 AND LOWER(email) = LOWER($2)',
      [proposalId, email]
    );
    return result !== null;
  }

  /**
   * Get per-person cost estimates for dynamic pricing display
   */
  async getPerPersonEstimate(proposalId: number): Promise<{
    current_per_person: number;
    ceiling_price: number;
    floor_price: number;
    current_guest_count: number;
    min_guests: number | null;
    max_guests: number | null;
    total: number;
  }> {
    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    const guestCount = await this.getGuestCount(proposalId);
    const total = proposal.total;
    const minGuests = Math.max(1, proposal.min_guests || guestCount || 1);
    const maxGuests = Math.max(1, proposal.max_guests || guestCount || 1);

    const currentPerPerson = guestCount > 0 ? total / guestCount : total;
    const ceilingPrice = total / minGuests;
    const floorPrice = total / maxGuests;

    return {
      current_per_person: Number.isFinite(currentPerPerson) ? currentPerPerson : 0,
      ceiling_price: Number.isFinite(ceilingPrice) ? ceilingPrice : 0,
      floor_price: Number.isFinite(floorPrice) ? floorPrice : 0,
      current_guest_count: guestCount,
      min_guests: proposal.min_guests,
      max_guests: proposal.max_guests,
      total,
    };
  }

  /**
   * Add an inclusion (line item) to the proposal
   */
  async addInclusion(proposalId: number, data: AddInclusionInput): Promise<TripProposalInclusion> {
    this.log('Adding inclusion to proposal', { proposalId, type: data.inclusion_type });

    // Validate
    const validated = AddInclusionSchema.parse(data);

    // Check proposal exists
    const proposalExists = await this.exists('trip_proposals', 'id = $1', [proposalId]);
    if (!proposalExists) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    // Get next sort order
    const maxOrderResult = await this.queryOne<{ max_order: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM trip_proposal_inclusions WHERE trip_proposal_id = $1',
      [proposalId]
    );
    const sortOrder = validated.sort_order ?? ((maxOrderResult?.max_order ?? -1) + 1);

    // Calculate total if not provided
    const totalPrice = validated.total_price ?? (validated.quantity || 1) * (validated.unit_price || 0);

    const inclusion = await this.insert<TripProposalInclusion>('trip_proposal_inclusions', {
      trip_proposal_id: proposalId,
      inclusion_type: validated.inclusion_type,
      description: validated.description,
      quantity: validated.quantity || 1,
      unit: validated.unit || null,
      unit_price: validated.unit_price || 0,
      total_price: totalPrice,
      pricing_type: validated.pricing_type || 'flat',
      is_taxable: validated.is_taxable ?? true,
      tax_included_in_price: validated.tax_included_in_price ?? false,
      sort_order: sortOrder,
      show_on_proposal: validated.show_on_proposal ?? true,
      notes: validated.notes || null,
    });

    return inclusion;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get proposal by ID
   */
  async getById(id: number): Promise<TripProposal | null> {
    this.log('Fetching trip proposal', { id });
    return this.findById<TripProposal>('trip_proposals', id);
  }

  /**
   * Get proposal by proposal number
   */
  async getByNumber(proposalNumber: string): Promise<TripProposal | null> {
    this.log('Fetching trip proposal by number', { proposalNumber });
    return this.queryOne<TripProposal>(
      'SELECT * FROM trip_proposals WHERE proposal_number = $1',
      [proposalNumber]
    );
  }

  /**
   * Get proposal by access token (for /my-trip/[token] routes)
   */
  async getByAccessToken(accessToken: string): Promise<TripProposal | null> {
    this.log('Fetching trip proposal by access token');
    if (!accessToken || accessToken.length < 32) return null;
    return this.queryOne<TripProposal>(
      'SELECT * FROM trip_proposals WHERE access_token = $1',
      [accessToken]
    );
  }

  /**
   * Update planning phase with validation
   */
  async updatePlanningPhase(id: number, phase: PlanningPhase): Promise<TripProposal> {
    this.log('Updating planning phase', { id, phase });

    const proposal = await this.getById(id);
    if (!proposal) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    const validTransitions: Record<PlanningPhase, PlanningPhase[]> = {
      proposal: ['active_planning'],
      active_planning: ['finalized', 'proposal'], // can revert to proposal
      finalized: ['active_planning'], // can reopen for changes
    };

    if (!validTransitions[proposal.planning_phase]?.includes(phase)) {
      throw new ValidationError(
        `Cannot transition planning phase from ${proposal.planning_phase} to ${phase}`
      );
    }

    const updated = await this.update<TripProposal>('trip_proposals', id, {
      planning_phase: phase,
    });
    if (!updated) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    await this.logActivity(id, `phase_${phase}`, `Planning phase changed to ${phase}`, {
      actor_type: 'staff',
    });

    // Trigger milestone admin reminders
    try {
      const { adminReminderService } = await import('./admin-reminder.service');
      await adminReminderService.onPlanningPhaseChange(id, phase);
    } catch {
      // Non-critical — don't block the phase change
    }

    return updated;
  }

  /**
   * Get full proposal with all relations
   */
  async getFullDetails(id: number): Promise<TripProposalFull | null> {
    this.log('Fetching full trip proposal details', { id });

    // Get base proposal
    const proposal = await this.queryOne<TripProposal>(
      `SELECT tp.*,
        JSON_BUILD_OBJECT(
          'id', b.id,
          'name', b.brand_name,
          'code', b.brand_code
        ) as brand
       FROM trip_proposals tp
       LEFT JOIN brands b ON tp.brand_id = b.id
       WHERE tp.id = $1`,
      [id]
    );

    if (!proposal) {
      return null;
    }

    // Get days with stops
    const daysResult = await this.query<TripProposalDay & { stops: string }>(
      `SELECT d.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', s.id,
              'trip_proposal_day_id', s.trip_proposal_day_id,
              'stop_order', s.stop_order,
              'stop_type', s.stop_type,
              'winery_id', s.winery_id,
              'restaurant_id', s.restaurant_id,
              'hotel_id', s.hotel_id,
              'custom_name', s.custom_name,
              'custom_address', s.custom_address,
              'custom_description', s.custom_description,
              'scheduled_time', s.scheduled_time,
              'duration_minutes', s.duration_minutes,
              'per_person_cost', s.per_person_cost,
              'flat_cost', s.flat_cost,
              'cost_note', s.cost_note,
              'room_rate', s.room_rate,
              'num_rooms', s.num_rooms,
              'nights', s.nights,
              'reservation_status', s.reservation_status,
              'reservation_confirmation', s.reservation_confirmation,
              'reservation_contact', s.reservation_contact,
              'reservation_notes', s.reservation_notes,
              'client_notes', s.client_notes,
              'internal_notes', s.internal_notes,
              'driver_notes', s.driver_notes,
              'created_at', s.created_at,
              'updated_at', s.updated_at,
              'winery', CASE WHEN w.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', w.id, 'name', w.name, 'city', w.city, 'slug', w.slug) ELSE NULL END,
              'restaurant', CASE WHEN r.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', r.id, 'name', r.name, 'cuisine_type', r.cuisine_type, 'address', r.address) ELSE NULL END,
              'hotel', CASE WHEN h.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', h.id, 'name', h.name, 'type', h.type, 'address', h.address) ELSE NULL END
            ) ORDER BY s.stop_order
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as stops
       FROM trip_proposal_days d
       LEFT JOIN trip_proposal_stops s ON d.id = s.trip_proposal_day_id
       LEFT JOIN wineries w ON s.winery_id = w.id
       LEFT JOIN restaurants r ON s.restaurant_id = r.id
       LEFT JOIN hotels h ON s.hotel_id = h.id
       WHERE d.trip_proposal_id = $1
       GROUP BY d.id
       ORDER BY d.day_number`,
      [id]
    );

    // Get guests
    const guestsResult = await this.query<TripProposalGuest>(
      'SELECT * FROM trip_proposal_guests WHERE trip_proposal_id = $1 ORDER BY is_primary DESC, name',
      [id]
    );

    // Get inclusions
    const inclusionsResult = await this.query<TripProposalInclusion>(
      'SELECT * FROM trip_proposal_inclusions WHERE trip_proposal_id = $1 ORDER BY sort_order',
      [id]
    );

    // Get activity log
    const activityResult = await this.query<TripProposalActivity>(
      'SELECT * FROM trip_proposal_activity WHERE trip_proposal_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );

    // Parse stops JSON
    const days = daysResult.rows.map((day) => ({
      ...day,
      stops: typeof day.stops === 'string' ? JSON.parse(day.stops) : day.stops,
    }));

    return {
      ...proposal,
      days,
      guests: guestsResult.rows,
      inclusions: inclusionsResult.rows,
      activity: activityResult.rows,
    } as TripProposalFull;
  }

  /**
   * List proposals with filters
   */
  async list(filters: {
    status?: TripProposalStatus;
    brand_id?: number;
    start_date_from?: string;
    start_date_to?: string;
    search?: string;
    include_archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: TripProposal[]; total: number }> {
    this.log('Listing trip proposals', filters);

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Exclude archived by default
    if (!filters.include_archived) {
      conditions.push('archived_at IS NULL');
    }

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filters.brand_id) {
      params.push(filters.brand_id);
      conditions.push(`brand_id = $${params.length}`);
    }

    if (filters.start_date_from) {
      params.push(filters.start_date_from);
      conditions.push(`start_date >= $${params.length}`);
    }

    if (filters.start_date_to) {
      params.push(filters.start_date_to);
      conditions.push(`start_date <= $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(
        customer_name ILIKE $${params.length} OR
        customer_email ILIKE $${params.length} OR
        proposal_number ILIKE $${params.length} OR
        trip_title ILIKE $${params.length}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM trip_proposals ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get proposals
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.query<TripProposal & { billable_guest_count: number; paid_guest_count: number }>(
      `SELECT tp.*,
        (SELECT COUNT(*)::int FROM trip_proposal_guests g WHERE g.trip_proposal_id = tp.id AND g.is_sponsored = false) AS billable_guest_count,
        (SELECT COUNT(*)::int FROM trip_proposal_guests g WHERE g.trip_proposal_id = tp.id AND g.is_sponsored = false AND g.payment_status = 'paid') AS paid_guest_count
       FROM trip_proposals tp
       ${whereClause}
       ORDER BY tp.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return { proposals: result.rows, total };
  }

  // ==========================================================================
  // UPDATE Operations
  // ==========================================================================

  /**
   * Update proposal
   */
  async updateProposal(id: number, data: UpdateTripProposalInput): Promise<TripProposal> {
    this.log('Updating trip proposal', { id, fields: Object.keys(data) });

    const proposal = await this.getById(id);
    if (!proposal) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== proposal.status) {
      this.validateStatusTransition(proposal.status, data.status);
    }

    // Validate input
    const validated = UpdateTripProposalSchema.parse(data);

    // Build update object
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) {
        updateData[key] = value === '' ? null : value;
      }
    }

    const updated = await this.update<TripProposal>('trip_proposals', id, updateData);
    if (!updated) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    // Hook: admin reminder for deferred deposits
    if ('skip_deposit_on_accept' in updateData) {
      try {
        const { adminReminderService } = await import('./admin-reminder.service');
        if (updateData.skip_deposit_on_accept) {
          await adminReminderService.onSkipDepositEnabled(id);
        } else {
          await adminReminderService.onSkipDepositDisabled(id);
        }
      } catch {
        // Non-critical
      }
    }

    return updated;
  }

  /**
   * Archive a proposal (soft-hide, reversible)
   */
  async archiveProposal(id: number): Promise<TripProposal> {
    this.log('Archiving trip proposal', { id });

    const proposal = await this.getById(id);
    if (!proposal) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    const updated = await this.update<TripProposal>('trip_proposals', id, {
      archived_at: new Date().toISOString(),
    });
    if (!updated) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    return updated;
  }

  /**
   * Unarchive a proposal
   */
  async unarchiveProposal(id: number): Promise<TripProposal> {
    this.log('Unarchiving trip proposal', { id });

    const proposal = await this.getById(id);
    if (!proposal) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    const updated = await this.update<TripProposal>('trip_proposals', id, {
      archived_at: null,
    });
    if (!updated) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    return updated;
  }

  /**
   * Update day
   */
  async updateDay(dayId: number, data: Partial<AddDayInput>): Promise<TripProposalDay> {
    this.log('Updating trip proposal day', { dayId });

    const day = await this.findById<TripProposalDay>('trip_proposal_days', dayId);
    if (!day) {
      throw new NotFoundError('TripProposalDay', dayId.toString());
    }

    const updated = await this.update<TripProposalDay>('trip_proposal_days', dayId, data);
    if (!updated) {
      throw new NotFoundError('TripProposalDay', dayId.toString());
    }

    return updated;
  }

  /**
   * Update stop
   */
  async updateStop(stopId: number, data: Partial<AddStopInput>): Promise<TripProposalStop> {
    this.log('Updating trip proposal stop', { stopId });

    const stop = await this.findById<TripProposalStop>('trip_proposal_stops', stopId);
    if (!stop) {
      throw new NotFoundError('TripProposalStop', stopId.toString());
    }

    const updated = await this.update<TripProposalStop>('trip_proposal_stops', stopId, data);
    if (!updated) {
      throw new NotFoundError('TripProposalStop', stopId.toString());
    }

    return updated;
  }

  /**
   * Reorder stops within a day
   */
  async reorderStops(dayId: number, stopIds: number[]): Promise<void> {
    this.log('Reordering stops', { dayId, stopCount: stopIds.length });

    await this.withTransaction(async () => {
      for (let i = 0; i < stopIds.length; i++) {
        await this.query(
          'UPDATE trip_proposal_stops SET stop_order = $1, updated_at = NOW() WHERE id = $2 AND trip_proposal_day_id = $3',
          [i, stopIds[i], dayId]
        );
      }
    });
  }

  /**
   * Update status with validation
   */
  async updateStatus(id: number, status: TripProposalStatus, metadata?: Record<string, unknown>): Promise<TripProposal> {
    this.log('Updating trip proposal status', { id, status });

    const proposal = await this.getById(id);
    if (!proposal) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    this.validateStatusTransition(proposal.status, status);

    const updateData: Record<string, unknown> = { status };

    // Handle special status updates
    if (status === 'sent') {
      // Record when sent
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'viewed') {
      // Track view
      updateData.view_count = (proposal.view_count || 0) + 1;
      updateData.last_viewed_at = new Date().toISOString();
      if (!proposal.first_viewed_at) {
        updateData.first_viewed_at = new Date().toISOString();
      }
    } else if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
      if (metadata?.signature) {
        updateData.accepted_signature = metadata.signature;
      }
      if (metadata?.ip_address) {
        updateData.accepted_ip = metadata.ip_address;
      }
    }

    const updated = await this.update<TripProposal>('trip_proposals', id, updateData);
    if (!updated) {
      throw new NotFoundError('TripProposal', id.toString());
    }

    // Log activity - validate actor_type is a valid string literal
    const actorType = metadata?.actor_type;
    const validActorType: 'customer' | 'system' | 'staff' =
      actorType === 'customer' || actorType === 'staff' ? actorType : 'system';
    await this.logActivity(id, `status_${status}`, `Status changed to ${status}`, {
      actor_type: validActorType,
      metadata,
    });

    // Sync status change to CRM (async, don't block)
    crmSyncService.onTripProposalStatusChange(
      id,
      proposal.proposal_number,
      status,
      { customerEmail: proposal.customer_email || undefined, amount: proposal.total }
    ).then(async () => {
      // Create follow-up task on proposal sent
      if (status === 'sent' && proposal.customer_email) {
        const crmData = await crmSyncService.getCrmDataForTripProposal(id);
        if (crmData.contact) {
          await crmTaskAutomationService.onProposalSent({
            contactId: crmData.contact.id,
            dealId: crmData.deal?.id,
            proposalNumber: proposal.proposal_number,
            customerName: proposal.customer_name,
          });
        }
      }
      // Create follow-up task on proposal viewed
      if (status === 'viewed' && proposal.customer_email) {
        const crmData = await crmSyncService.getCrmDataForTripProposal(id);
        if (crmData.contact) {
          await crmTaskAutomationService.onProposalViewed({
            contactId: crmData.contact.id,
            dealId: crmData.deal?.id,
            proposalNumber: proposal.proposal_number,
            customerName: proposal.customer_name,
          });
        }
      }
    }).catch((err) => {
      this.log('Failed to sync trip proposal status to CRM', { error: err, proposalId: id, status });
    });

    return updated;
  }

  // ==========================================================================
  // DELETE Operations
  // ==========================================================================

  /**
   * Delete day and its stops
   */
  async deleteDay(dayId: number): Promise<void> {
    this.log('Deleting trip proposal day', { dayId });

    const day = await this.findById<TripProposalDay>('trip_proposal_days', dayId);
    if (!day) {
      throw new NotFoundError('TripProposalDay', dayId.toString());
    }

    // Cascade will delete stops
    await this.query('DELETE FROM trip_proposal_days WHERE id = $1', [dayId]);

    // Renumber remaining days
    await this.query(
      `UPDATE trip_proposal_days
       SET day_number = day_number - 1
       WHERE trip_proposal_id = $1 AND day_number > $2`,
      [day.trip_proposal_id, day.day_number]
    );
  }

  /**
   * Delete stop
   */
  async deleteStop(stopId: number): Promise<void> {
    this.log('Deleting trip proposal stop', { stopId });

    const stop = await this.findById<TripProposalStop>('trip_proposal_stops', stopId);
    if (!stop) {
      throw new NotFoundError('TripProposalStop', stopId.toString());
    }

    await this.query('DELETE FROM trip_proposal_stops WHERE id = $1', [stopId]);

    // Renumber remaining stops
    await this.query(
      `UPDATE trip_proposal_stops
       SET stop_order = stop_order - 1
       WHERE trip_proposal_day_id = $1 AND stop_order > $2`,
      [stop.trip_proposal_day_id, stop.stop_order]
    );
  }

  /**
   * Delete guest (with proposal ownership check to prevent IDOR)
   */
  async deleteGuest(proposalId: number, guestId: number): Promise<void> {
    this.log('Deleting trip proposal guest', { proposalId, guestId });
    const result = await this.query(
      'DELETE FROM trip_proposal_guests WHERE id = $1 AND trip_proposal_id = $2',
      [guestId, proposalId]
    );
    if (!result.rowCount) {
      throw new NotFoundError('TripProposalGuest', guestId.toString());
    }
  }

  /**
   * Delete inclusion
   */
  async deleteInclusion(inclusionId: number): Promise<void> {
    this.log('Deleting trip proposal inclusion', { inclusionId });
    await this.query('DELETE FROM trip_proposal_inclusions WHERE id = $1', [inclusionId]);
  }

  // ==========================================================================
  // PRICING
  // ==========================================================================

  /**
   * Calculate and update pricing for a proposal
   */
  async calculatePricing(proposalId: number): Promise<TripProposalPricingBreakdown> {
    this.log('Calculating pricing', { proposalId });

    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    // Stops subtotal is now 0 — all billing goes through service line items
    const stopsSubtotal = 0;

    // Calculate inclusions (service line items) subtotal with pricing_type + per-item tax support
    const inclusionsRows = await this.query<{
      id: string;
      unit_price: string;
      quantity: string;
      total_price: string;
      pricing_type: string;
      inclusion_type: string;
      is_taxable: boolean;
      tax_included_in_price: boolean;
    }>(
      `SELECT id, unit_price, quantity, total_price,
              COALESCE(pricing_type, 'flat') as pricing_type,
              inclusion_type,
              COALESCE(is_taxable, true) as is_taxable,
              COALESCE(tax_included_in_price, false) as tax_included_in_price
       FROM trip_proposal_inclusions WHERE trip_proposal_id = $1`,
      [proposalId]
    );

    let inclusionsSubtotal = 0;
    let taxableAmount = 0;

    for (const row of inclusionsRows.rows) {
      const unitPrice = parseFloat(row.unit_price) || 0;
      const quantity = parseFloat(row.quantity) || 1;
      const pricingType = row.pricing_type || 'flat';

      let lineAmount = 0;
      if (pricingType === 'per_person') {
        lineAmount = unitPrice * proposal.party_size;
      } else if (pricingType === 'per_day') {
        lineAmount = unitPrice * quantity;
      } else {
        lineAmount = unitPrice * quantity;
      }

      if (row.is_taxable) {
        if (row.tax_included_in_price) {
          // Tax is already baked into the line amount — do NOT add to taxableAmount.
          // The customer already pays the embedded tax as part of the line item price.
          // No additional tax calculation needed for this item.
        } else {
          // Standard: tax will be applied on top
          taxableAmount += lineAmount;
        }
      }
      // Non-taxable items and tax-included items: add to subtotal but not to taxable base

      inclusionsSubtotal += lineAmount;
    }

    // Auto-calculate percentage-based planning fee if enabled
    if (proposal.planning_fee_mode === 'percentage' && proposal.planning_fee_percentage > 0) {
      // Calculate services subtotal excluding any existing planning_fee inclusions
      let servicesBase = 0;
      for (const row of inclusionsRows.rows) {
        if (row.inclusion_type === 'planning_fee') continue;
        const unitPrice = parseFloat(row.unit_price) || 0;
        const quantity = parseFloat(row.quantity) || 1;
        const pricingType = row.pricing_type || 'flat';
        if (pricingType === 'per_person') {
          servicesBase += unitPrice * proposal.party_size;
        } else if (pricingType === 'per_day') {
          servicesBase += unitPrice * quantity;
        } else {
          servicesBase += unitPrice * quantity;
        }
      }

      const autoPlanningFee = servicesBase * (proposal.planning_fee_percentage / 100);

      // Find existing planning_fee inclusion to update, or note it needs creation
      const existingPlanningFee = inclusionsRows.rows.find(r => r.inclusion_type === 'planning_fee');
      if (existingPlanningFee) {
        const existingAmount = parseFloat(existingPlanningFee.unit_price) * (parseFloat(existingPlanningFee.quantity) || 1);
        // Update the existing planning fee inclusion with auto-calculated amount
        await this.query(
          'UPDATE trip_proposal_inclusions SET unit_price = $1, total_price = $1, updated_at = NOW() WHERE id = $2',
          [autoPlanningFee, parseInt(existingPlanningFee.id)]
        );
        // Adjust subtotal and taxable amounts
        inclusionsSubtotal = inclusionsSubtotal - existingAmount + autoPlanningFee;
        if (existingPlanningFee.is_taxable) {
          taxableAmount = taxableAmount - existingAmount + autoPlanningFee;
        }
      }
      // If no planning_fee inclusion exists, the admin will add one; we don't auto-create
    }

    // Calculate totals with per-item tax
    const subtotal = stopsSubtotal + inclusionsSubtotal;
    const discountAmount = subtotal * (proposal.discount_percentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Apply discount proportionally to taxable amount
    const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;
    const adjustedTaxableAmount = taxableAmount * discountRatio;

    // Tax only on taxable items (after discount proportion)
    const taxes = adjustedTaxableAmount * proposal.tax_rate;
    const gratuityAmount = subtotalAfterDiscount * (proposal.gratuity_percentage / 100);
    const total = subtotalAfterDiscount + taxes + gratuityAmount;
    const depositAmount = total * (proposal.deposit_percentage / 100);
    const balanceDue = total - (proposal.deposit_paid ? proposal.deposit_amount : 0);

    // Update the proposal with calculated values
    await this.update<TripProposal>('trip_proposals', proposalId, {
      subtotal: subtotal,
      discount_amount: discountAmount,
      taxes,
      gratuity_amount: gratuityAmount,
      total,
      deposit_amount: depositAmount,
      balance_due: balanceDue,
    });

    return {
      stops_subtotal: stopsSubtotal,
      inclusions_subtotal: inclusionsSubtotal,
      services_subtotal: inclusionsSubtotal,
      subtotal,
      discount_amount: discountAmount,
      subtotal_after_discount: subtotalAfterDiscount,
      taxes,
      gratuity_amount: gratuityAmount,
      total,
      deposit_amount: depositAmount,
      balance_due: balanceDue,
    };
  }

  // ==========================================================================
  // GUEST BILLING
  // ==========================================================================

  /**
   * Calculate and distribute amounts owed per guest.
   * Safety invariant: sum(amount_owed) === total (within $0.01)
   */
  async calculateGuestAmounts(proposalId: number): Promise<{
    guests: { id: number; name: string; amount_owed: number; is_sponsored: boolean }[];
    total: number;
    valid: boolean;
  }> {
    this.log('Calculating guest amounts', { proposalId });

    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    if (!proposal.individual_billing_enabled) {
      throw new ValidationError('Individual billing is not enabled for this proposal');
    }

    const guests = await this.query<{
      id: number;
      name: string;
      is_sponsored: boolean;
      amount_owed_override: string | null;
    }>(
      'SELECT id, name, COALESCE(is_sponsored, false) as is_sponsored, amount_owed_override FROM trip_proposal_guests WHERE trip_proposal_id = $1',
      [proposalId]
    );

    if (guests.rows.length === 0) {
      return { guests: [], total: proposal.total, valid: true };
    }

    const total = proposal.total;
    const allGuests = guests.rows;

    // Separate sponsored from paying guests
    const payingGuests = allGuests.filter(g => !g.is_sponsored);
    const sponsoredGuests = allGuests.filter(g => g.is_sponsored);

    if (payingGuests.length === 0) {
      throw new ValidationError('Cannot calculate billing: all guests are sponsored. At least one guest must be paying.');
    }

    // Calculate overridden amounts first
    let overriddenTotal = 0;
    const overriddenGuests: typeof payingGuests = [];
    const autoCalcGuests: typeof payingGuests = [];

    for (const guest of payingGuests) {
      if (guest.amount_owed_override !== null) {
        const overrideAmount = parseFloat(guest.amount_owed_override);
        overriddenTotal += overrideAmount;
        overriddenGuests.push(guest);
      } else {
        autoCalcGuests.push(guest);
      }
    }

    // Distribute remainder among auto-calc guests
    const remainder = total - overriddenTotal;
    if (remainder < 0) {
      throw new ValidationError('Override amounts exceed the total. Please adjust overrides.');
    }

    const results: { id: number; name: string; amount_owed: number; is_sponsored: boolean }[] = [];

    // Set sponsored guests to $0
    for (const guest of sponsoredGuests) {
      results.push({ id: guest.id, name: guest.name, amount_owed: 0, is_sponsored: true });
    }

    // Set overridden guests
    for (const guest of overriddenGuests) {
      const amount = parseFloat(guest.amount_owed_override!);
      results.push({ id: guest.id, name: guest.name, amount_owed: amount, is_sponsored: false });
    }

    // C8 FIX: Penny correction with integer cents to avoid floating point drift
    if (autoCalcGuests.length > 0) {
      const remainderCents = Math.round(remainder * 100);
      const baseCents = Math.floor(remainderCents / autoCalcGuests.length);
      const extraPennies = remainderCents - (baseCents * autoCalcGuests.length);

      for (let i = 0; i < autoCalcGuests.length; i++) {
        const guest = autoCalcGuests[i];
        // First N guests get baseCents + 1 penny; the rest get baseCents
        const guestCents = i < extraPennies ? baseCents + 1 : baseCents;
        const amount = guestCents / 100;

        // Safety: non-sponsored guest amount_owed should never be $0 without explicit override
        if (amount === 0 && guest.amount_owed_override === null) {
          throw new ValidationError(
            `Guest "${guest.name}" would be assigned $0 without an explicit override. Please add an override or mark them as sponsored.`
          );
        }

        results.push({ id: guest.id, name: guest.name, amount_owed: amount, is_sponsored: false });
      }
    }

    // C7 FIX: Tighter billing invariant tolerance (half a cent)
    const sumOwed = results.reduce((sum, g) => sum + g.amount_owed, 0);
    const valid = Math.abs(sumOwed - total) < 0.005;

    // Persist to database
    await this.withTransaction(async () => {
      for (const guest of results) {
        await this.query(
          `UPDATE trip_proposal_guests
           SET amount_owed = $1, updated_at = NOW()
           WHERE id = $2`,
          [guest.amount_owed, guest.id]
        );
      }
    });

    await this.logActivity(proposalId, 'billing_calculated', `Guest amounts recalculated for ${results.length} guests`, {
      actor_type: 'system',
      metadata: { total, guest_count: results.length, sum_owed: sumOwed },
    });

    return { guests: results, total, valid };
  }

  /**
   * Toggle guest sponsored status and recalculate all amounts
   */
  async toggleGuestSponsored(guestId: number, sponsored: boolean): Promise<void> {
    this.log('Toggling guest sponsored', { guestId, sponsored });

    const guest = await this.findById<{ id: number; trip_proposal_id: number; name: string }>('trip_proposal_guests', guestId);
    if (!guest) {
      throw new NotFoundError('TripProposalGuest', guestId.toString());
    }

    await this.query(
      'UPDATE trip_proposal_guests SET is_sponsored = $1, amount_owed_override = NULL, updated_at = NOW() WHERE id = $2',
      [sponsored, guestId]
    );

    // Update proposal flag
    const sponsoredCount = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM trip_proposal_guests WHERE trip_proposal_id = $1 AND is_sponsored = true',
      [guest.trip_proposal_id]
    );
    await this.update('trip_proposals', guest.trip_proposal_id, {
      has_sponsored_guest: parseInt(sponsoredCount?.count || '0') > 0,
    });

    await this.logActivity(guest.trip_proposal_id, 'guest_sponsor_toggled',
      `${guest.name} ${sponsored ? 'marked as sponsored' : 'unmarked as sponsored'}`, {
      actor_type: 'staff',
      metadata: { guest_id: guestId, sponsored },
    });

    // Recalculate
    await this.calculateGuestAmounts(guest.trip_proposal_id);
  }

  /**
   * Set a manual override for a guest's amount owed (NULL to clear override)
   */
  async overrideGuestAmount(guestId: number, amount: number | null): Promise<void> {
    this.log('Overriding guest amount', { guestId, amount });

    const guest = await this.findById<{ id: number; trip_proposal_id: number; name: string }>('trip_proposal_guests', guestId);
    if (!guest) {
      throw new NotFoundError('TripProposalGuest', guestId.toString());
    }

    await this.query(
      'UPDATE trip_proposal_guests SET amount_owed_override = $1, updated_at = NOW() WHERE id = $2',
      [amount, guestId]
    );

    await this.logActivity(guest.trip_proposal_id, 'guest_amount_overridden',
      `${guest.name} amount overridden to ${amount !== null ? '$' + amount.toFixed(2) : 'auto-calculate'}`, {
      actor_type: 'staff',
      metadata: { guest_id: guestId, override_amount: amount },
    });

    // Recalculate
    await this.calculateGuestAmounts(guest.trip_proposal_id);
  }

  /**
   * Create a payment group (couples/subgroups)
   */
  async createPaymentGroup(proposalId: number, guestIds: number[], name: string): Promise<{ id: string; group_access_token: string }> {
    this.log('Creating payment group', { proposalId, guestIds, name });

    const proposal = await this.getById(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    // C6 FIX: Validate all guestIds exist in this proposal before creating the group
    const existingGuests = await this.query<{ id: number }>(
      'SELECT id FROM trip_proposal_guests WHERE id = ANY($1) AND trip_proposal_id = $2',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [guestIds as any, proposalId]
    );
    const foundIds = new Set(existingGuests.rows.map(g => g.id));
    const missingIds = guestIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new ValidationError(`Guest IDs not found in proposal: ${missingIds.join(', ')}`);
    }

    return await this.withTransaction(async () => {
      const group = await this.queryOne<{ id: string; group_access_token: string }>(
        `INSERT INTO guest_payment_groups (trip_proposal_id, group_name)
         VALUES ($1, $2)
         RETURNING id, group_access_token`,
        [proposalId, name]
      );

      if (!group) {
        throw new ValidationError('Failed to create payment group');
      }

      // Link guests to the group
      for (const guestId of guestIds) {
        await this.query(
          'UPDATE trip_proposal_guests SET payment_group_id = $1, updated_at = NOW() WHERE id = $2 AND trip_proposal_id = $3',
          [group.id, guestId, proposalId]
        );
      }

      await this.logActivity(proposalId, 'payment_group_created',
        `Payment group "${name}" created with ${guestIds.length} guests`, {
        actor_type: 'staff',
        metadata: { group_id: group.id, guest_ids: guestIds },
      });

      return group;
    });
  }

  /**
   * Remove a payment group and unlink its guests
   */
  async removePaymentGroup(groupId: string): Promise<void> {
    this.log('Removing payment group', { groupId });

    const group = await this.queryOne<{ id: string; trip_proposal_id: number; group_name: string }>(
      'SELECT id, trip_proposal_id, group_name FROM guest_payment_groups WHERE id = $1',
      [groupId]
    );

    if (!group) {
      throw new NotFoundError('GuestPaymentGroup', groupId);
    }

    await this.withTransaction(async () => {
      // Unlink guests
      await this.query(
        'UPDATE trip_proposal_guests SET payment_group_id = NULL, updated_at = NOW() WHERE payment_group_id = $1',
        [groupId]
      );
      // Delete group
      await this.query('DELETE FROM guest_payment_groups WHERE id = $1', [groupId]);
    });

    await this.logActivity(group.trip_proposal_id, 'payment_group_removed',
      `Payment group "${group.group_name}" removed`, {
      actor_type: 'staff',
      metadata: { group_id: groupId },
    });
  }

  /**
   * Record a manual payment for a guest (cash, check, Venmo, etc.)
   */
  async recordManualPayment(guestId: number, amount: number, notes?: string): Promise<void> {
    this.log('Recording manual payment', { guestId, amount });

    const guest = await this.findById<{ id: number; trip_proposal_id: number; name: string; amount_owed: number; amount_paid: number }>(
      'trip_proposal_guests', guestId
    );
    if (!guest) {
      throw new NotFoundError('TripProposalGuest', guestId.toString());
    }

    await this.withTransaction(async () => {
      // Insert payment record
      await this.query(
        `INSERT INTO guest_payments (trip_proposal_id, guest_id, amount, payment_type, status, notes)
         VALUES ($1, $2, $3, 'admin_adjustment', 'succeeded', $4)`,
        [guest.trip_proposal_id, guestId, amount, notes || 'Manual payment recorded by admin']
      );

      // Update guest amount_paid and status
      const newPaid = (parseFloat(String(guest.amount_paid)) || 0) + amount;
      const owed = parseFloat(String(guest.amount_owed)) || 0;
      const status = newPaid >= owed ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

      await this.query(
        `UPDATE trip_proposal_guests
         SET amount_paid = $1, payment_status = $2, payment_paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE payment_paid_at END, updated_at = NOW()
         WHERE id = $3`,
        [newPaid, status, guestId]
      );
    });

    await this.logActivity(guest.trip_proposal_id, 'manual_payment_recorded',
      `$${amount.toFixed(2)} manual payment recorded for ${guest.name}`, {
      actor_type: 'staff',
      metadata: { guest_id: guestId, amount },
    });
  }

  /**
   * Audit billing integrity for a proposal
   */
  async auditProposalBilling(proposalId: number): Promise<{
    valid: boolean;
    discrepancies: string[];
  }> {
    this.log('Auditing proposal billing', { proposalId });

    const discrepancies: string[] = [];

    // Recalculate total from inclusions
    const pricing = await this.calculatePricing(proposalId);
    const proposal = await this.getById(proposalId);
    if (!proposal) {
      return { valid: false, discrepancies: ['Proposal not found'] };
    }

    if (!proposal.individual_billing_enabled) {
      return { valid: true, discrepancies: [] };
    }

    // Verify sum(guest amount_owed) === total
    const guestSum = await this.queryOne<{ total_owed: string; total_paid: string }>(
      `SELECT COALESCE(SUM(amount_owed), 0) as total_owed, COALESCE(SUM(amount_paid), 0) as total_paid
       FROM trip_proposal_guests WHERE trip_proposal_id = $1`,
      [proposalId]
    );

    const totalOwed = parseFloat(guestSum?.total_owed || '0');
    // C7 FIX: Tighter tolerance
    if (Math.abs(totalOwed - pricing.total) > 0.005) {
      discrepancies.push(`Guest amounts (${totalOwed.toFixed(2)}) don't match proposal total (${pricing.total.toFixed(2)})`);
    }

    // Verify sum(guest_payments succeeded) === sum(amount_paid)
    const paymentSum = await this.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM guest_payments WHERE trip_proposal_id = $1 AND status = 'succeeded'`,
      [proposalId]
    );
    const totalPaid = parseFloat(guestSum?.total_paid || '0');
    const paymentRecordTotal = parseFloat(paymentSum?.total || '0');
    // C7 FIX: Tighter tolerance
    if (Math.abs(totalPaid - paymentRecordTotal) > 0.005) {
      discrepancies.push(`Guest amount_paid sums (${totalPaid.toFixed(2)}) don't match payment records (${paymentRecordTotal.toFixed(2)})`);
    }

    // Verify no non-sponsored guest has amount_owed = 0 without override
    const zeroOwed = await this.query<{ id: number; name: string }>(
      `SELECT id, name FROM trip_proposal_guests
       WHERE trip_proposal_id = $1 AND is_sponsored = false AND amount_owed = 0 AND amount_owed_override IS NULL`,
      [proposalId]
    );
    for (const guest of zeroOwed.rows) {
      discrepancies.push(`Guest "${guest.name}" (id: ${guest.id}) owes $0 without override or sponsorship`);
    }

    return { valid: discrepancies.length === 0, discrepancies };
  }

  // ==========================================================================
  // CONVERSION
  // ==========================================================================

  /**
   * Convert accepted proposal to booking
   * Returns the created booking ID
   */
  async convertToBooking(proposalId: number, userId?: number): Promise<{ booking_id: number; booking_number: string }> {
    this.log('Converting trip proposal to booking', { proposalId });

    const proposal = await this.getFullDetails(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    if (proposal.status !== 'accepted') {
      throw new ValidationError('Only accepted proposals can be converted to bookings');
    }

    if (proposal.converted_to_booking_id) {
      throw new ValidationError('This proposal has already been converted to a booking');
    }

    return await this.withTransaction(async () => {
      // Calculate total duration in hours (6 hours per day — standard tour length)
      const numDays = proposal.days?.length || 1;
      const durationHours = numDays * 6;

      // Generate booking number
      const bookingNumber = await this.generateBookingNumber();

      // Create the booking
      const bookingResult = await this.insert<{ id: number }>('bookings', {
        booking_number: bookingNumber,
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email,
        customer_phone: proposal.customer_phone,
        customer_id: proposal.customer_id,
        party_size: proposal.party_size,
        tour_date: proposal.start_date,
        start_time: '09:00', // Default start time
        duration_hours: durationHours,
        total_price: proposal.total,
        taxes: proposal.taxes,
        gratuity: proposal.gratuity_amount,
        deposit_amount: proposal.deposit_amount,
        deposit_paid: proposal.deposit_paid,
        status: 'confirmed',
        brand_id: proposal.brand_id,
        notes: proposal.special_notes,
        internal_notes: proposal.internal_notes,
        created_by: userId,
      });

      // Link proposal to booking
      await this.update<TripProposal>('trip_proposals', proposalId, {
        converted_to_booking_id: bookingResult.id,
        converted_at: new Date().toISOString(),
        status: 'booked',
      });

      // Log activity
      await this.logActivity(proposalId, 'booked', `Converted to booking ${bookingNumber}`, {
        actor_type: 'staff',
        actor_user_id: userId,
        metadata: { booking_id: bookingResult.id, booking_number: bookingNumber },
      });

      this.log('Trip proposal converted to booking', {
        proposalId,
        bookingId: bookingResult.id,
        bookingNumber,
      });

      // Sync to CRM - link deal to booking (async, don't block)
      crmSyncService.onTripProposalStatusChange(
        proposalId,
        proposal.proposal_number,
        'booked',
        { bookingId: bookingResult.id, amount: proposal.total }
      ).catch((err) => {
        this.log('Failed to sync trip proposal conversion to CRM', { error: err, proposalId, bookingId: bookingResult.id });
      });

      return { booking_id: bookingResult.id, booking_number: bookingNumber };
    });
  }

  /**
   * Generate driver itinerary from proposal
   */
  async generateDriverItinerary(proposalId: number): Promise<{ itinerary_id: number; stops_created: number }> {
    this.log('Generating driver itinerary', { proposalId });

    const proposal = await this.getFullDetails(proposalId);
    if (!proposal) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    if (!proposal.converted_to_booking_id) {
      throw new ValidationError('Proposal must be converted to a booking first');
    }

    return await this.withTransaction(async () => {
      // Check if itinerary already exists
      const existingItinerary = await this.queryOne<{ id: number }>(
        'SELECT id FROM itineraries WHERE booking_id = $1',
        [proposal.converted_to_booking_id]
      );

      if (existingItinerary) {
        throw new ValidationError('An itinerary already exists for this booking');
      }

      // Get first pickup and last dropoff
      let pickupLocation = '';
      let pickupTime = '09:00';
      let dropoffLocation = '';

      for (const day of proposal.days || []) {
        for (const stop of day.stops || []) {
          if (stop.stop_type === 'pickup' && !pickupLocation) {
            pickupLocation = stop.custom_address || stop.custom_name || '';
            pickupTime = stop.scheduled_time || '09:00';
          }
          if (stop.stop_type === 'dropoff') {
            dropoffLocation = stop.custom_address || stop.custom_name || '';
          }
        }
      }

      // Create itinerary
      const itinerary = await this.insert<{ id: number }>('itineraries', {
        booking_id: proposal.converted_to_booking_id,
        pickup_location: pickupLocation,
        pickup_time: pickupTime,
        dropoff_location: dropoffLocation || pickupLocation,
        driver_notes: proposal.internal_notes,
      });

      // Create itinerary stops from proposal stops
      let stopOrder = 0;
      let stopsCreated = 0;

      for (const day of proposal.days || []) {
        for (const stop of day.stops || []) {
          // Skip pickup/dropoff as they're handled in the itinerary header
          if (stop.stop_type === 'pickup' || stop.stop_type === 'dropoff') {
            continue;
          }

          // Only add winery stops to the driver itinerary
          if (stop.stop_type === 'winery' && stop.winery_id) {
            await this.insert('itinerary_stops', {
              itinerary_id: itinerary.id,
              winery_id: stop.winery_id,
              stop_order: stopOrder++,
              arrival_time: stop.scheduled_time,
              duration_minutes: stop.duration_minutes || 60,
              stop_type: 'tasting',
              reservation_confirmed: stop.reservation_status === 'confirmed',
              special_notes: stop.driver_notes || stop.client_notes,
            });
            stopsCreated++;
          }
        }
      }

      this.log('Driver itinerary generated', {
        proposalId,
        itineraryId: itinerary.id,
        stopsCreated,
      });

      return { itinerary_id: itinerary.id, stops_created: stopsCreated };
    });
  }

  // ==========================================================================
  // DUPLICATE
  // ==========================================================================

  /**
   * Duplicate a proposal (for templates)
   */
  async duplicate(proposalId: number, userId?: number): Promise<TripProposal> {
    this.log('Duplicating trip proposal', { proposalId });

    const original = await this.getFullDetails(proposalId);
    if (!original) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    return await this.withTransaction(async () => {
      // Create new proposal
      const newProposal = await this.create(
        {
          customer_name: original.customer_name,
          customer_email: original.customer_email || undefined,
          customer_phone: original.customer_phone || undefined,
          customer_company: original.customer_company || undefined,
          trip_type: original.trip_type,
          trip_title: original.trip_title ? `Copy of ${original.trip_title}` : undefined,
          party_size: original.party_size,
          start_date: original.start_date,
          end_date: original.end_date || undefined,
          brand_id: original.brand_id || undefined,
          introduction: original.introduction || undefined,
          special_notes: original.special_notes || undefined,
          internal_notes: original.internal_notes || undefined,
          discount_percentage: original.discount_percentage,
          discount_reason: original.discount_reason || undefined,
          gratuity_percentage: original.gratuity_percentage,
          tax_rate: original.tax_rate,
          deposit_percentage: original.deposit_percentage,
        },
        userId
      );

      // Delete auto-created first day
      const autoDay = await this.queryOne<{ id: number }>(
        'SELECT id FROM trip_proposal_days WHERE trip_proposal_id = $1 AND day_number = 1',
        [newProposal.id]
      );
      if (autoDay) {
        await this.query('DELETE FROM trip_proposal_days WHERE id = $1', [autoDay.id]);
      }

      // Copy days and stops
      for (const day of original.days || []) {
        const newDay = await this.addDay(newProposal.id, {
          date: day.date,
          title: day.title || undefined,
          description: day.description || undefined,
          notes: day.notes || undefined,
          internal_notes: day.internal_notes || undefined,
        });

        for (const stop of day.stops || []) {
          await this.addStop(newDay.id, {
            stop_type: stop.stop_type,
            stop_order: stop.stop_order,
            winery_id: stop.winery_id || undefined,
            restaurant_id: stop.restaurant_id || undefined,
            hotel_id: stop.hotel_id || undefined,
            custom_name: stop.custom_name || undefined,
            custom_address: stop.custom_address || undefined,
            custom_description: stop.custom_description || undefined,
            scheduled_time: stop.scheduled_time || undefined,
            duration_minutes: stop.duration_minutes || undefined,
            per_person_cost: stop.per_person_cost,
            flat_cost: stop.flat_cost,
            cost_note: stop.cost_note || undefined,
            room_rate: stop.room_rate,
            num_rooms: stop.num_rooms,
            nights: stop.nights,
            client_notes: stop.client_notes || undefined,
            internal_notes: stop.internal_notes || undefined,
            driver_notes: stop.driver_notes || undefined,
          });
        }
      }

      // Copy inclusions
      for (const inclusion of original.inclusions || []) {
        await this.addInclusion(newProposal.id, {
          inclusion_type: inclusion.inclusion_type,
          description: inclusion.description,
          quantity: inclusion.quantity,
          unit: inclusion.unit || undefined,
          unit_price: inclusion.unit_price,
          total_price: inclusion.total_price,
          pricing_type: inclusion.pricing_type || 'flat',
          sort_order: inclusion.sort_order,
          show_on_proposal: inclusion.show_on_proposal,
          notes: inclusion.notes || undefined,
        });
      }

      // Recalculate pricing
      await this.calculatePricing(newProposal.id);

      return newProposal;
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async generateProposalNumber(): Promise<string> {
    const result = await this.queryOne<{ proposal_number: string }>(
      'SELECT generate_trip_proposal_number() as proposal_number'
    );
    return result?.proposal_number || `TP-${Date.now()}`;
  }

  private async generateBookingNumber(): Promise<string> {
    const prefix = 'WWT';
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = generateSecureString(3, '0123456789');
    return `${prefix}-${year}-${timestamp}${random}`;
  }

  private calculateValidUntil(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

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
    });

    return newCustomer.id;
  }

  private validateStatusTransition(current: TripProposalStatus, next: TripProposalStatus): void {
    const validTransitions: Record<TripProposalStatus, TripProposalStatus[]> = {
      draft: ['sent', 'declined'],
      sent: ['viewed', 'accepted', 'declined', 'expired'],
      viewed: ['accepted', 'declined', 'expired', 'sent'], // Can resend
      accepted: ['booked'],
      declined: ['draft'], // Can reopen
      expired: ['draft'], // Can reopen
      booked: [], // Final state
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new ValidationError(`Cannot transition from ${current} to ${next}`);
    }
  }

  private async logActivity(
    proposalId: number,
    action: string,
    description: string,
    options?: {
      actor_type?: 'staff' | 'customer' | 'system';
      actor_name?: string;
      actor_user_id?: number;
      ip_address?: string;
      user_agent?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.insert('trip_proposal_activity', {
      trip_proposal_id: proposalId,
      action,
      description,
      actor_type: options?.actor_type || 'system',
      actor_name: options?.actor_name || null,
      actor_user_id: options?.actor_user_id || null,
      ip_address: options?.ip_address || null,
      user_agent: options?.user_agent || null,
      metadata: options?.metadata || {},
    });
  }
}

// Export singleton instance
export const tripProposalService = new TripProposalService();
