// Trip Planner Types

export type TripType =
  | 'wine_tour'
  | 'bachelorette'
  | 'corporate'
  | 'wedding'
  | 'anniversary'
  | 'custom';

export type StopType =
  | 'winery'
  | 'restaurant'
  | 'activity'
  | 'accommodation'
  | 'transportation'
  | 'custom';

export type RsvpStatus =
  | 'pending'
  | 'invited'
  | 'attending'
  | 'declined'
  | 'maybe';

export interface TripPreferences {
  transportation: 'need_driver' | 'self_drive' | 'undecided';
  pace: 'relaxed' | 'moderate' | 'packed';
  budget: 'budget' | 'moderate' | 'luxury';
}

export interface TripBase {
  id: number;
  share_code: string;
  title: string;
  trip_type: TripType;
  start_date?: string;
  end_date?: string;
  dates_flexible: boolean;
  expected_guests: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  description?: string;
  preferences: TripPreferences;
  is_public: boolean;
  status: 'draft' | 'planning' | 'ready_to_share' | 'shared' | 'handed_off' | 'booked' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface TripStop {
  id: number;
  trip_id: number;
  winery_id?: number;
  winery_name?: string;
  name: string;
  stop_type: StopType;
  day_number: number;
  stop_order: number;
  planned_arrival?: string;
  planned_departure?: string;
  arrival_time?: string;
  departure_time?: string;
  notes?: string;
  created_at: string;
}

export interface TripGuest {
  id: number;
  trip_id: number;
  name: string;
  email?: string;
  dietary_restrictions?: string;
  is_organizer: boolean;
  rsvp_status: RsvpStatus;
  created_at: string;
}

export interface TripStats {
  total_stops: number;
  attending_guests: number;
  pending_rsvps: number;
}

// Full Trip with related data (as returned by API - flat structure)
export interface Trip extends TripBase {
  stops: TripStop[];
  guests: TripGuest[];
  stats: TripStats;
}

export interface CreateTripInput {
  title: string;
  trip_type: TripType;
  start_date?: string;
  end_date?: string;
  dates_flexible?: boolean;
  expected_guests?: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  description?: string;
  preferences?: TripPreferences;
}

export interface TripSummary {
  id: number;
  share_code: string;
  title: string;
  trip_type: TripType;
  start_date?: string;
  end_date?: string;
  expected_guests: number;
  status: 'draft' | 'planning' | 'ready_to_share' | 'shared' | 'handed_off' | 'booked' | 'completed' | 'cancelled';
  stops_count: number;
  confirmed_guests: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AddStopRequest {
  winery_id?: number;
  winery_name?: string;
  name: string;
  stop_type: StopType;
  day_number: number;
  planned_arrival?: string;
  planned_departure?: string;
  notes?: string;
}

export interface AddGuestRequest {
  name: string;
  email?: string;
  dietary_restrictions?: string;
}

// ============================================================================
// AI Chat Types
// ============================================================================

export interface TripChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: TripAIAction[];
}

export interface TripAIAction {
  type: 'add_stop' | 'move_stop' | 'suggest_restaurant' | 'show_details' | 'refresh_suggestions';
  label: string;
  data?: {
    name?: string;
    stopType?: StopType;
    dayNumber?: number;
    wineryId?: number;
    notes?: string;
    arrivalTime?: string;
  };
}

export interface StopSuggestion {
  id: string;
  name: string;
  type: StopType;
  reason: string;
  dayRecommendation: number;
  arrivalTime?: string;
  wineryId?: number;
  wineStyles?: string[];
  experienceTags?: string[];
}
