# Viewing Sample Proposals

## Multi-Day Proposal

I've created a sample 3-day corporate retreat proposal for you to view!

### View the Proposal

**URL:** http://localhost:3000/proposals/MULTI-2025-001

### What You'll See

**Proposal Details:**
- **Title:** Walla Walla Wine Country Executive Retreat
- **Client:** Sarah Johnson (Acme Corporation)
- **Type:** 3-Day Multi-Day Itinerary + Corporate Event
- **Total:** $2,831.40

**Features Showcased:**

1. **Corporate Module** (Slate header)
   - Company: Acme Corporation
   - Contact Person: Sarah Johnson, VP of Operations
   - PO Number: PO-2025-12345
   - Billing Address

2. **3-Day Timeline** (Burgundy header with vertical timeline)
   - **Day 1:** Wine Country Arrival
     - Airport pickup from Seattle
     - Hotel check-in
     - Welcome reception
     - Team dinner
     - Accommodation: Marcus Whitman Hotel
     - Meals: Dinner
   
   - **Day 2:** Full-Day Wine Tour & Team Building
     - Breakfast at hotel
     - Leonetti Cellar (private tasting)
     - Blending workshop
     - Lunch at Walla Faces
     - L'Ecole No 41 (estate tour)
     - Woodward Canyon Winery
     - Sunset tasting at Abeja
     - Accommodation: Marcus Whitman Hotel
     - Meals: Breakfast, Lunch
   
   - **Day 3:** Morning Winery Visit & Departure
     - Breakfast at hotel
     - Pepper Bridge Winery
     - Airport transfer to Seattle
     - Meals: Breakfast

3. **Service Items** (Standard wine tour display)
   - Full-day wine tour (Day 2)
   - Airport transfer (arrival)
   - Airport transfer (departure)

4. **Pricing Section**
   - Subtotal: $2,600.00
   - Tax: $231.40
   - Total: $2,831.40
   - 50% Deposit: $1,415.70

## Creating More Sample Proposals

### Simple Wine Tour
```sql
-- Run in psql
psql $DATABASE_URL

INSERT INTO proposals (
  proposal_number, title, client_name, client_email,
  service_items, subtotal, total, status, valid_until
) VALUES (
  'SIMPLE-2025-001',
  'Afternoon Wine Tour',
  'John Doe',
  'john@example.com',
  '[{"id":"1","service_type":"wine_tour","date":"2025-06-20","duration_hours":6,"party_size":4,"pricing_type":"calculated","price":630,"description":"Full-day wine tour visiting 3 premier wineries"}]'::jsonb,
  630.00,
  686.07,
  'sent',
  NOW() + INTERVAL '7 days'
);
```

**View at:** http://localhost:3000/proposals/SIMPLE-2025-001

### Weekend Getaway (2-Day)
```sql
INSERT INTO proposals (
  proposal_number, title, client_name, client_email,
  service_items, subtotal, total, status, valid_until,
  modules, multi_day_itinerary
) VALUES (
  'WEEKEND-2025-001',
  'Romantic Weekend Wine Tour',
  'Jane Smith',
  'jane@example.com',
  '[{"id":"1","service_type":"wine_tour","date":"2025-07-15","duration_hours":6,"party_size":2,"pricing_type":"calculated","price":510}]'::jsonb,
  510.00,
  555.39,
  'sent',
  NOW() + INTERVAL '7 days',
  '{"multi_day": true}'::jsonb,
  '[
    {
      "day": 1,
      "title": "Arrival & Evening Tasting",
      "date": "2025-07-14",
      "activities": [
        "Check-in at Inn at Abeja",
        "Evening wine tasting at estate",
        "Romantic dinner"
      ],
      "accommodation": "Inn at Abeja",
      "meals": ["Dinner"]
    },
    {
      "day": 2,
      "title": "Full-Day Wine Tour",
      "date": "2025-07-15",
      "activities": [
        "Visit 3 premier wineries",
        "Gourmet lunch",
        "Sunset tasting"
      ],
      "accommodation": "Inn at Abeja",
      "meals": ["Breakfast", "Lunch"]
    }
  ]'::jsonb
);
```

**View at:** http://localhost:3000/proposals/WEEKEND-2025-001

## Deleting Sample Proposals

When you're done testing:

```sql
-- Delete specific proposal
DELETE FROM proposals WHERE proposal_number = 'MULTI-2025-001';

-- Delete all test proposals
DELETE FROM proposals WHERE proposal_number LIKE '%-2025-%';
```

## Testing Different Modules

### Corporate Only
```sql
UPDATE proposals 
SET 
  modules = '{"corporate": true}'::jsonb,
  corporate_details = '{
    "company_name": "Tech Startup Inc",
    "contact_person": "Mike Chen",
    "po_number": "PO-2025-99999"
  }'::jsonb
WHERE proposal_number = 'SIMPLE-2025-001';
```

### Special Event
```sql
UPDATE proposals 
SET 
  modules = '{"special_event": true}'::jsonb,
  special_event_details = '{
    "event_type": "Anniversary Celebration",
    "occasion": "25th Wedding Anniversary",
    "special_requests": "Private winery tour with champagne toast"
  }'::jsonb
WHERE proposal_number = 'SIMPLE-2025-001';
```

## Troubleshooting

### Proposal Not Found
- Check the proposal_number is correct
- Verify the proposal exists: `SELECT * FROM proposals WHERE proposal_number = 'MULTI-2025-001';`
- Make sure dev server is running: `npm run dev`

### Modules Not Showing
- Check `modules` field: `SELECT modules FROM proposals WHERE proposal_number = 'MULTI-2025-001';`
- Verify the module data exists (e.g., `multi_day_itinerary`, `corporate_details`)

### Styling Issues
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for errors
- Verify Tailwind CSS is compiling

## Next Steps

1. **View the proposal** at http://localhost:3000/proposals/MULTI-2025-001
2. **Test the timeline** - scroll through the 3-day itinerary
3. **Check responsiveness** - resize browser window
4. **Test acceptance flow** - click "Accept Proposal & Continue"
5. **Create variations** - modify the data to test different scenarios

---

**Quick Access:**
- Multi-Day Sample: http://localhost:3000/proposals/MULTI-2025-001
- Script Location: `/scripts/create-sample-multi-day-proposal.sql`

