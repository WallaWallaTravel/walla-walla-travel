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
}

export type UpdateEventData = Partial<CreateEventData> & {
  status?: EventStatus;
};

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
