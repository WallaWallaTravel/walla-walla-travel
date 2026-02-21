/**
 * Event Validation Schemas
 *
 * Zod schemas for validating event-related inputs.
 */

import { z } from 'zod';

// ============================================================================
// Recurrence Rule Schema
// ============================================================================

const recurrenceFrequencySchema = z.enum(['weekly', 'biweekly', 'monthly']);
const recurrenceEndTypeSchema = z.enum(['count', 'until_date']);

export const recurrenceRuleSchema = z.object({
  frequency: recurrenceFrequencySchema,
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  day_of_month: z.number().int().min(1).max(28).optional(),
  end_type: recurrenceEndTypeSchema,
  count: z.number().int().min(1).max(52).optional(),
  until_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
}).superRefine((data, ctx) => {
  // days_of_week required for weekly/biweekly
  if ((data.frequency === 'weekly' || data.frequency === 'biweekly') &&
      (!data.days_of_week || data.days_of_week.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Days of week are required for weekly/biweekly recurrence',
      path: ['days_of_week'],
    });
  }

  // day_of_month required for monthly
  if (data.frequency === 'monthly' && !data.day_of_month) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Day of month is required for monthly recurrence',
      path: ['day_of_month'],
    });
  }

  // count required when end_type is 'count'
  if (data.end_type === 'count' && !data.count) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Count is required when end type is "count"',
      path: ['count'],
    });
  }

  // until_date required when end_type is 'until_date'
  if (data.end_type === 'until_date' && !data.until_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date is required when end type is "until_date"',
      path: ['until_date'],
    });
  }
});

/**
 * Slug format validation
 */
const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must not exceed 255 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

/**
 * Date string validation (YYYY-MM-DD)
 */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Time string validation (HH:MM or HH:MM:SS)
 */
const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Time must be in HH:MM format');

/**
 * Event status enum
 */
const eventStatusSchema = z.enum(
  ['draft', 'published', 'cancelled', 'past', 'pending_review'],
  { message: 'Status must be one of: draft, published, cancelled, past, pending_review' }
);

/**
 * Create event validation
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .trim(),
  short_description: z
    .string()
    .max(200, 'Short description must not exceed 200 characters')
    .trim()
    .optional()
    .nullable(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .trim(),

  // Categorization
  category_id: z.number().int().positive('Category ID must be a positive integer').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional().nullable(),

  // Date/Time
  start_date: dateSchema,
  end_date: dateSchema.optional().nullable(),
  start_time: timeSchema.optional().nullable(),
  end_time: timeSchema.optional().nullable(),
  is_all_day: z.boolean().optional().default(false),

  // Location
  venue_name: z.string().max(255).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().default('Walla Walla'),
  state: z.string().length(2, 'State must be 2 characters').optional().default('WA'),
  zip: z.string().max(10).optional().nullable(),

  // Media
  featured_image_url: z.string().url('Invalid image URL').optional().nullable(),
  gallery_urls: z.array(z.string().url('Invalid gallery URL')).max(20).optional().nullable(),

  // Pricing
  is_free: z.boolean().optional().default(true),
  price_min: z.number().min(0, 'Minimum price cannot be negative').optional().nullable(),
  price_max: z.number().min(0, 'Maximum price cannot be negative').optional().nullable(),
  ticket_url: z.string().url('Invalid ticket URL').optional().nullable(),

  // Organizer
  organizer_name: z.string().max(255).trim().optional().nullable(),
  organizer_website: z.string().url('Invalid organizer website URL').optional().nullable(),
  organizer_email: z.string().email('Invalid organizer email').optional().nullable(),
  organizer_phone: z.string().max(50).optional().nullable(),

  // Featured
  is_featured: z.boolean().optional().default(false),
  feature_priority: z.number().int().min(0).optional().default(0),

  // SEO
  meta_title: z.string().max(255).trim().optional().nullable(),
  meta_description: z.string().max(300).trim().optional().nullable(),

  // Recurring
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: recurrenceRuleSchema.optional().nullable(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return data.end_date >= data.start_date;
    }
    return true;
  },
  { message: 'End date must be on or after start date', path: ['end_date'] }
).refine(
  (data) => {
    if (data.price_min != null && data.price_max != null) {
      return data.price_max >= data.price_min;
    }
    return true;
  },
  { message: 'Maximum price must be greater than or equal to minimum price', path: ['price_max'] }
);

/**
 * Update event validation (partial version of create)
 */
export const updateEventSchema = z.object({
  title: z.string().min(3).max(255).trim().optional(),
  short_description: z.string().max(200).trim().optional().nullable(),
  description: z.string().min(10).trim().optional(),
  category_id: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional().nullable(),
  start_time: timeSchema.optional().nullable(),
  end_time: timeSchema.optional().nullable(),
  is_all_day: z.boolean().optional(),
  venue_name: z.string().max(255).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional(),
  state: z.string().length(2).optional(),
  zip: z.string().max(10).optional().nullable(),
  featured_image_url: z.string().url().optional().nullable(),
  gallery_urls: z.array(z.string().url()).max(20).optional().nullable(),
  is_free: z.boolean().optional(),
  price_min: z.number().min(0).optional().nullable(),
  price_max: z.number().min(0).optional().nullable(),
  ticket_url: z.string().url().optional().nullable(),
  organizer_name: z.string().max(255).trim().optional().nullable(),
  organizer_website: z.string().url().optional().nullable(),
  organizer_email: z.string().email().optional().nullable(),
  organizer_phone: z.string().max(50).optional().nullable(),
  is_featured: z.boolean().optional(),
  feature_priority: z.number().int().min(0).optional(),
  meta_title: z.string().max(255).trim().optional().nullable(),
  meta_description: z.string().max(300).trim().optional().nullable(),
  status: eventStatusSchema.optional(),
});

/**
 * Event filters validation (for query params)
 */
export const eventFiltersSchema = z.object({
  category: slugSchema.optional(),
  search: z.string().max(200).trim().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  isFree: z.coerce.boolean().optional(),
  status: eventStatusSchema.optional(),
  isFeatured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Track event interaction
 */
export const trackEventSchema = z.object({
  type: z.enum(['view', 'click'], { message: 'Type must be view or click' }),
});

// ============================================================================
// Organizer Schemas
// ============================================================================

/**
 * Invite organizer validation
 */
export const inviteOrganizerSchema = z.object({
  organization_name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255, 'Organization name must not exceed 255 characters')
    .trim(),
  contact_name: z
    .string()
    .min(2, 'Contact name must be at least 2 characters')
    .max(255, 'Contact name must not exceed 255 characters')
    .trim(),
  contact_email: z.string().email('Invalid email address').trim().toLowerCase(),
  contact_phone: z.string().max(50).optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  notes: z.string().max(1000).trim().optional(),
});

/**
 * Complete organizer setup
 */
export const organizerSetupSchema = z.object({
  token: z.string().min(1, 'Setup token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

/**
 * Update organizer profile
 */
export const updateOrganizerProfileSchema = z.object({
  organization_name: z.string().min(2).max(255).trim().optional(),
  contact_name: z.string().min(2).max(255).trim().optional(),
  contact_phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().max(2000).trim().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});

/**
 * Update organizer status (admin)
 */
export const updateOrganizerStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  trust_level: z.enum(['standard', 'trusted']).optional(),
  auto_approve: z.boolean().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventFiltersInput = z.infer<typeof eventFiltersSchema>;
export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type InviteOrganizerInput = z.infer<typeof inviteOrganizerSchema>;
export type OrganizerSetupInput = z.infer<typeof organizerSetupSchema>;
export type UpdateOrganizerProfileInput = z.infer<typeof updateOrganizerProfileSchema>;
export type UpdateOrganizerStatusInput = z.infer<typeof updateOrganizerStatusSchema>;
