// Trip Planner Types

export type TripType =
  | 'wine_tour'
  | 'celebration'
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
  restaurant_id?: number;
  name: string;
  description?: string;
  stop_type: StopType;
  day_number: number;
  stop_order: number;
  planned_arrival?: string;
  planned_departure?: string;
  arrival_time?: string;
  departure_time?: string;
  duration_minutes?: number;
  status?: 'suggested' | 'confirmed' | 'booked' | 'cancelled';
  booking_confirmation?: string;
  notes?: string;
  special_requests?: string;
  estimated_cost_per_person?: number;
  added_by?: string;
  added_via?: 'manual' | 'ai' | 'suggestion' | 'import';
  created_at: string;
  updated_at?: string;
  winery?: {
    id: number;
    name: string;
    image_url?: string;
    wine_styles?: string[];
  };
  restaurant?: {
    id: number;
    name: string;
    cuisine_type?: string;
  };
}

export interface TripGuest {
  id: number;
  trip_id: number;
  name: string;
  email?: string;
  phone?: string;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  arrival_date?: string;
  departure_date?: string;
  accommodation_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_organizer: boolean;
  rsvp_status: RsvpStatus;
  rsvp_responded_at?: string;
  rsvp_notes?: string;
  invite_sent_at?: string;
  invite_opened_at?: string;
  last_viewed_at?: string;
  customer_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface TripStats {
  total_stops: number;
  attending_guests: number;
  pending_rsvps: number;
}

// Full Trip with related data (as returned by API - flat structure)
export interface Trip extends TripBase {
  visitor_id?: string;
  user_id?: number;
  confirmed_guests?: number;
  allow_guest_suggestions?: boolean;
  allow_guest_rsvp?: boolean;
  handoff_requested_at?: string;
  handoff_notes?: string;
  assigned_staff_id?: number;
  converted_to_booking_id?: number;
  last_activity_at?: string;
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
  restaurant_id?: number;
  name: string;
  description?: string;
  stop_type: StopType;
  day_number: number;
  planned_arrival?: string;
  planned_departure?: string;
  duration_minutes?: number;
  notes?: string;
  special_requests?: string;
  estimated_cost_per_person?: number;
}

export interface AddGuestRequest {
  name: string;
  email?: string;
  phone?: string;
  is_organizer?: boolean;
  dietary_restrictions?: string;
  accessibility_needs?: string;
  arrival_date?: string;
  departure_date?: string;
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

// ============================================================================
// Trip Status Types
// ============================================================================

export type TripStatus =
  | 'draft'
  | 'planning'
  | 'ready_to_share'
  | 'shared'
  | 'handed_off'
  | 'booked'
  | 'completed'
  | 'cancelled';

export type RSVPStatus = RsvpStatus;

// ============================================================================
// Extended Trip Types (used by service layer)
// ============================================================================

export interface TripMessage {
  id: number;
  trip_id: number;
  message_type: 'invitation' | 'update' | 'reminder' | 'custom';
  subject?: string;
  content: string;
  sender_name?: string;
  sender_email?: string;
  sent_by_guest_id?: number;
  sent_by_user_id?: number;
  send_to_all: boolean;
  recipient_guest_ids?: number[];
  scheduled_for?: string;
  sent_at?: string;
  delivery_method: 'email' | 'sms' | 'both';
  template_id?: string;
  created_at: string;
}

export interface TripActivityLog {
  id: number;
  trip_id: number;
  activity_type: string;
  description: string;
  actor_type?: string;
  actor_id?: string;
  actor_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TripSuggestion {
  id: number;
  trip_id: number;
  suggestion_type: string;
  title: string;
  description?: string;
  winery_id?: number;
  restaurant_id?: number;
  source: string;
  source_id?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
  created_at: string;
  responded_at?: string;
  winery?: {
    id: number;
    name: string;
    image_url?: string;
  };
}

export interface TripDashboardStats {
  total_stops: number;
  confirmed_stops: number;
  total_guests: number;
  attending_guests: number;
  pending_rsvps: number;
  estimated_total_cost: number;
}

export interface TripDashboard {
  trip: Trip;
  stops: TripStop[];
  guests: TripGuest[];
  recent_activity: TripActivityLog[];
  pending_suggestions: TripSuggestion[];
  stats: TripDashboardStats;
}

// ============================================================================
// Request Types (used by service layer)
// ============================================================================

export interface CreateTripRequest {
  title: string;
  description?: string;
  trip_type?: TripType;
  start_date?: string;
  end_date?: string;
  dates_flexible?: boolean;
  expected_guests?: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  preferences?: TripPreferences;
}

export interface UpdateTripRequest {
  title?: string;
  description?: string;
  trip_type?: TripType;
  start_date?: string;
  end_date?: string;
  dates_flexible?: boolean;
  expected_guests?: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  is_public?: boolean;
  allow_guest_suggestions?: boolean;
  allow_guest_rsvp?: boolean;
  preferences?: TripPreferences;
}

export interface SendMessageRequest {
  message_type: 'invitation' | 'update' | 'reminder' | 'custom';
  subject?: string;
  content: string;
  send_to_all?: boolean;
  recipient_guest_ids?: number[];
  delivery_method?: 'email' | 'sms' | 'both';
  scheduled_for?: string;
}

export interface HandoffRequest {
  notes?: string;
}
