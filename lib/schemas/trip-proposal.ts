import { z } from 'zod'
import {
  TRIP_TYPES,
  TRIP_PROPOSAL_STATUS,
  STOP_TYPES,
  RESERVATION_STATUS,
  INCLUSION_TYPES,
  PRICING_TYPES,
  RSVP_STATUS,
} from '@/lib/types/trip-proposal'

// ============================================================================
// Date helpers
// ============================================================================

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM')

// ============================================================================
// CreateProposalSchema — customer info, trip type, dates, party size
// ============================================================================

export const CreateProposalSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_email: z.string().email('Valid email required').optional().or(z.literal('')),
  customer_phone: z.string().max(50).optional().or(z.literal('')),
  customer_company: z.string().max(255).optional().or(z.literal('')),
  trip_type: z.enum(TRIP_TYPES, {
    error: 'Select a trip type',
  }).optional().default('wine_tour'),
  trip_title: z.string().max(255).optional(),
  party_size: z.coerce.number().int().min(1, 'Party size must be at least 1').max(100),
  start_date: dateString,
  end_date: dateString.optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  introduction: z.string().optional(),
  special_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  valid_until: dateString.optional(),
  discount_percentage: z.coerce.number().min(0).max(100).optional(),
  discount_reason: z.string().optional(),
  gratuity_percentage: z.coerce.number().int().min(0).max(100).optional(),
  tax_rate: z.coerce.number().min(0).max(1).optional(),
  deposit_percentage: z.coerce.number().int().min(0).max(100).optional(),
})

export type CreateProposalInput = z.infer<typeof CreateProposalSchema>

// ============================================================================
// UpdateProposalDetailsSchema — for the Details/Overview tab
// ============================================================================

export const UpdateProposalDetailsSchema = z.object({
  customer_name: z.string().min(1).max(255).optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().max(50).optional().or(z.literal('')),
  customer_company: z.string().max(255).optional().or(z.literal('')),
  trip_type: z.enum(TRIP_TYPES, {
    error: 'Select a trip type',
  }).optional(),
  trip_title: z.string().max(255).optional(),
  party_size: z.coerce.number().int().min(1).max(100).optional(),
  start_date: dateString.optional(),
  end_date: dateString.optional().nullable(),
  brand_id: z.coerce.number().int().positive().optional().nullable(),
  introduction: z.string().optional(),
  special_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  valid_until: dateString.optional().nullable(),
})

export type UpdateProposalDetailsInput = z.infer<typeof UpdateProposalDetailsSchema>

// ============================================================================
// UpsertDaySchema — for Days & Stops tab
// ============================================================================

export const UpsertDaySchema = z.object({
  id: z.number().int().positive().optional(), // present = update, absent = create
  date: dateString,
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
})

export type UpsertDayInput = z.infer<typeof UpsertDaySchema>

// ============================================================================
// UpsertStopSchema — for Days & Stops tab
// ============================================================================

export const UpsertStopSchema = z.object({
  id: z.number().int().positive().optional(), // present = update, absent = create
  stop_type: z.enum(STOP_TYPES, {
    error: 'Select a stop type',
  }),
  stop_order: z.coerce.number().int().min(0).optional(),
  winery_id: z.coerce.number().int().positive().optional().nullable(),
  restaurant_id: z.coerce.number().int().positive().optional().nullable(),
  hotel_id: z.coerce.number().int().positive().optional().nullable(),
  custom_name: z.string().max(255).optional(),
  custom_address: z.string().optional(),
  custom_description: z.string().optional(),
  scheduled_time: timeString.optional().nullable(),
  duration_minutes: z.coerce.number().int().min(0).optional().nullable(),
  // Legacy cost fields — kept for DB compatibility, always 0 for new proposals
  per_person_cost: z.coerce.number().min(0).optional().default(0),
  flat_cost: z.coerce.number().min(0).optional().default(0),
  cost_note: z.string().optional(), // informational only
  // Hotel-specific
  room_rate: z.coerce.number().min(0).optional(),
  num_rooms: z.coerce.number().int().min(0).optional(),
  nights: z.coerce.number().int().min(1).optional(),
  // Reservation
  reservation_status: z.enum(RESERVATION_STATUS, {
    error: 'Select a reservation status',
  }).optional().default('pending'),
  reservation_confirmation: z.string().max(100).optional(),
  reservation_contact: z.string().max(255).optional(),
  reservation_notes: z.string().optional(),
  // Notes
  client_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  driver_notes: z.string().optional(),
})

export type UpsertStopInput = z.infer<typeof UpsertStopSchema>

// ============================================================================
// ManageGuestSchema — add/remove/update guest
// ============================================================================

export const ManageGuestSchema = z.object({
  id: z.number().int().positive().optional(), // present = update, absent = create
  name: z.string().min(1, 'Guest name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  is_primary: z.boolean().optional().default(false),
  dietary_restrictions: z.string().optional(),
  accessibility_needs: z.string().optional(),
  special_requests: z.string().optional(),
  room_assignment: z.string().max(100).optional(),
  rsvp_status: z.enum(RSVP_STATUS, {
    error: 'Select an RSVP status',
  }).optional().default('pending'),
})

export type ManageGuestInput = z.infer<typeof ManageGuestSchema>

// ============================================================================
// UpsertInclusionSchema — service line item (name, pricing_type, amount, quantity)
// Billing is at SERVICE level, NOT stop level.
// ============================================================================

export const UpsertInclusionSchema = z.object({
  id: z.number().int().positive().optional(), // present = update, absent = create
  inclusion_type: z.enum(INCLUSION_TYPES, {
    error: 'Select an inclusion type',
  }),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0).optional().default(1),
  unit: z.string().max(50).optional(),
  unit_price: z.coerce.number().min(0).optional().default(0),
  total_price: z.coerce.number().min(0).optional().default(0),
  // pricing_type determines how the total is calculated:
  //   flat — fixed amount
  //   per_person — amount x party_size
  //   per_day — amount x quantity (days)
  pricing_type: z.enum(PRICING_TYPES, {
    error: 'Select a pricing type',
  }).optional().default('flat'),
  is_taxable: z.boolean().optional().default(true),
  sort_order: z.coerce.number().int().min(0).optional().default(0),
  show_on_proposal: z.boolean().optional().default(true),
  notes: z.string().optional(),
})

export type UpsertInclusionInput = z.infer<typeof UpsertInclusionSchema>

// ============================================================================
// UpdatePricingSchema — tax_rate, gratuity_percentage, discount, deposit_percentage
// Pricing formula: subtotal (from inclusions) -> discount -> tax (9.1%) -> gratuity -> total -> deposit
// NEVER calculate subtotal from stop costs.
// ============================================================================

export const UpdatePricingSchema = z.object({
  tax_rate: z.coerce.number().min(0).max(1).optional(),
  gratuity_percentage: z.coerce.number().int().min(0).max(100).optional(),
  discount_percentage: z.coerce.number().min(0).max(100).optional(),
  discount_reason: z.string().optional(),
  deposit_percentage: z.coerce.number().int().min(0).max(100).optional(),
})

export type UpdatePricingInput = z.infer<typeof UpdatePricingSchema>

// ============================================================================
// UpdateProposalStatusSchema — for status transitions
// ============================================================================

export const UpdateProposalStatusSchema = z.object({
  status: z.enum(TRIP_PROPOSAL_STATUS, {
    error: 'Select a valid status',
  }),
})

export type UpdateProposalStatusInput = z.infer<typeof UpdateProposalStatusSchema>

// ============================================================================
// ProposalFiltersSchema — for list queries
// ============================================================================

export const ProposalFiltersSchema = z.object({
  status: z.enum(TRIP_PROPOSAL_STATUS).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ProposalFiltersInput = z.infer<typeof ProposalFiltersSchema>
