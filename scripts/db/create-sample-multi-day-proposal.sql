-- Create a sample multi-day proposal for testing
-- Run this script to create a test proposal you can view

-- Insert the proposal
INSERT INTO proposals (
  proposal_number,
  title,
  client_name,
  client_email,
  client_phone,
  service_items,
  subtotal,
  discount_amount,
  discount_percentage,
  total,
  gratuity_enabled,
  gratuity_percentage,
  notes,
  valid_until,
  status,
  modules,
  multi_day_itinerary,
  corporate_details
) VALUES (
  'MULTI-2025-001',
  'Walla Walla Wine Country Executive Retreat',
  'Sarah Johnson',
  'sarah.johnson@acmecorp.com',
  '(206) 555-0123',
  '[
    {
      "id": "1",
      "service_type": "wine_tour",
      "date": "2025-06-16",
      "duration_hours": 6,
      "party_size": 12,
      "pricing_type": "calculated",
      "price": 900,
      "description": "Full-day wine tour visiting premier wineries"
    },
    {
      "id": "2",
      "service_type": "airport_transfer",
      "date": "2025-06-15",
      "duration_hours": 4,
      "party_size": 12,
      "pricing_type": "flat",
      "price": 850,
      "description": "Seattle-Tacoma Airport to Walla Walla"
    },
    {
      "id": "3",
      "service_type": "airport_transfer",
      "date": "2025-06-17",
      "duration_hours": 4,
      "party_size": 12,
      "pricing_type": "flat",
      "price": 850,
      "description": "Walla Walla to Seattle-Tacoma Airport"
    }
  ]'::jsonb,
  2600.00,
  0.00,
  0,
  2831.40,
  true,
  20,
  'Looking forward to hosting your team!',
  NOW() + INTERVAL '7 days',
  'sent',
  '{"multi_day": true, "corporate": true}'::jsonb,
  '[
    {
      "day": 1,
      "title": "Wine Country Arrival",
      "date": "2025-06-15",
      "activities": [
        "Airport pickup from Seattle-Tacoma International Airport",
        "Scenic drive through the Columbia Valley (4 hours)",
        "Hotel check-in at Marcus Whitman Hotel & Conference Center",
        "Welcome reception with local wine tasting",
        "Team dinner at Saffron Mediterranean Kitchen"
      ],
      "accommodation": "Marcus Whitman Hotel & Conference Center",
      "meals": ["Dinner"]
    },
    {
      "day": 2,
      "title": "Full-Day Wine Tour & Team Building",
      "date": "2025-06-16",
      "activities": [
        "Breakfast at hotel",
        "Morning visit to Leonetti Cellar (private tasting)",
        "Team building activity: Blending workshop",
        "Gourmet lunch at Walla Faces Brewing Co.",
        "Afternoon visit to L''Ecole No 41 (estate tour)",
        "Visit Woodward Canyon Winery",
        "Sunset tasting at Abeja with vineyard views",
        "Return to hotel for evening at leisure"
      ],
      "accommodation": "Marcus Whitman Hotel & Conference Center",
      "meals": ["Breakfast", "Lunch"]
    },
    {
      "day": 3,
      "title": "Morning Winery Visit & Departure",
      "date": "2025-06-17",
      "activities": [
        "Breakfast at hotel",
        "Hotel checkout",
        "Morning visit to Pepper Bridge Winery",
        "Wine purchase opportunity and shipping arrangements",
        "Departure for Seattle-Tacoma International Airport",
        "Arrive Seattle early evening"
      ],
      "meals": ["Breakfast"]
    }
  ]'::jsonb,
  '{
    "company_name": "Acme Corporation",
    "contact_person": "Sarah Johnson, VP of Operations",
    "po_number": "PO-2025-12345",
    "billing_address": "123 Business Street, Suite 500, Seattle, WA 98101"
  }'::jsonb
);

-- Get the proposal number for viewing
SELECT 
  proposal_number,
  title,
  client_name,
  status,
  'View at: http://localhost:3000/proposals/' || proposal_number AS url
FROM proposals 
WHERE proposal_number = 'MULTI-2025-001';

