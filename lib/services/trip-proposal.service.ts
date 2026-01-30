/**
 * Trip Proposal Service
 *
 * @module lib/services/trip-proposal.service
 * @description Handles all trip proposal business logic for comprehensive
 * multi-day trip planning with hotels, restaurants, wineries, and pricing.
 */

import { BaseService } from './base.service';
import { NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import {
  TripProposal,
  TripProposalFull,
  TripProposalDay,
  TripProposalStop,
  TripProposalGuest,
  TripProposalInclusion,
  TripProposalActivity,
  TripProposalStatus,
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

      // Create the proposal
      const proposal = await this.insert<TripProposal>('trip_proposals', {
        proposal_number: proposalNumber,
        status: 'draft',
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
        tax_rate: validated.tax_rate || 0.089,
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
      cost_notes: validated.cost_notes || null,
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

    // Check proposal exists
    const proposalExists = await this.exists('trip_proposals', 'id = $1', [proposalId]);
    if (!proposalExists) {
      throw new NotFoundError('TripProposal', proposalId.toString());
    }

    const guest = await this.insert<TripProposalGuest>('trip_proposal_guests', {
      trip_proposal_id: proposalId,
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      is_primary: validated.is_primary || false,
      dietary_restrictions: validated.dietary_restrictions || null,
      accessibility_needs: validated.accessibility_needs || null,
      special_requests: validated.special_requests || null,
      room_assignment: validated.room_assignment || null,
    });

    return guest;
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
   * Get full proposal with all relations
   */
  async getFullDetails(id: number): Promise<TripProposalFull | null> {
    this.log('Fetching full trip proposal details', { id });

    // Get base proposal
    const proposal = await this.queryOne<TripProposal>(
      `SELECT tp.*,
        JSON_BUILD_OBJECT(
          'id', b.id,
          'name', b.name,
          'code', b.code
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
              'cost_notes', s.cost_notes,
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
    limit?: number;
    offset?: number;
  }): Promise<{ proposals: TripProposal[]; total: number }> {
    this.log('Listing trip proposals', filters);

    const conditions: string[] = [];
    const params: unknown[] = [];

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

    const result = await this.query<TripProposal>(
      `SELECT * FROM trip_proposals ${whereClause}
       ORDER BY created_at DESC
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
   * Delete guest
   */
  async deleteGuest(guestId: number): Promise<void> {
    this.log('Deleting trip proposal guest', { guestId });
    await this.query('DELETE FROM trip_proposal_guests WHERE id = $1', [guestId]);
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

    // Calculate stops subtotal
    const stopsResult = await this.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(
        (per_person_cost * $2) + flat_cost + (room_rate * num_rooms * nights)
       ), 0) as total
       FROM trip_proposal_stops s
       JOIN trip_proposal_days d ON s.trip_proposal_day_id = d.id
       WHERE d.trip_proposal_id = $1`,
      [proposalId, proposal.party_size]
    );
    const stopsSubtotal = parseFloat(stopsResult?.total || '0');

    // Calculate inclusions subtotal
    const inclusionsResult = await this.queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(total_price), 0) as total FROM trip_proposal_inclusions WHERE trip_proposal_id = $1',
      [proposalId]
    );
    const inclusionsSubtotal = parseFloat(inclusionsResult?.total || '0');

    // Calculate totals
    const subtotal = stopsSubtotal + inclusionsSubtotal;
    const discountAmount = subtotal * (proposal.discount_percentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxes = subtotalAfterDiscount * proposal.tax_rate;
    const gratuityAmount = subtotalAfterDiscount * (proposal.gratuity_percentage / 100);
    const total = subtotalAfterDiscount + taxes + gratuityAmount;
    const depositAmount = total * (proposal.deposit_percentage / 100);
    const balanceDue = total - (proposal.deposit_paid ? proposal.deposit_amount : 0);

    // Update the proposal with calculated values
    await this.update<TripProposal>('trip_proposals', proposalId, {
      subtotal: subtotalAfterDiscount,
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
      // Calculate total duration in hours (rough estimate: 8 hours per day)
      const numDays = proposal.days?.length || 1;
      const durationHours = numDays * 8;

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
        status: 'converted',
      });

      // Log activity
      await this.logActivity(proposalId, 'converted', `Converted to booking ${bookingNumber}`, {
        actor_type: 'staff',
        actor_user_id: userId,
        metadata: { booking_id: bookingResult.id, booking_number: bookingNumber },
      });

      this.log('Trip proposal converted to booking', {
        proposalId,
        bookingId: bookingResult.id,
        bookingNumber,
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
            cost_notes: stop.cost_notes || undefined,
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
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
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
      accepted: ['converted'],
      declined: ['draft'], // Can reopen
      expired: ['draft'], // Can reopen
      converted: [], // Final state
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
