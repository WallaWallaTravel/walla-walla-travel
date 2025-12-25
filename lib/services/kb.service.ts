/**
 * Knowledge Base Service
 *
 * Handles all database operations for the AI Knowledge Base:
 * - Businesses (content sources)
 * - Contributions (content items)
 * - Chat sessions and messages
 * - Trip states and draft bookings
 */

import { BaseService } from './base.service';
import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  type: z.enum(['winery', 'restaurant', 'hotel', 'attraction', 'expert']),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
});

export const CreateContributionSchema = z.object({
  business_id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required'),
  content_type: z.enum(['text', 'document', 'voice', 'video', 'image', 'url']),
  content_text: z.string().optional(),
  original_filename: z.string().optional(),
  topics: z.array(z.string()).optional(),
  audience_type: z.enum(['first-time', 'wine-enthusiast', 'family', 'romantic', 'all']).optional(),
  is_evergreen: z.boolean().default(true),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

export const CreateChatMessageSchema = z.object({
  session_id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  sources_used: z.array(z.string()).optional(),
  grounding_metadata: z.record(z.unknown()).optional(),
});

export const UpdateTripStateSchema = z.object({
  dates_status: z.enum(['flexible', 'tentative', 'confirmed']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  date_flexibility: z.string().optional(),
  party_size: z.number().int().positive().optional(),
  party_type: z.enum(['couple', 'family', 'friends', 'solo', 'corporate']).optional(),
  special_occasion: z.string().optional(),
  selections: z.array(z.record(z.unknown())).optional(),
  preferences: z.record(z.unknown()).optional(),
  ready_for_itinerary: z.boolean().optional(),
  ready_for_deposit: z.boolean().optional(),
});

export const CreateDraftBookingSchema = z.object({
  chat_session_id: z.string().uuid().optional(),
  itinerary_id: z.string().uuid().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Valid email is required'),
  customer_phone: z.string().optional(),
  trip_start_date: z.string(),
  trip_end_date: z.string(),
  party_size: z.number().int().positive(),
  party_type: z.string().optional(),
  special_occasion: z.string().optional(),
  itinerary_summary: z.record(z.unknown()).optional(),
  preferences: z.record(z.unknown()).optional(),
  special_requests: z.string().optional(),
  cost_transportation: z.number().optional(),
  cost_guide: z.number().optional(),
  cost_activities: z.number().optional(),
  cost_tour_total: z.number(),
  deposit_amount: z.number(),
});

// ============================================================================
// Types
// ============================================================================

export interface KBBusiness {
  id: number;
  name: string;
  type: 'winery' | 'restaurant' | 'hotel' | 'attraction' | 'expert';
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface KBContribution {
  id: number;
  business_id: number;
  contributor_id?: number;
  title: string;
  content_type: string;
  content_text?: string;
  original_filename?: string;
  status: string;
  file_search_doc_id?: string;
  ai_prescreening?: Record<string, unknown>;
  reviewed_by?: number;
  reviewed_at?: Date;
  review_notes?: string;
  rejection_reason?: string;
  topics?: string[];
  audience_type?: string;
  is_evergreen: boolean;
  valid_from?: Date;
  valid_until?: Date;
  created_at: Date;
  updated_at: Date;
  indexed_at?: Date;
  retrieval_count: number;
}

export interface KBChatSession {
  id: string;
  visitor_id?: string;
  visitor_profile?: Record<string, unknown>;
  started_at: Date;
  last_message_at?: Date;
  message_count: number;
  itinerary_generated: boolean;
}

export interface KBChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources_used?: string[];
  grounding_metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface KBTripState {
  id: string;
  session_id: string;
  dates_status: 'flexible' | 'tentative' | 'confirmed';
  start_date?: Date;
  end_date?: Date;
  date_flexibility?: string;
  party_size?: number;
  party_type?: string;
  special_occasion?: string;
  selections: Record<string, unknown>[];
  preferences: Record<string, unknown>;
  ready_for_itinerary: boolean;
  ready_for_deposit: boolean;
  updated_at: Date;
}

export interface KBDraftBooking {
  id: string;
  chat_session_id?: string;
  itinerary_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  trip_start_date: Date;
  trip_end_date: Date;
  party_size: number;
  party_type?: string;
  special_occasion?: string;
  itinerary_summary?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  special_requests?: string;
  cost_transportation?: number;
  cost_guide?: number;
  cost_activities?: number;
  cost_tour_total: number;
  tbd_tastings_estimate?: number;
  tbd_dining_estimate?: number;
  tbd_winery_count?: number;
  deposit_percentage: number;
  deposit_base_amount: number;
  deposit_amount: number;
  stripe_payment_intent_id?: string;
  deposit_paid_at?: Date;
  status: string;
  assigned_to?: number;
  admin_notes?: string;
  converted_booking_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface KBPricingConfig {
  id: number;
  rate_sedan: number;
  rate_suv: number;
  rate_van: number;
  rate_sprinter: number;
  rate_guide_per_day: number;
  default_tasting_fee: number;
  tasting_fee_note: string;
  avg_breakfast: number;
  avg_lunch: number;
  avg_dinner: number;
  deposit_percentage: number;
  is_active: boolean;
}

// ============================================================================
// Service Class
// ============================================================================

class KBServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'KBService';
  }

  // ==========================================================================
  // Businesses
  // ==========================================================================

  async createBusiness(data: z.infer<typeof CreateBusinessSchema>): Promise<KBBusiness> {
    return this.insert<KBBusiness>('kb_businesses', {
      ...data,
      verified: false,
    });
  }

  async getBusinessById(id: number): Promise<KBBusiness | null> {
    return this.findById<KBBusiness>('kb_businesses', id);
  }

  async getBusinesses(filters?: { type?: string; verified?: boolean }): Promise<KBBusiness[]> {
    let sql = 'SELECT * FROM kb_businesses WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.type) {
      params.push(filters.type);
      sql += ` AND type = $${params.length}`;
    }

    if (filters?.verified !== undefined) {
      params.push(filters.verified);
      sql += ` AND verified = $${params.length}`;
    }

    sql += ' ORDER BY name ASC';

    return this.queryMany<KBBusiness>(sql, params);
  }

  async updateBusiness(id: number, data: Partial<KBBusiness>): Promise<KBBusiness | null> {
    return this.update<KBBusiness>('kb_businesses', id, {
      ...data,
      updated_at: new Date(),
    });
  }

  // ==========================================================================
  // Contributions
  // ==========================================================================

  async createContribution(
    data: z.infer<typeof CreateContributionSchema>,
    contributorId?: number
  ): Promise<KBContribution> {
    return this.insert<KBContribution>('kb_contributions', {
      ...data,
      contributor_id: contributorId,
      status: 'pending',
      retrieval_count: 0,
    });
  }

  async getContributionById(id: number): Promise<KBContribution | null> {
    return this.findById<KBContribution>('kb_contributions', id);
  }

  async getContributions(filters?: {
    business_id?: number;
    status?: string;
    content_type?: string;
  }): Promise<KBContribution[]> {
    let sql = 'SELECT * FROM kb_contributions WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.business_id) {
      params.push(filters.business_id);
      sql += ` AND business_id = $${params.length}`;
    }

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters?.content_type) {
      params.push(filters.content_type);
      sql += ` AND content_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    return this.queryMany<KBContribution>(sql, params);
  }

  async updateContribution(
    id: number,
    data: Partial<KBContribution>
  ): Promise<KBContribution | null> {
    return this.update<KBContribution>('kb_contributions', id, {
      ...data,
      updated_at: new Date(),
    });
  }

  async updateContributionStatus(
    id: number,
    status: string,
    additionalData?: {
      file_search_doc_id?: string;
      ai_prescreening?: Record<string, unknown>;
      reviewed_by?: number;
      review_notes?: string;
      rejection_reason?: string;
    }
  ): Promise<KBContribution | null> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };

    if (status === 'indexed') {
      updateData.indexed_at = new Date();
    }

    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_at = new Date();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    return this.update<KBContribution>('kb_contributions', id, updateData);
  }

  async incrementRetrievalCount(id: number): Promise<void> {
    await this.query(
      `UPDATE kb_contributions 
       SET retrieval_count = retrieval_count + 1, 
           last_retrieved_at = NOW() 
       WHERE id = $1`,
      [id]
    );
  }

  // ==========================================================================
  // Chat Sessions
  // ==========================================================================

  async createChatSession(visitorId?: string): Promise<KBChatSession> {
    return this.insert<KBChatSession>('kb_chat_sessions', {
      visitor_id: visitorId,
      message_count: 0,
      itinerary_generated: false,
    });
  }

  async getChatSession(id: string): Promise<KBChatSession | null> {
    return this.queryOne<KBChatSession>(
      'SELECT * FROM kb_chat_sessions WHERE id = $1',
      [id]
    );
  }

  async updateChatSession(
    id: string,
    data: Partial<KBChatSession>
  ): Promise<KBChatSession | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const result = await this.query<KBChatSession>(
      `UPDATE kb_chat_sessions SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    return result.rows[0] || null;
  }

  // ==========================================================================
  // Chat Messages
  // ==========================================================================

  async createChatMessage(data: z.infer<typeof CreateChatMessageSchema>): Promise<KBChatMessage> {
    // Create message
    const message = await this.insert<KBChatMessage>('kb_chat_messages', data);

    // Update session
    await this.query(
      `UPDATE kb_chat_sessions 
       SET message_count = message_count + 1, 
           last_message_at = NOW() 
       WHERE id = $1`,
      [data.session_id]
    );

    return message;
  }

  async getChatMessages(sessionId: string): Promise<KBChatMessage[]> {
    return this.queryMany<KBChatMessage>(
      'SELECT * FROM kb_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
  }

  // ==========================================================================
  // Trip States
  // ==========================================================================

  async getOrCreateTripState(sessionId: string): Promise<KBTripState> {
    // Try to get existing
    const existing = await this.queryOne<KBTripState>(
      'SELECT * FROM kb_trip_states WHERE session_id = $1',
      [sessionId]
    );

    if (existing) {
      return existing;
    }

    // Create new
    return this.insert<KBTripState>('kb_trip_states', {
      session_id: sessionId,
      dates_status: 'flexible',
      selections: [],
      preferences: {},
      ready_for_itinerary: false,
      ready_for_deposit: false,
    });
  }

  async updateTripState(
    sessionId: string,
    data: z.infer<typeof UpdateTripStateSchema>
  ): Promise<KBTripState | null> {
    // Ensure trip state exists
    await this.getOrCreateTripState(sessionId);

    const keys = Object.keys(data);
    const values = Object.values(data);

    // Handle JSON fields
    const processedValues = values.map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const result = await this.query<KBTripState>(
      `UPDATE kb_trip_states 
       SET ${setClause}, updated_at = NOW() 
       WHERE session_id = $${keys.length + 1} 
       RETURNING *`,
      [...processedValues, sessionId]
    );

    return result.rows[0] || null;
  }

  async addToTripBasket(
    sessionId: string,
    selection: {
      type: 'winery' | 'restaurant' | 'activity' | 'accommodation';
      businessName: string;
      businessId?: number;
      reason?: string;
      preferredDay?: number;
      preferredTime?: 'morning' | 'afternoon' | 'evening';
    }
  ): Promise<KBTripState | null> {
    const tripState = await this.getOrCreateTripState(sessionId);
    const selections = [...(tripState.selections || [])];

    // Add new selection with ID
    selections.push({
      id: `sel_${Date.now()}`,
      ...selection,
      addedAt: new Date().toISOString(),
    });

    return this.updateTripState(sessionId, { selections });
  }

  // ==========================================================================
  // Draft Bookings
  // ==========================================================================

  async createDraftBooking(
    data: z.infer<typeof CreateDraftBookingSchema>
  ): Promise<KBDraftBooking> {
    const depositPercentage = 0.5;
    const depositBaseAmount = data.cost_tour_total;
    const depositAmount = data.deposit_amount || Math.round(depositBaseAmount * depositPercentage);

    return this.insert<KBDraftBooking>('kb_draft_bookings', {
      ...data,
      deposit_percentage: depositPercentage,
      deposit_base_amount: depositBaseAmount,
      deposit_amount: depositAmount,
      status: 'draft',
    });
  }

  async getDraftBooking(id: string): Promise<KBDraftBooking | null> {
    return this.queryOne<KBDraftBooking>(
      'SELECT * FROM kb_draft_bookings WHERE id = $1',
      [id]
    );
  }

  async updateDraftBookingStatus(
    id: string,
    status: string,
    additionalData?: {
      stripe_payment_intent_id?: string;
      deposit_paid_at?: Date;
      assigned_to?: number;
      admin_notes?: string;
      converted_booking_id?: number;
    }
  ): Promise<KBDraftBooking | null> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const keys = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const result = await this.query<KBDraftBooking>(
      `UPDATE kb_draft_bookings SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    return result.rows[0] || null;
  }

  async getDraftBookings(filters?: {
    status?: string;
    customer_email?: string;
  }): Promise<KBDraftBooking[]> {
    let sql = 'SELECT * FROM kb_draft_bookings WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters?.customer_email) {
      params.push(filters.customer_email);
      sql += ` AND customer_email = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    return this.queryMany<KBDraftBooking>(sql, params);
  }

  // ==========================================================================
  // Pricing Config
  // ==========================================================================

  async getActivePricingConfig(): Promise<KBPricingConfig | null> {
    return this.queryOne<KBPricingConfig>(
      'SELECT * FROM kb_pricing_config WHERE is_active = TRUE LIMIT 1'
    );
  }

  async calculateTourCost(
    days: number,
    partySize: number,
    wineryCount: number = 0
  ): Promise<{
    transportation: number;
    guide: number;
    tourTotal: number;
    depositAmount: number;
    tbdTastings: number;
    tbdDining: number;
  }> {
    const config = await this.getActivePricingConfig();

    if (!config) {
      throw new Error('No active pricing configuration found');
    }

    // Determine vehicle rate based on party size
    let vehicleRate: number;
    if (partySize <= 2) {
      vehicleRate = Number(config.rate_sedan);
    } else if (partySize <= 4) {
      vehicleRate = Number(config.rate_suv);
    } else if (partySize <= 8) {
      vehicleRate = Number(config.rate_van);
    } else {
      vehicleRate = Number(config.rate_sprinter);
    }

    const transportation = vehicleRate * days;
    const guide = Number(config.rate_guide_per_day) * days;
    const tourTotal = transportation + guide;
    const depositAmount = Math.round(tourTotal * Number(config.deposit_percentage));

    // TBD estimates (for internal reference only)
    const tbdTastings = wineryCount * partySize * Number(config.default_tasting_fee);
    const tbdDining =
      days *
      partySize *
      (Number(config.avg_breakfast) + Number(config.avg_lunch) + Number(config.avg_dinner));

    return {
      transportation,
      guide,
      tourTotal,
      depositAmount,
      tbdTastings,
      tbdDining,
    };
  }

  // ==========================================================================
  // Search Indexed Content
  // ==========================================================================

  async searchIndexedContent(query: string, limit: number = 10): Promise<KBContribution[]> {
    // Simple text search on indexed content
    // In production, this would use Gemini File Search for semantic search
    return this.queryMany<KBContribution>(
      `SELECT * FROM kb_contributions 
       WHERE status = 'indexed' 
       AND (
         title ILIKE $1 
         OR content_text ILIKE $1 
         OR $2 = ANY(topics)
       )
       ORDER BY retrieval_count DESC
       LIMIT $3`,
      [`%${query}%`, query.toLowerCase(), limit]
    );
  }
}

// Export singleton instance
export const kbService = new KBServiceClass();

