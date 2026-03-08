/**
 * Zod Schemas for Guest-Facing Operations
 *
 * Covers: join trip, guest registration, guest updates, lunch ordering,
 * deposit payment confirmation, and announcement preferences.
 */

import { z } from 'zod';
import { noDisposableEmail } from '@/lib/utils/email-validation';

// ─── Join Trip (Self-Registration via shareable link) ─────────────────────────

export const JoinTripSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z
    .string()
    .email('Valid email required')
    .superRefine(noDisposableEmail),
  phone: z.string().max(50).optional().or(z.literal('')),
});

export type JoinTripInput = z.infer<typeof JoinTripSchema>;

// ─── Guest Registration (existing guest fills in their info) ──────────────────

export const RegisterGuestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z
    .string()
    .email('Valid email required')
    .superRefine(noDisposableEmail),
  phone: z.string().max(50).optional().or(z.literal('')),
});

export type RegisterGuestInput = z.infer<typeof RegisterGuestSchema>;

// ─── Guest Details Update (dietary, accessibility, special requests) ──────────

export const UpdateGuestDetailsSchema = z.object({
  dietary_restrictions: z.string().max(1000).nullable().optional(),
  accessibility_needs: z.string().max(1000).nullable().optional(),
  special_requests: z.string().max(2000).nullable().optional(),
});

export type UpdateGuestDetailsInput = z.infer<typeof UpdateGuestDetailsSchema>;

// ─── Resolve Guest by Token ───────────────────────────────────────────────────

export const ResolveGuestSchema = z.object({
  guest_token: z.string().min(1).max(255),
});

export type ResolveGuestInput = z.infer<typeof ResolveGuestSchema>;

// ─── Confirm Payment (deposit or guest share) ─────────────────────────────────

export const ConfirmPaymentSchema = z.object({
  payment_intent_id: z.string().min(1, 'payment_intent_id is required'),
  guest_access_token: z.string().min(1, 'guest_access_token is required').optional(),
});

export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;

// ─── Client Note ──────────────────────────────────────────────────────────────

export const ClientNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
  author_name: z.string().min(1, 'Author name is required').max(255),
  context_type: z.enum(['general', 'stop', 'day', 'logistics']).optional(),
  context_id: z.number().int().positive().optional(),
});

export type ClientNoteInput = z.infer<typeof ClientNoteSchema>;

// ─── Individual Lunch Order ───────────────────────────────────────────────────

export const IndividualLunchOrderItemSchema = z.object({
  item_id: z.number().int().positive(),
  name: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

export const IndividualLunchOrderSchema = z.object({
  order_id: z.number().int().positive(),
  guest_id: z.number().int().positive(),
  items: z.array(IndividualLunchOrderItemSchema).min(1),
  notes: z.string().max(500).optional(),
});

export type IndividualLunchOrderInput = z.infer<typeof IndividualLunchOrderSchema>;

// ─── Announcement Preferences ─────────────────────────────────────────────────

export const UpdateAnnouncementPrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
});

export type UpdateAnnouncementPrefsInput = z.infer<typeof UpdateAnnouncementPrefsSchema>;
