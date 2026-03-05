/**
 * Partner Booking Request Types
 *
 * @module lib/types/partner-request
 * @description Type definitions for the partner booking request/response system.
 * Covers request tokens, structured partner responses, conversation threads,
 * and inbound email routing.
 */

import { z } from 'zod';

// ============================================================================
// Enums & Constants
// ============================================================================

export const REQUEST_TYPES = ['availability', 'reservation', 'quote', 'custom'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TOKEN_STATUSES = ['sent', 'opened', 'responded', 'expired', 'revoked'] as const;
export type RequestTokenStatus = (typeof REQUEST_TOKEN_STATUSES)[number];

export const RESPONSE_ACTIONS = ['confirm', 'modify', 'decline', 'message'] as const;
export type ResponseAction = (typeof RESPONSE_ACTIONS)[number];

export const RESPONSE_SOURCES = ['web_form', 'inbound_email', 'manual_entry'] as const;
export type ResponseSource = (typeof RESPONSE_SOURCES)[number];

export const INTERACTION_TYPES = [
  'note', 'email_sent', 'email_received', 'phone_call', 'quote_received',
  'partner_response', 'request_sent', 'status_change',
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const ROUTING_METHODS = ['auto_address', 'manual_link', 'unmatched'] as const;
export type RoutingMethod = (typeof ROUTING_METHODS)[number];

/** Default token validity in days */
export const DEFAULT_TOKEN_EXPIRY_DAYS = 30;

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Partner Request Token — one per outbound request email
 */
export interface PartnerRequestToken {
  id: number;
  token: string;
  stop_id: number;
  proposal_id: number;

  // Recipient
  partner_email: string;
  partner_name: string | null;

  // Request details
  request_type: RequestType;
  request_subject: string | null;
  request_body: string;

  // State
  status: RequestTokenStatus;
  responded_at: string | null;
  opened_at: string | null;
  expires_at: string;

  // Metadata
  sent_by: number | null;
  resend_message_id: string | null;
  created_at: string;
}

/**
 * Partner Response — one per form submission
 */
export interface PartnerResponse {
  id: number;
  request_token_id: number;
  stop_id: number;

  // Response
  action: ResponseAction;
  message: string | null;

  // Structured fields
  confirmed_date: string | null;
  confirmed_time: string | null;
  confirmed_party_size: number | null;
  confirmation_code: string | null;
  alternate_date: string | null;
  alternate_time: string | null;
  quoted_amount: number | null;

  // Source
  response_source: ResponseSource;
  responder_name: string | null;
  responder_email: string | null;
  responder_ip: string | null;

  created_at: string;
}

/**
 * Vendor Interaction — extended with request/response links
 */
export interface VendorInteraction {
  id: number;
  trip_proposal_stop_id: number;
  interaction_type: InteractionType;
  content: string;
  contacted_by: number | null;
  request_token_id: number | null;
  response_id: number | null;
  created_at: string;

  // Joined fields (when included)
  contacted_by_email?: string;
  contacted_by_name?: string;
}

/**
 * Inbound Email Log — for Resend inbound webhook routing
 */
export interface InboundEmailLog {
  id: number;
  from_address: string;
  to_address: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;

  // Routing
  routed_to_stop_id: number | null;
  routing_method: RoutingMethod | null;
  routed_at: string | null;
  routed_by: number | null;

  // Resend data
  resend_message_id: string | null;
  raw_headers: Record<string, unknown> | null;

  created_at: string;
}

// ============================================================================
// Conversation Thread (unified view)
// ============================================================================

/**
 * A single entry in a stop's conversation thread.
 * Combines vendor_interactions, partner_request_tokens, and partner_responses
 * into a single chronological view.
 */
export interface ConversationEntry {
  id: number;
  entry_type: 'interaction' | 'request' | 'response';
  interaction_type: InteractionType;
  content: string;
  created_at: string;

  // Author
  author_name: string | null;
  author_type: 'staff' | 'partner' | 'system';

  // Links
  request_token_id: number | null;
  response_id: number | null;

  // Response-specific structured data (only for entry_type: 'response')
  response_action: ResponseAction | null;
  confirmation_code: string | null;
  alternate_date: string | null;
  alternate_time: string | null;
  quoted_amount: number | null;
}

// ============================================================================
// DTOs — Create / Input
// ============================================================================

export interface CreateRequestInput {
  stop_id: number;
  proposal_id: number;
  partner_email: string;
  partner_name?: string;
  request_type: RequestType;
  request_subject?: string;
  request_body: string;
  sent_by: number;
  expires_in_days?: number;
}

export interface AddResponseInput {
  action: ResponseAction;
  message?: string;
  confirmed_date?: string;
  confirmed_time?: string;
  confirmed_party_size?: number;
  confirmation_code?: string;
  alternate_date?: string;
  alternate_time?: string;
  quoted_amount?: number;
  response_source?: ResponseSource;
  responder_name: string;
  responder_email?: string;
  responder_ip?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/** What the partner response page receives (safe subset — no internal data) */
export interface PartnerRequestPublicView {
  request_type: RequestType;
  request_subject: string | null;
  request_body: string;
  created_at: string;
  status: RequestTokenStatus;
  stop: {
    venue_name: string;
    stop_type: string;
    date: string | null;
    time: string | null;
    party_size: number;
  };
  previous_responses: Array<{
    action: ResponseAction;
    message: string | null;
    created_at: string;
  }>;
}

export interface ConversationThreadResponse {
  entries: ConversationEntry[];
  stop: {
    id: number;
    vendor_name: string | null;
    vendor_email: string | null;
    reservation_status: string;
  };
  active_requests: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

/** Schema for admin sending a request */
export const CreateRequestSchema = z.object({
  partner_email: z.string().email().max(255),
  partner_name: z.string().max(255).optional(),
  request_type: z.enum(REQUEST_TYPES),
  request_subject: z.string().max(500).optional(),
  request_body: z.string().min(1).max(10000),
  expires_in_days: z.number().int().min(1).max(90).optional(),
});

/** Schema for partner submitting a response (public form) */
export const AddResponseSchema = z.object({
  action: z.enum(RESPONSE_ACTIONS),
  message: z.string().max(5000).optional(),
  confirmation_code: z.string().max(100).optional(),
  confirmed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confirmed_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  confirmed_party_size: z.number().int().min(1).max(200).optional(),
  alternate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  alternate_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quoted_amount: z.number().min(0).max(100000).optional(),
  responder_name: z.string().min(1).max(255),
  responder_email: z.string().email().max(255).optional(),
});
