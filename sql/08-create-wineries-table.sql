-- ============================================================================
-- Wineries Table
-- ============================================================================
-- Stores winery information for the directory and AI Knowledge Base

CREATE TABLE IF NOT EXISTS wineries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    region VARCHAR(100) DEFAULT 'Walla Walla Valley',
    description TEXT NOT NULL,
    long_description TEXT,
    wine_styles TEXT[] DEFAULT '{}',
    tasting_fee DECIMAL(10, 2) DEFAULT 0,
    tasting_fee_waived VARCHAR(255),
    reservation_required BOOLEAN DEFAULT false,
    hours VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    website VARCHAR(500),
    email VARCHAR(255),
    rating DECIMAL(2, 1),
    review_count INTEGER DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    image_url VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wineries_slug ON wineries(slug);
CREATE INDEX IF NOT EXISTS idx_wineries_active ON wineries(is_active);
CREATE INDEX IF NOT EXISTS idx_wineries_rating ON wineries(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wineries_region ON wineries(region);

-- ============================================================================
-- Seed Data - Sample Wineries
-- ============================================================================

INSERT INTO wineries (name, slug, region, description, long_description, wine_styles, tasting_fee, tasting_fee_waived, reservation_required, hours, address, phone, website, rating, review_count, features, is_active)
VALUES
(
    'L''Ecole No. 41',
    'lecole-no-41',
    'Walla Walla Valley',
    'Pioneer Walla Walla winery in a historic schoolhouse. Known for exceptional Semillon and Cabernet Sauvignon.',
    'L''Ecole No. 41 is a third-generation family-owned artisan winery located in the historic Frenchtown School depicted on our label. Founded in 1983, we are the third oldest winery in the Walla Walla Valley. Our wines are made from grapes grown in our certified sustainable estate vineyards and from other premier vineyards in the Columbia Valley.

The winery is known for producing exceptional Semillon, which has become a signature variety, as well as outstanding Cabernet Sauvignon, Merlot, and other Bordeaux varieties. The tasting room is housed in the original 1915 schoolhouse, providing a unique and memorable wine tasting experience.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Semillon', 'Chardonnay', 'Syrah'],
    20.00,
    'Waived with purchase of 2+ bottles',
    false,
    'Daily 10am - 5pm',
    '41 Lowden School Road, Lowden, WA 99360',
    '(509) 525-0940',
    'https://www.lecole.com',
    4.8,
    342,
    ARRAY['Historic Building', 'Picnic Area', 'Wine Club', 'Private Tastings', 'Pet Friendly'],
    true
),
(
    'Foundry Vineyards',
    'foundry-vineyards',
    'Walla Walla Valley',
    'Art-focused winery featuring rotating gallery exhibitions alongside exceptional wine tastings.',
    'Foundry Vineyards combines the art of winemaking with visual arts in a unique tasting experience. Located in downtown Walla Walla, the winery features rotating art exhibitions from local and regional artists alongside their exceptional wines.

The winery produces small-lot, handcrafted wines focusing on Cabernet Sauvignon, Syrah, and Malbec from premium Walla Walla Valley vineyards. The modern tasting room provides an intimate setting to explore both wine and art.',
    ARRAY['Cabernet Sauvignon', 'Syrah', 'Malbec', 'Red Blend'],
    15.00,
    'Waived with purchase',
    false,
    'Thu-Mon 11am - 5pm',
    '1111 E Main St, Walla Walla, WA 99362',
    '(509) 529-0736',
    'https://www.foundryvineyards.com',
    4.6,
    156,
    ARRAY['Art Gallery', 'Downtown Location', 'Wine Club', 'Events Space'],
    true
),
(
    'Pepper Bridge Winery',
    'pepper-bridge',
    'Walla Walla Valley',
    'Estate winery producing world-class Bordeaux-style wines from certified sustainable vineyards.',
    'Pepper Bridge Winery is one of the founding members of the Walla Walla Valley wine industry and continues to set the standard for premium Bordeaux-style wines. The winery is committed to sustainable viticulture and has been certified by LIVE (Low Input Viticulture and Enology) and Salmon-Safe.

All wines are made from 100% estate-grown grapes from their certified sustainable vineyards, including the acclaimed Pepper Bridge Vineyard and Seven Hills Vineyard. The stunning tasting room offers panoramic views of the Blue Mountains.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Malbec'],
    25.00,
    'Waived for wine club members',
    true,
    'Daily 10am - 4pm (by appointment)',
    '1704 JB George Rd, Walla Walla, WA 99362',
    '(509) 525-6502',
    'https://www.pepperbridge.com',
    4.9,
    287,
    ARRAY['Estate Vineyards', 'Mountain Views', 'Sustainable', 'Wine Club', 'Private Tastings'],
    true
),
(
    'Dunham Cellars',
    'dunham-cellars',
    'Walla Walla Valley',
    'Family-owned winery in a renovated WWII airplane hangar, known for bold reds and their signature Three Legged Red.',
    'Dunham Cellars is a family-owned winery housed in a renovated World War II airplane hangar at the Walla Walla Regional Airport. Founded in 1995, the winery has become known for producing bold, complex red wines.

The winery''s flagship wine, Three Legged Red, has become a cult favorite among wine enthusiasts. The unique tasting room setting, combined with exceptional wines and warm hospitality, makes for a memorable visit.',
    ARRAY['Cabernet Sauvignon', 'Syrah', 'Red Blend'],
    20.00,
    'Waived with purchase',
    false,
    'Daily 11am - 4pm',
    '150 E Boeing Ave, Walla Walla, WA 99362',
    '(509) 529-4685',
    'https://www.dunhamcellars.com',
    4.7,
    198,
    ARRAY['Historic Building', 'Wine Club', 'Dog Friendly', 'Outdoor Seating'],
    true
),
(
    'Leonetti Cellar',
    'leonetti-cellar',
    'Walla Walla Valley',
    'Iconic Washington winery and the first commercial winery in Walla Walla. Mailing list only, but worth the wait.',
    'Leonetti Cellar holds the distinction of being the first commercial winery in the Walla Walla Valley, founded in 1977. The winery has earned legendary status for producing some of Washington''s most sought-after wines.

Due to high demand, Leonetti wines are available exclusively through their mailing list. The winery occasionally offers tastings by appointment for mailing list members. Their Cabernet Sauvignon and Merlot consistently receive critical acclaim.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Sangiovese'],
    0.00,
    NULL,
    true,
    'By appointment only',
    '1875 Foothills Lane, Walla Walla, WA 99362',
    '(509) 525-1428',
    'https://www.leonetticellar.com',
    5.0,
    89,
    ARRAY['Mailing List Only', 'Estate Vineyards', 'Historic Winery'],
    true
),
(
    'Gramercy Cellars',
    'gramercy-cellars',
    'Walla Walla Valley',
    'Master Sommelier-owned winery focusing on Rhône and Bordeaux varieties with old-world winemaking techniques.',
    'Gramercy Cellars was founded by Master Sommelier Greg Harrington and his wife Pam in 2005. The winery focuses on producing wines that express the unique terroir of the Walla Walla Valley using traditional, old-world winemaking techniques.

Specializing in Syrah and other Rhône varieties, as well as Cabernet Sauvignon, Gramercy has earned recognition for producing some of the most elegant and age-worthy wines in Washington State.',
    ARRAY['Syrah', 'Cabernet Sauvignon', 'Tempranillo', 'Viognier'],
    20.00,
    'Waived with purchase',
    true,
    'Fri-Sun 11am - 4pm (by appointment)',
    '635 N 13th Ave, Walla Walla, WA 99362',
    '(509) 876-2427',
    'https://www.gramercycellars.com',
    4.8,
    167,
    ARRAY['Master Sommelier', 'Rhône Varieties', 'Wine Club', 'Educational Tastings'],
    true
),
(
    'Cayuse Vineyards',
    'cayuse-vineyards',
    'Walla Walla Valley',
    'Biodynamic pioneer producing highly allocated Syrah and Rhône varieties from unique rocky vineyards.',
    'Cayuse Vineyards, founded by Christophe Baron in 1997, is renowned for its biodynamic farming practices and exceptional Syrah. The winery''s vineyards are planted in the unique cobblestone soils of the Walla Walla Valley.

The wines from Cayuse are highly allocated and sought after by collectors worldwide. The distinctive terroir, combined with meticulous biodynamic farming, produces wines of remarkable depth and complexity.',
    ARRAY['Syrah', 'Grenache', 'Tempranillo', 'Viognier'],
    0.00,
    NULL,
    true,
    'By appointment only',
    'Milton-Freewater, OR',
    '(509) 526-0686',
    'https://www.cayusevineyards.com',
    4.9,
    124,
    ARRAY['Biodynamic', 'Highly Allocated', 'Estate Vineyards', 'Rhône Varieties'],
    true
),
(
    'Sleight of Hand Cellars',
    'sleight-of-hand',
    'Walla Walla Valley',
    'Rock-and-roll inspired winery known for creative blends and a fun, approachable tasting experience.',
    'Sleight of Hand Cellars brings a rock-and-roll attitude to Walla Walla winemaking. Founded by Trey Busch and Jerry Solomon, the winery is known for its creative approach to winemaking and fun, music-inspired wine names.

The tasting room offers an energetic, welcoming atmosphere where guests can enjoy a diverse portfolio of wines, from bold reds to crisp whites. The winery''s "Conjurer" and "Psychedelic Syrah" have become fan favorites.',
    ARRAY['Syrah', 'Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Riesling'],
    15.00,
    'Waived with purchase',
    false,
    'Daily 11am - 5pm',
    '1959 JB George Rd, Walla Walla, WA 99362',
    '(509) 525-3661',
    'https://www.sofhcellars.com',
    4.5,
    231,
    ARRAY['Music Theme', 'Fun Atmosphere', 'Wine Club', 'Outdoor Patio', 'Dog Friendly'],
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    wine_styles = EXCLUDED.wine_styles,
    tasting_fee = EXCLUDED.tasting_fee,
    tasting_fee_waived = EXCLUDED.tasting_fee_waived,
    reservation_required = EXCLUDED.reservation_required,
    hours = EXCLUDED.hours,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE wineries IS 'Directory of wineries in the Walla Walla Valley';
COMMENT ON COLUMN wineries.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN wineries.wine_styles IS 'Array of wine varieties produced';
COMMENT ON COLUMN wineries.features IS 'Array of amenities and features';
COMMENT ON COLUMN wineries.tasting_fee_waived IS 'Conditions under which tasting fee is waived';



-- Wineries Table
-- ============================================================================
-- Stores winery information for the directory and AI Knowledge Base

CREATE TABLE IF NOT EXISTS wineries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    region VARCHAR(100) DEFAULT 'Walla Walla Valley',
    description TEXT NOT NULL,
    long_description TEXT,
    wine_styles TEXT[] DEFAULT '{}',
    tasting_fee DECIMAL(10, 2) DEFAULT 0,
    tasting_fee_waived VARCHAR(255),
    reservation_required BOOLEAN DEFAULT false,
    hours VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    website VARCHAR(500),
    email VARCHAR(255),
    rating DECIMAL(2, 1),
    review_count INTEGER DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    image_url VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wineries_slug ON wineries(slug);
CREATE INDEX IF NOT EXISTS idx_wineries_active ON wineries(is_active);
CREATE INDEX IF NOT EXISTS idx_wineries_rating ON wineries(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wineries_region ON wineries(region);

-- ============================================================================
-- Seed Data - Sample Wineries
-- ============================================================================

INSERT INTO wineries (name, slug, region, description, long_description, wine_styles, tasting_fee, tasting_fee_waived, reservation_required, hours, address, phone, website, rating, review_count, features, is_active)
VALUES
(
    'L''Ecole No. 41',
    'lecole-no-41',
    'Walla Walla Valley',
    'Pioneer Walla Walla winery in a historic schoolhouse. Known for exceptional Semillon and Cabernet Sauvignon.',
    'L''Ecole No. 41 is a third-generation family-owned artisan winery located in the historic Frenchtown School depicted on our label. Founded in 1983, we are the third oldest winery in the Walla Walla Valley. Our wines are made from grapes grown in our certified sustainable estate vineyards and from other premier vineyards in the Columbia Valley.

The winery is known for producing exceptional Semillon, which has become a signature variety, as well as outstanding Cabernet Sauvignon, Merlot, and other Bordeaux varieties. The tasting room is housed in the original 1915 schoolhouse, providing a unique and memorable wine tasting experience.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Semillon', 'Chardonnay', 'Syrah'],
    20.00,
    'Waived with purchase of 2+ bottles',
    false,
    'Daily 10am - 5pm',
    '41 Lowden School Road, Lowden, WA 99360',
    '(509) 525-0940',
    'https://www.lecole.com',
    4.8,
    342,
    ARRAY['Historic Building', 'Picnic Area', 'Wine Club', 'Private Tastings', 'Pet Friendly'],
    true
),
(
    'Foundry Vineyards',
    'foundry-vineyards',
    'Walla Walla Valley',
    'Art-focused winery featuring rotating gallery exhibitions alongside exceptional wine tastings.',
    'Foundry Vineyards combines the art of winemaking with visual arts in a unique tasting experience. Located in downtown Walla Walla, the winery features rotating art exhibitions from local and regional artists alongside their exceptional wines.

The winery produces small-lot, handcrafted wines focusing on Cabernet Sauvignon, Syrah, and Malbec from premium Walla Walla Valley vineyards. The modern tasting room provides an intimate setting to explore both wine and art.',
    ARRAY['Cabernet Sauvignon', 'Syrah', 'Malbec', 'Red Blend'],
    15.00,
    'Waived with purchase',
    false,
    'Thu-Mon 11am - 5pm',
    '1111 E Main St, Walla Walla, WA 99362',
    '(509) 529-0736',
    'https://www.foundryvineyards.com',
    4.6,
    156,
    ARRAY['Art Gallery', 'Downtown Location', 'Wine Club', 'Events Space'],
    true
),
(
    'Pepper Bridge Winery',
    'pepper-bridge',
    'Walla Walla Valley',
    'Estate winery producing world-class Bordeaux-style wines from certified sustainable vineyards.',
    'Pepper Bridge Winery is one of the founding members of the Walla Walla Valley wine industry and continues to set the standard for premium Bordeaux-style wines. The winery is committed to sustainable viticulture and has been certified by LIVE (Low Input Viticulture and Enology) and Salmon-Safe.

All wines are made from 100% estate-grown grapes from their certified sustainable vineyards, including the acclaimed Pepper Bridge Vineyard and Seven Hills Vineyard. The stunning tasting room offers panoramic views of the Blue Mountains.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Malbec'],
    25.00,
    'Waived for wine club members',
    true,
    'Daily 10am - 4pm (by appointment)',
    '1704 JB George Rd, Walla Walla, WA 99362',
    '(509) 525-6502',
    'https://www.pepperbridge.com',
    4.9,
    287,
    ARRAY['Estate Vineyards', 'Mountain Views', 'Sustainable', 'Wine Club', 'Private Tastings'],
    true
),
(
    'Dunham Cellars',
    'dunham-cellars',
    'Walla Walla Valley',
    'Family-owned winery in a renovated WWII airplane hangar, known for bold reds and their signature Three Legged Red.',
    'Dunham Cellars is a family-owned winery housed in a renovated World War II airplane hangar at the Walla Walla Regional Airport. Founded in 1995, the winery has become known for producing bold, complex red wines.

The winery''s flagship wine, Three Legged Red, has become a cult favorite among wine enthusiasts. The unique tasting room setting, combined with exceptional wines and warm hospitality, makes for a memorable visit.',
    ARRAY['Cabernet Sauvignon', 'Syrah', 'Red Blend'],
    20.00,
    'Waived with purchase',
    false,
    'Daily 11am - 4pm',
    '150 E Boeing Ave, Walla Walla, WA 99362',
    '(509) 529-4685',
    'https://www.dunhamcellars.com',
    4.7,
    198,
    ARRAY['Historic Building', 'Wine Club', 'Dog Friendly', 'Outdoor Seating'],
    true
),
(
    'Leonetti Cellar',
    'leonetti-cellar',
    'Walla Walla Valley',
    'Iconic Washington winery and the first commercial winery in Walla Walla. Mailing list only, but worth the wait.',
    'Leonetti Cellar holds the distinction of being the first commercial winery in the Walla Walla Valley, founded in 1977. The winery has earned legendary status for producing some of Washington''s most sought-after wines.

Due to high demand, Leonetti wines are available exclusively through their mailing list. The winery occasionally offers tastings by appointment for mailing list members. Their Cabernet Sauvignon and Merlot consistently receive critical acclaim.',
    ARRAY['Cabernet Sauvignon', 'Merlot', 'Sangiovese'],
    0.00,
    NULL,
    true,
    'By appointment only',
    '1875 Foothills Lane, Walla Walla, WA 99362',
    '(509) 525-1428',
    'https://www.leonetticellar.com',
    5.0,
    89,
    ARRAY['Mailing List Only', 'Estate Vineyards', 'Historic Winery'],
    true
),
(
    'Gramercy Cellars',
    'gramercy-cellars',
    'Walla Walla Valley',
    'Master Sommelier-owned winery focusing on Rhône and Bordeaux varieties with old-world winemaking techniques.',
    'Gramercy Cellars was founded by Master Sommelier Greg Harrington and his wife Pam in 2005. The winery focuses on producing wines that express the unique terroir of the Walla Walla Valley using traditional, old-world winemaking techniques.

Specializing in Syrah and other Rhône varieties, as well as Cabernet Sauvignon, Gramercy has earned recognition for producing some of the most elegant and age-worthy wines in Washington State.',
    ARRAY['Syrah', 'Cabernet Sauvignon', 'Tempranillo', 'Viognier'],
    20.00,
    'Waived with purchase',
    true,
    'Fri-Sun 11am - 4pm (by appointment)',
    '635 N 13th Ave, Walla Walla, WA 99362',
    '(509) 876-2427',
    'https://www.gramercycellars.com',
    4.8,
    167,
    ARRAY['Master Sommelier', 'Rhône Varieties', 'Wine Club', 'Educational Tastings'],
    true
),
(
    'Cayuse Vineyards',
    'cayuse-vineyards',
    'Walla Walla Valley',
    'Biodynamic pioneer producing highly allocated Syrah and Rhône varieties from unique rocky vineyards.',
    'Cayuse Vineyards, founded by Christophe Baron in 1997, is renowned for its biodynamic farming practices and exceptional Syrah. The winery''s vineyards are planted in the unique cobblestone soils of the Walla Walla Valley.

The wines from Cayuse are highly allocated and sought after by collectors worldwide. The distinctive terroir, combined with meticulous biodynamic farming, produces wines of remarkable depth and complexity.',
    ARRAY['Syrah', 'Grenache', 'Tempranillo', 'Viognier'],
    0.00,
    NULL,
    true,
    'By appointment only',
    'Milton-Freewater, OR',
    '(509) 526-0686',
    'https://www.cayusevineyards.com',
    4.9,
    124,
    ARRAY['Biodynamic', 'Highly Allocated', 'Estate Vineyards', 'Rhône Varieties'],
    true
),
(
    'Sleight of Hand Cellars',
    'sleight-of-hand',
    'Walla Walla Valley',
    'Rock-and-roll inspired winery known for creative blends and a fun, approachable tasting experience.',
    'Sleight of Hand Cellars brings a rock-and-roll attitude to Walla Walla winemaking. Founded by Trey Busch and Jerry Solomon, the winery is known for its creative approach to winemaking and fun, music-inspired wine names.

The tasting room offers an energetic, welcoming atmosphere where guests can enjoy a diverse portfolio of wines, from bold reds to crisp whites. The winery''s "Conjurer" and "Psychedelic Syrah" have become fan favorites.',
    ARRAY['Syrah', 'Cabernet Sauvignon', 'Merlot', 'Chardonnay', 'Riesling'],
    15.00,
    'Waived with purchase',
    false,
    'Daily 11am - 5pm',
    '1959 JB George Rd, Walla Walla, WA 99362',
    '(509) 525-3661',
    'https://www.sofhcellars.com',
    4.5,
    231,
    ARRAY['Music Theme', 'Fun Atmosphere', 'Wine Club', 'Outdoor Patio', 'Dog Friendly'],
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    wine_styles = EXCLUDED.wine_styles,
    tasting_fee = EXCLUDED.tasting_fee,
    tasting_fee_waived = EXCLUDED.tasting_fee_waived,
    reservation_required = EXCLUDED.reservation_required,
    hours = EXCLUDED.hours,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE wineries IS 'Directory of wineries in the Walla Walla Valley';
COMMENT ON COLUMN wineries.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN wineries.wine_styles IS 'Array of wine varieties produced';
COMMENT ON COLUMN wineries.features IS 'Array of amenities and features';
COMMENT ON COLUMN wineries.tasting_fee_waived IS 'Conditions under which tasting fee is waived';




