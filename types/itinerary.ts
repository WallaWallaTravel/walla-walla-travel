/**
 * TypeScript interfaces for the Itinerary Builder system
 */

export type ItineraryStatus = 'draft' | 'finalized' | 'sent' | 'confirmed';

export type ActivityType = 
  | 'winery_visit' 
  | 'transfer' 
  | 'meal' 
  | 'accommodation' 
  | 'custom';

export type LocationType = 
  | 'winery' 
  | 'restaurant' 
  | 'hotel' 
  | 'airport' 
  | 'venue' 
  | 'other';

export interface Itinerary {
  id: number;
  booking_id?: number;
  proposal_id?: number;
  
  // Basic Info
  title: string;
  client_name: string;
  client_email?: string;
  party_size: number;
  
  // Dates
  start_date: string;  // ISO date string
  end_date: string;
  
  // Status
  status: ItineraryStatus;
  
  // Notes
  internal_notes?: string;
  client_notes?: string;
  
  // Relations
  days?: ItineraryDay[];
  attachments?: ItineraryAttachment[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
  last_modified_by?: number;
}

export interface ItineraryDay {
  id: number;
  itinerary_id: number;
  
  // Day Info
  day_number: number;
  date: string;  // ISO date string
  title?: string;
  description?: string;
  
  // Display Order
  display_order: number;
  
  // Relations
  activities?: ItineraryActivity[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ItineraryActivity {
  id: number;
  itinerary_day_id: number;
  
  // Activity Type
  activity_type: ActivityType;
  
  // Timing
  start_time?: string;  // HH:MM:SS
  end_time?: string;
  duration_minutes?: number;
  
  // Location Info
  location_name?: string;
  location_address?: string;
  location_type?: LocationType;
  pickup_location?: string;
  dropoff_location?: string;
  
  // Winery-specific
  winery_id?: number;
  tasting_included?: boolean;
  tasting_fee?: number;
  
  // Details
  title: string;
  description?: string;
  notes?: string;
  
  // Display Order
  display_order: number;
  
  // Relations
  wineries?: ActivityWinery[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ActivityWinery {
  id: number;
  itinerary_activity_id: number;
  winery_id: number;
  display_order: number;
  notes?: string;
  
  // Populated from join
  winery?: {
    id: number;
    name: string;
    city?: string;
    region?: string;
  };
  
  created_at: string;
}

export interface ItineraryAttachment {
  id: number;
  itinerary_id: number;
  
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  
  description?: string;
  
  created_at: string;
  uploaded_by?: number;
}

export interface ItineraryVersion {
  id: number;
  itinerary_id: number;
  
  version_number: number;
  snapshot: Itinerary;  // Full itinerary data
  
  change_summary?: string;
  changed_by?: number;
  created_at: string;
}

// Form data interfaces for creating/updating

export interface CreateItineraryData {
  booking_id?: number;
  proposal_id?: number;
  title: string;
  client_name: string;
  client_email?: string;
  party_size: number;
  start_date: string;
  end_date: string;
  internal_notes?: string;
  client_notes?: string;
}

export interface CreateDayData {
  itinerary_id: number;
  day_number: number;
  date: string;
  title?: string;
  description?: string;
}

export interface CreateActivityData {
  itinerary_day_id: number;
  activity_type: ActivityType;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location_name?: string;
  location_address?: string;
  location_type?: LocationType;
  pickup_location?: string;
  dropoff_location?: string;
  winery_id?: number;
  tasting_included?: boolean;
  tasting_fee?: number;
  title: string;
  description?: string;
  notes?: string;
  display_order?: number;
}

export interface UpdateActivityData extends Partial<CreateActivityData> {
  id: number;
}

// Helper types for UI

export interface ActivityTemplate {
  type: ActivityType;
  icon: string;
  label: string;
  defaultTitle: string;
  defaultDuration?: number;
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    type: 'winery_visit',
    icon: '🍷',
    label: 'Winery Visit',
    defaultTitle: 'Winery Visit',
    defaultDuration: 60
  },
  {
    type: 'transfer',
    icon: '🚐',
    label: 'Transfer',
    defaultTitle: 'Transfer',
    defaultDuration: 30
  },
  {
    type: 'meal',
    icon: '🍽️',
    label: 'Meal',
    defaultTitle: 'Lunch',
    defaultDuration: 90
  },
  {
    type: 'accommodation',
    icon: '🏨',
    label: 'Accommodation',
    defaultTitle: 'Hotel Check-in',
    defaultDuration: 15
  },
  {
    type: 'custom',
    icon: '📍',
    label: 'Custom Activity',
    defaultTitle: 'Activity',
    defaultDuration: 60
  }
];

