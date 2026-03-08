import { z } from 'zod'
import { noDisposableEmail } from '@/lib/utils/email-validation'

// ============================================================================
// PUBLIC WINERY SCHEMAS
// ============================================================================

export const WineryFiltersSchema = z.object({
  search: z.string().optional(),
  reservationRequired: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
})

export type WineryFilters = z.infer<typeof WineryFiltersSchema>

// ============================================================================
// PUBLIC SHARED TOURS SCHEMAS
// ============================================================================

export const SharedTourFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type SharedTourFilters = z.infer<typeof SharedTourFiltersSchema>

export const SharedTourBookingSchema = z.object({
  tourId: z.coerce.number().int().positive(),
  ticketCount: z.number().int().min(1).max(14),
  customerName: z.string().min(1, 'Name is required').max(255),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().max(50).optional(),
  guestNames: z.array(z.string().max(255)).optional(),
  includesLunch: z.boolean().default(true),
  lunchSelection: z.string().max(100).optional(),
  guestLunchSelections: z
    .array(z.object({ guestName: z.string(), selection: z.string() }))
    .optional(),
  dietaryRestrictions: z.string().max(1000).optional(),
  specialRequests: z.string().max(2000).optional(),
  referralSource: z.string().max(100).optional(),
})

export type SharedTourBooking = z.infer<typeof SharedTourBookingSchema>

// ============================================================================
// PUBLIC EVENTS SCHEMAS
// ============================================================================

export const EventFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().max(200).optional(),
  tags: z.string().optional(),
  isFree: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

export type PublicEventFilters = z.infer<typeof EventFiltersSchema>

// ============================================================================
// CONTACT FORM SCHEMA
// ============================================================================

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address').superRefine(noDisposableEmail),
  phone: z.string().max(50).optional(),
  dates: z.string().max(255).optional(),
  groupSize: z.string().max(50).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  service: z.string().optional(),
})

export type ContactFormData = z.infer<typeof ContactFormSchema>

// ============================================================================
// TRIP PROPOSAL PUBLIC VIEW SCHEMA
// ============================================================================

export const TripProposalAccessSchema = z.object({
  proposalNumber: z.string().min(1).max(30),
})

export type TripProposalAccess = z.infer<typeof TripProposalAccessSchema>
