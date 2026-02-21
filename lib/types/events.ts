/**
 * Event System Types
 *
 * Type definitions for the events system used by both
 * wallawallaevents.com and wallawalla.travel/events
 */

// ============================================================================
// Event Category
// ============================================================================

export interface EventCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// Event
// ============================================================================

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past' | 'pending_review';

// ============================================================================
// Recurring Events
// ============================================================================

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';
export type RecurrenceEndType = 'count' | 'until_date';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  days_of_week?: number[];      // 0=Sun..6=Sat (weekly/biweekly)
  day_of_month?: number;        // 1-28 (monthly)
  end_type: RecurrenceEndType;
  count?: number;               // 1-52
  until_date?: string;          // YYYY-MM-DD
}

export interface Event {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  description: string;

  // Categorization
  category_id: number | null;
  tags: string[] | null;

  // Date/Time
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;

  // Location
  venue_name: string | null;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;

  // Media
  featured_image_url: string | null;
  gallery_urls: string[] | null;

  // Pricing
  is_free: boolean;
  price_min: number | null;
  price_max: number | null;
  ticket_url: string | null;

  // Organizer
  organizer_id: number | null;
  organizer_name: string | null;
  organizer_website: string | null;
  organizer_email: string | null;
  organizer_phone: string | null;

  // Publishing
  status: EventStatus;
  is_featured: boolean;
  feature_priority: number;
  published_at: string | null;

  // SEO
  meta_title: string | null;
  meta_description: string | null;

  // Analytics
  view_count: number;
  click_count: number;

  // Recurring Events
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  parent_event_id: number | null;
  is_instance_override: boolean;

  // Timestamps
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventWithCategory extends Event {
  category_name: string | null;
  category_slug: string | null;
  category_icon: string | null;
}

// ============================================================================
// Create / Update Data
// ============================================================================

export interface CreateEventData {
  title: string;
  short_description?: string | null;
  description: string;
  category_id?: number | null;
  tags?: string[] | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
  venue_name?: string | null;
  address?: string | null;
  city?: string;
  state?: string;
  zip?: string | null;
  featured_image_url?: string | null;
  gallery_urls?: string[] | null;
  is_free?: boolean;
  price_min?: number | null;
  price_max?: number | null;
  ticket_url?: string | null;
  organizer_name?: string | null;
  organizer_website?: string | null;
  organizer_email?: string | null;
  organizer_phone?: string | null;
  is_featured?: boolean;
  feature_priority?: number;
  meta_title?: string | null;
  meta_description?: string | null;

  // Recurring
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
}

export type UpdateEventData = Partial<CreateEventData> & {
  status?: EventStatus;
};

// ============================================================================
// Event Organizer
// ============================================================================

export type OrganizerStatus = 'pending' | 'active' | 'suspended';
export type TrustLevel = 'standard' | 'trusted';

export interface EventOrganizer {
  id: number;
  user_id: number;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  status: OrganizerStatus;
  trust_level: TrustLevel;
  auto_approve: boolean;
  invited_by: number | null;
  invited_at: string | null;
  setup_token: string | null;
  setup_token_expires_at: string | null;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventOrganizerWithUser extends EventOrganizer {
  user_email: string;
  user_name: string;
}

export interface OrganizerInvitation {
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string;
}

export interface OrganizerDashboardData {
  profile: EventOrganizer;
  stats: {
    total_events: number;
    published_events: number;
    pending_events: number;
    draft_events: number;
    total_views: number;
    upcoming_events: number;
  };
}

export interface UpdateOrganizerProfileData {
  organization_name?: string;
  contact_name?: string;
  contact_phone?: string | null;
  website?: string | null;
  description?: string | null;
  logo_url?: string | null;
}

// ============================================================================
// Filters & List Results
// ============================================================================

export interface EventFilters {
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  isFree?: boolean;
  status?: EventStatus;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

export interface EventListResult {
  data: EventWithCategory[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
