import { z } from 'zod';

// ============================================================================
// Trip Type Enums
// ============================================================================

export const tripTypeSchema = z.enum([
  'wine_tour',
  'bachelorette',
  'corporate',
  'wedding',
  'anniversary',
  'custom',
]);

export const tripStatusSchema = z.enum([
  'draft',
  'planning',
  'ready_to_share',
  'shared',
  'handed_off',
  'booked',
  'completed',
  'cancelled',
]);

export const stopTypeSchema = z.enum([
  'winery',
  'restaurant',
  'activity',
  'accommodation',
  'transportation',
  'custom',
]);

export const stopStatusSchema = z.enum([
  'suggested',
  'confirmed',
  'booked',
  'cancelled',
]);

export const rsvpStatusSchema = z.enum([
  'pending',
  'invited',
  'attending',
  'declined',
  'maybe',
]);

// ============================================================================
// Trip Schemas
// ============================================================================

export const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  trip_type: tripTypeSchema.optional().default('wine_tour'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  dates_flexible: z.boolean().optional().default(true),
  expected_guests: z.number().int().min(1).max(100).optional().default(2),
  owner_name: z.string().max(255).optional(),
  owner_email: z.string().email('Invalid email').max(255).optional(),
  owner_phone: z.string().max(50).optional(),
  preferences: z.object({
    transportation: z.string().optional(),
    pace: z.string().optional(),
    budget: z.string().optional(),
  }).optional(),
});

export const updateTripSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  trip_type: tripTypeSchema.optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  dates_flexible: z.boolean().optional(),
  expected_guests: z.number().int().min(1).max(100).optional(),
  owner_name: z.string().max(255).optional().nullable(),
  owner_email: z.string().email().max(255).optional().nullable(),
  owner_phone: z.string().max(50).optional().nullable(),
  is_public: z.boolean().optional(),
  allow_guest_suggestions: z.boolean().optional(),
  allow_guest_rsvp: z.boolean().optional(),
  preferences: z.object({
    transportation: z.string().optional(),
    pace: z.string().optional(),
    budget: z.string().optional(),
  }).optional(),
  status: tripStatusSchema.optional(),
});

// ============================================================================
// Stop Schemas
// ============================================================================

export const addStopSchema = z.object({
  stop_type: stopTypeSchema,
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  winery_id: z.number().int().positive().optional(),
  day_number: z.number().int().min(1).optional().default(1),
  planned_arrival: z.string().max(10).optional(),
  planned_departure: z.string().max(10).optional(),
  duration_minutes: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
  special_requests: z.string().max(2000).optional(),
  estimated_cost_per_person: z.number().min(0).optional(),
});

// ============================================================================
// Guest Schemas
// ============================================================================

export const addGuestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  is_organizer: z.boolean().optional().default(false),
  dietary_restrictions: z.string().max(500).optional(),
  accessibility_needs: z.string().max(500).optional(),
});

export const updateGuestRsvpSchema = z.object({
  rsvp_status: rsvpStatusSchema,
  rsvp_notes: z.string().max(1000).optional(),
});

// ============================================================================
// Handoff Schema
// ============================================================================

export const requestHandoffSchema = z.object({
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Magic Link Schema
// ============================================================================

export const sendMagicLinkSchema = z.object({
  email: z.string().email('Valid email required'),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const tripsByEmailSchema = z.object({
  email: z.string().email('Valid email required'),
});

// ============================================================================
// Types
// ============================================================================

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddStopInput = z.infer<typeof addStopSchema>;
export type AddGuestInput = z.infer<typeof addGuestSchema>;
export type UpdateGuestRsvpInput = z.infer<typeof updateGuestRsvpSchema>;
export type RequestHandoffInput = z.infer<typeof requestHandoffSchema>;
export type SendMagicLinkInput = z.infer<typeof sendMagicLinkSchema>;
