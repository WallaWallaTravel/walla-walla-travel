-- ============================================================================
-- Phase 2: Booking System Database Migration
-- Version: 1.0
-- Created: October 17, 2025
-- Description: Creates complete booking system schema for wine tour reservations
-- Revenue Impact: $120K/year potential
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- TABLE 1: customers
-- Stores customer information and preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Preferences
  preferred_wineries TEXT[], -- Array of winery names
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  vip_status BOOLEAN DEFAULT FALSE,

  -- Marketing
  email_marketing_consent BOOLEAN DEFAULT FALSE,
  sms_marketing_consent BOOLEAN DEFAULT FALSE,

  -- Statistics
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(2,1),
  last_booking_date DATE,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Stripe
  stripe_customer_id VARCHAR(100)
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_vip ON customers(vip_status);

-- ============================================================================
-- TABLE 2: wineries
-- Comprehensive winery information database
-- ============================================================================

CREATE TABLE IF NOT EXISTS wineries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Basic Info
  description TEXT,
  short_description VARCHAR(500),
  founded_year INTEGER,
  winemaker VARCHAR(255),
  owner VARCHAR(255),

  -- Location
  address VARCHAR(500),
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Tasting Details
  tasting_fee DECIMAL(6,2),
  tasting_fee_waived_with_purchase BOOLEAN DEFAULT TRUE,
  minimum_purchase_for_waiver INTEGER DEFAULT 2,
  reservation_required BOOLEAN DEFAULT FALSE,
  accepts_walkins BOOLEAN DEFAULT TRUE,
  average_visit_duration INTEGER DEFAULT 60, -- minutes

  -- Wines
  specialties TEXT[], -- ["Cabernet Sauvignon", "Syrah"]
  production_volume VARCHAR(50), -- "Boutique (<1000 cases)", etc.
  price_range VARCHAR(50), -- "$$ ($20-40)", "$$$ ($40-80)", etc.

  -- Hours (JSON format for flexibility)
  hours_of_operation JSONB,
  seasonal_hours JSONB,

  -- Amenities & Features
  amenities TEXT[], -- ["dog-friendly", "food-available", "outdoor-seating"]
  accessibility_features TEXT[], -- ["wheelchair-accessible", "ada-restrooms"]

  -- Media
  logo_url VARCHAR(500),
  cover_photo_url VARCHAR(500),
  photos JSONB, -- [{ url, caption, order, isPrimary }]
  virtual_tour_url VARCHAR(500),
  video_url VARCHAR(500),

  -- Reviews & Ratings
  average_rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  curator_notes TEXT,
  wine_enthusiast_rating INTEGER,
  wine_spectator_rating INTEGER,

  -- SEO & Marketing
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  keywords TEXT[],

  -- Partnership
  is_partner BOOLEAN DEFAULT FALSE,
  partner_since DATE,
  commission_rate DECIMAL(4,2),
  special_offers JSONB,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wineries_slug ON wineries(slug);
CREATE INDEX idx_wineries_active ON wineries(is_active);
CREATE INDEX idx_wineries_featured ON wineries(is_featured);

-- ============================================================================
-- TABLE 3: restaurants
-- Partner restaurants for lunch service
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cuisine_type VARCHAR(100),

  -- Location
  address VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Menu
  menu_url VARCHAR(500),
  menu_data JSONB, -- Structured menu
  accepts_pre_orders BOOLEAN DEFAULT TRUE,
  minimum_order_value DECIMAL(8,2),

  -- Partnership
  is_partner BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(4,2),
  payment_terms VARCHAR(100), -- "weekly", "monthly"
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),

  -- Integration
  api_enabled BOOLEAN DEFAULT FALSE,
  api_endpoint VARCHAR(500),
  api_key_encrypted VARCHAR(500),
  order_notification_method VARCHAR(50) DEFAULT 'email', -- "email", "api", "phone"

  -- Ratings
  average_rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 4: bookings
-- Core booking/reservation table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "WWT-2025-10001"

  -- Customer Information
  customer_id INTEGER REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 14),

  -- Tour Details
  tour_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL CHECK (duration_hours IN (4.0, 6.0, 8.0)),
  pickup_location VARCHAR(500) NOT NULL,
  dropoff_location VARCHAR(500),
  special_requests TEXT,

  -- Assignment
  driver_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  time_card_id INTEGER REFERENCES time_cards(id), -- Links to actual shift

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  gratuity DECIMAL(10,2) DEFAULT 0,
  taxes DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_at TIMESTAMP,
  final_payment_amount DECIMAL(10,2) NOT NULL,
  final_payment_paid BOOLEAN DEFAULT FALSE,
  final_payment_paid_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),

  -- Source
  booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, admin, api
  booked_by INTEGER REFERENCES users(id), -- For manual bookings

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_bookings_tour_date ON bookings(tour_date);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);

-- ============================================================================
-- TABLE 5: booking_wineries
-- Junction table for bookings and wineries (itinerary)
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_wineries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  winery_id INTEGER NOT NULL REFERENCES wineries(id),
  visit_order INTEGER NOT NULL, -- 1, 2, 3, etc.
  estimated_arrival_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_arrival_time TIMESTAMP,
  actual_departure_time TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(booking_id, visit_order)
);

CREATE INDEX idx_booking_wineries_booking ON booking_wineries(booking_id);
CREATE INDEX idx_booking_wineries_winery ON booking_wineries(winery_id);

-- ============================================================================
-- TABLE 6: lunch_orders
-- Lunch pre-orders for tours
-- ============================================================================

CREATE TABLE IF NOT EXISTS lunch_orders (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),

  -- Order Details
  order_items JSONB NOT NULL, -- [{name, price, quantity, modifications, notes}]
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Timing
  estimated_arrival_time TIME NOT NULL,
  requested_ready_time TIME NOT NULL,

  -- Special Requests
  dietary_restrictions TEXT,
  allergies TEXT,
  special_instructions TEXT,

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP,
  stripe_payment_intent_id VARCHAR(100),

  -- Restaurant Fulfillment
  restaurant_notified BOOLEAN DEFAULT FALSE,
  restaurant_notified_at TIMESTAMP,
  restaurant_confirmed BOOLEAN DEFAULT FALSE,
  restaurant_confirmed_at TIMESTAMP,
  ready_for_pickup BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lunch_orders_booking ON lunch_orders(booking_id);
CREATE INDEX idx_lunch_orders_restaurant ON lunch_orders(restaurant_id);
CREATE INDEX idx_lunch_orders_ready_time ON lunch_orders(requested_ready_time);

-- ============================================================================
-- TABLE 7: payments
-- Payment transaction records (Stripe integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  customer_id INTEGER REFERENCES customers(id),

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('deposit', 'final_payment', 'refund')),
  payment_method VARCHAR(50) NOT NULL, -- card, cash, check

  -- Stripe
  stripe_payment_intent_id VARCHAR(100),
  stripe_charge_id VARCHAR(100),
  stripe_refund_id VARCHAR(100),

  -- Card Details (last 4 for reference)
  card_brand VARCHAR(20), -- visa, mastercard, amex
  card_last4 VARCHAR(4),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  failure_reason TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  succeeded_at TIMESTAMP,
  failed_at TIMESTAMP,
  refunded_at TIMESTAMP
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- TABLE 8: pricing_rules
-- Dynamic pricing based on various factors
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Conditions
  vehicle_type VARCHAR(50), -- sprinter, sedan, suv
  duration_hours DECIMAL(3,1), -- 4.0, 6.0, 8.0
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  is_weekend BOOLEAN,
  is_holiday BOOLEAN,
  season VARCHAR(20), -- spring, summer, fall, winter

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  price_per_hour DECIMAL(10,2),
  price_per_person DECIMAL(10,2),
  minimum_price DECIMAL(10,2),
  maximum_price DECIMAL(10,2),

  -- Modifiers
  weekend_multiplier DECIMAL(4,2) DEFAULT 1.0, -- 1.2 for 20% increase
  holiday_multiplier DECIMAL(4,2) DEFAULT 1.0,

  -- Priority (higher priority rules override lower)
  priority INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority DESC);

-- ============================================================================
-- TABLE 9: availability_rules
-- Rules for blocking dates and managing capacity
-- ============================================================================

CREATE TABLE IF NOT EXISTS availability_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL
    CHECK (rule_type IN ('buffer_time', 'blackout_date', 'capacity_limit', 'maintenance_block')),

  -- Buffer Time Rules
  buffer_minutes INTEGER, -- Minutes between bookings
  applies_to VARCHAR(50), -- vehicle, driver, all

  -- Blackout Date Rules
  blackout_date DATE,
  blackout_start_date DATE,
  blackout_end_date DATE,
  reason TEXT,

  -- Capacity Rules
  max_daily_bookings INTEGER,
  max_concurrent_bookings INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_availability_rules_type ON availability_rules(rule_type);
CREATE INDEX idx_availability_rules_active ON availability_rules(is_active);

-- ============================================================================
-- TABLE 10: booking_timeline
-- Audit trail of all booking changes and events
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_timeline (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_description TEXT,
  event_data JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_timeline_booking ON booking_timeline(booking_id);
CREATE INDEX idx_booking_timeline_created_at ON booking_timeline(created_at);

-- ============================================================================
-- TABLE 11: winery_reviews
-- Customer reviews of wineries
-- ============================================================================

CREATE TABLE IF NOT EXISTS winery_reviews (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER NOT NULL REFERENCES wineries(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  booking_id INTEGER REFERENCES bookings(id),

  -- Review
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  visit_date DATE,

  -- Wine Purchased
  wines_purchased TEXT[], -- Names of wines bought
  total_spent DECIMAL(10,2),

  -- Helpful Voting
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Moderation
  is_verified BOOLEAN DEFAULT FALSE, -- Verified booking
  is_approved BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  moderated_at TIMESTAMP,
  moderated_by INTEGER REFERENCES users(id),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_winery_reviews_winery ON winery_reviews(winery_id);
CREATE INDEX idx_winery_reviews_approved ON winery_reviews(is_approved);

-- ============================================================================
-- TABLE 12: customer_tasting_notes
-- Private customer notes from wine tastings
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_tasting_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  winery_id INTEGER NOT NULL REFERENCES wineries(id),
  booking_id INTEGER REFERENCES bookings(id),

  -- Wine Details
  wine_name VARCHAR(255) NOT NULL,
  wine_varietal VARCHAR(100),
  wine_vintage INTEGER,

  -- Tasting Notes
  appearance_notes TEXT,
  aroma_notes TEXT,
  taste_notes TEXT,
  finish_notes TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),

  -- Purchase Intent
  purchased BOOLEAN DEFAULT FALSE,
  purchase_quantity INTEGER,
  want_to_buy_later BOOLEAN DEFAULT FALSE,

  -- Photos
  photos JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasting_notes_customer ON customer_tasting_notes(customer_id);
CREATE INDEX idx_tasting_notes_winery ON customer_tasting_notes(winery_id);

-- ============================================================================
-- TABLE 13: wine_purchases
-- Track wine purchases for commission and customer cellar
-- ============================================================================

CREATE TABLE IF NOT EXISTS wine_purchases (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  winery_id INTEGER NOT NULL REFERENCES wineries(id),

  -- Wine Details
  wine_name VARCHAR(255) NOT NULL,
  wine_varietal VARCHAR(100),
  vintage INTEGER,
  quantity INTEGER NOT NULL,
  price_per_bottle DECIMAL(8,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Shipment
  shipment_carrier VARCHAR(50), -- "FedEx", "UPS"
  tracking_number VARCHAR(100),
  shipment_status VARCHAR(50) DEFAULT 'pending', -- "pending", "shipped", "in_transit", "delivered"
  shipped_date DATE,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,

  -- Commission Tracking
  commission_rate DECIMAL(4,2),
  commission_amount DECIMAL(10,2),
  commission_paid BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wine_purchases_customer ON wine_purchases(customer_id);
CREATE INDEX idx_wine_purchases_tracking ON wine_purchases(tracking_number);
CREATE INDEX idx_wine_purchases_booking ON wine_purchases(booking_id);

-- ============================================================================
-- SEQUENCE: Booking Number Generator
-- Generates unique booking numbers: WWT-YYYY-NNNNN
-- ============================================================================

-- Create sequence for 2025
CREATE SEQUENCE IF NOT EXISTS booking_number_seq_2025 START 1;

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  year VARCHAR(4);
  seq_num INTEGER;
  booking_num VARCHAR(20);
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  -- Get next sequence number for current year
  EXECUTE format('SELECT nextval(%L)', 'booking_number_seq_' || year) INTO seq_num;

  -- Format: WWT-2025-00001
  booking_num := 'WWT-' || year || '-' || LPAD(seq_num::VARCHAR, 5, '0');

  RETURN booking_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Walla Walla Wineries
-- 50+ premier Walla Walla Valley wineries
-- ============================================================================

-- Top Tier Wineries (Highly Acclaimed)
INSERT INTO wineries (name, slug, description, short_description, founded_year, specialties, tasting_fee, reservation_required, average_rating, is_active, is_featured, display_order, curator_notes) VALUES
('Leonetti Cellar', 'leonetti-cellar', 'Family-owned winery producing world-class Cabernet Sauvignon and Bordeaux blends since 1977. One of Washington State''s most prestigious wineries.', 'Legendary family winery known for exceptional Cabernet Sauvignon', 1977, ARRAY['Cabernet Sauvignon', 'Merlot', 'Sangiovese'], 20.00, TRUE, 4.9, TRUE, TRUE, 1, 'One of Washington''s founding wineries and still among the best. Book well in advance.'),

('Cayuse Vineyards', 'cayuse-vineyards', 'Pioneering biodynamic winery crafting distinctive Syrah and Rhône-style wines from rocky vineyards. Extremely limited production.', 'Biodynamic pioneer with cult-following Syrah', 1997, ARRAY['Syrah', 'Grenache', 'Tempranillo'], 25.00, TRUE, 4.8, TRUE, TRUE, 2, 'Biodynamic farming and terroir-driven wines. These are some of the most sought-after wines in Washington.'),

('L''Ecole No 41', 'lecole-no-41', 'Historic schoolhouse turned winery producing elegant estate wines. Third generation family winery with exceptional tasting room.', 'Charming historic winery with elegant estate wines', 1983, ARRAY['Cabernet Sauvignon', 'Semillon', 'Syrah'], 15.00, FALSE, 4.7, TRUE, TRUE, 3, 'Beautiful tasting room in a converted schoolhouse. Great for first-time visitors.'),

('Woodward Canyon', 'woodward-canyon', 'Pioneering estate winery known for Old Vines Cabernet and Chardonnay. Consistently high-rated wines since 1981.', 'Estate winery with exceptional Old Vines Cabernet', 1981, ARRAY['Cabernet Sauvignon', 'Chardonnay', 'Merlot'], 20.00, TRUE, 4.7, TRUE, TRUE, 4, 'One of the originals. The Old Vines Cabernet is legendary.'),

('Walla Walla Vintners', 'walla-walla-vintners', 'Collaborative winery featuring multiple talented winemakers under one roof. Unique concept with diverse wine styles.', 'Unique incubator winery showcasing multiple winemakers', 1995, ARRAY['Cabernet Sauvignon', 'Syrah', 'Bordeaux Blends'], 15.00, FALSE, 4.6, TRUE, TRUE, 5, 'Experience wines from multiple winemakers in one stop. Great variety.');

-- Established Premium Wineries
INSERT INTO wineries (name, slug, description, short_description, specialties, tasting_fee, reservation_required, average_rating, is_active, display_order) VALUES
('Pepper Bridge Winery', 'pepper-bridge', 'Estate winery producing powerful Cabernet Sauvignon and Merlot from estate vineyards.', 'Estate Cabernet and Merlot specialist', ARRAY['Cabernet Sauvignon', 'Merlot'], 20.00, TRUE, 4.6, TRUE, 6),

('Amavi Cellars', 'amavi-cellars', 'Sister winery to Pepper Bridge with approachable Syrah and red blends. Beautiful modern tasting room.', 'Modern tasting room with approachable Syrah', ARRAY['Syrah', 'Cabernet Sauvignon', 'Sémillon'], 15.00, FALSE, 4.5, TRUE, 7),

('Foundry Vineyards', 'foundry-vineyards', 'Boutique winery crafting small-lot Bordeaux and Rhône varietals. Industrial-chic tasting room.', 'Small-lot Bordeaux and Rhône wines', ARRAY['Cabernet Franc', 'Syrah', 'Grenache'], 15.00, FALSE, 4.5, TRUE, 8),

('Tertulia Cellars', 'tertulia-cellars', 'Spanish-inspired winery focusing on Tempranillo and other Spanish varietals. Warm, inviting atmosphere.', 'Spanish varietals in Walla Walla', ARRAY['Tempranillo', 'Garnacha', 'Graciano'], 15.00, FALSE, 4.4, TRUE, 9),

('Garrison Creek Cellars', 'garrison-creek', 'Small family winery producing elegant Bordeaux-style blends with personal service.', 'Family winery with Bordeaux blends', ARRAY['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'], 15.00, FALSE, 4.4, TRUE, 10);

-- Mid-Size Wineries with Character
INSERT INTO wineries (name, slug, description, specialties, tasting_fee, reservation_required, average_rating, is_active, amenities) VALUES
('Dunham Cellars', 'dunham-cellars', 'Former airport hangar transformed into rustic tasting room. Known for bold Cabernet and Syrah.', ARRAY['Cabernet Sauvignon', 'Syrah', 'Chardonnay'], 15.00, FALSE, 4.5, TRUE, ARRAY['dog-friendly', 'outdoor-seating']),

('Reininger Winery', 'reininger', 'Consistently high-quality Bordeaux varietals and blends. Welcoming tasting room with knowledgeable staff.', ARRAY['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc'], 15.00, FALSE, 4.4, TRUE, ARRAY['dog-friendly']),

('Balboa Winery', 'balboa-winery', 'Spanish mission-style winery with Mediterranean varietals and approachable wines.', ARRAY['Tempranillo', 'Albariño', 'Grenache'], 12.00, FALSE, 4.3, TRUE, ARRAY['outdoor-seating', 'picnic-area']),

('Sapolil Cellars', 'sapolil-cellars', 'Named after historic creek, producing terroir-driven Bordeaux varietals with farming pedigree.', ARRAY['Cabernet Sauvignon', 'Cabernet Franc', 'Malbec'], 15.00, FALSE, 4.4, TRUE, ARRAY['dog-friendly']),

('Patit Creek Cellars', 'patit-creek', 'Small production winery with unique barrel room cave. Focus on Cabernet and Rhône wines.', ARRAY['Cabernet Sauvignon', 'Syrah', 'Viognier'], 15.00, TRUE, 4.3, TRUE, ARRAY['outdoor-seating']);

-- Boutique & Artisan Wineries (continued)
INSERT INTO wineries (name, slug, description, specialties, tasting_fee, average_rating, is_active, amenities) VALUES
('Va Piano Vineyards', 'va-piano', 'Italian-inspired winery with Sangiovese and Super Tuscan blends. Beautiful estate setting.', ARRAY['Sangiovese', 'Cabernet Sauvignon', 'Dolcetto'], 15.00, 4.5, TRUE, ARRAY['outdoor-seating', 'picnic-area', 'art-gallery']),

('Skylite Cellars', 'skylite-cellars', 'Aviation-themed winery in downtown Walla Walla. Fun atmosphere with solid wines.', ARRAY['Cabernet Sauvignon', 'Syrah', 'Malbec'], 12.00, 4.2, TRUE, ARRAY['dog-friendly']),

('Tamarack Cellars', 'tamarack-cellars', 'Affordable, approachable wines with consistent quality. Great for casual tastings.', ARRAY['Cabernet Sauvignon', 'Merlot', 'Chardonnay'], 10.00, 4.3, TRUE, ARRAY['dog-friendly', 'outdoor-seating']),

('Forgeron Cellars', 'forgeron', 'Blacksmith-themed winery producing robust reds and Viognier. Industrial-rustic charm.', ARRAY['Cabernet Sauvignon', 'Viognier', 'Syrah'], 15.00, 4.3, TRUE, ARRAY['dog-friendly']),

('Revelry Vintners', 'revelry-vintners', 'Small-lot wines focusing on Rhône and Bordeaux varietals. Welcoming downtown location.', ARRAY['Syrah', 'Grenache', 'Cabernet Sauvignon'], 15.00, 4.2, TRUE, ARRAY['dog-friendly']);

-- Additional Quality Wineries
INSERT INTO wineries (name, slug, specialties, tasting_fee, average_rating, is_active) VALUES
('Seven Hills Winery', 'seven-hills', ARRAY['Merlot', 'Cabernet Sauvignon', 'Syrah'], 15.00, 4.4, TRUE),
('K Vintners', 'k-vintners', ARRAY['Syrah', 'Grenache', 'Viognier'], 20.00, 4.6, TRUE),
('Gramercy Cellars', 'gramercy', ARRAY['Syrah', 'Tempranillo', 'Picpoul'], 15.00, 4.5, TRUE),
('Trust Cellars', 'trust-cellars', ARRAY['Cabernet Sauvignon', 'Syrah', 'Chardonnay'], 15.00, 4.3, TRUE),
('Abeja', 'abeja', ARRAY['Cabernet Sauvignon', 'Chardonnay', 'Viognier'], 20.00, 4.6, TRUE),
('Adamant Cellars', 'adamant', ARRAY['Syrah', 'Rhône Blends'], 15.00, 4.4, TRUE),
('àMaurice Cellars', 'amaurice', ARRAY['Cabernet Sauvignon', 'Syrah', 'Viognier'], 15.00, 4.3, TRUE),
('Beresan Winery', 'beresan', ARRAY['Cabernet Sauvignon', 'Malbec', 'Syrah'], 15.00, 4.2, TRUE),
('Artifex Wine Company', 'artifex', ARRAY['Cabernet Sauvignon', 'Syrah'], 15.00, 4.4, TRUE),
('Basel Cellars Estate Winery', 'basel-cellars', ARRAY['Cabernet Sauvignon', 'Merlot', 'Syrah'], 15.00, 4.4, TRUE);

-- Unique & Specialty Wineries
INSERT INTO wineries (name, slug, specialties, tasting_fee, average_rating, is_active, amenities) VALUES
('Kontos Cellars', 'kontos', ARRAY['Cabernet Sauvignon', 'Merlot'], 12.00, 4.2, TRUE, ARRAY['dog-friendly']),
('Plumb Cellars', 'plumb', ARRAY['Rhône Varietals', 'Syrah'], 15.00, 4.3, TRUE, ARRAY['outdoor-seating']),
('Zerba Cellars', 'zerba', ARRAY['Cabernet Sauvignon', 'Syrah', 'Sangiovese'], 15.00, 4.4, TRUE, ARRAY['food-available', 'outdoor-seating']),
('Maison Bleue Family Winery', 'maison-bleue', ARRAY['Cabernet Sauvignon', 'Syrah'], 15.00, 4.3, TRUE, ARRAY['dog-friendly']),
('Three Rivers Winery', 'three-rivers', ARRAY['Cabernet Sauvignon', 'Merlot', 'Riesling'], 12.00, 4.2, TRUE, ARRAY['food-available', 'outdoor-seating']),
('Mannina Cellars', 'mannina', ARRAY['Cabernet Sauvignon', 'Sangiovese'], 15.00, 4.3, TRUE, ARRAY['dog-friendly']),
('Sleight of Hand Cellars', 'sleight-of-hand', ARRAY['Red Blends', 'Syrah', 'Grenache'], 15.00, 4.4, TRUE, ARRAY['dog-friendly', 'magic-themed']),
('Frichette Winery', 'frichette', ARRAY['Cabernet Sauvignon', 'Syrah'], 15.00, 4.3, TRUE, ARRAY['dog-friendly']),
('Long Shadows Vintners', 'long-shadows', ARRAY['Bordeaux Blends', 'Syrah', 'Riesling'], 20.00, 4.5, TRUE, ARRAY['outdoor-seating']),
('Rôtie Cellars', 'rotie', ARRAY['Syrah', 'Viognier', 'Co-Fermented Blends'], 15.00, 4.4, TRUE, ARRAY['dog-friendly']);

-- More Great Wineries
INSERT INTO wineries (name, slug, specialties, tasting_fee, average_rating, is_active) VALUES
('Doubleback', 'doubleback', ARRAY['Cabernet Sauvignon'], 25.00, 4.7, TRUE),
('Waters Winery', 'waters', ARRAY['Syrah', 'Cabernet Sauvignon'], 15.00, 4.5, TRUE),
('Robert Karl Cellars', 'robert-karl', ARRAY['Rhône Varietals', 'Syrah'], 15.00, 4.3, TRUE),
('Trio Vintners', 'trio-vintners', ARRAY['Cabernet Sauvignon', 'Syrah', 'Sangiovese'], 15.00, 4.4, TRUE),
('Spring Valley Vineyard', 'spring-valley', ARRAY['Cabernet Sauvignon', 'Merlot', 'Mullan Road Red'], 20.00, 4.6, TRUE),
('Canvasback', 'canvasback', ARRAY['Cabernet Sauvignon', 'Red Mountain'], 20.00, 4.5, TRUE),
('Dumas Station Wines', 'dumas-station', ARRAY['Rhône Varietals', 'Syrah', 'Grenache'], 15.00, 4.3, TRUE),
('College Cellars', 'college-cellars', ARRAY['Various - Educational Winery'], 10.00, 4.1, TRUE),
('Guardian Cellars', 'guardian', ARRAY['Cabernet Sauvignon', 'Syrah'], 15.00, 4.4, TRUE),
('Browne Family Vineyards', 'browne-family', ARRAY['Cabernet Sauvignon', 'Tribute Series'], 15.00, 4.4, TRUE);

-- Final Set of Wineries
INSERT INTO wineries (name, slug, specialties, tasting_fee, average_rating, is_active, amenities) VALUES
('Doces Copas', 'doces-copas', ARRAY['Tempranillo', 'Spanish Varietals'], 15.00, 4.2, TRUE, ARRAY['dog-friendly']),
('Corliss Estates', 'corliss', ARRAY['Cabernet Sauvignon', 'Red Blends'], 25.00, 4.6, TRUE, ARRAY['outdoor-seating']),
('Morrison Lane Winery', 'morrison-lane', ARRAY['Cabernet Sauvignon', 'Syrah'], 15.00, 4.3, TRUE, ARRAY['dog-friendly']),
('Castillo de Feliciana', 'castillo', ARRAY['Spanish Varietals', 'Tempranillo'], 15.00, 4.2, TRUE, ARRAY['outdoor-seating']),
('Drew Bledsoe''s Doubleback', 'doubleback-bledsoe', ARRAY['Cabernet Sauvignon'], 25.00, 4.7, TRUE, ARRAY['celebrity-owned']);

-- ============================================================================
-- SEED DATA: Partner Restaurants
-- Initial lunch partner restaurants
-- ============================================================================

INSERT INTO restaurants (name, cuisine_type, address, phone, email, website, accepts_pre_orders, commission_rate, is_partner, is_active, order_notification_method) VALUES
('Brasserie Four', 'French Bistro', '4 East Main Street, Walla Walla, WA 99362', '509-529-2011', 'info@brasseriewallawalla.com', 'https://brasseriewallawalla.com', TRUE, 12.00, TRUE, TRUE, 'email'),

('The Finch', 'American Contemporary', '16 N 2nd Ave, Walla Walla, WA 99362', '509-876-4446', 'reservations@thefinchwallawalla.com', 'https://thefinchwallawalla.com', TRUE, 12.00, TRUE, TRUE, 'email'),

('Saffron Mediterranean Kitchen', 'Mediterranean', '125 W Alder St, Walla Walla, WA 99362', '509-525-2112', 'info@saffronmediterraneankitchen.com', 'https://saffronmediterraneankitchen.com', TRUE, 10.00, TRUE, TRUE, 'email'),

('Merchants Ltd. (Marcus Whitman Hotel)', 'American', '6 West Rose Street, Walla Walla, WA 99362', '509-525-2200', 'dining@marcuswhitmanhotel.com', 'https://marcuswhitmanhotel.com/merchants/', TRUE, 10.00, TRUE, TRUE, 'email'),

('Whoopemup Hollow Cafe', 'Casual American', '120 E Sumach St, Walla Walla, WA 99362', '509-522-2933', 'contact@whoopemup.com', 'http://www.whoopemup.com', TRUE, 10.00, FALSE, TRUE, 'phone');

-- ============================================================================
-- DEFAULT DATA: Pricing Rules
-- Initial pricing structure
-- ============================================================================

-- Base pricing for Sprinter van
INSERT INTO pricing_rules (name, description, vehicle_type, duration_hours, base_price, is_active, priority, valid_from) VALUES
('Sprinter 4-Hour Weekday', 'Base pricing for 4-hour Sprinter tour on weekdays', 'sprinter', 4.0, 600.00, TRUE, 10, '2025-01-01'),
('Sprinter 6-Hour Weekday', 'Base pricing for 6-hour Sprinter tour on weekdays', 'sprinter', 6.0, 800.00, TRUE, 10, '2025-01-01'),
('Sprinter 8-Hour Weekday', 'Base pricing for 8-hour Sprinter tour on weekdays', 'sprinter', 8.0, 1000.00, TRUE, 10, '2025-01-01');

-- Weekend pricing (20% premium)
INSERT INTO pricing_rules (name, description, vehicle_type, duration_hours, base_price, is_weekend, weekend_multiplier, is_active, priority, valid_from) VALUES
('Sprinter 4-Hour Weekend', 'Weekend pricing for 4-hour Sprinter tour', 'sprinter', 4.0, 720.00, TRUE, 1.20, TRUE, 20, '2025-01-01'),
('Sprinter 6-Hour Weekend', 'Weekend pricing for 6-hour Sprinter tour', 'sprinter', 6.0, 960.00, TRUE, 1.20, TRUE, 20, '2025-01-01'),
('Sprinter 8-Hour Weekend', 'Weekend pricing for 8-hour Sprinter tour', 'sprinter', 8.0, 1200.00, TRUE, 1.20, TRUE, 20, '2025-01-01');

-- ============================================================================
-- DEFAULT DATA: Availability Rules
-- Initial availability constraints
-- ============================================================================

-- Buffer time between bookings
INSERT INTO availability_rules (name, rule_type, buffer_minutes, applies_to, is_active) VALUES
('Standard Buffer Time', 'buffer_time', 60, 'all', TRUE),
('Vehicle Cleaning Buffer', 'buffer_time', 90, 'vehicle', TRUE);

-- Capacity limits
INSERT INTO availability_rules (name, rule_type, max_daily_bookings, max_concurrent_bookings, is_active) VALUES
('Daily Booking Limit', 'capacity_limit', 10, 5, TRUE);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wineries_updated_at BEFORE UPDATE ON wineries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lunch_orders_updated_at BEFORE UPDATE ON lunch_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_rules_updated_at BEFORE UPDATE ON availability_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_winery_reviews_updated_at BEFORE UPDATE ON winery_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_tasting_notes_updated_at BEFORE UPDATE ON customer_tasting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wine_purchases_updated_at BEFORE UPDATE ON wine_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table creation
SELECT
  'Migration completed successfully!' as status,
  COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'customers', 'wineries', 'restaurants', 'bookings', 'booking_wineries',
    'lunch_orders', 'payments', 'pricing_rules', 'availability_rules',
    'booking_timeline', 'winery_reviews', 'customer_tasting_notes', 'wine_purchases'
  );

-- Show winery count
SELECT COUNT(*) as winery_count, 'Walla Walla wineries loaded' as description FROM wineries;

-- Show restaurant count
SELECT COUNT(*) as restaurant_count, 'Partner restaurants loaded' as description FROM restaurants;

-- Show pricing rules
SELECT COUNT(*) as pricing_rule_count, 'Pricing rules created' as description FROM pricing_rules;
