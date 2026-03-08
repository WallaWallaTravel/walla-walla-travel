import { z } from 'zod'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const EVENT_STATUSES = [
  'draft',
  'published',
  'cancelled',
  'past',
  'pending_review',
] as const

export const RECURRENCE_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const
export const RECURRENCE_END_TYPES = ['count', 'until_date'] as const

export const ORGANIZER_STATUSES = ['pending', 'active', 'suspended'] as const
export const TRUST_LEVELS = ['standard', 'trusted'] as const

// ============================================================================
// RECURRENCE RULE SCHEMA
// ============================================================================

export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  day_of_month: z.number().int().min(1).max(28).optional(),
  end_type: z.enum(RECURRENCE_END_TYPES),
  count: z.number().int().min(1).max(52).optional(),
  until_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// ============================================================================
// EVENT CRUD SCHEMAS
// ============================================================================

export const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  tag_ids: z.array(z.coerce.number().int().positive()).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date is required (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  is_all_day: z.boolean().optional(),
  venue_name: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional().nullable(),
  featured_image_url: z.string().url().max(500).optional().nullable(),
  gallery_urls: z.array(z.string().url()).optional().nullable(),
  is_free: z.boolean().optional(),
  price_min: z.coerce.number().min(0).optional().nullable(),
  price_max: z.coerce.number().min(0).optional().nullable(),
  ticket_url: z.string().url().max(500).optional().nullable(),
  organizer_name: z.string().max(255).optional().nullable(),
  organizer_website: z.string().max(500).optional().nullable(),
  organizer_email: z.string().email().max(255).optional().nullable(),
  organizer_phone: z.string().max(50).optional().nullable(),
  is_featured: z.boolean().optional(),
  feature_priority: z.coerce.number().int().min(0).optional(),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: RecurrenceRuleSchema.optional().nullable(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(EVENT_STATUSES).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
)

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>

// ============================================================================
// EVENT FILTERS SCHEMA
// ============================================================================

export const EventFiltersSchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isFree: z.coerce.boolean().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  isFeatured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type EventFiltersInput = z.infer<typeof EventFiltersSchema>

// ============================================================================
// ORGANIZER SCHEMAS
// ============================================================================

export const CreateOrganizerInvitationSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required').max(255),
  contact_name: z.string().min(1, 'Contact name is required').max(255),
  contact_email: z.string().email('Valid email required').max(255),
  contact_phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional(),
})

export type CreateOrganizerInvitationInput = z.infer<typeof CreateOrganizerInvitationSchema>

export const UpdateOrganizerProfileSchema = z.object({
  organization_name: z.string().min(1).max(255).optional(),
  contact_name: z.string().min(1).max(255).optional(),
  contact_phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
)

export type UpdateOrganizerProfileInput = z.infer<typeof UpdateOrganizerProfileSchema>

export const UpdateOrganizerStatusSchema = z.object({
  status: z.enum(ORGANIZER_STATUSES).optional(),
  trust_level: z.enum(TRUST_LEVELS).optional(),
  auto_approve: z.boolean().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' }
)

export type UpdateOrganizerStatusInput = z.infer<typeof UpdateOrganizerStatusSchema>

// ============================================================================
// ORGANIZER SETUP SCHEMA
// ============================================================================

export const CompleteOrganizerSetupSchema = z.object({
  setup_token: z.string().min(32, 'Invalid setup token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type CompleteOrganizerSetupInput = z.infer<typeof CompleteOrganizerSetupSchema>

// ============================================================================
// EVENT TAG SCHEMAS
// ============================================================================

export const CreateEventTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100),
  slug: z.string().min(1, 'Tag slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export type CreateEventTagInput = z.infer<typeof CreateEventTagSchema>

// ============================================================================
// EVENT ANALYTICS FILTER
// ============================================================================

export const EventAnalyticsFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
})

export type EventAnalyticsFilterInput = z.infer<typeof EventAnalyticsFilterSchema>
