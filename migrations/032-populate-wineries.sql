-- ============================================================================
-- POPULATE WINERIES: Walla Walla Valley Wineries
-- ============================================================================
-- Source: wallawallawine.com, verified December 2024
-- ============================================================================

INSERT INTO wineries (slug, name, email, phone, website, address_line1, city, state, zip, ava, reservation_required, is_verified, is_active)
VALUES
-- Westside District
('abeja', 'Abeja', 'info@abeja.net', '(509) 526-7400', 'https://abeja.net', '2014 Mill Creek Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('aluve', 'ALUVÉ', NULL, '(509) 520-6251', 'https://aluvewine.com', '100 Aluvé Lane', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('amavi-cellars', 'Amavi Cellars', NULL, '(509) 525-3541', 'https://amavicellars.com', '3796 Peppers Bridge Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('balboa-winery', 'Balboa Winery', NULL, '(509) 529-0461', 'https://balboawinery.com', '4169 Peppers Bridge Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('basel-cellars', 'Basel Cellars', NULL, '(509) 522-0200', 'https://baselcellars.com', '2901 Old Milton Highway', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('beresan-winery', 'Beresan Winery', NULL, '(509) 526-4300', 'https://beresanwines.com', '4169 Peppers Bridge Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('canoe-ridge-vineyard', 'Canoe Ridge Vineyard', NULL, '(509) 527-0885', 'https://canoeridgevineyard.com', '1102 West Cherry Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('castillo-de-feliciana', 'Castillo de Feliciana', NULL, '(509) 876-4528', 'https://castillodefeliciana.com', '4320 Stateline Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('corliss-estates', 'Corliss Estates', NULL, '(509) 526-2091', 'https://corlissestates.com', '524 North 4th Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('doubleback', 'Doubleback', NULL, '(509) 525-7000', 'https://doubleback.com', '31 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),

-- Downtown District
('armstrong-family-winery', 'Armstrong Family Winery', NULL, '(509) 524-8494', 'https://armstrongwinery.com', '9 N 2nd Ave', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('bartholomew-winery', 'Bartholomew Winery', NULL, '(206) 395-8460', 'https://bartholomewwinery.com', '12 N 2nd Ave', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('beekeeper-by-abeja', 'Beekeeper by Abeja', NULL, '(509) 520-8541', 'https://abeja.net', '6 West Rose Street #101', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('bledsoe-family-winery', 'Bledsoe Family Winery', NULL, '(509) 792-3510', 'https://bledsoefamilywinery.com', '229 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('browne-family-vineyards', 'Browne Family Vineyards', NULL, '(509) 522-1261', 'https://brownefamilyvineyards.com', '31 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('cayuse-vineyards', 'Cayuse Vineyards', NULL, '(509) 526-0686', 'https://cayusevineyards.com', '17 East Main Street', 'Walla Walla', 'WA', '99362', 'The Rocks District', true, true, true),
('charles-smith-wines', 'Charles Smith Wines', NULL, '(509) 526-5230', 'https://charlessmithwines.com', '35 South Spokane Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('college-cellars', 'College Cellars', NULL, '(509) 527-4437', 'https://collegecellars.com', '500 Tausick Way', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('dunham-cellars', 'Dunham Cellars', NULL, '(509) 529-4685', 'https://dunhamcellars.com', '150 East Boeing Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('eleganté-cellars', 'Eleganté Cellars', NULL, '(509) 876-4007', 'https://elegantecellars.com', '40 North Second Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),

-- Airport District
('adamant-cellars', 'Adamant Cellars', NULL, '(509) 529-4161', 'https://adamantcellars.com', '525 East Cessna Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('arenness-cellars', 'Arenness Cellars', NULL, '(509) 540-5175', 'https://arennesscellars.com', '602 Piper Ave', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('august-forest', 'August Forest', NULL, '(509) 593-8652', 'https://augustforest.com', '594 Piper Ave', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('brook-bull-cellars', 'Brook & Bull Cellars', NULL, '(509) 529-0695', 'https://brookandbull.com', '604 Cessna Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('buty-winery', 'Buty Winery', NULL, '(509) 527-0901', 'https://butywinery.com', '535 East Cessna Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('dusted-valley-vintners', 'Dusted Valley Vintners', NULL, '(509) 525-1337', 'https://dustedvalley.com', '1248 Old Milton Highway', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('echolands-winery', 'Echolands Winery', NULL, '(509) 540-1096', 'https://echolands.com', '4321 Old Milton Highway', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('figgins-wine-studio', 'FIGGINS Wine Studio', NULL, '(509) 527-4813', 'https://figginsestates.com', '55 West Cherry Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('force-majeure', 'Force Majeure Vineyards', NULL, '(509) 525-0227', 'https://forcemajeurevineyards.com', '710 East Sumach Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('foundry-vineyards', 'Foundry Vineyards', NULL, '(509) 529-0736', 'https://foundryvineyards.com', '1111 Abadie Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),

-- Southside District
('gramercy-cellars', 'Gramercy Cellars', NULL, '(509) 876-2427', 'https://gramercycellars.com', '636 West Boeing Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('grantwood-winery', 'GrantWood Winery', NULL, '(509) 386-9990', 'https://grantwoodwinery.com', '3600 Hillview Drive', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('house-of-smith', 'House of Smith', NULL, '(509) 526-5230', 'https://houseofsmith.com', '35 South Spokane Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', false, true, true),
('jm-cellars', 'JM Cellars', NULL, '(509) 529-3955', 'https://jmcellars.com', '4475 Peppers Bridge Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('kontos-cellars', 'Kontos Cellars', NULL, '(509) 529-8898', 'https://kontoscellars.com', '485 North Myra Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('lecole-no-41', 'L''Ecole № 41', 'info@lecole.com', '(509) 525-0940', 'https://lecole.com', '41 Lowden School Road', 'Lowden', 'WA', '99360', 'Walla Walla Valley', true, true, true),
('leonetti-cellar', 'Leonetti Cellar', NULL, '(509) 525-1428', 'https://leonetticellar.com', '1321 School Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('long-shadows-vintners', 'Long Shadows Vintners', NULL, '(509) 526-0905', 'https://longshadows.com', '1604 Frenchtown Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('mark-ryan-winery', 'Mark Ryan Winery', NULL, '(253) 376-1653', 'https://markryanwinery.com', '26 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('northstar-winery', 'Northstar Winery', NULL, '(509) 525-6100', 'https://northstarwinery.com', '1736 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),

-- Eastside District
('pepper-bridge-winery', 'Pepper Bridge Winery', 'info@pepperbridge.com', '(509) 525-6502', 'https://pepperbridge.com', '1704 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('reininger-winery', 'Reininger Winery', NULL, '(509) 522-1994', 'https://reiningerwinery.com', '5858 West Highway 12', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('rotie-cellars', 'Rôtie Cellars', NULL, '(509) 301-9280', 'https://rotiecellars.com', '25 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('saviah-cellars', 'Saviah Cellars', NULL, '(509) 520-0654', 'https://saviahcellars.com', '1979 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('seven-hills-winery', 'Seven Hills Winery', 'info@sevenhillswinery.com', '(509) 529-7198', 'https://sevenhillswinery.com', '212 North Third Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('sleight-of-hand', 'Sleight of Hand Cellars', NULL, '(509) 525-3661', 'https://sofhcellars.com', '1959 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('spring-valley-vineyard', 'Spring Valley Vineyard', NULL, '(509) 337-6990', 'https://springvalleyvineyard.com', '1663 Corkrum Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('syncline-wine-cellars', 'Syncline Wine Cellars', NULL, '(509) 529-9882', 'https://synclinewine.com', '27 East Main Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('tertulia-cellars', 'Tertulia Cellars', NULL, '(509) 526-5230', 'https://tertuliacellars.com', '1564 Whiteley Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('tranche-cellars', 'Tranche Cellars', NULL, '(509) 540-5870', 'https://tranchecellars.com', '1024 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),

-- Additional Notable Wineries
('valdemar-estates', 'Valdemar Estates', NULL, '(509) 593-8808', 'https://valdemarestates.com', '635 North 13th Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('walla-walla-vintners', 'Walla Walla Vintners', NULL, '(509) 525-4724', 'https://wallawallavintners.com', '225 Vineyard Lane', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('waters-winery', 'Waters Winery', NULL, '(509) 525-1590', 'https://waterswinery.com', '405 East Boeing Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('woodward-canyon', 'Woodward Canyon Winery', 'info@woodwardcanyon.com', '(509) 525-4129', 'https://woodwardcanyon.com', '11920 West Highway 12', 'Lowden', 'WA', '99360', 'Walla Walla Valley', true, true, true),
('zerba-cellars', 'Zerba Cellars', NULL, '(541) 938-9463', 'https://zerbacellars.com', '85530 Highway 11', 'Milton-Freewater', 'OR', '97862', 'Walla Walla Valley', true, true, true),
('va-piano-vineyards', 'Va Piano Vineyards', NULL, '(509) 529-0900', 'https://vapiano.com', '1793 J B George Road', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('trio-vintners', 'Trio Vintners', NULL, '(509) 876-4024', 'https://triovintners.com', '14 North Second Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('trust-cellars', 'Trust Cellars', NULL, '(509) 529-4511', 'https://trustcellars.com', '8 North Second Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('tamarack-cellars', 'Tamarack Cellars', NULL, '(509) 526-3533', 'https://tamarackcellars.com', '700 C Street', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true),
('supernatural-cellars', 'Supernatural Cellars', NULL, '(509) 529-5445', 'https://supernaturalcellars.com', '608 Cessna Avenue', 'Walla Walla', 'WA', '99362', 'Walla Walla Valley', true, true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    address_line1 = EXCLUDED.address_line1,
    city = EXCLUDED.city,
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- RESTAURANTS: Walla Walla Dining
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, is_verified, is_active)
VALUES
-- Fine Dining
('whitehouse-crawford', 'Whitehouse-Crawford', 'restaurant', 'fine_dining', '(509) 525-2222', 'https://whitehousecrawford.com', '55 West Cherry Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('saffron-mediterranean', 'Saffron Mediterranean Kitchen', 'restaurant', 'fine_dining', '(509) 525-2112', 'https://saffronmediterraneankitchen.com', '125 West Alder Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('brasserie-four', 'Brasserie Four', 'restaurant', 'fine_dining', '(509) 529-2011', 'https://bfrench.com', '4 East Main Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('the-marc', 'The Marc Restaurant', 'restaurant', 'fine_dining', '(509) 876-4510', 'https://themarcrestaurant.com', '6 West Rose Street', 'Walla Walla', 'WA', '99362', '$$$$', true, true),

-- Casual Dining
('t-maccarones', 'T. Maccarone''s', 'restaurant', 'italian', '(509) 522-4776', 'https://tmaccarones.com', '4 North Colville Street', 'Walla Walla', 'WA', '99362', '$$', true, true),
('marc-restaurant', 'Marc Restaurant', 'restaurant', 'american', '(509) 525-3500', 'https://marcrestaurant.com', '26 East Main Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('public-house-124', 'Public House 124', 'restaurant', 'gastropub', '(509) 876-4511', 'https://publichouse124.com', '124 East Main Street', 'Walla Walla', 'WA', '99362', '$$', true, true),
('graze', 'Graze', 'restaurant', 'american', '(509) 522-9991', 'https://grazedowntown.com', '5 South First Avenue', 'Walla Walla', 'WA', '99362', '$$', true, true),
('passatempo-taverna', 'Passatempo Taverna', 'restaurant', 'italian', '(509) 876-8822', 'https://passatempotaverna.com', '215 West Main Street', 'Walla Walla', 'WA', '99362', '$$', true, true),

-- Steakhouse
('walla-walla-steak-co', 'Walla Walla Steak Co.', 'restaurant', 'steakhouse', '(509) 876-4017', 'https://wallawallasteak.com', '416 North Second Avenue', 'Walla Walla', 'WA', '99362', '$$$', true, true),

-- Breakfast/Brunch
('bacon-eggs', 'Bacon & Eggs', 'restaurant', 'breakfast', '(509) 876-4553', NULL, '52 East Main Street', 'Walla Walla', 'WA', '99362', '$', true, true),
('maple-counter-cafe', 'Maple Counter Cafe', 'restaurant', 'breakfast', '(509) 876-2525', NULL, '209 East Alder Street', 'Walla Walla', 'WA', '99362', '$', true, true),
('clarettes', 'Clarette''s', 'restaurant', 'breakfast', '(509) 525-5580', NULL, '15 South Spokane Street', 'Walla Walla', 'WA', '99362', '$', true, true),

-- Wine Bars & Bistros
('olive-marketplace-cafe', 'Olive Marketplace & Cafe', 'restaurant', 'bistro', '(509) 526-0200', 'https://olivedowntown.com', '21 East Main Street', 'Walla Walla', 'WA', '99362', '$$', true, true),
('sweet-basil-pizzeria', 'Sweet Basil Pizzeria', 'restaurant', 'pizza', '(509) 529-1950', NULL, '5 South First Avenue', 'Walla Walla', 'WA', '99362', '$', true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    phone = EXCLUDED.phone,
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- LODGING: Hotels, B&Bs, Vacation Rentals
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, is_verified, is_active)
VALUES
-- Hotels
('marcus-whitman-hotel', 'Marcus Whitman Hotel & Conference Center', 'lodging', 'hotel', '(509) 525-2200', 'https://marcuswhitmanhotel.com', '6 West Rose Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('the-finch', 'The Finch', 'lodging', 'boutique_hotel', '(509) 876-2125', 'https://thefinchwallawalla.com', '325 East Main Street', 'Walla Walla', 'WA', '99362', '$$$', true, true),
('eritage-resort', 'Eritage Resort', 'lodging', 'resort', '(509) 394-9500', 'https://eritageresort.com', '1751 Stovall Road', 'Walla Walla', 'WA', '99362', '$$$$', true, true),

-- B&Bs
('inn-at-abeja', 'Inn at Abeja', 'lodging', 'bed_breakfast', '(509) 522-1234', 'https://abeja.net/inn', '2014 Mill Creek Road', 'Walla Walla', 'WA', '99362', '$$$$', true, true),
('green-gables-inn', 'Green Gables Inn', 'lodging', 'bed_breakfast', '(509) 876-4373', 'https://greengablesinn.com', '922 Bonsella Street', 'Walla Walla', 'WA', '99362', '$$', true, true),

-- Vacation Rentals
('maxwell-house', 'Maxwell House Bed & Breakfast', 'lodging', 'bed_breakfast', '(509) 525-1885', NULL, '8 South Howard Street', 'Walla Walla', 'WA', '99362', '$$', true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    phone = EXCLUDED.phone,
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- ACTIVITIES & EXPERIENCES
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, description, is_verified, is_active)
VALUES
('walla-walla-balloon-stampede', 'Walla Walla Balloon Stampede', 'activity', 'hot_air_balloon', '(509) 527-3247', 'https://balloonstampede.org', NULL, 'Walla Walla', 'WA', '99362', '$$', 'Annual hot air balloon festival held in May', true, true),
('blue-mountain-cider', 'Blue Mountain Cider Company', 'activity', 'cidery', '(509) 529-1140', 'https://bluemountaincider.com', '208 Freewater Road', 'Milton-Freewater', 'OR', '97862', '$', 'Craft cider tasting and production facility', true, true),
('palouse-falls', 'Palouse Falls State Park', 'activity', 'nature', NULL, 'https://parks.state.wa.us', 'Palouse Falls Road', 'LaCrosse', 'WA', '99143', '$', 'Washington State waterfall and hiking', true, true),
('walla-walla-chamber-music-festival', 'Walla Walla Chamber Music Festival', 'activity', 'music', '(509) 529-8850', 'https://wwcmf.org', NULL, 'Walla Walla', 'WA', '99362', '$$', 'Annual chamber music festival in summer', true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- WAITSBURG BUSINESSES
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, is_verified, is_active)
VALUES
('jimgermanbar', 'Jimgermanbar', 'restaurant', 'american', '(509) 337-9802', NULL, '206 East Main Street', 'Waitsburg', 'WA', '99361', '$$', true, true),
('whoopemup-hollow-cafe', 'Whoopemup Hollow Cafe', 'restaurant', 'breakfast', '(509) 337-9000', NULL, '120 Main Street', 'Waitsburg', 'WA', '99361', '$', true, true),
('waitsburg-wine', 'Waitsburg Wine', 'activity', 'wine_tasting', NULL, NULL, NULL, 'Waitsburg', 'WA', '99361', '$$', true, true)

ON CONFLICT (slug) DO UPDATE SET
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- DAYTON BUSINESSES
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, is_verified, is_active)
VALUES
('weinhard-hotel', 'The Historic Weinhard Hotel', 'lodging', 'hotel', '(509) 382-4032', 'https://weinhardhotel.com', '235 East Main Street', 'Dayton', 'WA', '99328', '$$', true, true),
('patit-creek-restaurant', 'Patit Creek Restaurant', 'restaurant', 'american', '(509) 382-2625', NULL, '725 East Dayton Avenue', 'Dayton', 'WA', '99328', '$$', true, true),
('blue-mountain-station', 'Blue Mountain Station', 'activity', 'museum', '(509) 382-2026', 'https://bluemtnstation.com', '2nd & Main Street', 'Dayton', 'WA', '99328', '$', true, true),
('dayton-historic-depot', 'Dayton Historic Depot', 'activity', 'museum', '(509) 382-2026', NULL, '222 East Commercial Street', 'Dayton', 'WA', '99328', 'free', true, true)

ON CONFLICT (slug) DO UPDATE SET
    is_verified = true,
    updated_at = NOW();

-- ============================================================================
-- PENDLETON BUSINESSES (Oregon)
-- ============================================================================

INSERT INTO businesses (slug, name, category, subcategory, phone, website, address_line1, city, state, zip, price_range, is_verified, is_active)
VALUES
('pendleton-round-up', 'Pendleton Round-Up', 'activity', 'rodeo', '(800) 457-6336', 'https://pendletonroundup.com', '1205 SW Court Avenue', 'Pendleton', 'OR', '97801', '$$', true, true),
('pendleton-underground-tours', 'Pendleton Underground Tours', 'activity', 'tour', '(541) 276-0730', 'https://pendletonundergroundtours.org', '37 SW Emigrant Avenue', 'Pendleton', 'OR', '97801', '$$', true, true),
('pendleton-woolen-mills', 'Pendleton Woolen Mills', 'retail', 'shopping', '(541) 276-6911', 'https://pendleton-usa.com', '1307 SE Court Place', 'Pendleton', 'OR', '97801', '$$', true, true),
('hamley-co', 'Hamley & Co.', 'retail', 'western_wear', '(541) 278-1100', 'https://hamley.com', '30 SE Court Avenue', 'Pendleton', 'OR', '97801', '$$$', true, true),
('prodigal-son-brewery', 'Prodigal Son Brewery & Pub', 'restaurant', 'brewery', '(541) 276-6090', 'https://prodigalsonbrewery.com', '230 SE Court Avenue', 'Pendleton', 'OR', '97801', '$$', true, true)

ON CONFLICT (slug) DO UPDATE SET
    is_verified = true,
    updated_at = NOW();
