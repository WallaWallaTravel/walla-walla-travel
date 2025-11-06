-- Create test proposal for testing the acceptance flow
-- This creates a complete proposal with all features

-- Standard leisure proposal
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  client_phone,
  service_items,
  subtotal,
  discount_amount,
  total,
  gratuity_enabled,
  gratuity_percentage,
  notes,
  valid_until,
  status,
  created_at
) VALUES (
  'TEST-2025-001',
  'Wine Country Experience',
  'John & Jane Doe',
  'john.doe@example.com',
  '(509) 555-0123',
  '[
    {
      "id": "1",
      "service_type": "wine_tour",
      "date": "2025-06-15",
      "duration_hours": 6,
      "party_size": 4,
      "pricing_type": "calculated",
      "price": 570,
      "description": "Full-day wine tour visiting 4 premier wineries",
      "notes": "Includes tastings and lunch coordination"
    }
  ]'::jsonb,
  570.00,
  0.00,
  620.73,
  true,
  20,
  'Looking forward to hosting you! We''ll visit some of our favorite wineries and ensure you have an unforgettable experience.',
  '2025-12-31',
  'sent',
  NOW()
) ON CONFLICT (proposal_number) DO UPDATE SET
  status = 'sent',
  valid_until = '2025-12-31';

-- Corporate proposal with modules
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  client_phone,
  service_items,
  subtotal,
  total,
  gratuity_enabled,
  valid_until,
  status,
  modules,
  corporate_details,
  created_at
) VALUES (
  'TEST-2025-002',
  'Corporate Team Building Event',
  'Acme Corporation',
  'events@acme.com',
  '(206) 555-0199',
  '[
    {
      "id": "1",
      "service_type": "wine_tour",
      "date": "2025-07-10",
      "duration_hours": 6,
      "party_size": 12,
      "pricing_type": "calculated",
      "price": 840,
      "description": "Team building wine tour for 12 employees"
    }
  ]'::jsonb,
  840.00,
  914.76,
  true,
  '2025-12-31',
  'sent',
  '{"corporate": true}'::jsonb,
  '{
    "company_name": "Acme Corporation",
    "contact_person": "Sarah Johnson",
    "po_number": "PO-2025-12345",
    "billing_address": "123 Business Ave, Seattle, WA 98101"
  }'::jsonb,
  NOW()
) ON CONFLICT (proposal_number) DO UPDATE SET
  status = 'sent',
  valid_until = '2025-12-31';

-- Multi-day proposal
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  service_items,
  subtotal,
  total,
  gratuity_enabled,
  valid_until,
  status,
  modules,
  multi_day_itinerary,
  created_at
) VALUES (
  'TEST-2025-003',
  '3-Day Wine Country Retreat',
  'Smith Family',
  'smith.family@example.com',
  '[
    {
      "id": "1",
      "service_type": "airport_transfer",
      "date": "2025-08-01",
      "party_size": 4,
      "pricing_type": "flat",
      "price": 150,
      "description": "Airport pickup - Pasco to Walla Walla"
    },
    {
      "id": "2",
      "service_type": "wine_tour",
      "date": "2025-08-02",
      "duration_hours": 6,
      "party_size": 4,
      "pricing_type": "calculated",
      "price": 570,
      "description": "Full-day wine tour"
    },
    {
      "id": "3",
      "service_type": "wine_tour",
      "date": "2025-08-03",
      "duration_hours": 4,
      "party_size": 4,
      "pricing_type": "calculated",
      "price": 380,
      "description": "Half-day tour before departure"
    },
    {
      "id": "4",
      "service_type": "airport_transfer",
      "date": "2025-08-03",
      "party_size": 4,
      "pricing_type": "flat",
      "price": 150,
      "description": "Airport drop-off - Walla Walla to Pasco"
    }
  ]'::jsonb,
  1250.00,
  1361.25,
  true,
  '2025-12-31',
  'sent',
  '{"multi_day": true}'::jsonb,
  '[
    {
      "day": 1,
      "date": "2025-08-01",
      "title": "Arrival Day",
      "activities": [
        "Airport pickup at 2:00 PM",
        "Transfer to Marcus Whitman Hotel",
        "Check-in and settle",
        "Dinner recommendation: Saffron Mediterranean Kitchen"
      ],
      "accommodation": "Marcus Whitman Hotel & Conference Center",
      "meals": ["Dinner (on your own)"]
    },
    {
      "day": 2,
      "date": "2025-08-02",
      "title": "Full Wine Tour",
      "activities": [
        "Pickup at 10:00 AM",
        "Visit Leonetti Cellar (10:30 AM)",
        "Lunch at Dunham Cellars (12:30 PM)",
        "Visit L''Ecole No 41 (2:00 PM)",
        "Sunset tasting at Waterbrook (4:00 PM)",
        "Return to hotel by 5:30 PM"
      ],
      "meals": ["Breakfast (hotel)", "Lunch (included)"]
    },
    {
      "day": 3,
      "date": "2025-08-03",
      "title": "Departure Day",
      "activities": [
        "Breakfast at hotel",
        "Pickup at 9:00 AM",
        "Morning tour of 2 wineries",
        "Airport transfer at 1:00 PM"
      ],
      "meals": ["Breakfast (hotel)"]
    }
  ]'::jsonb,
  NOW()
) ON CONFLICT (proposal_number) DO UPDATE SET
  status = 'sent',
  valid_until = '2025-12-31';

-- Wedding/Special Event proposal
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  service_items,
  subtotal,
  total,
  gratuity_enabled,
  valid_until,
  status,
  modules,
  special_event_details,
  created_at
) VALUES (
  'TEST-2025-004',
  'Wedding Wine Tour',
  'Sarah & Mike',
  'sarah.mike.wedding@example.com',
  '[
    {
      "id": "1",
      "service_type": "wine_tour",
      "date": "2025-09-20",
      "duration_hours": 6,
      "party_size": 8,
      "pricing_type": "calculated",
      "price": 690,
      "description": "Wedding party wine tour",
      "notes": "Champagne toast, rose petals, special playlist"
    }
  ]'::jsonb,
  690.00,
  751.41,
  true,
  '2025-12-31',
  'sent',
  '{"special_event": true}'::jsonb,
  '{
    "event_type": "Wedding",
    "occasion": "Sarah & Mike''s Wedding Celebration",
    "special_requests": "Champagne toast at sunset, rose petals in vehicle, romantic playlist, photo stops at scenic viewpoints",
    "vip_needs": ["Wheelchair accessible for grandmother", "Gluten-free lunch options", "Sparkling cider for non-drinkers"]
  }'::jsonb,
  NOW()
) ON CONFLICT (proposal_number) DO UPDATE SET
  status = 'sent',
  valid_until = '2025-12-31';

-- Print confirmation
SELECT 
  proposal_number,
  title,
  client_name,
  status,
  total,
  CASE 
    WHEN modules->>'corporate' = 'true' THEN 'Corporate'
    WHEN modules->>'multi_day' = 'true' THEN 'Multi-Day'
    WHEN modules->>'special_event' = 'true' THEN 'Special Event'
    ELSE 'Standard'
  END as type
FROM proposals 
WHERE proposal_number LIKE 'TEST-2025-%'
ORDER BY proposal_number;

