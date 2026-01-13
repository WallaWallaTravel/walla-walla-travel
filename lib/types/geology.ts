// ============================================================================
// Geology Types
// ============================================================================
// Type definitions for the geology education feature
// ============================================================================

// ============================================================================
// Enums / Union Types
// ============================================================================

export type TopicType =
  | 'ice_age_floods'
  | 'soil_types'
  | 'basalt'
  | 'terroir'
  | 'climate'
  | 'water'
  | 'overview'
  | 'wine_connection';

export type DifficultyLevel = 'general' | 'intermediate' | 'advanced';

export type FactType =
  | 'statistic'
  | 'comparison'
  | 'quote'
  | 'timeline'
  | 'mind_blowing'
  | 'wine_connection';

export type SiteType =
  | 'viewpoint'
  | 'formation'
  | 'vineyard_example'
  | 'educational_marker'
  | 'museum'
  | 'tour_stop';

export type MediaType =
  | 'photo'
  | 'video'
  | 'diagram'
  | 'map'
  | 'before_after'
  | 'timeline_graphic'
  | '3d_model';

export type GuidanceType =
  | 'personality'
  | 'key_themes'
  | 'common_questions'
  | 'corrections'
  | 'connections'
  | 'terminology'
  | 'emphasis';

// ============================================================================
// Core Entity Types
// ============================================================================

export interface GeologyTopic {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt?: string;
  topic_type: TopicType;
  difficulty: DifficultyLevel;
  hero_image_url?: string;
  display_order: number;
  is_featured: boolean;
  is_published: boolean;
  related_winery_ids?: number[];
  related_topic_ids?: number[];
  author_name?: string;
  sources?: string;
  verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GeologyFact {
  id: number;
  fact_text: string;
  context?: string;
  fact_type?: FactType;
  topic_id?: number;
  display_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface GeologySite {
  id: number;
  name: string;
  slug: string;
  description?: string;
  site_type?: SiteType;
  latitude?: number;
  longitude?: number;
  address?: string;
  directions?: string;
  is_public_access: boolean;
  requires_appointment: boolean;
  best_time_to_visit?: string;
  accessibility_notes?: string;
  photos: string[];
  related_topic_ids?: number[];
  nearby_winery_ids?: number[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeologyMedia {
  id: number;
  title: string;
  description?: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  alt_text?: string;
  credit?: string;
  caption?: string;
  topic_ids?: number[];
  site_ids?: number[];
  is_featured: boolean;
  created_at: string;
}

export interface GeologyAIGuidance {
  id: number;
  guidance_type: GuidanceType;
  title?: string;
  content: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeologyTour {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  duration_hours?: number;
  group_size_min: number;
  group_size_max: number;
  price_per_person?: number;
  private_tour_price?: number;
  available_days?: string[];
  start_times?: string[];
  seasonal_availability?: string;
  what_included?: string[];
  what_to_bring?: string[];
  highlights?: string[];
  site_ids?: number[];
  partner_winery_ids?: number[];
  hero_image_url?: string;
  is_featured: boolean;
  is_active: boolean;
  booking_url?: string;
  booking_notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface GeologyChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    topicId?: number;
    topicTitle?: string;
    siteId?: number;
    siteName?: string;
  };
}

export interface GeologyChatResponse {
  message: string;
  suggestedTopics?: {
    id: number;
    slug: string;
    title: string;
    reason: string;
  }[];
  suggestedSites?: {
    id: number;
    slug: string;
    name: string;
    reason: string;
  }[];
  suggestedTours?: {
    id: number;
    slug: string;
    name: string;
    reason: string;
  }[];
}

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

export interface CreateTopicInput {
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt?: string;
  topic_type: TopicType;
  difficulty?: DifficultyLevel;
  hero_image_url?: string;
  display_order?: number;
  is_featured?: boolean;
  related_winery_ids?: number[];
  related_topic_ids?: number[];
  author_name?: string;
  sources?: string;
}

export interface UpdateTopicInput extends Partial<CreateTopicInput> {
  is_published?: boolean;
  verified?: boolean;
}

export interface CreateFactInput {
  fact_text: string;
  context?: string;
  fact_type?: FactType;
  topic_id?: number;
  display_order?: number;
  is_featured?: boolean;
}

export interface CreateSiteInput {
  name: string;
  slug: string;
  description?: string;
  site_type?: SiteType;
  latitude?: number;
  longitude?: number;
  address?: string;
  directions?: string;
  is_public_access?: boolean;
  requires_appointment?: boolean;
  best_time_to_visit?: string;
  accessibility_notes?: string;
  photos?: string[];
  related_topic_ids?: number[];
  nearby_winery_ids?: number[];
}

export interface CreateMediaInput {
  title: string;
  description?: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  alt_text?: string;
  credit?: string;
  caption?: string;
  topic_ids?: number[];
  site_ids?: number[];
  is_featured?: boolean;
}

export interface CreateGuidanceInput {
  guidance_type: GuidanceType;
  title?: string;
  content: string;
  priority?: number;
  is_active?: boolean;
}

export interface CreateTourInput {
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  duration_hours?: number;
  group_size_min?: number;
  group_size_max?: number;
  price_per_person?: number;
  private_tour_price?: number;
  available_days?: string[];
  start_times?: string[];
  seasonal_availability?: string;
  what_included?: string[];
  what_to_bring?: string[];
  highlights?: string[];
  site_ids?: number[];
  partner_winery_ids?: number[];
  hero_image_url?: string;
  is_featured?: boolean;
  booking_url?: string;
  booking_notes?: string;
}

// ============================================================================
// Summary/List Types
// ============================================================================

export interface TopicSummary {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  topic_type: TopicType;
  difficulty: DifficultyLevel;
  hero_image_url?: string;
  is_featured: boolean;
  is_published: boolean;
}

export interface SiteSummary {
  id: number;
  slug: string;
  name: string;
  description?: string;
  site_type?: SiteType;
  latitude?: number;
  longitude?: number;
  is_public_access: boolean;
}

export interface TourSummary {
  id: number;
  slug: string;
  name: string;
  tagline?: string;
  duration_hours?: number;
  price_per_person?: number;
  hero_image_url?: string;
  is_featured: boolean;
}

// ============================================================================
// Context Types (for AI services)
// ============================================================================

export interface GeologyContext {
  topics: GeologyTopic[];
  facts: GeologyFact[];
  sites: GeologySite[];
  tours: GeologyTour[];
  guidance: GeologyAIGuidance[];
}

export interface GeologyChatContext {
  sessionId: string;
  currentTopicId?: number;
  currentSiteId?: number;
  history: GeologyChatMessage[];
}
