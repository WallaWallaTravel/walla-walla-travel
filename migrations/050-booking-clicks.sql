-- Migration: 050-booking-clicks.sql
-- Created: 2026-01-08
-- Purpose: Track booking redirect clicks for revenue attribution

-- Create booking_clicks table (simplified - no FK constraints)
CREATE TABLE IF NOT EXISTS booking_clicks (
    id SERIAL PRIMARY KEY,
    winery_id INTEGER,
    winery_slug VARCHAR(255) NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address VARCHAR(45), -- Supports IPv6
    session_id VARCHAR(255),
    user_id INTEGER,
    converted_to_booking BOOLEAN DEFAULT FALSE,
    booking_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_booking_clicks_winery ON booking_clicks(winery_id);
CREATE INDEX IF NOT EXISTS idx_booking_clicks_slug ON booking_clicks(winery_slug);
CREATE INDEX IF NOT EXISTS idx_booking_clicks_created ON booking_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_clicks_converted ON booking_clicks(converted_to_booking) WHERE converted_to_booking = TRUE;

-- Add comment
COMMENT ON TABLE booking_clicks IS 'Tracks clicks on /go/[slug] booking redirects for revenue attribution';
