/**
 * Zod validation schemas for API endpoints
 * These ensure type safety and data validation across all API routes
 */

import { z } from 'zod';

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

export const CreateBookingSchema = z.object({
  // Customer Information
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: z.string().email('Invalid email address'),
  customer_phone: z.string().optional(),
  
  // Tour Details
  tour_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  tour_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tour_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tour_duration_type: z.enum(['single', 'multi']).default('single'),
  party_size: z.number().int().min(1).max(14),
  tour_type: z.enum(['wine_tour', 'private_transportation', 'corporate', 'airport_transfer']).default('wine_tour'),
  
  // Locations
  pickup_location: z.string().min(1),
  dropoff_location: z.string().optional(),
  
  // Times
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  duration_hours: z.number().min(1).max(12).optional(),
  
  // Preferences
  wine_tour_preference: z.enum(['private', 'open_to_shared', 'open_to_offset']).optional(),
  special_requests: z.string().optional(),
  
  // Referral
  referral_source: z.enum([
    'google',
    'social_media',
    'friend_referral',
    'hotel_concierge',
    'wine_spectator',
    'ai_search',
    'other'
  ]).optional(),
  specific_social_media: z.string().optional(),
  specific_ai: z.string().optional(),
  hotel_concierge_name: z.string().optional(),
  referral_other_details: z.string().optional(),
  
  // Pricing
  base_price: z.number().optional(),
  total_price: z.number().optional(),
  deposit_amount: z.number().optional(),
  
  // Status
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).default('pending'),
  
  // Brand
  brand_id: z.number().optional(),
});

export const UpdateBookingSchema = CreateBookingSchema.partial();

export const BookingFilterSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  tour_type: z.enum(['wine_tour', 'private_transportation', 'corporate', 'airport_transfer']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customer_email: z.string().email().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// ITINERARY SCHEMAS
// ============================================================================

export const CreateItinerarySchema = z.object({
  booking_id: z.number().int(),
  pickup_location: z.string(),
  pickup_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  pickup_drive_time_minutes: z.number().int().min(0).optional(),
  dropoff_location: z.string(),
  estimated_dropoff_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  dropoff_drive_time_minutes: z.number().int().min(0).optional(),
  driver_notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

export const UpdateItinerarySchema = CreateItinerarySchema.partial().omit({ booking_id: true });

export const ItineraryStopSchema = z.object({
  winery_id: z.number().int(),
  stop_order: z.number().int().min(1),
  arrival_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  departure_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(15),
  drive_time_to_next_minutes: z.number().int().min(0),
  is_lunch_stop: z.boolean().default(false),
  reservation_confirmed: z.boolean().default(false),
  special_notes: z.string().nullable().optional(),
});

export const UpdateItineraryStopsSchema = z.object({
  stops: z.array(ItineraryStopSchema),
});

// ============================================================================
// PROPOSAL SCHEMAS
// ============================================================================

export const CreateProposalSchema = z.object({
  // Customer Information
  customer_name: z.string().min(2),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  
  // Event Details
  event_type: z.enum(['corporate', 'wedding', 'private_group', 'celebration', 'other']),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  party_size: z.number().int().min(1),
  duration_hours: z.number().min(1).max(12).optional(),
  
  // Preferences
  budget_range: z.string().optional(),
  preferred_wineries: z.array(z.string()).optional(),
  meal_preferences: z.string().optional(),
  special_requests: z.string().optional(),
  
  // Pricing
  base_price: z.number().optional(),
  total_price: z.number().optional(),
  
  // Status
  status: z.enum(['draft', 'sent', 'accepted', 'declined']).default('draft'),
});

export const UpdateProposalSchema = CreateProposalSchema.partial();

// ============================================================================
// WINERY SCHEMAS
// ============================================================================

export const CreateWinerySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  address: z.string().min(1),
  city: z.string().default('Walla Walla'),
  state: z.string().length(2).default('WA'),
  zip_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  tasting_fee: z.number().min(0).default(0),
  reservation_required: z.boolean().default(false),
  average_visit_duration: z.number().int().min(30).default(75),
  specialties: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const UpdateWinerySchema = CreateWinerySchema.partial();

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'driver', 'office']).default('office'),
  phone: z.string().optional(),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const CreatePaymentIntentSchema = z.object({
  booking_id: z.number().int().optional(),
  reservation_id: z.number().int().optional(),
  amount: z.number().positive(),
  description: z.string().optional(),
  customer_email: z.string().email(),
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const DateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ============================================================================
// SHARED TOUR SCHEMAS
// ============================================================================

/**
 * Schema for creating a shared tour ticket
 * Used for public booking endpoint
 */
export const CreateSharedTourTicketSchema = z.object({
  tour_id: z.string().uuid('Invalid tour ID format'),
  ticket_count: z.number().int().min(1, 'At least 1 ticket required').max(14, 'Maximum 14 tickets per booking'),
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  customer_email: z.string().email('Invalid email address').max(255, 'Email too long'),
  customer_phone: z.string().regex(/^[\d\s()+-]+$/, 'Invalid phone number format').max(20, 'Phone number too long').optional(),
  guest_names: z.array(z.string().min(1).max(100)).max(14).optional(),
  includes_lunch: z.boolean().default(true),
  lunch_selection: z.string().max(100).optional(),
  guest_lunch_selections: z.array(z.object({
    guest_name: z.string().min(1).max(100),
    selection: z.string().min(1).max(100),
  })).max(14).optional(),
  dietary_restrictions: z.string().max(500, 'Dietary restrictions text too long').optional(),
  special_requests: z.string().max(1000, 'Special requests text too long').optional(),
  referral_source: z.string().max(100).optional(),
  promo_code: z.string().max(50).optional(),
  hotel_partner_id: z.string().uuid().optional(),
  booked_by_hotel: z.boolean().default(false),
});

/**
 * Schema for creating a shared tour
 * Used for admin tour creation endpoint
 */
export const CreateSharedTourSchema = z.object({
  tour_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').optional(),
  duration_hours: z.number().min(1).max(12).optional(),
  max_guests: z.number().int().min(1).max(50).optional(),
  min_guests: z.number().int().min(1).max(50).optional(),
  base_price_per_person: z.number().min(0).optional(),
  lunch_price_per_person: z.number().min(0).optional(),
  lunch_included_default: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  meeting_location: z.string().max(500).optional(),
  wineries_preview: z.array(z.string()).optional(),
  booking_cutoff_hours: z.number().int().min(0).max(168).optional(),
  is_published: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  vehicle_id: z.number().int().optional(),
  driver_id: z.number().int().optional(),
  auto_assign_vehicle: z.boolean().optional(),
  require_vehicle: z.boolean().optional(),
});

export const UpdateSharedTourSchema = CreateSharedTourSchema.partial();

/**
 * Schema for tour ID path parameter validation
 */
export const TourIdParamSchema = z.object({
  tour_id: z.string().uuid('Invalid tour ID format'),
});

/**
 * Schema for ticket ID path parameter validation
 */
export const TicketIdParamSchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID format'),
});

// ============================================================================
// TYPE EXPORTS (inferred from schemas)
// ============================================================================

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;
export type BookingFilter = z.infer<typeof BookingFilterSchema>;

export type CreateItineraryInput = z.infer<typeof CreateItinerarySchema>;
export type UpdateItineraryInput = z.infer<typeof UpdateItinerarySchema>;
export type ItineraryStop = z.infer<typeof ItineraryStopSchema>;

export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

export type CreateWineryInput = z.infer<typeof CreateWinerySchema>;
export type UpdateWineryInput = z.infer<typeof UpdateWinerySchema>;

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;

export type CreateSharedTourTicketInput = z.infer<typeof CreateSharedTourTicketSchema>;
export type CreateSharedTourInput = z.infer<typeof CreateSharedTourSchema>;
export type UpdateSharedTourInput = z.infer<typeof UpdateSharedTourSchema>;




