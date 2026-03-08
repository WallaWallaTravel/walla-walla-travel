import { z } from 'zod'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const PARTNER_BUSINESS_TYPES = [
  'winery',
  'hotel',
  'restaurant',
  'activity',
  'catering',
  'service',
  'other',
] as const

export const PARTNER_STATUSES = ['pending', 'active', 'suspended'] as const

// ============================================================================
// PARTNER PROFILE SCHEMAS
// ============================================================================

export const UpdatePartnerProfileSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(255).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
)

export type UpdatePartnerProfileInput = z.infer<typeof UpdatePartnerProfileSchema>

// ============================================================================
// PARTNER INVITATION SCHEMA
// ============================================================================

export const CreatePartnerInvitationSchema = z.object({
  email: z.string().email('Valid email required'),
  business_name: z.string().min(1, 'Business name is required').max(255),
  business_type: z.enum(PARTNER_BUSINESS_TYPES, {
    error: 'Select a business type',
  }),
  winery_id: z.coerce.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
})

export type CreatePartnerInvitationInput = z.infer<typeof CreatePartnerInvitationSchema>

// ============================================================================
// PARTNER SETUP SCHEMA
// ============================================================================

export const CompletePartnerSetupSchema = z.object({
  setup_token: z.string().min(32, 'Invalid setup token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type CompletePartnerSetupInput = z.infer<typeof CompletePartnerSetupSchema>

// ============================================================================
// HOTEL PARTNER SCHEMAS
// ============================================================================

export const CreateHotelPartnerSchema = z.object({
  name: z.string().min(1, 'Hotel name is required').max(255),
  email: z.string().email('Valid email required').max(255),
  contact_name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateHotelPartnerInput = z.infer<typeof CreateHotelPartnerSchema>

export const UpdateHotelPartnerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  contact_name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
)

export type UpdateHotelPartnerInput = z.infer<typeof UpdateHotelPartnerSchema>

// ============================================================================
// PARTNER BOOKING REQUEST RESPONSE SCHEMA
// ============================================================================

export const PARTNER_RESPONSE_ACTIONS = ['confirm', 'modify', 'decline', 'message'] as const

export const PartnerResponseSchema = z.object({
  action: z.enum(PARTNER_RESPONSE_ACTIONS, { error: 'Select a response action' }),
  message: z.string().max(2000).optional(),
  responder_name: z.string().min(1, 'Name is required').max(255),
  responder_email: z.string().email().max(255).optional(),
  confirmed_date: z.string().optional(),
  confirmed_time: z.string().optional(),
  confirmed_party_size: z.coerce.number().int().positive().optional(),
  confirmation_code: z.string().max(100).optional(),
  alternate_date: z.string().optional(),
  alternate_time: z.string().optional(),
  quoted_amount: z.coerce.number().min(0).optional(),
})

export type PartnerResponseInput = z.infer<typeof PartnerResponseSchema>

// ============================================================================
// HOTEL GUEST BOOKING SCHEMA
// ============================================================================

export const BookGuestForHotelSchema = z.object({
  tour_id: z.string().min(1, 'Tour is required'),
  customer_name: z.string().min(1, 'Guest name is required').max(255),
  customer_email: z.string().email('Valid email required'),
  customer_phone: z.string().max(50).optional(),
  ticket_count: z.coerce.number().int().min(1, 'At least 1 ticket required'),
  guest_names: z.array(z.string()).optional(),
  includes_lunch: z.boolean().optional(),
  lunch_selection: z.string().max(255).optional(),
  dietary_restrictions: z.string().max(500).optional(),
  special_requests: z.string().max(1000).optional(),
})

export type BookGuestForHotelInput = z.infer<typeof BookGuestForHotelSchema>
