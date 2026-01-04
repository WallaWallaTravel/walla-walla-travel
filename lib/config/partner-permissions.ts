/**
 * Partner Portal Permission Configuration
 *
 * Defines which fields partners can edit on their business profiles.
 * Three tiers of editability:
 * 1. IMMEDIATE: Changes go live instantly
 * 2. REVIEW_RECOMMENDED: Changes go live but flagged for review
 * 3. ADMIN_APPROVAL: Changes require admin approval before going live
 */

// ============================================================================
// Winery Field Permissions
// ============================================================================

export const PARTNER_WINERY_PERMISSIONS = {
  /**
   * Fields that partners can edit immediately (no approval needed)
   * These are operational details that change frequently
   */
  IMMEDIATE: [
    'hours_of_operation',
    'seasonal_hours',
    'phone',
    'email',
    'website',
    'tasting_fee',
    'tasting_fee_waived_with_purchase',
    'minimum_purchase_for_waiver',
    'reservation_required',
    'accepts_walkins',
    'average_visit_duration',
    'special_offers',
    'contact_name',
    'contact_email',
    'pet_policy',
    'cancellation_policy',
    'booking_advance_days_min',
    'booking_advance_days_max',
    'min_group_size',
    'max_group_size',
  ],

  /**
   * Fields that partners can edit, but changes are flagged for review
   * These affect public perception and SEO
   */
  REVIEW_RECOMMENDED: [
    'description',
    'short_description',
    'amenities',
    'accessibility_features',
    'specialties',
    'experience_tags',
    'price_range',
    'production_volume',
    'cover_photo_url',
    'logo_url',
    'photos',
    'virtual_tour_url',
    'video_url',
  ],

  /**
   * Fields that require admin approval before going live
   * These are core identity or location fields
   */
  ADMIN_APPROVAL: [
    'name',
    'slug',
    'address',
    'city',
    'state',
    'zip_code',
    'latitude',
    'longitude',
    'ava',
    'founded_year',
    'winemaker',
    'owner',
  ],

  /**
   * Content submissions (partner can add, requires approval)
   * These are narrative content pieces
   */
  CONTENT_SUBMISSION: [
    'origin_story',
    'philosophy',
    'unique_story',
    'anecdote',
    'fun_fact',
    'insider_tip',
  ],

  /**
   * Read-only fields (partners cannot edit)
   * System-managed or admin-only fields
   */
  READ_ONLY: [
    'id',
    'is_active',
    'is_featured',
    'is_partner',
    'partner_since',
    'commission_rate',
    'average_rating',
    'review_count',
    'wine_enthusiast_rating',
    'wine_spectator_rating',
    'meta_title',
    'meta_description',
    'keywords',
    'curator_notes',
    'display_order',
    'verified',
    'verified_by',
    'verified_at',
    'data_source',
    'source_url',
    'last_data_refresh',
    'created_at',
    'updated_at',
  ],
} as const;

// ============================================================================
// Permission Helpers
// ============================================================================

export type PermissionLevel = 'immediate' | 'review_recommended' | 'admin_approval' | 'content_submission' | 'read_only';

/**
 * Get the permission level for a specific winery field
 */
export function getWineryFieldPermission(fieldName: string): PermissionLevel {
  if (PARTNER_WINERY_PERMISSIONS.IMMEDIATE.includes(fieldName as never)) {
    return 'immediate';
  }
  if (PARTNER_WINERY_PERMISSIONS.REVIEW_RECOMMENDED.includes(fieldName as never)) {
    return 'review_recommended';
  }
  if (PARTNER_WINERY_PERMISSIONS.ADMIN_APPROVAL.includes(fieldName as never)) {
    return 'admin_approval';
  }
  if (PARTNER_WINERY_PERMISSIONS.CONTENT_SUBMISSION.includes(fieldName as never)) {
    return 'content_submission';
  }
  return 'read_only';
}

/**
 * Check if a field can be edited by partners
 */
export function canPartnerEdit(fieldName: string): boolean {
  const level = getWineryFieldPermission(fieldName);
  return level !== 'read_only';
}

/**
 * Check if a field requires approval
 */
export function requiresApproval(fieldName: string): boolean {
  const level = getWineryFieldPermission(fieldName);
  return level === 'admin_approval' || level === 'content_submission';
}

/**
 * Get all editable fields for partners
 */
export function getPartnerEditableFields(): string[] {
  return [
    ...PARTNER_WINERY_PERMISSIONS.IMMEDIATE,
    ...PARTNER_WINERY_PERMISSIONS.REVIEW_RECOMMENDED,
    ...PARTNER_WINERY_PERMISSIONS.ADMIN_APPROVAL,
  ];
}

// ============================================================================
// Edit Status Types
// ============================================================================

export const EDIT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type EditStatus = typeof EDIT_STATUS[keyof typeof EDIT_STATUS];

// ============================================================================
// Permission Level Labels & Descriptions
// ============================================================================

export const PERMISSION_LEVEL_INFO: Record<PermissionLevel, { label: string; description: string }> = {
  immediate: {
    label: 'Instant Update',
    description: 'Changes take effect immediately',
  },
  review_recommended: {
    label: 'Flagged for Review',
    description: 'Changes go live but are flagged for staff review',
  },
  admin_approval: {
    label: 'Requires Approval',
    description: 'Changes require staff approval before going live',
  },
  content_submission: {
    label: 'Content Submission',
    description: 'New content requires approval before publishing',
  },
  read_only: {
    label: 'Read Only',
    description: 'This field cannot be edited',
  },
};
