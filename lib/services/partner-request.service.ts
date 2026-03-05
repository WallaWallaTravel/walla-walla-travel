/**
 * Partner Request Service
 *
 * @module lib/services/partner-request.service
 * @description Service layer for partner booking request/response system.
 * Handles creating outbound requests, processing partner responses,
 * building conversation threads, and auto-updating stop reservation status.
 *
 * Built on top of existing vendor_interactions (migration 092) and
 * partner_request_tokens / partner_responses (migration 118).
 */

import crypto from 'crypto';
import { BaseService } from './base.service';
import {
  PartnerRequestToken,
  PartnerResponse,
  VendorInteraction,
  ConversationEntry,
  ConversationThreadResponse,
  PartnerRequestPublicView,
  CreateRequestInput,
  AddResponseInput,
  DEFAULT_TOKEN_EXPIRY_DAYS,
} from '@/lib/types/partner-request';

class PartnerRequestService extends BaseService {
  protected get serviceName() {
    return 'PartnerRequestService';
  }

  // ============================================================================
  // Request Creation
  // ============================================================================

  /**
   * Create a new partner request token and log the outbound request.
   *
   * Generates a cryptographic token, inserts the request record,
   * logs a vendor_interaction entry, and updates the stop's reservation_status
   * to 'requested'.
   *
   * Does NOT send the email — the caller is responsible for that, passing
   * back the resend_message_id via updateMessageId().
   */
  async createRequest(input: CreateRequestInput): Promise<PartnerRequestToken> {
    this.log('Creating partner request', {
      stopId: input.stop_id,
      proposalId: input.proposal_id,
      partnerEmail: input.partner_email,
      requestType: input.request_type,
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiryDays = input.expires_in_days ?? DEFAULT_TOKEN_EXPIRY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return this.withTransaction(async () => {
      // 1. Insert the request token
      const requestToken = await this.insert<PartnerRequestToken>(
        'partner_request_tokens',
        {
          token,
          stop_id: input.stop_id,
          proposal_id: input.proposal_id,
          partner_email: input.partner_email,
          partner_name: input.partner_name || null,
          request_type: input.request_type,
          request_subject: input.request_subject || null,
          request_body: input.request_body,
          status: 'sent',
          expires_at: expiresAt.toISOString(),
          sent_by: input.sent_by,
        }
      );

      // 2. Log the interaction
      await this.insert('vendor_interactions', {
        trip_proposal_stop_id: input.stop_id,
        interaction_type: 'request_sent',
        content: input.request_subject
          ? `Request sent: ${input.request_subject}`
          : `${input.request_type} request sent to ${input.partner_email}`,
        contacted_by: input.sent_by,
        request_token_id: requestToken.id,
      });

      // 3. Update stop reservation_status → 'requested'
      await this.query(
        `UPDATE trip_proposal_stops
         SET reservation_status = 'requested',
             vendor_email = COALESCE(NULLIF($2, ''), vendor_email),
             vendor_name = COALESCE(NULLIF($3, ''), vendor_name),
             updated_at = NOW()
         WHERE id = $1`,
        [input.stop_id, input.partner_email, input.partner_name || '']
      );

      return requestToken;
    });
  }

  /**
   * Update the resend_message_id after the email is actually sent.
   */
  async updateMessageId(tokenId: number, messageId: string): Promise<void> {
    await this.query(
      'UPDATE partner_request_tokens SET resend_message_id = $1 WHERE id = $2',
      [messageId, tokenId]
    );
  }

  // ============================================================================
  // Token Lookup
  // ============================================================================

  /**
   * Get a request token by its public token string.
   * Used by the partner response page to validate + display the request.
   */
  async getRequestByToken(token: string): Promise<PartnerRequestToken | null> {
    if (!token || token.length < 32) {
      return null;
    }

    return this.queryOne<PartnerRequestToken>(
      'SELECT * FROM partner_request_tokens WHERE token = $1',
      [token]
    );
  }

  /**
   * Build the public-safe view of a request for the partner response page.
   * Excludes internal notes, financials, customer last name, etc.
   */
  async getPublicView(token: string): Promise<PartnerRequestPublicView | null> {
    const request = await this.getRequestByToken(token);
    if (!request) return null;

    // Check expiry
    if (new Date(request.expires_at) < new Date() && request.status === 'sent') {
      await this.query(
        "UPDATE partner_request_tokens SET status = 'expired' WHERE id = $1",
        [request.id]
      );
      request.status = 'expired';
    }

    // Get stop details (safe subset)
    const stop = await this.queryOne<{
      venue_name: string;
      stop_type: string;
      date: string | null;
      time: string | null;
      party_size: number;
    }>(
      `SELECT
        COALESCE(s.custom_name, w.name, r.name, h.name, 'Venue') as venue_name,
        s.stop_type,
        d.date::text as date,
        s.scheduled_time as time,
        tp.party_size
       FROM trip_proposal_stops s
       JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id
       JOIN trip_proposals tp ON tp.id = d.trip_proposal_id
       LEFT JOIN wineries w ON w.id = s.winery_id
       LEFT JOIN restaurants r ON r.id = s.restaurant_id
       LEFT JOIN hotels h ON h.id = s.hotel_id
       WHERE s.id = $1`,
      [request.stop_id]
    );

    if (!stop) return null;

    // Get previous responses for this token
    const responses = await this.queryMany<{
      action: string;
      message: string | null;
      created_at: string;
    }>(
      `SELECT action, message, created_at
       FROM partner_responses
       WHERE request_token_id = $1
       ORDER BY created_at ASC`,
      [request.id]
    );

    // Mark as opened on first view
    if (!request.opened_at && request.status === 'sent') {
      await this.query(
        "UPDATE partner_request_tokens SET opened_at = NOW(), status = 'opened' WHERE id = $1 AND opened_at IS NULL",
        [request.id]
      );
    }

    return {
      request_type: request.request_type,
      request_subject: request.request_subject,
      request_body: request.request_body,
      created_at: request.created_at,
      status: request.status,
      stop: {
        venue_name: stop.venue_name,
        stop_type: stop.stop_type,
        date: stop.date,
        time: stop.time,
        party_size: stop.party_size,
      },
      previous_responses: responses.map(r => ({
        action: r.action as PartnerRequestPublicView['previous_responses'][number]['action'],
        message: r.message,
        created_at: r.created_at,
      })),
    };
  }

  // ============================================================================
  // Response Processing
  // ============================================================================

  /**
   * Record a partner's response and auto-update stop reservation status.
   *
   * @param token - The public token string
   * @param input - Response data from the form
   * @returns The created response, or null if token is invalid/expired
   */
  async addResponse(
    token: string,
    input: AddResponseInput
  ): Promise<PartnerResponse | null> {
    const request = await this.getRequestByToken(token);
    if (!request) return null;

    // Check expiry
    if (new Date(request.expires_at) < new Date()) {
      if (request.status !== 'expired') {
        await this.query(
          "UPDATE partner_request_tokens SET status = 'expired' WHERE id = $1",
          [request.id]
        );
      }
      return null;
    }

    // Revoked tokens cannot receive responses
    if (request.status === 'revoked') {
      return null;
    }

    this.log('Recording partner response', {
      tokenId: request.id,
      action: input.action,
      stopId: request.stop_id,
    });

    return this.withTransaction(async () => {
      // 1. Insert response
      const response = await this.insert<PartnerResponse>(
        'partner_responses',
        {
          request_token_id: request.id,
          stop_id: request.stop_id,
          action: input.action,
          message: input.message || null,
          confirmed_date: input.confirmed_date || null,
          confirmed_time: input.confirmed_time || null,
          confirmed_party_size: input.confirmed_party_size || null,
          confirmation_code: input.confirmation_code || null,
          alternate_date: input.alternate_date || null,
          alternate_time: input.alternate_time || null,
          quoted_amount: input.quoted_amount ?? null,
          response_source: input.response_source || 'web_form',
          responder_name: input.responder_name,
          responder_email: input.responder_email || null,
          responder_ip: input.responder_ip || null,
        }
      );

      // 2. Log the interaction
      const actionLabel = {
        confirm: 'Partner confirmed',
        modify: 'Partner suggested changes',
        decline: 'Partner declined',
        message: 'Partner sent message',
      }[input.action];

      await this.insert('vendor_interactions', {
        trip_proposal_stop_id: request.stop_id,
        interaction_type: 'partner_response',
        content: input.message
          ? `${actionLabel}: ${input.message}`
          : actionLabel,
        request_token_id: request.id,
        response_id: response.id,
      });

      // 3. Update request token status
      await this.query(
        "UPDATE partner_request_tokens SET status = 'responded', responded_at = NOW() WHERE id = $1",
        [request.id]
      );

      // 4. Auto-update stop reservation status
      await this.updateStopStatus(request.stop_id, input);

      return response;
    });
  }

  // ============================================================================
  // Stop Status Updates
  // ============================================================================

  /**
   * Auto-update the stop's reservation_status and related fields
   * based on a partner response action.
   */
  async updateStopStatus(
    stopId: number,
    input: AddResponseInput
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (input.action) {
      case 'confirm':
        updates.reservation_status = 'confirmed';
        if (input.confirmation_code) {
          updates.reservation_confirmation = input.confirmation_code;
        }
        if (input.quoted_amount !== undefined) {
          updates.quoted_amount = input.quoted_amount;
          updates.quote_status = 'confirmed';
        }
        break;

      case 'modify':
        // Back to pending — needs admin review of proposed changes
        updates.reservation_status = 'pending';
        break;

      case 'decline':
        updates.reservation_status = 'cancelled';
        break;

      case 'message':
        // Don't change status for general messages
        break;
    }

    if (Object.keys(updates).length > 1) {
      const keys = Object.keys(updates);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      await this.query(
        `UPDATE trip_proposal_stops SET ${setClause} WHERE id = $${keys.length + 1}`,
        [...Object.values(updates), stopId]
      );

      // Log the status change
      if (updates.reservation_status) {
        await this.insert('vendor_interactions', {
          trip_proposal_stop_id: stopId,
          interaction_type: 'status_change',
          content: `Reservation status updated to '${updates.reservation_status}'`,
        });
      }
    }
  }

  // ============================================================================
  // Conversation Thread
  // ============================================================================

  /**
   * Get the full conversation thread for a stop.
   * Combines vendor_interactions, request tokens, and responses into
   * a single chronological view.
   */
  async getStopConversation(stopId: number): Promise<ConversationThreadResponse> {
    // Get interactions
    const interactions = await this.queryMany<VendorInteraction & { contacted_by_name: string | null }>(
      `SELECT vi.*, u.name as contacted_by_name
       FROM vendor_interactions vi
       LEFT JOIN users u ON u.id = vi.contacted_by
       WHERE vi.trip_proposal_stop_id = $1
       ORDER BY vi.created_at ASC`,
      [stopId]
    );

    // Get request tokens (with sent_by name)
    const requests = await this.queryMany<PartnerRequestToken & { sent_by_name: string | null }>(
      `SELECT prt.*, u.name as sent_by_name
       FROM partner_request_tokens prt
       LEFT JOIN users u ON u.id = prt.sent_by
       WHERE prt.stop_id = $1
       ORDER BY prt.created_at ASC`,
      [stopId]
    );

    // Get responses
    const responses = await this.queryMany<PartnerResponse>(
      `SELECT * FROM partner_responses
       WHERE stop_id = $1
       ORDER BY created_at ASC`,
      [stopId]
    );

    // Build unified thread — deduplicate entries already tracked as interactions
    const interactionRequestIds = new Set(
      interactions.filter(i => i.request_token_id).map(i => i.request_token_id)
    );
    const interactionResponseIds = new Set(
      interactions.filter(i => i.response_id).map(i => i.response_id)
    );

    const entries: ConversationEntry[] = [];

    // Add interactions (these include manual notes, phone calls, etc.)
    for (const vi of interactions) {
      entries.push({
        id: vi.id,
        entry_type: 'interaction',
        interaction_type: vi.interaction_type,
        content: vi.content,
        created_at: vi.created_at,
        author_name: vi.contacted_by_name || null,
        author_type: vi.interaction_type === 'partner_response' ? 'partner'
          : vi.interaction_type === 'status_change' ? 'system'
          : 'staff',
        request_token_id: vi.request_token_id,
        response_id: vi.response_id,
        response_action: null,
        confirmation_code: null,
        alternate_date: null,
        alternate_time: null,
        quoted_amount: null,
      });
    }

    // Add requests not already tracked as interactions
    for (const req of requests) {
      if (!interactionRequestIds.has(req.id)) {
        entries.push({
          id: req.id,
          entry_type: 'request',
          interaction_type: 'request_sent',
          content: req.request_body,
          created_at: req.created_at,
          author_name: req.sent_by_name || null,
          author_type: 'staff',
          request_token_id: req.id,
          response_id: null,
          response_action: null,
          confirmation_code: null,
          alternate_date: null,
          alternate_time: null,
          quoted_amount: null,
        });
      }
    }

    // Add responses not already tracked as interactions
    for (const resp of responses) {
      if (!interactionResponseIds.has(resp.id)) {
        entries.push({
          id: resp.id,
          entry_type: 'response',
          interaction_type: 'partner_response',
          content: resp.message || `Partner ${resp.action}`,
          created_at: resp.created_at,
          author_name: resp.responder_name,
          author_type: 'partner',
          request_token_id: resp.request_token_id,
          response_id: resp.id,
          response_action: resp.action,
          confirmation_code: resp.confirmation_code,
          alternate_date: resp.alternate_date,
          alternate_time: resp.alternate_time,
          quoted_amount: resp.quoted_amount ? Number(resp.quoted_amount) : null,
        });
      }
    }

    // Sort by created_at
    entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Get stop summary
    const stop = await this.queryOne<{
      id: number;
      vendor_name: string | null;
      vendor_email: string | null;
      reservation_status: string;
    }>(
      `SELECT id, vendor_name, vendor_email, reservation_status
       FROM trip_proposal_stops WHERE id = $1`,
      [stopId]
    );

    // Count active (non-expired, non-revoked) requests
    const activeRequests = await this.queryCount(
      `SELECT COUNT(*) as count FROM partner_request_tokens
       WHERE stop_id = $1 AND status IN ('sent', 'opened')
       AND expires_at > NOW()`,
      [stopId]
    );

    return {
      entries,
      stop: stop || { id: stopId, vendor_name: null, vendor_email: null, reservation_status: 'pending' },
      active_requests: activeRequests,
    };
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Revoke a request token (prevents further responses).
   */
  async revokeToken(tokenId: number): Promise<void> {
    await this.query(
      "UPDATE partner_request_tokens SET status = 'revoked' WHERE id = $1 AND status IN ('sent', 'opened')",
      [tokenId]
    );
    this.log('Revoked request token', { tokenId });
  }

  /**
   * Expire all stale tokens. Designed to be called by a cron job.
   * Returns the count of tokens expired.
   */
  async expireStaleTokens(): Promise<number> {
    const result = await this.query(
      `UPDATE partner_request_tokens
       SET status = 'expired'
       WHERE status IN ('sent', 'opened')
       AND expires_at < NOW()`,
      []
    );
    const count = result.rowCount || 0;
    if (count > 0) {
      this.log('Expired stale tokens', { count });
    }
    return count;
  }

  /**
   * Get all requests for a stop (admin view).
   */
  async getRequestsForStop(stopId: number): Promise<PartnerRequestToken[]> {
    return this.queryMany<PartnerRequestToken>(
      `SELECT * FROM partner_request_tokens
       WHERE stop_id = $1
       ORDER BY created_at DESC`,
      [stopId]
    );
  }

  /**
   * Get all responses for a specific request token.
   */
  async getResponsesForToken(tokenId: number): Promise<PartnerResponse[]> {
    return this.queryMany<PartnerResponse>(
      `SELECT * FROM partner_responses
       WHERE request_token_id = $1
       ORDER BY created_at ASC`,
      [tokenId]
    );
  }

  // ============================================================================
  // Inbound Email Helpers
  // ============================================================================

  /**
   * Parse a reply-to address to extract the stop ID.
   * Expected format: stop-{id}@in.wallawalla.travel
   *
   * @returns The stop ID, or null if format doesn't match
   */
  parseReplyToAddress(address: string): number | null {
    const match = address.match(/^stop-(\d+)@in\.wallawalla\.travel$/i);
    if (!match) return null;
    const stopId = parseInt(match[1], 10);
    return isNaN(stopId) ? null : stopId;
  }

  /**
   * Generate a reply-to address for a stop.
   */
  getReplyToAddress(stopId: number): string {
    return `stop-${stopId}@in.wallawalla.travel`;
  }

  /**
   * Verify a stop exists and belongs to a valid proposal.
   */
  async verifyStop(stopId: number, proposalId?: number): Promise<boolean> {
    const condition = proposalId
      ? 's.id = $1 AND d.trip_proposal_id = $2'
      : 's.id = $1';
    const params = proposalId ? [stopId, proposalId] : [stopId];

    return this.exists(
      'trip_proposal_stops s JOIN trip_proposal_days d ON d.id = s.trip_proposal_day_id',
      condition,
      params
    );
  }
}

export const partnerRequestService = new PartnerRequestService();
