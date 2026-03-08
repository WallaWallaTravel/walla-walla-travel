import { z } from 'zod'

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

export const USER_ROLES = [
  'admin',
  'driver',
  'partner',
  'organizer',
  'geology_admin',
] as const

export const CreateUserSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(USER_ROLES, { error: 'Select a valid role' }),
  phone: z.string().max(20).optional(),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  email: z.string().email('Valid email required').optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(USER_ROLES).optional(),
  phone: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// ============================================================================
// SYSTEM SETTINGS SCHEMAS
// ============================================================================

export const UpdateSettingSchema = z.object({
  setting_key: z.string().min(1, 'Setting key is required').max(100),
  setting_value: z.unknown(),
})

export type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>

// ============================================================================
// CONTENT MANAGEMENT SCHEMAS
// ============================================================================

export const CONTENT_TYPES = ['text', 'html', 'json', 'number'] as const

export const CreatePageContentSchema = z.object({
  page_slug: z.string().min(1).max(100),
  section_key: z.string().min(1).max(100),
  content_type: z.enum(CONTENT_TYPES).optional().default('text'),
  content: z.string().max(50000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreatePageContentInput = z.infer<typeof CreatePageContentSchema>

export const UpdatePageContentSchema = z.object({
  page_slug: z.string().min(1).max(100),
  section_key: z.string().min(1).max(100),
  content: z.string().max(50000).optional(),
  content_type: z.enum(CONTENT_TYPES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdatePageContentInput = z.infer<typeof UpdatePageContentSchema>

export const CreateCollectionItemSchema = z.object({
  collection_type: z.string().min(1).max(50),
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  image_url: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  sort_order: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCollectionItemInput = z.infer<typeof CreateCollectionItemSchema>

export const UpdateCollectionItemSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  image_url: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  sort_order: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateCollectionItemInput = z.infer<typeof UpdateCollectionItemSchema>

export const ReorderCollectionSchema = z.object({
  collection_type: z.string().min(1).max(50),
  ordered_ids: z.array(z.coerce.number().int().positive()),
})

export type ReorderCollectionInput = z.infer<typeof ReorderCollectionSchema>

// ============================================================================
// MARKETING CAMPAIGN SCHEMAS
// ============================================================================

export const CreateMarketingCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  theme: z.string().min(1).max(500),
  channels: z.array(z.string().min(1).max(255)).min(1, 'At least one channel required'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  targetAudience: z.string().max(500).optional(),
})

export type CreateMarketingCampaignInput = z.infer<typeof CreateMarketingCampaignSchema>

// ============================================================================
// EMAIL CAMPAIGN SCHEMAS
// ============================================================================

export const CreateEmailCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  preview_text: z.string().max(500).optional(),
  campaign_type: z.string().max(255).optional(),
  template_id: z.coerce.number().int().positive().optional(),
  content_html: z.string().max(50000).optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
  scheduled_for: z.string().max(255).optional(),
  recipient_list_ids: z.array(z.coerce.number().int().positive()).optional(),
  created_by: z.string().max(255).optional(),
})

export type CreateEmailCampaignInput = z.infer<typeof CreateEmailCampaignSchema>
