import { z } from 'zod'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

export const CONTACT_TYPES = ['individual', 'corporate', 'referral_partner'] as const
export const LIFECYCLE_STAGES = ['lead', 'qualified', 'opportunity', 'customer', 'repeat_customer', 'lost'] as const
export const LEAD_TEMPERATURES = ['cold', 'warm', 'hot'] as const
export const TASK_TYPES = ['follow_up', 'call', 'email', 'meeting', 'proposal', 'other'] as const
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
export const ACTIVITY_TYPES = [
  'call', 'email', 'sms', 'meeting', 'note',
  'proposal_sent', 'proposal_viewed', 'payment_received',
  'system', 'status_change', 'booking_created', 'tour_completed',
] as const
export const BRANDS = ['nw_touring', 'walla_walla_travel'] as const

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

export const CreateContactSchema = z.object({
  email: z.string().email('Valid email required').max(255),
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  contact_type: z.enum(CONTACT_TYPES, { error: 'Invalid contact type' }).optional(),
  lifecycle_stage: z.enum(LIFECYCLE_STAGES, { error: 'Invalid lifecycle stage' }).optional(),
  lead_temperature: z.enum(LEAD_TEMPERATURES, { error: 'Invalid lead temperature' }).optional(),
  source: z.string().max(255).optional(),
  source_detail: z.string().max(500).optional(),
  preferred_wineries: z.array(z.string()).optional(),
  dietary_restrictions: z.string().max(500).optional(),
  accessibility_needs: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  email_marketing_consent: z.boolean().optional(),
  sms_marketing_consent: z.boolean().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
})

export type CreateContactInput = z.infer<typeof CreateContactSchema>

export const UpdateContactSchema = z.object({
  email: z.string().email('Valid email required').max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  contact_type: z.enum(CONTACT_TYPES, { error: 'Invalid contact type' }).optional(),
  lifecycle_stage: z.enum(LIFECYCLE_STAGES, { error: 'Invalid lifecycle stage' }).optional(),
  lead_score: z.coerce.number().int().min(0).optional(),
  lead_temperature: z.enum(LEAD_TEMPERATURES, { error: 'Invalid lead temperature' }).optional(),
  source: z.string().max(255).optional(),
  source_detail: z.string().max(500).optional(),
  preferred_wineries: z.array(z.string()).optional(),
  dietary_restrictions: z.string().max(500).nullable().optional(),
  accessibility_needs: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  email_marketing_consent: z.boolean().optional(),
  sms_marketing_consent: z.boolean().optional(),
  assigned_to: z.coerce.number().int().positive().nullable().optional(),
  next_follow_up_at: z.string().nullable().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided to update' }
)

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>

// ============================================================================
// DEAL SCHEMAS
// ============================================================================

export const CreateDealSchema = z.object({
  contact_id: z.coerce.number().int().positive('Contact is required'),
  stage_id: z.coerce.number().int().positive('Pipeline stage is required'),
  title: z.string().min(1, 'Title is required').max(255),
  deal_type_id: z.coerce.number().int().positive().optional(),
  brand: z.enum(BRANDS, { error: 'Invalid brand' }).optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  description: z.string().max(5000).optional(),
  party_size: z.coerce.number().int().positive().optional(),
  expected_tour_date: z.string().optional(),
  expected_close_date: z.string().optional(),
  estimated_value: z.coerce.number().nonnegative().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  consultation_id: z.coerce.number().int().positive().optional(),
  corporate_request_id: z.coerce.number().int().positive().optional(),
  trip_proposal_id: z.coerce.number().int().positive().optional(),
})

export type CreateDealInput = z.infer<typeof CreateDealSchema>

export const UpdateDealSchema = z.object({
  stage_id: z.coerce.number().int().positive().optional(),
  deal_type_id: z.coerce.number().int().positive().nullable().optional(),
  brand: z.enum(BRANDS, { error: 'Invalid brand' }).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  party_size: z.coerce.number().int().positive().optional(),
  expected_tour_date: z.string().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
  estimated_value: z.coerce.number().nonnegative().optional(),
  actual_value: z.coerce.number().nonnegative().optional(),
  assigned_to: z.coerce.number().int().positive().nullable().optional(),
  lost_reason: z.string().max(500).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided to update' }
)

export type UpdateDealInput = z.infer<typeof UpdateDealSchema>

export const DealActionSchema = z.object({
  action: z.enum(['win', 'lose']),
  actual_value: z.coerce.number().nonnegative().optional(),
  lost_reason: z.string().max(500).optional(),
})

export type DealActionInput = z.infer<typeof DealActionSchema>

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  due_date: z.string().min(1, 'Due date is required'),
  assigned_to: z.coerce.number().int().positive('Assignee is required'),
  contact_id: z.coerce.number().int().positive().optional(),
  deal_id: z.coerce.number().int().positive().optional(),
  description: z.string().max(5000).optional(),
  task_type: z.enum(TASK_TYPES, { error: 'Invalid task type' }).optional(),
  priority: z.enum(TASK_PRIORITIES, { error: 'Invalid priority' }).optional(),
  due_time: z.string().optional(),
  reminder_at: z.string().optional(),
}).refine(
  (data) => data.contact_id || data.deal_id,
  { message: 'Either contact_id or deal_id must be provided' }
)

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>

export const UpdateTaskSchema = z.object({
  status: z.enum(TASK_STATUSES, { error: 'Invalid status' }).optional(),
  completion_notes: z.string().max(5000).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  task_type: z.enum(TASK_TYPES, { error: 'Invalid task type' }).optional(),
  priority: z.enum(TASK_PRIORITIES, { error: 'Invalid priority' }).optional(),
  due_date: z.string().optional(),
  due_time: z.string().nullable().optional(),
  reminder_at: z.string().nullable().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided to update' }
)

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

export const SnoozeTaskSchema = z.object({
  new_due_date: z.string().min(1, 'New due date is required'),
  new_due_time: z.string().optional(),
})

export type SnoozeTaskInput = z.infer<typeof SnoozeTaskSchema>

// ============================================================================
// ACTIVITY SCHEMA
// ============================================================================

export const CreateActivitySchema = z.object({
  contact_id: z.coerce.number().int().positive().optional(),
  deal_id: z.coerce.number().int().positive().optional(),
  activity_type: z.enum(ACTIVITY_TYPES, { error: 'Invalid activity type' }),
  subject: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
  call_duration_minutes: z.coerce.number().int().nonnegative().optional(),
  call_outcome: z.string().max(50).optional(),
  email_direction: z.string().max(20).optional(),
  email_status: z.string().max(20).optional(),
  source_type: z.string().max(50).optional(),
  source_id: z.string().max(255).optional(),
}).refine(
  (data) => data.contact_id || data.deal_id,
  { message: 'Either contact_id or deal_id must be provided' }
)

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>

// ============================================================================
// FILTER SCHEMAS (for queries)
// ============================================================================

export const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  lifecycle_stage: z.enum(LIFECYCLE_STAGES).optional(),
  lead_temperature: z.enum(LEAD_TEMPERATURES).optional(),
  contact_type: z.enum(CONTACT_TYPES).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type ContactFilters = z.infer<typeof ContactFiltersSchema>

export const DealFiltersSchema = z.object({
  search: z.string().optional(),
  stage_id: z.coerce.number().int().positive().optional(),
  brand: z.enum(BRANDS).optional(),
  deal_type_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  contact_id: z.coerce.number().int().positive().optional(),
  include_won: z.boolean().default(false),
  include_lost: z.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type DealFilters = z.infer<typeof DealFiltersSchema>

export const TaskFiltersSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  contact_id: z.coerce.number().int().positive().optional(),
  deal_id: z.coerce.number().int().positive().optional(),
  overdue: z.boolean().optional(),
  due_today: z.boolean().optional(),
  upcoming: z.boolean().optional(),
})

export type TaskFilters = z.infer<typeof TaskFiltersSchema>
