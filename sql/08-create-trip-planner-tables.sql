-- ============================================================================
-- Trip Planner / Event Planning System
-- ============================================================================
-- Migration: 08-create-trip-planner-tables.sql
-- Date: December 2025
-- 
-- This module enables users to:
-- 1. Create and manage trips/events
-- 2. Build live itineraries with stops/activities
-- 3. Manage guest lists with contact info
-- 4. Send messages/invitations to guests
-- 5. Share plans publicly or hand off to Walla Walla Travel
-- ============================================================================

-- ============================================================================
-- TRIPS TABLE - Main trip/event container
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    
    -- Unique shareable identifier (e.g., "abc123xyz")
    share_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Owner info (can be visitor_id for anonymous users or user_id for logged in)
    visitor_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(20),
    
    -- Trip details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trip_type VARCHAR(50) DEFAULT 'wine_tour', -- wine_tour, bachelorette, corporate, wedding, anniversary, custom
    
    -- Dates
    start_date DATE,
    end_date DATE,
    dates_flexible BOOLEAN DEFAULT true,
    
    -- Party info
    expected_guests INTEGER DEFAULT 1,
    confirmed_guests INTEGER DEFAULT 0,
    
    -- Status workflow
    status VARCHAR(50) DEFAULT 'draft', -- draft, planning, ready_to_share, shared, handed_off, booked, completed, cancelled
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT false,
    allow_guest_suggestions BOOLEAN DEFAULT true,
    allow_guest_rsvp BOOLEAN DEFAULT true,
    
    -- Handoff to Walla Walla Travel
    handoff_requested_at TIMESTAMP,
    handoff_notes TEXT,
    assigned_staff_id INTEGER REFERENCES users(id),
    converted_to_booking_id INTEGER REFERENCES bookings(id),
    
    -- Preferences (stored as JSON for flexibility)
    preferences JSONB DEFAULT '{}',
    -- Example: {"wine_styles": ["red", "bold"], "budget": "moderate", "transportation": "need_driver"}
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP STOPS - Itinerary items (wineries, restaurants, activities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_stops (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Stop details
    stop_type VARCHAR(50) NOT NULL, -- winery, restaurant, activity, accommodation, transportation, custom
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Reference to actual business if applicable
    winery_id INTEGER REFERENCES wineries(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    
    -- Scheduling
    day_number INTEGER DEFAULT 1, -- For multi-day trips
    stop_order INTEGER NOT NULL,
    planned_arrival TIME,
    planned_departure TIME,
    duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'suggested', -- suggested, confirmed, booked, completed, skipped
    booking_confirmation VARCHAR(100), -- External booking reference
    
    -- Notes
    notes TEXT,
    special_requests TEXT,
    
    -- Cost tracking
    estimated_cost_per_person DECIMAL(10,2),
    
    -- Metadata
    added_by VARCHAR(100), -- visitor_id or user_id who added it
    added_via VARCHAR(50), -- chat, manual, ai_suggestion
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP GUESTS - Guest list management
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_guests (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Guest info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- RSVP status
    rsvp_status VARCHAR(50) DEFAULT 'pending', -- pending, invited, attending, declined, maybe
    rsvp_responded_at TIMESTAMP,
    rsvp_notes TEXT,
    
    -- Guest details
    is_organizer BOOLEAN DEFAULT false,
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    
    -- Arrival/departure if different from main trip
    arrival_date DATE,
    departure_date DATE,
    
    -- Room/accommodation assignment
    accommodation_group VARCHAR(100),
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Invite tracking
    invite_sent_at TIMESTAMP,
    invite_opened_at TIMESTAMP,
    last_viewed_at TIMESTAMP,
    
    -- Link to customer if they've booked before
    customer_id INTEGER REFERENCES customers(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP MESSAGES - Communication with guests
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_messages (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Message details
    message_type VARCHAR(50) NOT NULL, -- invitation, update, reminder, announcement, direct
    subject VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Sender
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    sent_by_guest_id INTEGER REFERENCES trip_guests(id),
    sent_by_user_id INTEGER REFERENCES users(id),
    
    -- Recipients
    send_to_all BOOLEAN DEFAULT false,
    recipient_guest_ids INTEGER[], -- Specific guest IDs if not send_to_all
    
    -- Delivery
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivery_method VARCHAR(50) DEFAULT 'email', -- email, sms, both
    
    -- Template used (if any)
    template_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP MESSAGE RECEIPTS - Track message delivery/opens
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_message_receipts (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES trip_messages(id) ON DELETE CASCADE,
    guest_id INTEGER NOT NULL REFERENCES trip_guests(id) ON DELETE CASCADE,
    
    -- Delivery tracking
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP, -- If they clicked a link in the message
    
    -- Bounce/error tracking
    delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
    error_message TEXT,
    
    UNIQUE(message_id, guest_id)
);

-- ============================================================================
-- TRIP ACTIVITY LOG - Track all changes for history
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_activity_log (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(100) NOT NULL,
    -- Examples: stop_added, stop_removed, guest_invited, guest_rsvp, 
    --           message_sent, itinerary_shared, handoff_requested, etc.
    
    description TEXT,
    
    -- Who did it
    actor_type VARCHAR(50), -- organizer, guest, staff, system
    actor_id VARCHAR(100),
    actor_name VARCHAR(255),
    
    -- Additional data
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP SUGGESTIONS - AI or staff suggestions for the trip
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_suggestions (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL, -- winery, restaurant, activity, timing, route
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Reference to actual item if applicable
    winery_id INTEGER REFERENCES wineries(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    
    -- Source
    source VARCHAR(50) NOT NULL, -- ai, staff, guest
    source_id VARCHAR(100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, expired
    
    -- Reason for suggestion
    reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code);
CREATE INDEX IF NOT EXISTS idx_trips_visitor_id ON trips(visitor_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_handoff ON trips(handoff_requested_at) WHERE handoff_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_order ON trip_stops(trip_id, day_number, stop_order);

CREATE INDEX IF NOT EXISTS idx_trip_guests_trip_id ON trip_guests(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_guests_email ON trip_guests(email);
CREATE INDEX IF NOT EXISTS idx_trip_guests_rsvp ON trip_guests(trip_id, rsvp_status);

CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_scheduled ON trip_messages(scheduled_for) WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_activity_trip_id ON trip_activity_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_created ON trip_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_trip_suggestions_trip_id ON trip_suggestions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_suggestions_status ON trip_suggestions(trip_id, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE trips IS 'Main trip/event planning container - stores trip details, dates, and settings';
COMMENT ON TABLE trip_stops IS 'Itinerary stops - wineries, restaurants, activities in the trip';
COMMENT ON TABLE trip_guests IS 'Guest list with contact info, RSVP status, and preferences';
COMMENT ON TABLE trip_messages IS 'Messages sent to guests - invitations, updates, reminders';
COMMENT ON TABLE trip_message_receipts IS 'Tracks delivery and engagement for each message per guest';
COMMENT ON TABLE trip_activity_log IS 'Audit log of all trip changes for history and collaboration';
COMMENT ON TABLE trip_suggestions IS 'AI and staff suggestions for improving the trip';

-- Trip Planner / Event Planning System
-- ============================================================================
-- Migration: 08-create-trip-planner-tables.sql
-- Date: December 2025
-- 
-- This module enables users to:
-- 1. Create and manage trips/events
-- 2. Build live itineraries with stops/activities
-- 3. Manage guest lists with contact info
-- 4. Send messages/invitations to guests
-- 5. Share plans publicly or hand off to Walla Walla Travel
-- ============================================================================

-- ============================================================================
-- TRIPS TABLE - Main trip/event container
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    
    -- Unique shareable identifier (e.g., "abc123xyz")
    share_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Owner info (can be visitor_id for anonymous users or user_id for logged in)
    visitor_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(20),
    
    -- Trip details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trip_type VARCHAR(50) DEFAULT 'wine_tour', -- wine_tour, bachelorette, corporate, wedding, anniversary, custom
    
    -- Dates
    start_date DATE,
    end_date DATE,
    dates_flexible BOOLEAN DEFAULT true,
    
    -- Party info
    expected_guests INTEGER DEFAULT 1,
    confirmed_guests INTEGER DEFAULT 0,
    
    -- Status workflow
    status VARCHAR(50) DEFAULT 'draft', -- draft, planning, ready_to_share, shared, handed_off, booked, completed, cancelled
    
    -- Sharing settings
    is_public BOOLEAN DEFAULT false,
    allow_guest_suggestions BOOLEAN DEFAULT true,
    allow_guest_rsvp BOOLEAN DEFAULT true,
    
    -- Handoff to Walla Walla Travel
    handoff_requested_at TIMESTAMP,
    handoff_notes TEXT,
    assigned_staff_id INTEGER REFERENCES users(id),
    converted_to_booking_id INTEGER REFERENCES bookings(id),
    
    -- Preferences (stored as JSON for flexibility)
    preferences JSONB DEFAULT '{}',
    -- Example: {"wine_styles": ["red", "bold"], "budget": "moderate", "transportation": "need_driver"}
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP STOPS - Itinerary items (wineries, restaurants, activities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_stops (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Stop details
    stop_type VARCHAR(50) NOT NULL, -- winery, restaurant, activity, accommodation, transportation, custom
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Reference to actual business if applicable
    winery_id INTEGER REFERENCES wineries(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    
    -- Scheduling
    day_number INTEGER DEFAULT 1, -- For multi-day trips
    stop_order INTEGER NOT NULL,
    planned_arrival TIME,
    planned_departure TIME,
    duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'suggested', -- suggested, confirmed, booked, completed, skipped
    booking_confirmation VARCHAR(100), -- External booking reference
    
    -- Notes
    notes TEXT,
    special_requests TEXT,
    
    -- Cost tracking
    estimated_cost_per_person DECIMAL(10,2),
    
    -- Metadata
    added_by VARCHAR(100), -- visitor_id or user_id who added it
    added_via VARCHAR(50), -- chat, manual, ai_suggestion
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP GUESTS - Guest list management
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_guests (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Guest info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- RSVP status
    rsvp_status VARCHAR(50) DEFAULT 'pending', -- pending, invited, attending, declined, maybe
    rsvp_responded_at TIMESTAMP,
    rsvp_notes TEXT,
    
    -- Guest details
    is_organizer BOOLEAN DEFAULT false,
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    
    -- Arrival/departure if different from main trip
    arrival_date DATE,
    departure_date DATE,
    
    -- Room/accommodation assignment
    accommodation_group VARCHAR(100),
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Invite tracking
    invite_sent_at TIMESTAMP,
    invite_opened_at TIMESTAMP,
    last_viewed_at TIMESTAMP,
    
    -- Link to customer if they've booked before
    customer_id INTEGER REFERENCES customers(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP MESSAGES - Communication with guests
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_messages (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Message details
    message_type VARCHAR(50) NOT NULL, -- invitation, update, reminder, announcement, direct
    subject VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Sender
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    sent_by_guest_id INTEGER REFERENCES trip_guests(id),
    sent_by_user_id INTEGER REFERENCES users(id),
    
    -- Recipients
    send_to_all BOOLEAN DEFAULT false,
    recipient_guest_ids INTEGER[], -- Specific guest IDs if not send_to_all
    
    -- Delivery
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivery_method VARCHAR(50) DEFAULT 'email', -- email, sms, both
    
    -- Template used (if any)
    template_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP MESSAGE RECEIPTS - Track message delivery/opens
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_message_receipts (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES trip_messages(id) ON DELETE CASCADE,
    guest_id INTEGER NOT NULL REFERENCES trip_guests(id) ON DELETE CASCADE,
    
    -- Delivery tracking
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP, -- If they clicked a link in the message
    
    -- Bounce/error tracking
    delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
    error_message TEXT,
    
    UNIQUE(message_id, guest_id)
);

-- ============================================================================
-- TRIP ACTIVITY LOG - Track all changes for history
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_activity_log (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(100) NOT NULL,
    -- Examples: stop_added, stop_removed, guest_invited, guest_rsvp, 
    --           message_sent, itinerary_shared, handoff_requested, etc.
    
    description TEXT,
    
    -- Who did it
    actor_type VARCHAR(50), -- organizer, guest, staff, system
    actor_id VARCHAR(100),
    actor_name VARCHAR(255),
    
    -- Additional data
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIP SUGGESTIONS - AI or staff suggestions for the trip
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_suggestions (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL, -- winery, restaurant, activity, timing, route
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Reference to actual item if applicable
    winery_id INTEGER REFERENCES wineries(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    
    -- Source
    source VARCHAR(50) NOT NULL, -- ai, staff, guest
    source_id VARCHAR(100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, expired
    
    -- Reason for suggestion
    reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code);
CREATE INDEX IF NOT EXISTS idx_trips_visitor_id ON trips(visitor_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_handoff ON trips(handoff_requested_at) WHERE handoff_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_order ON trip_stops(trip_id, day_number, stop_order);

CREATE INDEX IF NOT EXISTS idx_trip_guests_trip_id ON trip_guests(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_guests_email ON trip_guests(email);
CREATE INDEX IF NOT EXISTS idx_trip_guests_rsvp ON trip_guests(trip_id, rsvp_status);

CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_scheduled ON trip_messages(scheduled_for) WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_activity_trip_id ON trip_activity_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_created ON trip_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_trip_suggestions_trip_id ON trip_suggestions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_suggestions_status ON trip_suggestions(trip_id, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE trips IS 'Main trip/event planning container - stores trip details, dates, and settings';
COMMENT ON TABLE trip_stops IS 'Itinerary stops - wineries, restaurants, activities in the trip';
COMMENT ON TABLE trip_guests IS 'Guest list with contact info, RSVP status, and preferences';
COMMENT ON TABLE trip_messages IS 'Messages sent to guests - invitations, updates, reminders';
COMMENT ON TABLE trip_message_receipts IS 'Tracks delivery and engagement for each message per guest';
COMMENT ON TABLE trip_activity_log IS 'Audit log of all trip changes for history and collaboration';
COMMENT ON TABLE trip_suggestions IS 'AI and staff suggestions for improving the trip';


