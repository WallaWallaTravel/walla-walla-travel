-- Multi-Brand Architecture for Walla Walla Travel Portfolio
-- Supports: Walla Walla Travel, Herding Cats Wine Tours, NW Touring & Concierge

-- 1. Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  brand_code VARCHAR(20) UNIQUE NOT NULL, -- 'WWT', 'HCWT', 'NWTC'
  brand_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  legal_name VARCHAR(255), -- "NW Touring & Concierge LLC"
  tagline TEXT,
  
  -- Contact Info
  website_url VARCHAR(255),
  booking_url VARCHAR(255), -- Direct booking link
  email_from VARCHAR(255), -- Sender email for confirmations
  email_support VARCHAR(255), -- Customer support email
  phone VARCHAR(20),
  phone_display VARCHAR(50), -- Formatted for display
  
  -- Branding Assets
  logo_url VARCHAR(255),
  icon_url VARCHAR(255),
  primary_color VARCHAR(7), -- Hex color code
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  
  -- Positioning & Marketing
  target_market TEXT, -- 'corporate', 'leisure', 'premium', 'fun'
  description TEXT,
  meta_description TEXT, -- For SEO
  short_description TEXT, -- For cards/previews
  
  -- Terms & Policies
  terms_url VARCHAR(255),
  cancellation_policy_url VARCHAR(255),
  
  -- Configuration
  active BOOLEAN DEFAULT true,
  show_on_wwt BOOLEAN DEFAULT true, -- Show as partner on WWT site
  default_brand BOOLEAN DEFAULT false, -- If no brand specified
  
  -- Operational
  operating_entity VARCHAR(255), -- "NW Touring & Concierge LLC" for all
  insurance_policy_number VARCHAR(100),
  license_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Seed the three brands
INSERT INTO brands (
  brand_code, 
  brand_name, 
  display_name, 
  legal_name,
  tagline,
  website_url,
  booking_url,
  email_from,
  email_support,
  phone,
  phone_display,
  primary_color,
  target_market,
  description,
  short_description,
  show_on_wwt,
  default_brand,
  operating_entity
) VALUES
(
  'WWT',
  'Walla Walla Travel',
  'Walla Walla Travel',
  'Walla Walla Travel',
  'We handle everything. You enjoy.',
  'https://wallawalla.travel',
  'https://wallawalla.travel/book',
  'concierge@wallawalla.travel',
  'info@wallawalla.travel',
  '+15092008000',
  '(509) 200-8000',
  '#8B2E3E', -- Wine red
  'premium',
  'Your complete Walla Walla wine country experience. We curate every detail - from winery selection to lunch reservations - so you can simply enjoy.',
  'Full-service wine country concierge',
  false, -- Don't show WWT as partner on its own site
  true, -- Default if no brand specified
  'NW Touring & Concierge LLC'
),
(
  'HCWT',
  'Herding Cats Wine Tours',
  'Herding Cats Wine Tours',
  'NW Touring & Concierge LLC (DBA Herding Cats Wine Tours)',
  'Seriously fun wine tours',
  'https://herdingcatswine.com',
  'https://herdingcatswine.com/book',
  'tours@hctours.com',
  'info@hctours.com',
  '+15092008000',
  '(509) 200-8000',
  '#9B59B6', -- Playful purple
  'leisure',
  'Wine tours that are as fun as herding cats (which is to say, a blast!). Great wineries, awesome guides, unforgettable memories. No corporate stiffness here.',
  'Fun, casual wine country tours',
  true, -- Show as partner on WWT
  false,
  'NW Touring & Concierge LLC'
),
(
  'NWTC',
  'NW Touring & Concierge',
  'NW Touring & Concierge',
  'NW Touring & Concierge LLC',
  'Excellence in corporate transportation',
  'https://nwtouring.com',
  'https://nwtouring.com/book',
  'bookings@nwtouring.com',
  'info@nwtouring.com',
  '+15092008000',
  '(509) 200-8000',
  '#1A1F3A', -- Professional dark blue
  'corporate',
  'Professional wine country transportation for corporate groups and business events. Reliable, polished, and perfectly coordinated.',
  'Professional corporate transportation',
  true, -- Show as partner on WWT
  false,
  'NW Touring & Concierge LLC'
);

-- 3. Add brand references to existing tables

-- Bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_bookings_brand ON bookings(brand_id);

-- Reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_reservations_brand ON reservations(brand_id);

-- Proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_proposals_brand ON proposals(brand_id);

-- Corporate Requests
ALTER TABLE corporate_requests ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
ALTER TABLE corporate_requests ADD COLUMN IF NOT EXISTS brand_code VARCHAR(20);

-- Customers (track which brand they discovered through)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discovery_brand_id INTEGER REFERENCES brands(id);
COMMENT ON COLUMN customers.discovery_brand_id IS 'Which brand the customer first discovered/booked through';

-- 4. Create brand-specific email templates table
CREATE TABLE IF NOT EXISTS brand_email_templates (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- 'reservation_confirmation', 'booking_confirmation', etc.
  subject_line TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, template_type)
);

CREATE INDEX idx_brand_templates ON brand_email_templates(brand_id, template_type);

-- 5. Create brand performance tracking
CREATE TABLE IF NOT EXISTS brand_metrics (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Traffic
  website_visits INTEGER DEFAULT 0,
  booking_page_visits INTEGER DEFAULT 0,
  
  -- Conversions
  reservations_created INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2), -- percentage
  
  -- Revenue
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_booking_value DECIMAL(10,2),
  
  -- Customer
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, metric_date)
);

CREATE INDEX idx_brand_metrics_date ON brand_metrics(brand_id, metric_date DESC);

-- 6. Add helper functions

-- Get brand by code
CREATE OR REPLACE FUNCTION get_brand_by_code(code VARCHAR(20))
RETURNS brands AS $$
  SELECT * FROM brands WHERE brand_code = code AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get default brand
CREATE OR REPLACE FUNCTION get_default_brand()
RETURNS brands AS $$
  SELECT * FROM brands WHERE default_brand = true AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get partner brands (for showing on WWT)
CREATE OR REPLACE FUNCTION get_partner_brands()
RETURNS SETOF brands AS $$
  SELECT * FROM brands WHERE show_on_wwt = true AND active = true ORDER BY brand_name;
$$ LANGUAGE sql STABLE;

-- 7. Comments for documentation
COMMENT ON TABLE brands IS 'Multi-brand portfolio: WWT, Herding Cats, NW Touring';
COMMENT ON COLUMN brands.brand_code IS 'Unique identifier: WWT, HCWT, NWTC';
COMMENT ON COLUMN brands.operating_entity IS 'Legal entity operating tours (all under NW Touring & Concierge LLC)';
COMMENT ON COLUMN brands.show_on_wwt IS 'Whether to show this brand as a partner option on WWT site';
COMMENT ON COLUMN brands.default_brand IS 'Use this brand if customer does not explicitly choose';

-- 8. Update existing bookings/reservations to default brand (WWT)
DO $$
DECLARE
  default_brand_id INTEGER;
BEGIN
  SELECT id INTO default_brand_id FROM brands WHERE brand_code = 'WWT';
  
  UPDATE bookings SET brand_id = default_brand_id WHERE brand_id IS NULL;
  UPDATE reservations SET brand_id = default_brand_id WHERE brand_id IS NULL;
  UPDATE proposals SET brand_id = default_brand_id WHERE brand_id IS NULL;
END $$;

-- 9. Create view for brand statistics
CREATE OR REPLACE VIEW brand_statistics AS
SELECT 
  b.brand_code,
  b.brand_name,
  b.target_market,
  COUNT(DISTINCT bk.id) as total_bookings,
  COUNT(DISTINCT r.id) as total_reservations,
  COUNT(DISTINCT p.id) as total_proposals,
  SUM(bk.total_price) as total_revenue,
  AVG(bk.total_price) as avg_booking_value,
  COUNT(DISTINCT bk.customer_id) as unique_customers
FROM brands b
LEFT JOIN bookings bk ON bk.brand_id = b.id
LEFT JOIN reservations r ON r.brand_id = b.id
LEFT JOIN proposals p ON p.brand_id = b.id
WHERE b.active = true
GROUP BY b.id, b.brand_code, b.brand_name, b.target_market;

COMMENT ON VIEW brand_statistics IS 'Real-time statistics for each brand';


