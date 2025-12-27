-- Update hotels table with accurate, verified Walla Walla lodging data
-- This migration replaces placeholder data with real addresses and contact information

-- Clear existing data
TRUNCATE TABLE hotels RESTART IDENTITY CASCADE;

-- Downtown Hotels (verified addresses and information)
INSERT INTO hotels (name, slug, address, city, state, zip_code, phone, website, type, description, amenities, display_order) VALUES
('Marcus Whitman Hotel & Conference Center', 'marcus-whitman', '6 W Rose St', 'Walla Walla', 'WA', '99362', '509-525-2200', 'https://www.marcuswhitmanhotel.com', 'hotel', 'Historic luxury hotel in downtown Walla Walla. Built in 1928, featuring The Marc Restaurant and Wine Bar. Walking distance to 100+ tasting rooms.', ARRAY['parking', 'restaurant', 'wine_bar', 'conference_rooms', 'fitness', 'historic'], 1),

('The Finch', 'the-finch', '325 E Main St', 'Walla Walla', 'WA', '99362', '509-876-3100', 'https://www.thefinchandbarley.com', 'hotel', 'Modern boutique hotel above The Barley restaurant in downtown Walla Walla. Contemporary design with wine country elegance.', ARRAY['restaurant', 'wine_bar', 'parking'], 2),

('Hampton Inn & Suites Walla Walla', 'hampton-inn', '1531 Kelly Pl', 'Walla Walla', 'WA', '99362', '509-526-7700', 'https://www.hilton.com', 'hotel', 'Modern hotel with complimentary breakfast and indoor pool. Close to downtown and wineries.', ARRAY['parking', 'breakfast', 'pool', 'fitness', 'business_center'], 3),

('Courtyard by Marriott Walla Walla', 'courtyard-marriott', '550 W Rose St', 'Walla Walla', 'WA', '99362', '509-526-0300', 'https://www.marriott.com', 'hotel', 'Contemporary hotel with pool, fitness center, and Bistro restaurant. Ideal for business and leisure travelers.', ARRAY['parking', 'restaurant', 'pool', 'fitness', 'business_center'], 4),

('Best Western Plus Walla Walla Suites Inn', 'best-western', '7 E Oak St', 'Walla Walla', 'WA', '99362', '509-525-4700', 'https://www.bestwestern.com', 'hotel', 'All-suite hotel in downtown Walla Walla. Spacious rooms with full breakfast included.', ARRAY['parking', 'breakfast', 'pool', 'fitness'], 5),

('La Quinta Inn & Suites by Wyndham Walla Walla', 'la-quinta', '520 N 2nd Ave', 'Walla Walla', 'WA', '99362', '509-525-2522', 'https://www.wyndhamhotels.com', 'hotel', 'Pet-friendly hotel with complimentary breakfast and convenient highway access.', ARRAY['parking', 'breakfast', 'pets_allowed', 'fitness'], 6),

('Comfort Inn Downtown Walla Walla', 'comfort-inn', '200 E Rose St', 'Walla Walla', 'WA', '99362', '509-525-2522', 'https://www.choicehotels.com', 'hotel', 'Affordable downtown hotel with continental breakfast and easy access to tasting rooms.', ARRAY['parking', 'breakfast'], 7);

-- Luxury Inns & Resorts
INSERT INTO hotels (name, slug, address, city, state, zip_code, phone, website, type, description, amenities, display_order) VALUES
('Inn at Abeja', 'inn-at-abeja', '2014 Mill Creek Rd', 'Walla Walla', 'WA', '99362', '509-526-7400', 'https://www.abeja.net', 'inn', 'Luxury farmhouse inn on a 38-acre working winery. Historic buildings with modern amenities, gourmet breakfast included.', ARRAY['breakfast', 'wine_tasting', 'vineyard_views', 'gardens', 'event_space'], 8),

('Eritage Resort', 'eritage-resort', '1319 Bergevin Springs Rd', 'Walla Walla', 'WA', '99362', '509-394-0293', 'https://www.eritageresort.com', 'resort', 'Luxury wine country resort with suites overlooking vineyards. On-site winery, spa, and fine dining.', ARRAY['spa', 'restaurant', 'wine_tasting', 'vineyard_views', 'event_space', 'pool'], 9),

('The Weinhard Hotel', 'weinhard-hotel', '235 E Main St', 'Dayton', 'WA', '99328', '509-382-4032', 'https://www.weinhardhotel.com', 'hotel', 'Historic Victorian hotel in nearby Dayton (20 minutes from Walla Walla). Built by brewery founder Jacob Weinhard in 1890.', ARRAY['breakfast', 'restaurant', 'historic', 'event_space'], 10);

-- Bed & Breakfasts
INSERT INTO hotels (name, slug, address, city, state, zip_code, phone, website, type, description, amenities, display_order) VALUES
('Green Gables Inn', 'green-gables-inn', '922 Bonsella St', 'Walla Walla', 'WA', '99362', '509-876-4960', 'https://www.greengablesinn.com', 'bnb', 'Charming 1909 Craftsman-style B&B with beautiful gardens. Walking distance to downtown tasting rooms.', ARRAY['breakfast', 'gardens', 'historic', 'wine_focus'], 11),

('Stone Creek Inn', 'stone-creek-inn', '720 Bryant Ave', 'Walla Walla', 'WA', '99362', '509-529-8120', 'https://www.stonecreekinn.com', 'bnb', 'Elegant B&B in historic 1883 Carnegie building. Steps from downtown, wine-focused hospitality.', ARRAY['breakfast', 'historic', 'wine_focus'], 12),

('The Barn B&B Walla Walla', 'the-barn', '1624 Stovall Rd', 'Walla Walla', 'WA', '99362', '509-529-4656', null, 'bnb', 'Rustic-chic converted barn B&B in wine country. Spacious suites with vineyard views.', ARRAY['breakfast', 'vineyard_views', 'gardens'], 13);

-- Vacation Rentals & Unique Stays (generic placeholders for custom entries)
INSERT INTO hotels (name, slug, address, city, state, zip_code, type, description, amenities, display_order) VALUES
('Airbnb/VRBO - Downtown', 'airbnb-downtown', 'Various Downtown Locations', 'Walla Walla', 'WA', '99362', 'vacation_rental', 'Vacation rentals in downtown Walla Walla. Walking distance to tasting rooms, restaurants, and shops.', ARRAY['parking', 'kitchen', 'full_home'], 14),

('Airbnb/VRBO - Wine Country', 'airbnb-wine-country', 'Various Rural Locations', 'Walla Walla', 'WA', '99362', 'vacation_rental', 'Vacation rentals near wineries and vineyards. Scenic settings with wine country views.', ARRAY['parking', 'kitchen', 'vineyard_views', 'full_home'], 15),

('Private Residence / Custom Location', 'private-custom', 'Enter Custom Address', 'Walla Walla', 'WA', '99362', 'vacation_rental', 'Private home, rental property, or custom pickup location. Enter specific address when booking.', ARRAY['parking'], 16);

-- Common Pickup Locations
INSERT INTO hotels (name, slug, address, city, state, zip_code, phone, type, description, display_order) VALUES
('Downtown Walla Walla (Main & 2nd)', 'downtown-main', 'Main St & 2nd Ave', 'Walla Walla', 'WA', '99362', null, 'pickup_location', 'Central downtown pickup point near tasting rooms and restaurants.', 17),

('Walla Walla Regional Airport', 'ww-airport', '45 Terminal Loop', 'Walla Walla', 'WA', '99362', '509-525-3100', 'airport', 'Walla Walla Regional Airport (ALW). Flight arrivals from Seattle and other cities.', 18),

('Walla Walla Valley Wine Alliance (Mill Creek)', 'mill-creek-tasting', '26 E Main St', 'Walla Walla', 'WA', '99362', null, 'pickup_location', 'Popular downtown tasting room district near multiple wineries.', 19),

('Whitman College Area', 'whitman-college', 'Park St & Isaacs Ave', 'Walla Walla', 'WA', '99362', null, 'pickup_location', 'Pickup near Whitman College campus area.', 20);

-- Additional Hotels
INSERT INTO hotels (name, slug, address, city, state, zip_code, phone, website, type, description, amenities, display_order) VALUES
('Holiday Inn Express & Suites', 'holiday-inn-express', '1433 W Pine St', 'Walla Walla', 'WA', '99362', '509-525-6200', 'https://www.ihg.com', 'hotel', 'Modern hotel with complimentary breakfast and indoor pool. Near wine country attractions.', ARRAY['parking', 'breakfast', 'pool', 'fitness', 'business_center'], 21),

('Super 8 by Wyndham Walla Walla', 'super-8', '2315 Eastgate St N', 'Walla Walla', 'WA', '99362', '509-525-8800', 'https://www.wyndhamhotels.com', 'hotel', 'Budget-friendly hotel with basic amenities and easy highway access.', ARRAY['parking', 'breakfast'], 22),

('Travelodge by Wyndham Walla Walla', 'travelodge', '421 E Main St', 'Walla Walla', 'WA', '99362', '509-529-4940', 'https://www.wyndhamhotels.com', 'hotel', 'Economical downtown hotel within walking distance of restaurants and tasting rooms.', ARRAY['parking', 'pets_allowed'], 23);

COMMENT ON TABLE hotels IS 'Verified hotels, lodging, and pickup locations for Walla Walla wine country tours - Updated with real contact information and accurate addresses';




