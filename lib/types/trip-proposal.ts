/**
 * Trip Proposal Types
 *
 * @module lib/types/trip-proposal
 * @description Type definitions for the comprehensive trip proposal system.
 * Supports multi-day trips with hotels, restaurants, wineries, and full pricing.
 */

import { z } from 'zod';

// ============================================================================
// Enums & Constants
// ============================================================================

export const TRIP_PROPOSAL_STATUS = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'converted',
] as const;

export type TripProposalStatus = (typeof TRIP_PROPOSAL_STATUS)[number];

export const PLANNING_PHASES = ['proposal', 'active_planning', 'finalized'] as const;
export type PlanningPhase = (typeof PLANNING_PHASES)[number];

export const TRIP_TYPES = [
  'wine_tour',
  'wine_group',
  'celebration',
  'corporate',
  'wedding',
  'anniversary',
  'family',
  'romantic',
  'custom',
] as const;

export type TripType = (typeof TRIP_TYPES)[number];

export const STOP_TYPES = [
  'pickup',
  'winery',
  'restaurant',
  'hotel_checkin',
  'hotel_checkout',
  'activity',
  'dropoff',
  'custom',
] as const;

export type StopType = (typeof STOP_TYPES)[number];

export const RESERVATION_STATUS = [
  'pending',
  'requested',
  'confirmed',
  'waitlist',
  'cancelled',
  'na',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[number];

export const INCLUSION_TYPES = [
  'transportation',
  'chauffeur',
  'gratuity',
  'planning_fee',
  'arranged_tasting',
  'custom',
] as const;

export const PRICING_TYPES = ['flat', 'per_person', 'per_day'] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

export type InclusionType = (typeof INCLUSION_TYPES)[number];

export const RSVP_STATUS = ['pending', 'confirmed', 'declined', 'maybe'] as const;
export type RsvpStatus = (typeof RSVP_STATUS)[number];

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Trip Proposal - Main entity
 */
export interface TripProposal {
  id: number;
  proposal_number: string;
  status: TripProposalStatus;
  access_token: string;
  planning_phase: PlanningPhase;

  // Customer info
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_company: string | null;
  customer_id: number | null;

  // Trip details
  trip_type: TripType;
  trip_title: string | null;
  party_size: number;
  start_date: string; // ISO date
  end_date: string | null; // ISO date, null for single-day

  // Pricing
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  discount_reason: string | null;
  taxes: number;
  tax_rate: number;
  gratuity_percentage: number;
  gratuity_amount: number;
  total: number;

  // Planning fee
  planning_fee_mode: 'flat' | 'percentage';
  planning_fee_percentage: number;

  // Deposit
  deposit_percentage: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_payment_id: number | null;
  skip_deposit_on_accept: boolean;

  // Per-guest billing
  individual_billing_enabled: boolean;
  has_sponsored_guest: boolean;
  payment_deadline: string | null;
  reminders_paused: boolean;

  // Balance
  balance_due: number;
  balance_paid: boolean;
  balance_paid_at: string | null;
  balance_payment_id: number | null;

  // Validity
  valid_until: string | null;

  // Branding
  brand_id: number | null;

  // Content
  introduction: string | null;
  special_notes: string | null;
  internal_notes: string | null;

  // Conversion
  converted_to_booking_id: number | null;
  converted_at: string | null;

  // View tracking
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;

  // Acceptance
  accepted_at: string | null;
  accepted_signature: string | null;
  accepted_ip: string | null;

  // Sent tracking
  sent_at: string | null;

  // Metadata
  created_by: number | null;
  created_at: string;
  updated_at: string;

  // Relations (when included)
  days?: TripProposalDay[];
  guests?: TripProposalGuest[];
  inclusions?: TripProposalInclusion[];
  activity?: TripProposalActivity[];
  brand?: { id: number; name: string; code: string } | null;
}

/**
 * Trip Proposal Day
 */
export interface TripProposalDay {
  id: number;
  trip_proposal_id: number;
  day_number: number;
  date: string; // ISO date
  title: string | null;
  description: string | null;
  subtotal: number;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  stops?: TripProposalStop[];
}

/**
 * Trip Proposal Stop
 */
export interface TripProposalStop {
  id: number;
  trip_proposal_day_id: number;
  stop_order: number;
  stop_type: StopType;

  // Venue references
  winery_id: number | null;
  restaurant_id: number | null;
  hotel_id: number | null;

  // Custom stop info
  custom_name: string | null;
  custom_address: string | null;
  custom_description: string | null;

  // Scheduling
  scheduled_time: string | null; // HH:MM format
  duration_minutes: number | null;

  // Pricing (legacy — new proposals use service line items)
  per_person_cost: number;
  flat_cost: number;
  cost_note: string | null;

  // Hotel specific
  room_rate: number;
  num_rooms: number;
  nights: number;

  // Reservation
  reservation_status: ReservationStatus;
  reservation_confirmation: string | null;
  reservation_contact: string | null;
  reservation_notes: string | null;

  // Notes
  client_notes: string | null;
  internal_notes: string | null;
  driver_notes: string | null;

  // Vendor tracking
  vendor_name: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  quote_status: 'none' | 'requested' | 'quoted' | 'accepted' | 'confirmed' | 'paid';
  quoted_amount: number | null;
  quote_notes: string | null;

  created_at: string;
  updated_at: string;

  // Relations (when included)
  winery?: {
    id: number;
    name: string;
    city: string;
    slug?: string;
  } | null;
  restaurant?: {
    id: number;
    name: string;
    cuisine_type: string;
    address: string;
  } | null;
  hotel?: {
    id: number;
    name: string;
    type: string;
    address: string;
  } | null;
}

/**
 * Trip Proposal Guest
 */
export const GUEST_PAYMENT_STATUS = ['unpaid', 'partial', 'paid', 'refunded'] as const;
export type GuestPaymentStatus = (typeof GUEST_PAYMENT_STATUS)[number];

export const PAYMENT_TYPES = ['guest_share', 'group_payment', 'admin_adjustment', 'refund'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export interface TripProposalGuest {
  id: number;
  trip_proposal_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  special_requests: string | null;
  room_assignment: string | null;
  rsvp_status: RsvpStatus;
  rsvp_responded_at: string | null;
  guest_access_token: string;
  is_registered: boolean;
  // Billing fields
  is_sponsored: boolean;
  amount_owed: number;
  amount_owed_override: number | null;
  amount_paid: number;
  payment_status: GuestPaymentStatus;
  payment_paid_at: string | null;
  payment_group_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Guest Payment — individual payment transaction record
 */
export interface GuestPayment {
  id: number;
  trip_proposal_id: number;
  guest_id: number;
  amount: number;
  stripe_payment_intent_id: string | null;
  payment_type: PaymentType;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  paid_by_guest_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Guest Payment Group — couples/subgroups sharing a payment link
 */
export interface GuestPaymentGroup {
  id: string;
  trip_proposal_id: number;
  group_name: string;
  group_access_token: string;
  created_at: string;
  updated_at: string;
}

/**
 * Vendor Interaction Log Entry
 */
export type VendorInteractionType = 'note' | 'email_sent' | 'email_received' | 'phone_call' | 'quote_received';

export interface VendorInteraction {
  id: number;
  trip_proposal_stop_id: number;
  interaction_type: VendorInteractionType;
  content: string;
  contacted_by: number | null;
  created_at: string;
}

/**
 * Trip Proposal Inclusion (line items)
 */
export interface TripProposalInclusion {
  id: number;
  trip_proposal_id: number;
  inclusion_type: InclusionType;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  pricing_type: PricingType;
  is_taxable: boolean;
  tax_included_in_price: boolean;
  sort_order: number;
  show_on_proposal: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Trip Proposal Activity Log
 */
export interface TripProposalActivity {
  id: number;
  trip_proposal_id: number;
  action: string;
  description: string | null;
  actor_type: 'staff' | 'customer' | 'system' | null;
  actor_name: string | null;
  actor_user_id: number | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// Full Detail Types (with all relations)
// ============================================================================

/**
 * Trip Proposal with all related data
 */
export interface TripProposalFull extends TripProposal {
  days: (TripProposalDay & {
    stops: (TripProposalStop & {
      winery?: { id: number; name: string; city: string; slug?: string } | null;
      restaurant?: { id: number; name: string; cuisine_type: string; address: string } | null;
      hotel?: { id: number; name: string; type: string; address: string } | null;
    })[];
  })[];
  guests: TripProposalGuest[];
  inclusions: TripProposalInclusion[];
  activity: TripProposalActivity[];
  brand?: { id: number; name: string; code: string } | null;
}

// ============================================================================
// Create/Update DTOs
// ============================================================================

/**
 * Create Trip Proposal Input
 */
export interface CreateTripProposalInput {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
  trip_type?: TripType;
  trip_title?: string;
  party_size: number;
  start_date: string;
  end_date?: string;
  brand_id?: number;
  introduction?: string;
  special_notes?: string;
  internal_notes?: string;
  valid_until?: string;
  discount_percentage?: number;
  discount_reason?: string;
  gratuity_percentage?: number;
  tax_rate?: number;
  deposit_percentage?: number;
}

/**
 * Update Trip Proposal Input
 */
export interface UpdateTripProposalInput extends Partial<CreateTripProposalInput> {
  status?: TripProposalStatus;
  planning_phase?: PlanningPhase;
  skip_deposit_on_accept?: boolean;
  planning_fee_mode?: 'flat' | 'percentage';
  planning_fee_percentage?: number;
}

/**
 * Add Day Input
 */
export interface AddDayInput {
  date: string;
  title?: string;
  description?: string;
  notes?: string;
  internal_notes?: string;
}

/**
 * Add Stop Input
 */
export interface AddStopInput {
  stop_type: StopType;
  stop_order?: number;
  winery_id?: number;
  restaurant_id?: number;
  hotel_id?: number;
  custom_name?: string;
  custom_address?: string;
  custom_description?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost?: number;
  flat_cost?: number;
  cost_note?: string;
  room_rate?: number;
  num_rooms?: number;
  nights?: number;
  reservation_status?: ReservationStatus;
  client_notes?: string;
  internal_notes?: string;
  driver_notes?: string;
}

/**
 * Add Guest Input
 */
export interface AddGuestInput {
  name: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  special_requests?: string;
  room_assignment?: string;
}

/**
 * Add Inclusion Input
 */
export interface AddInclusionInput {
  inclusion_type: InclusionType;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  pricing_type?: PricingType;
  is_taxable?: boolean;
  tax_included_in_price?: boolean;
  sort_order?: number;
  show_on_proposal?: boolean;
  notes?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateTripProposalSchema = z.object({
  customer_name: z.string().min(1).max(255),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().max(50).optional().or(z.literal('')),
  customer_company: z.string().max(255).optional().or(z.literal('')),
  trip_type: z.enum(TRIP_TYPES).optional().default('wine_tour'),
  trip_title: z.string().max(255).optional(),
  party_size: z.number().int().min(1).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  brand_id: z.number().int().positive().optional(),
  introduction: z.string().optional(),
  special_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_reason: z.string().optional(),
  gratuity_percentage: z.number().min(0).max(100).optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  deposit_percentage: z.number().int().min(0).max(100).optional(),
  skip_deposit_on_accept: z.boolean().optional(),
});

export const UpdateTripProposalSchema = CreateTripProposalSchema.partial().extend({
  status: z.enum(TRIP_PROPOSAL_STATUS).optional(),
  planning_phase: z.enum(PLANNING_PHASES).optional(),
  planning_fee_mode: z.enum(['flat', 'percentage']).optional(),
  planning_fee_percentage: z.number().min(0).max(100).optional(),
});

export const AddDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

export const AddStopSchema = z.object({
  stop_type: z.enum(STOP_TYPES),
  stop_order: z.number().int().min(0).optional(),
  winery_id: z.number().int().positive().optional(),
  restaurant_id: z.number().int().positive().optional(),
  hotel_id: z.number().int().positive().optional(),
  custom_name: z.string().max(255).optional(),
  custom_address: z.string().optional(),
  custom_description: z.string().optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().min(0).optional(),
  per_person_cost: z.number().min(0).optional(),
  flat_cost: z.number().min(0).optional(),
  cost_note: z.string().optional(),
  room_rate: z.number().min(0).optional(),
  num_rooms: z.number().int().min(0).optional(),
  nights: z.number().int().min(1).optional(),
  reservation_status: z.enum(RESERVATION_STATUS).optional(),
  client_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  driver_notes: z.string().optional(),
});

export const AddGuestSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  is_primary: z.boolean().optional(),
  dietary_restrictions: z.string().optional(),
  accessibility_needs: z.string().optional(),
  special_requests: z.string().optional(),
  room_assignment: z.string().max(100).optional(),
});

export const AddInclusionSchema = z.object({
  inclusion_type: z.enum(INCLUSION_TYPES),
  description: z.string().min(1),
  quantity: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  unit_price: z.number().min(0).optional(),
  total_price: z.number().min(0).optional(),
  pricing_type: z.enum(PRICING_TYPES).optional(),
  is_taxable: z.boolean().optional(),
  tax_included_in_price: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  show_on_proposal: z.boolean().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface TripProposalListResponse {
  proposals: TripProposal[];
  total: number;
  limit: number;
  offset: number;
}

export interface TripProposalPricingBreakdown {
  stops_subtotal: number;
  inclusions_subtotal: number;
  services_subtotal: number;
  subtotal: number;
  discount_amount: number;
  subtotal_after_discount: number;
  taxes: number;
  gratuity_amount: number;
  total: number;
  deposit_amount: number;
  balance_due: number;
}

// ============================================================================
// Conversion Types (for booking/itinerary generation)
// ============================================================================

export interface ConvertToBookingResult {
  booking_id: number;
  booking_number: string;
  success: boolean;
}

export interface GenerateItineraryResult {
  itinerary_id: number;
  booking_id: number;
  stops_created: number;
  success: boolean;
}
