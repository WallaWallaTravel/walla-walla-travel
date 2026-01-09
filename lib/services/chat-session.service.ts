/**
 * Chat Session Service
 *
 * @module lib/services/chat-session.service
 * @description Manages chat session persistence in the database.
 * Uses the existing kb_chat_sessions, kb_chat_messages, and kb_trip_states tables.
 *
 * @features
 * - Create/resume sessions based on visitor ID
 * - Save and load chat messages
 * - Persist trip preferences (party size, dates, occasion, etc.)
 * - Support for returning visitors ("Welcome back!")
 */

import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface ChatSession {
  id: string; // UUID
  visitor_id: string;
  visitor_profile: Record<string, unknown> | null;
  started_at: string;
  last_message_at: string | null;
  message_count: number;
  itinerary_generated: boolean;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources_used: string[] | null;
  grounding_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TripState {
  id: string; // UUID
  session_id: string;
  dates_status: string;
  start_date: string | null;
  end_date: string | null;
  date_flexibility: string | null;
  party_size: number | null;
  party_type: string | null;
  special_occasion: string | null;
  selections: unknown[];
  preferences: Record<string, unknown>;
  ready_for_itinerary: boolean;
  ready_for_deposit: boolean;
  updated_at: string;
}

export interface SessionWithState {
  session: ChatSession;
  messages: ChatMessage[];
  tripState: TripState | null;
}

// ============================================================================
// Service
// ============================================================================

class ChatSessionService extends BaseService {
  protected get serviceName(): string {
    return 'ChatSessionService';
  }

  /**
   * Get or create a session for a visitor
   * Returns existing session with messages and trip state if found
   */
  async getOrCreateSession(visitorId: string): Promise<SessionWithState> {
    this.log('Getting or creating session', { visitorId });

    // Try to find existing session (most recent)
    let session = await this.queryOne<ChatSession>(
      `SELECT *
       FROM kb_chat_sessions
       WHERE visitor_id = $1
       ORDER BY last_message_at DESC NULLS LAST, started_at DESC
       LIMIT 1`,
      [visitorId]
    );

    if (session) {
      // Found existing session - load messages and trip state
      const [messages, tripState] = await Promise.all([
        this.getSessionMessages(session.id),
        this.getSessionTripState(session.id),
      ]);

      this.log('Resuming existing session', {
        sessionId: session.id,
        messageCount: messages.length,
        hasTripState: !!tripState,
      });

      return { session, messages, tripState };
    }

    // No session found - create new one
    session = await this.createSession(visitorId);

    return {
      session,
      messages: [],
      tripState: null,
    };
  }

  /**
   * Create a new chat session
   */
  async createSession(visitorId: string, visitorProfile?: Record<string, unknown>): Promise<ChatSession> {
    this.log('Creating new session', { visitorId });

    const session = await this.queryOne<ChatSession>(
      `INSERT INTO kb_chat_sessions (visitor_id, visitor_profile, started_at, message_count)
       VALUES ($1, $2, NOW(), 0)
       RETURNING *`,
      [visitorId, visitorProfile ? JSON.stringify(visitorProfile) : null]
    );

    if (!session) {
      throw new Error('Failed to create chat session');
    }

    // Also create an empty trip state for this session
    await this.query(
      `INSERT INTO kb_trip_states (session_id, selections, preferences, updated_at)
       VALUES ($1, '[]'::jsonb, '{}'::jsonb, NOW())`,
      [session.id]
    );

    return session;
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const messages = await this.queryMany<ChatMessage>(
      `SELECT id, session_id, role, content, sources_used, grounding_metadata, created_at
       FROM kb_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return messages;
  }

  /**
   * Get trip state for a session
   */
  async getSessionTripState(sessionId: string): Promise<TripState | null> {
    const tripState = await this.queryOne<TripState>(
      `SELECT *
       FROM kb_trip_states
       WHERE session_id = $1`,
      [sessionId]
    );
    return tripState;
  }

  /**
   * Add a message to a session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: string[],
    groundingMetadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    // Insert message
    const message = await this.queryOne<ChatMessage>(
      `INSERT INTO kb_chat_messages (session_id, role, content, sources_used, grounding_metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        sessionId,
        role,
        content,
        sources || null,
        groundingMetadata ? JSON.stringify(groundingMetadata) : null,
      ]
    );

    if (!message) {
      throw new Error('Failed to save message');
    }

    // Update session's last_message_at and message_count
    await this.query(
      `UPDATE kb_chat_sessions
       SET last_message_at = NOW(), message_count = message_count + 1
       WHERE id = $1`,
      [sessionId]
    );

    return message;
  }

  /**
   * Update trip state for a session
   */
  async updateTripState(
    sessionId: string,
    updates: Partial<{
      partySize: number;
      dates: string;
      startDate: string;
      endDate: string;
      occasion: string;
      pace: string;
      winePreferences: string[];
      selections: unknown[];
    }>
  ): Promise<TripState | null> {
    this.log('Updating trip state', { sessionId, updates });

    // Build dynamic update query
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.partySize !== undefined) {
      setClauses.push(`party_size = $${paramIndex++}`);
      params.push(updates.partySize);
    }

    if (updates.dates !== undefined) {
      setClauses.push(`dates_status = 'specific'`);
      // Try to parse dates for start/end
      if (updates.dates.includes('-')) {
        setClauses.push(`date_flexibility = $${paramIndex++}`);
        params.push(updates.dates);
      }
    }

    if (updates.startDate !== undefined) {
      setClauses.push(`start_date = $${paramIndex++}`);
      params.push(updates.startDate);
    }

    if (updates.endDate !== undefined) {
      setClauses.push(`end_date = $${paramIndex++}`);
      params.push(updates.endDate);
    }

    if (updates.occasion !== undefined) {
      setClauses.push(`special_occasion = $${paramIndex++}`);
      params.push(updates.occasion);
    }

    if (updates.winePreferences !== undefined || updates.pace !== undefined) {
      // These go in the preferences JSONB
      const prefUpdate: Record<string, unknown> = {};
      if (updates.winePreferences) prefUpdate.winePreferences = updates.winePreferences;
      if (updates.pace) prefUpdate.pace = updates.pace;
      setClauses.push(`preferences = preferences || $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(prefUpdate));
    }

    if (updates.selections !== undefined) {
      setClauses.push(`selections = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(updates.selections));
    }

    params.push(sessionId);

    const result = await this.queryOne<TripState>(
      `UPDATE kb_trip_states
       SET ${setClauses.join(', ')}
       WHERE session_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<ChatSession | null> {
    return this.queryOne<ChatSession>(
      `SELECT * FROM kb_chat_sessions WHERE id = $1`,
      [sessionId]
    );
  }

  /**
   * Check if visitor is returning (has previous sessions)
   */
  async isReturningVisitor(visitorId: string): Promise<{
    isReturning: boolean;
    previousSessionCount: number;
    lastVisit: string | null;
    lastTripContext?: {
      partySize?: number;
      occasion?: string;
    };
  }> {
    const result = await this.queryOne<{
      session_count: string;
      last_visit: string | null;
      party_size: number | null;
      special_occasion: string | null;
    }>(
      `SELECT
         COUNT(DISTINCT s.id)::text as session_count,
         MAX(s.last_message_at) as last_visit,
         (SELECT party_size FROM kb_trip_states ts
          JOIN kb_chat_sessions cs ON ts.session_id = cs.id
          WHERE cs.visitor_id = $1
          ORDER BY ts.updated_at DESC LIMIT 1) as party_size,
         (SELECT special_occasion FROM kb_trip_states ts
          JOIN kb_chat_sessions cs ON ts.session_id = cs.id
          WHERE cs.visitor_id = $1
          ORDER BY ts.updated_at DESC LIMIT 1) as special_occasion
       FROM kb_chat_sessions s
       WHERE s.visitor_id = $1`,
      [visitorId]
    );

    const sessionCount = parseInt(result?.session_count || '0', 10);

    return {
      isReturning: sessionCount > 0,
      previousSessionCount: sessionCount,
      lastVisit: result?.last_visit || null,
      lastTripContext: sessionCount > 0 ? {
        partySize: result?.party_size || undefined,
        occasion: result?.special_occasion || undefined,
      } : undefined,
    };
  }

  /**
   * Link session to user account (after login)
   */
  async linkSessionToUser(visitorId: string, userId: number): Promise<void> {
    this.log('Linking sessions to user', { visitorId, userId });

    // Update all sessions with this visitor_id to have the user_id
    // (Assumes user_id column exists - add via migration if not)
    await this.query(
      `UPDATE kb_chat_sessions
       SET visitor_profile = COALESCE(visitor_profile, '{}')::jsonb || jsonb_build_object('user_id', $2)
       WHERE visitor_id = $1`,
      [visitorId, userId]
    );
  }

  /**
   * Get all sessions for a user (for cross-device sync)
   */
  async getUserSessions(userId: number): Promise<ChatSession[]> {
    const sessions = await this.queryMany<ChatSession>(
      `SELECT *
       FROM kb_chat_sessions
       WHERE visitor_profile->>'user_id' = $1::text
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT 10`,
      [userId.toString()]
    );
    return sessions;
  }
}

export const chatSessionService = new ChatSessionService();
