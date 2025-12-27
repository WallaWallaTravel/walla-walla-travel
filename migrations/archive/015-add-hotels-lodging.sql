-- Create hotels/lodging table for pickup/dropoff locations
-- Includes popular hotels, inns, vacation rentals, and bed & breakfasts in Walla Walla

CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Location
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact
  phone VARCHAR(20),
  website VARCHAR(500),
  
  -- Details
  type VARCHAR(50), -- 'hotel', 'inn', 'bnb', 'vacation_rental', 'resort'
  description TEXT,
  amenities TEXT[], -- ['parking', 'breakfast', 'pool', 'pet_friendly']
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hotels_slug ON hotels(slug);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_type ON hotels(type);
CREATE INDEX idx_hotels_active ON hotels(is_active);

-- Seed with popular Walla Walla hotels and lodging

-- Downtown Hotels
INSERT INTO hotels (name, slug, address, city, phone, type, description, amenities, display_order) VALUES
('Marcus Whitman Hotel', 'marcus-whitman', '6 W Rose St', 'Walla Walla', '509-525-2200', 'hotel', 'Historic downtown hotel with restaurant and wine bar. Walking distance to wineries and restaurants.', ARRAY['parking', 'breakfast', 'restaurant', 'wine_bar', 'conference_rooms'], 1),
('Finch & Barley', 'finch-barley', '123 E Main St', 'Walla Walla', '509-876-3100', 'hotel', 'Modern boutique hotel in the heart of downtown. Walking distance to tasting rooms.', ARRAY['parking', 'wine_bar', 'pets_allowed'], 2),
('Hampton Inn & Suites', 'hampton-inn', '7 E Oak St', 'Walla Walla', '509-526-7700', 'hotel', 'Comfortable hotel with free breakfast. Easy access to downtown and wineries.', ARRAY['parking', 'breakfast', 'pool', 'fitness'], 3),
('Courtyard by Marriott', 'courtyard-marriott', '550 W Rose St', 'Walla Walla', '509-526-0300', 'hotel', 'Modern hotel with pool and fitness center. Short drive to downtown tasting rooms.', ARRAY['parking', 'breakfast', 'pool', 'fitness', 'conference_rooms'], 4);

-- Bed & Breakfasts / Inns
INSERT INTO hotels (name, slug, address, city, phone, type, description, amenities, display_order) VALUES
('Inn at Abeja', 'inn-at-abeja', '2014 Mill Creek Rd', 'Walla Walla', '509-526-7400', 'inn', 'Luxury farmhouse inn on a working winery. Beautiful grounds and wine tasting on-site.', ARRAY['breakfast', 'wine_tasting', 'outdoor_seating', 'vineyard_views'], 5),
('Eritage Resort', 'eritage-resort', '1565 Whiteley Rd', 'Walla Walla', '509-394-0293', 'resort', 'Luxury resort with suites, spa, and winery. Premium wine country experience.', ARRAY['spa', 'restaurant', 'wine_tasting', 'event_space', 'vineyard_views'], 6),
('The Weinhard Hotel', 'weinhard-hotel', '235 E Main St', 'Dayton', '509-382-4032', 'hotel', 'Historic hotel in nearby Dayton (20 minutes from Walla Walla). Charming Victorian-era rooms.', ARRAY['breakfast', 'restaurant', 'historic'], 7),
('Green Gables Inn', 'green-gables-inn', '922 Bonsella St', 'Walla Walla', '509-876-4960', 'bnb', 'Classic bed & breakfast with beautiful gardens. Walking distance to downtown.', ARRAY['breakfast', 'gardens', 'historic'], 8),
('Stone Creek Inn', 'stone-creek-inn', '720 Bryant Ave', 'Walla Walla', '509-529-8120', 'bnb', 'Elegant B&B in historic Carnegie building. Steps from downtown tasting rooms.', ARRAY['breakfast', 'historic', 'wine_focus'], 9);

-- Budget/Chain Options
INSERT INTO hotels (name, slug, address, city, phone, type, description, amenities, display_order) VALUES
('Best Western Plus', 'best-western', '7 E Oak St', 'Walla Walla', '509-525-4700', 'hotel', 'Reliable chain hotel with breakfast and pool. Convenient to wineries.', ARRAY['parking', 'breakfast', 'pool', 'fitness'], 10),
('La Quinta Inn', 'la-quinta', '520 N 2nd Ave', 'Walla Walla', '509-525-2522', 'hotel', 'Budget-friendly hotel with free breakfast. Pet-friendly.', ARRAY['parking', 'breakfast', 'pets_allowed'], 11),
('Comfort Inn', 'comfort-inn', '520 N 2nd Ave', 'Walla Walla', '509-525-2522', 'hotel', 'Affordable hotel with continental breakfast and easy highway access.', ARRAY['parking', 'breakfast'], 12);

-- Vacation Rentals & Unique Stays
INSERT INTO hotels (name, slug, address, city, type, description, amenities, display_order) VALUES
('Airbnb/VRBO - Downtown', 'airbnb-downtown', 'Various Downtown Locations', 'Walla Walla', 'vacation_rental', 'Vacation rentals in downtown Walla Walla. Walking distance to tasting rooms.', ARRAY['parking', 'kitchen', 'washer_dryer'], 13),
('Airbnb/VRBO - Wine Country', 'airbnb-wine-country', 'Various Rural Locations', 'Walla Walla', 'vacation_rental', 'Vacation rentals near wineries. Scenic wine country settings.', ARRAY['parking', 'kitchen', 'outdoor_space', 'vineyard_views'], 14),
('Private Residence', 'private-residence', 'Various Locations', 'Walla Walla', 'vacation_rental', 'Private home or vacation rental. Enter specific address during booking.', ARRAY['parking'], 15);

-- Common Pickup Locations
INSERT INTO hotels (name, slug, address, city, type, description, display_order) VALUES
('Downtown Walla Walla - Main Street', 'downtown-main', 'Main St & 2nd Ave', 'Walla Walla', 'pickup_location', 'Central downtown pickup point near tasting rooms.', 16),
('Walla Walla Airport', 'ww-airport', '45 Terminal Loop', 'Walla Walla', 'airport', 'Walla Walla Regional Airport pickup.', 17),
('Walla Walla Train Station', 'train-station', '315 N Colville St', 'Walla Walla', 'train_station', 'Amtrak station pickup.', 18);

COMMENT ON TABLE hotels IS 'Hotels, lodging, and pickup/dropoff locations for tour itineraries';
COMMENT ON COLUMN hotels.type IS 'Type of lodging: hotel, inn, bnb, vacation_rental, resort, pickup_location, airport, train_station';
COMMENT ON COLUMN hotels.amenities IS 'Array of amenities: parking, breakfast, pool, fitness, spa, restaurant, wine_tasting, pets_allowed, etc.';




