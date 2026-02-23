/**
 * Proposal Notes Types
 *
 * @module lib/types/proposal-notes
 * @description Type definitions for the proposal notes/communication system.
 * Supports both general message threads and contextual notes attached to
 * specific items (days, stops, guests, lunch orders).
 */

import { z } from 'zod';

// ============================================================================
// Enums & Constants
// ============================================================================

export const NOTE_AUTHOR_TYPES = ['client', 'staff'] as const;
export type NoteAuthorType = (typeof NOTE_AUTHOR_TYPES)[number];

export const NOTE_CONTEXT_TYPES = ['day', 'stop', 'guest', 'lunch'] as const;
export type NoteContextType = (typeof NOTE_CONTEXT_TYPES)[number];

// ============================================================================
// Core Interface
// ============================================================================

export interface ProposalNote {
  id: number;
  trip_proposal_id: number;
  author_type: NoteAuthorType;
  author_name: string;
  content: string;
  context_type: NoteContextType | null;
  context_id: number | null;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// Create / Query DTOs
// ============================================================================

export interface CreateNoteInput {
  author_type: NoteAuthorType;
  author_name: string;
  content: string;
  context_type?: NoteContextType;
  context_id?: number;
}

export interface NoteFilter {
  trip_proposal_id: number;
  context_type?: NoteContextType;
  context_id?: number;
  general_only?: boolean;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateNoteSchema = z.object({
  author_name: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  context_type: z.enum(NOTE_CONTEXT_TYPES).optional(),
  context_id: z.number().int().positive().optional(),
});

/** Schema for client-submitted notes (author_type always 'client') */
export const ClientNoteSchema = CreateNoteSchema.extend({
  author_name: z.string().min(1).max(255),
});

/** Schema for staff-submitted notes (author_type always 'staff') */
export const StaffNoteSchema = CreateNoteSchema.extend({
  author_name: z.string().min(1).max(255),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface ProposalNotesResponse {
  notes: ProposalNote[];
  unread_count: number;
}
