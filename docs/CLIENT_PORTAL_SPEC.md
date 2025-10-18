# Phase 3: Premium Client Portal
## Technical Specification Document

**Version:** 1.0
**Target Release:** Q1-Q2 2026
**Development Timeline:** 16 weeks
**Priority:** High (Competitive Differentiation)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Vision](#strategic-vision)
3. [Feature Specifications](#feature-specifications)
4. [Winery Information System](#winery-information-system)
5. [Interactive Lunch Ordering](#interactive-lunch-ordering)
6. [Live Tracking & Communication](#live-tracking--communication)
7. [Post-Tour Experience](#post-tour-experience)
8. [Mobile-First UX Design](#mobile-first-ux-design)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Revenue & Business Impact](#revenue--business-impact)

---

## Executive Summary

The Premium Client Portal transforms basic transportation service into a comprehensive wine country concierge experience. This white-glove digital experience differentiates Walla Walla Travel from commodity transportation providers and justifies premium pricing.

### Core Philosophy

> "We're not selling rides. We're selling unforgettable wine country experiences."

The portal serves as a **digital sommelier and tour guide**, providing:
- Curated winery information and recommendations
- Interactive itinerary planning and customization
- Real-time tour tracking and communication
- Seamless lunch ordering from partner restaurants
- Wine purchase assistance and shipment coordination
- Post-tour engagement and rebooking incentives

### Business Impact

**Revenue Drivers:**
- **Premium Pricing:** 15-25% price increase justified by enhanced experience
- **Lunch Commissions:** 10-15% from partner restaurants ($40-60 per tour)
- **Wine Commissions:** 10-15% from direct-to-consumer wine sales ($75-150 per tour)
- **Repeat Bookings:** 40% increase in rebooking rate
- **Referrals:** 35% of customers refer friends/family

**Competitive Moats:**
- Proprietary winery database with exclusive content
- Partner relationships (wineries, restaurants)
- Superior customer experience (NPS 70+)
- Network effects (more bookings = better data = better recommendations)

---

## Strategic Vision

### Customer Journey Transformation

**Traditional Experience (Competitor):**
```
Book → Show up → Get driven → Go home → Forget
```

**Walla Walla Travel Premium Experience:**
```
Book →
  Explore portal (learn about wineries) →
  Customize itinerary →
  Get excited (photos, videos, tasting notes) →
  Receive welcome message from driver →
Tour Day:
  Track driver arrival →
  Order lunch via app →
  Access tasting notes →
  Purchase wines (ship home) →
  Share photos with group →
Post-Tour:
  Review favorite wines →
  Track wine shipments →
  Receive personalized recommendations →
  Share experience (reviews, social) →
  Easy rebooking with saved preferences →
  Join wine club partnerships →
Repeat customer with emotional connection
```

### Differentiation Strategy

| Feature | Competitors | Walla Walla Travel |
|---------|-------------|-------------------|
| Booking | Phone/email | Online 24/7 + mobile |
| Itinerary | Driver decides | Customer customizes |
| Winery Info | Google search | Rich portal with exclusive content |
| Lunch | Figure it out | Pre-order via app |
| Wine Purchases | Carry bottles | Ship home, track delivery |
| Communication | Phone calls | In-app chat, live tracking |
| Post-Tour | Nothing | Tasting notes, recommendations, rebooking |
| Engagement | One-time transaction | Ongoing relationship |

---

## Feature Specifications

### F-1: Personalized Welcome Portal

**User Story:**
> As a **booked customer**, I want **a personalized portal for my tour** so that **I can prepare and get excited**.

**Features:**
- Unique portal URL sent via email (e.g., `portal.wallawallatravel.com/tour/WWT-2025-10234`)
- Customized welcome message with tour countdown
- Weather forecast for tour date
- Packing suggestions (dress code, what to bring)
- Group chat for tour participants
- FAQ and tour tips

**Technical Implementation:**
- Next.js dynamic route: `app/portal/[bookingNumber]/page.tsx`
- Authentication via magic link (no password required)
- Progressive Web App (PWA) for offline access
- Push notifications for tour updates

**UI Components:**
```
┌─────────────────────────────────────┐
│ Welcome, John! 🍷                   │
│ Your wine tour is in 5 days         │
├─────────────────────────────────────┤
│ Tour Details                        │
│ Nov 15, 2025 • 10:00 AM • 8 people │
│ Mercedes Sprinter • Eric (Driver)  │
├─────────────────────────────────────┤
│ Weather: 72°F Sunny ☀️             │
│ Dress: Casual, layers recommended  │
├─────────────────────────────────────┤
│ [View Itinerary]                    │
│ [Chat with Group]                   │
│ [Contact Driver]                    │
└─────────────────────────────────────┘
```

---

### F-2: Interactive Winery Guide

**User Story:**
> As a **customer planning my tour**, I want **detailed information about each winery** so that **I can choose wisely and know what to expect**.

**Features:**

**Winery Cards:**
- Professional photography (3-5 images per winery)
- Description and history
- Wine specialties (Cabernet, Syrah, Viognier, etc.)
- Tasting fee and policies
- Amenities (food available, dog-friendly, outdoor seating)
- Customer ratings and reviews
- "Why we love this winery" (curator's notes)
- Virtual tasting room tour (360° photos)

**Interactive Elements:**
- Save favorites (heart icon)
- Compare wineries side-by-side
- Filter by: wine type, amenities, price range
- Sort by: rating, distance, popularity
- Map view with route preview
- Estimated time at each winery

**Content Management:**
- Admin can upload/edit winery content
- Wineries can submit updates (partnership portal)
- Seasonal content (harvest, releases, events)
- Video content from winery owners

**Technical Implementation:**
```typescript
interface Winery {
  id: number;
  name: string;
  slug: string;
  description: string;
  foundedYear?: number;
  winemaker?: string;

  // Location
  address: string;
  coordinates: { lat: number; lng: number };

  // Wines
  specialties: string[]; // ["Cabernet Sauvignon", "Syrah"]
  tastingFee: number;
  tastingFeeWaivedWithPurchase: boolean;

  // Details
  amenities: string[]; // ["dog-friendly", "food-available", "outdoor-seating"]
  reservationRequired: boolean;
  averageVisitDuration: number; // minutes

  // Media
  photos: {
    url: string;
    caption?: string;
    isPrimary: boolean;
  }[];
  virtualTourUrl?: string;
  videoUrl?: string;

  // Reviews
  averageRating: number;
  reviewCount: number;
  curatorNotes?: string;

  // Partnership
  isPartner: boolean;
  commissionRate?: number;
  specialOffers?: string[];
}
```

**UI Design:**
```
┌─────────────────────────────────────┐
│ [Photo Carousel]                    │
│ ← → ❤️ 4.8★ (127 reviews)          │
├─────────────────────────────────────┤
│ Leonetti Cellar                     │
│ 📍 1875 Foothills Lane             │
│                                     │
│ Known for world-class Cabernet     │
│ Sauvignon and Bordeaux blends.     │
│ Family-owned since 1977.           │
│                                     │
│ 🍷 Specialties:                    │
│ Cabernet Sauvignon, Merlot, Sangiovese │
│                                     │
│ 💰 Tasting Fee: $20                │
│ (waived with 2-bottle purchase)    │
│                                     │
│ ✨ Amenities:                      │
│ 🐕 Dog-Friendly                    │
│ 🪑 Outdoor Seating                 │
│ 🎨 Art Gallery                     │
│                                     │
│ "One of Washington's most          │
│ prestigious wineries. Book ahead!" │
│ - Wine Enthusiast Magazine         │
│                                     │
│ [Add to Tour] [View Menu] [360° Tour] │
└─────────────────────────────────────┘
```

---

### F-3: Customizable Itinerary Builder

**User Story:**
> As a **customer**, I want **to customize my tour itinerary** so that **I can visit my preferred wineries in my desired order**.

**Features:**

**Drag-and-Drop Interface:**
- Visual timeline showing tour flow
- Drag wineries to reorder
- Automatic time calculations
- Buffer time indicators
- Lunch break scheduling
- Map updates in real-time

**Smart Suggestions:**
- "Customers who visited X also loved Y"
- Route optimization recommendations
- Timing suggestions (avoid crowds)
- Pairing suggestions (light wines before heavy)

**Constraints & Validation:**
- Maximum wineries based on duration
- Minimum time at each winery (45 min)
- Geographic routing (minimize backtracking)
- Winery operating hours
- Lunch timing (11:30 AM - 2:00 PM window)

**Save & Share:**
- Save multiple itinerary drafts
- Share with tour group for voting
- Compare alternative routes
- Export to calendar (iCal, Google Calendar)

**UI Design:**
```
┌─────────────────────────────────────┐
│ Your 6-Hour Tour                    │
│ Nov 15 • 10:00 AM - 4:00 PM        │
├─────────────────────────────────────┤
│ 10:00 AM - Pickup                   │
│ 📍 Marcus Whitman Hotel            │
│ ⬇️ 15 min drive                     │
│                                     │
│ 10:15 AM - Leonetti Cellar ⭐     │
│ 🍷 Cabernet & Bordeaux blends      │
│ ⏱️ 60 min                           │
│ [Move Up] [Remove] [Details]        │
│ ⬇️ 10 min drive                     │
│                                     │
│ 11:25 AM - Cayuse Vineyards        │
│ 🍷 Biodynamic wines                │
│ ⏱️ 60 min                           │
│ ⬇️ 20 min drive                     │
│                                     │
│ 12:45 PM - Lunch 🍴                │
│ Brasserie Four                      │
│ [Pre-Order Meal]                    │
│ ⏱️ 75 min                           │
│ ⬇️ 5 min drive                      │
│                                     │
│ 2:05 PM - L'Ecole No. 41           │
│ 🍷 Estate wines                    │
│ ⏱️ 60 min                           │
│ ⬇️ 15 min drive                     │
│                                     │
│ 4:00 PM - Return to hotel          │
│                                     │
│ [Add Winery] [Optimize Route]       │
│ [Share with Group] [Save Changes]   │
└─────────────────────────────────────┘
```

---

### F-4: Pre-Tour Wine Education

**User Story:**
> As a **wine novice**, I want **to learn about wines before my tour** so that **I can have more meaningful tasting experiences**.

**Features:**

**Wine 101 Module:**
- Quick video: "Understanding Wine Tasting" (5 min)
- Glossary of wine terms (body, tannins, finish, etc.)
- How to taste wine (look, swirl, smell, sip, savor)
- Common varietals in Walla Walla
- Food and wine pairing basics

**Winery-Specific Prep:**
- What to expect at each winery
- Signature wines to try
- Questions to ask the tasting room staff
- History and fun facts

**Tasting Notes Template:**
- Digital notepad for each winery
- Pre-populated questions (aroma, flavor, finish)
- 5-star rating system
- Notes field
- Photo attachment

**Technical Implementation:**
- Video player with progress tracking
- Interactive quiz (optional, gamified)
- Badge system for learning milestones
- Shareable achievements

---

## Winery Information System

### Database Schema

```sql
CREATE TABLE wineries (
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
  minimum_purchase_for_waiver INTEGER,
  reservation_required BOOLEAN DEFAULT FALSE,
  accepts_walkins BOOLEAN DEFAULT TRUE,
  average_visit_duration INTEGER, -- minutes

  -- Wines
  specialties TEXT[], -- ["Cabernet Sauvignon", "Syrah"]
  production_volume VARCHAR(50), -- "Boutique (<1000 cases)", "Small (1000-5000)", etc.
  price_range VARCHAR(50), -- "$$ ($20-40)", "$$$ ($40-80)", "$$$$ ($80+)"

  -- Hours
  hours_of_operation JSONB,
  seasonal_hours JSONB,

  -- Amenities & Features
  amenities TEXT[], -- ["dog-friendly", "food-available", "outdoor-seating", "picnic-area"]
  accessibility_features TEXT[], -- ["wheelchair-accessible", "ada-restrooms"]

  -- Media
  logo_url VARCHAR(500),
  cover_photo_url VARCHAR(500),
  photos JSONB, -- [{ url, caption, order, isPrimary }]
  virtual_tour_url VARCHAR(500),
  video_url VARCHAR(500),

  -- Reviews & Ratings
  average_rating DECIMAL(2,1),
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
CREATE INDEX idx_wineries_location ON wineries USING GIST(ll_to_earth(latitude, longitude));
```

### Winery Reviews

```sql
CREATE TABLE winery_reviews (
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
```

### Customer Tasting Notes

```sql
CREATE TABLE customer_tasting_notes (
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
```

---

## Interactive Lunch Ordering

### Feature Overview

**Problem:**
During wine tours, coordinating lunch for groups is chaotic:
- Lost time discussing where to eat
- Long waits at restaurants (no reservation)
- Dietary restrictions not communicated
- Bill splitting confusion

**Solution:**
Pre-order meals via app, meals ready when group arrives, seamless payment.

### Partner Restaurant Integration

**Restaurant Partners:**
- Brasserie Four
- The Finch
- Saffron Mediterranean Kitchen
- Whoopemup Hollow Cafe
- Merchants (at Marcus Whitman Hotel)

**Integration Model:**
1. **Menu API:** Restaurants provide digital menu (or we digitize)
2. **Order Transmission:** Orders sent via API or email (depends on restaurant capabilities)
3. **Payment:** Customer pays via Walla Walla Travel, we remit to restaurant weekly
4. **Commission:** 10-15% commission on food sales

### User Experience

**Flow:**
1. Customer receives lunch suggestion at booking (based on itinerary)
2. 48 hours before tour, reminder to pre-order lunch
3. Browse restaurant menu in portal
4. Select meal, specify dietary restrictions
5. Confirm order and timing
6. Restaurant receives order (printed or API)
7. Meal ready when group arrives
8. Customer receives digital receipt

**UI Design:**
```
┌─────────────────────────────────────┐
│ Lunch at Brasserie Four             │
│ Est. Arrival: 12:45 PM              │
├─────────────────────────────────────┤
│ [Menu]                              │
│                                     │
│ 🥗 Starters                         │
│ ▢ Seasonal Soup       $12           │
│ ▢ Caesar Salad        $14           │
│ ▢ Charcuterie Plate   $18           │
│                                     │
│ 🍔 Entrees                          │
│ ✓ Grass-Fed Burger    $22           │
│   Add: ✓ Bacon  ✓ Avocado           │
│   Sides: ▢ Fries  ✓ Side Salad      │
│   Notes: Medium rare, no onions     │
│                                     │
│ ▢ Pan-Seared Salmon   $28           │
│ ▢ Vegetarian Pasta    $24           │
│ ▢ Ribeye Steak        $42           │
│                                     │
│ 🍰 Desserts                         │
│ ▢ Chocolate Torte     $10           │
│ ▢ Seasonal Sorbet     $8            │
│                                     │
│ Your Order: $22.00                  │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```

### Database Schema

```sql
CREATE TABLE restaurants (
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
  order_notification_method VARCHAR(50), -- "email", "api", "phone"

  -- Ratings
  average_rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lunch_orders (
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
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, confirmed, preparing, ready, served, cancelled

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lunch_orders_booking ON lunch_orders(booking_id);
CREATE INDEX idx_lunch_orders_restaurant ON lunch_orders(restaurant_id);
CREATE INDEX idx_lunch_orders_ready_time ON lunch_orders(requested_ready_time);
```

---

## Live Tracking & Communication

### Real-Time Driver Tracking

**User Story:**
> As a **customer waiting for pickup**, I want **to see where my driver is** so that **I can be ready and not anxious**.

**Features:**

**Live Map View:**
- Driver location updates every 10 seconds
- ETA calculation with traffic
- Visual route from driver to pickup location
- "Your driver is 5 minutes away" notifications
- Driver photo and vehicle details

**Push Notifications:**
- "Your driver has started toward you"
- "Your driver is nearby (< 5 min)"
- "Your driver has arrived"
- Notification permissions requested at booking confirmation

**Technical Implementation:**
- WebSocket connection for real-time updates
- Driver app sends GPS coordinates every 10 seconds
- Google Maps API for ETA calculation
- Haversine formula for distance
- Push notifications via service worker (PWA)

**UI Design:**
```
┌─────────────────────────────────────┐
│ Your Driver is on the Way! 🚐      │
│                                     │
│ [Interactive Map]                   │
│ 📍 Driver Location (moving dot)    │
│ 📌 Your Location (fixed pin)       │
│ --- Route Line ---                  │
│                                     │
│ ETA: 8 minutes                      │
│ Distance: 2.3 miles                 │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Eric Critchlow              │   │
│ │ [Driver Photo]              │   │
│ │ Mercedes Sprinter (Sprinter 1) │  │
│ │ License: ABC-1234           │   │
│ │                             │   │
│ │ [📞 Call] [💬 Message]      │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### In-App Messaging

**Features:**
- Text chat with driver
- Group chat for tour participants
- Share photos during tour
- Driver can send updates ("Traffic, 10 min delay")
- Customer can send requests ("Can we add a quick photo stop?")

**Message Types:**
- Text messages
- Photos (from gallery or camera)
- Location pins ("Meet us here")
- Quick replies ("On my way!", "Ready!", "Need 5 more minutes")

**Technical Implementation:**
- WebSocket for real-time messaging
- Message persistence in database
- Push notifications for new messages
- Image upload to Cloudinary
- Read receipts and typing indicators

---

## Post-Tour Experience

### Wine Tracking & Shipment

**User Story:**
> As a **customer who purchased wine**, I want **to track my shipments** so that **I know when my wines will arrive**.

**Features:**

**Wine Purchase Log:**
- Wines purchased at each winery
- Prices and quantities
- Order confirmation numbers
- Shipment tracking numbers
- Expected delivery dates

**Shipment Tracking:**
- Real-time tracking via carrier API (FedEx, UPS)
- Delivery status updates
- Signature requirement alerts
- Delivery photo (if available)

**Wine Cellar:**
- Virtual wine cellar of all purchased wines
- Tasting notes and ratings
- Drinking window recommendations
- Food pairing suggestions
- Repurchase links

**Technical Implementation:**
```sql
CREATE TABLE wine_purchases (
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
  shipment_status VARCHAR(50), -- "pending", "shipped", "in_transit", "delivered"
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
```

### Review & Feedback System

**Post-Tour Email Sequence:**

**Day 1 (Tour Day):**
- Thank you email
- Tour recap with photos
- "How was your experience?" quick survey

**Day 3:**
- Review request email
- "Share your favorite winery" prompt
- Incentive: 10% off next booking for reviews

**Day 7:**
- Wine shipment reminder
- Personalized wine recommendations
- Exclusive offers from wineries

**Review Collection:**
- Overall tour rating (1-5 stars)
- Individual winery ratings
- Driver rating
- Likelihood to recommend (NPS)
- Written feedback
- Photo uploads

**Review Display:**
- Public reviews on website
- Testimonials in marketing
- Winery-specific feedback (shared with partners)
- Driver performance tracking

---

## Mobile-First UX Design

### Design Principles

1. **Mobile-First:** Design for mobile, enhance for desktop
2. **Thumb-Friendly:** All interactive elements within thumb reach
3. **Offline-Capable:** PWA with offline functionality
4. **Fast Loading:** < 2s on 3G connection
5. **Minimal Typing:** Use selectors, checkboxes, voice input
6. **Visual Hierarchy:** Clear calls-to-action
7. **Accessibility:** WCAG 2.1 Level AA compliance

### Component Library

**Winery Card (Mobile):**
```
┌────────────────────────────┐
│ [Hero Photo - 16:9 ratio]  │
│ ❤️ 4.8★                    │
├────────────────────────────┤
│ Leonetti Cellar            │
│ Cabernet • $20 tasting     │
│ 🐕 Dog-friendly            │
│                            │
│ [Add to Tour →]            │
└────────────────────────────┘
```

**Tour Timeline (Mobile):**
```
┌────────────────────────────┐
│ 10:00 AM                   │
│ ○────● Pickup              │
│      📍 Marcus Whitman     │
│                            │
│ 10:15 AM                   │
│ ●────● Leonetti            │
│      🍷 Cab & Bordeaux     │
│      ⏱️ 60 min             │
│                            │
│ 11:25 AM                   │
│ ●────● Cayuse              │
│      🍷 Biodynamic         │
│      ⏱️ 60 min             │
│                            │
│ [+] Add winery             │
└────────────────────────────┘
```

### Performance Optimization

**Techniques:**
- Image lazy loading
- Code splitting by route
- Service worker caching
- Prefetch next step in flow
- Skeleton screens while loading
- Optimistic UI updates
- Background sync for offline actions

**Metrics:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

---

## Implementation Roadmap

### Phase 3.1: Winery Information System (Weeks 1-4)

**Week 1-2: Database & Content**
- [ ] Create winery database schema
- [ ] Build admin CMS for winery content
- [ ] Seed database with 50+ Walla Walla wineries
- [ ] Upload professional photos (hire photographer if needed)
- [ ] Write curator notes for each winery

**Week 3-4: Public Interface**
- [ ] Build winery browse/search interface
- [ ] Implement filtering and sorting
- [ ] Create winery detail pages
- [ ] Add map view with route preview
- [ ] Implement favorite/save functionality

**Deliverables:**
- Complete winery database
- Public winery directory
- Admin content management system

### Phase 3.2: Itinerary Builder (Weeks 5-7)

**Week 5: UI Development**
- [ ] Design drag-and-drop interface
- [ ] Build timeline visualization
- [ ] Implement route optimization
- [ ] Add time calculations

**Week 6: Smart Features**
- [ ] Build recommendation engine
- [ ] Implement constraint validation
- [ ] Add sharing functionality
- [ ] Create export to calendar

**Week 7: Integration**
- [ ] Connect to booking system
- [ ] Save itinerary with booking
- [ ] Driver view of itinerary
- [ ] Modification workflow

**Deliverables:**
- Interactive itinerary builder
- Route optimization
- Calendar export

### Phase 3.3: Lunch Ordering (Weeks 8-10)

**Week 8: Restaurant Partnerships**
- [ ] Partner with 3-5 restaurants
- [ ] Digitize menus
- [ ] Set up order notification system
- [ ] Define payment/commission terms

**Week 9: Order Interface**
- [ ] Build menu browsing UI
- [ ] Create order customization flow
- [ ] Implement cart and checkout
- [ ] Payment integration

**Week 10: Restaurant Integration**
- [ ] Order transmission system (email/API)
- [ ] Confirmation workflow
- [ ] Status updates
- [ ] Payment reconciliation

**Deliverables:**
- Lunch ordering system
- Restaurant partner integrations
- Commission tracking

### Phase 3.4: Live Tracking & Chat (Weeks 11-13)

**Week 11: Real-Time Infrastructure**
- [ ] Set up WebSocket server
- [ ] Build GPS tracking system
- [ ] Implement push notifications
- [ ] Create map visualization

**Week 12: Messaging System**
- [ ] Build in-app chat
- [ ] Implement group messaging
- [ ] Add photo sharing
- [ ] Push notification for messages

**Week 13: Driver App Enhancement**
- [ ] Update driver app to send location
- [ ] Add driver messaging interface
- [ ] Implement status updates
- [ ] Test real-time features

**Deliverables:**
- Live driver tracking
- In-app messaging
- Push notifications

### Phase 3.5: Post-Tour Experience (Weeks 14-16)

**Week 14: Wine Tracking**
- [ ] Build wine purchase logging
- [ ] Integrate shipment tracking APIs
- [ ] Create virtual wine cellar
- [ ] Implement repurchase flow

**Week 15: Reviews & Feedback**
- [ ] Build review submission interface
- [ ] Create moderation dashboard
- [ ] Implement NPS surveys
- [ ] Design email sequence

**Week 16: Launch Prep**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing with customers
- [ ] Marketing materials
- [ ] Production deployment

**Deliverables:**
- Wine tracking system
- Review platform
- Full client portal launch

---

## Revenue & Business Impact

### Direct Revenue

**Lunch Commissions:**
- Average lunch order: $25/person
- 8-person tour: $200 total lunch sales
- 15% commission: $30 per tour
- 200 tours/year: $6,000 annual revenue

**Wine Purchase Commissions:**
- Average wine purchase: $150/tour
- 60% of tours include purchases: 120 tours
- 10% commission: $15/tour
- Annual revenue: $1,800

**Premium Pricing:**
- Standard tour: $600
- Premium portal experience justifies: $750 (+25%)
- Increased revenue: $150/tour
- 200 tours/year: $30,000 additional revenue

**Total Direct Revenue:** $37,800/year from 200 tours

### Indirect Revenue & Benefits

**Increased Conversion:**
- Industry booking conversion: 15%
- With premium portal: 25% (+67% improvement)
- More bookings from same traffic

**Higher Rebooking Rate:**
- Without portal: 15% rebook within 2 years
- With portal: 40% rebook (+167% improvement)
- Reduced customer acquisition cost

**Referral Generation:**
- Without portal: 10% of customers refer
- With portal: 35% refer (+250% improvement)
- Lower CAC, higher LTV

**Brand Differentiation:**
- Justify 20-30% price premium
- Attract higher-value customers
- Reduce price sensitivity

**Operational Efficiency:**
- Fewer customer service calls
- Self-service itinerary changes
- Automated lunch ordering
- Digital wine tracking

### 5-Year ROI Projection

**Investment:**
- Phase 3 development: $85,000
- Third-party integrations: $12,000
- Annual maintenance: $15,000/year
- **Total 5-Year Investment:** $172,000

**Revenue (Conservative):**
- Year 1: $50,000 (200 tours)
- Year 2: $125,000 (500 tours)
- Year 3: $250,000 (1,000 tours)
- Year 4: $375,000 (1,500 tours)
- Year 5: $500,000 (2,000 tours)
- **Total 5-Year Revenue:** $1,300,000

**ROI:** 656% over 5 years

---

## Conclusion

The Premium Client Portal is the crown jewel of the Walla Walla Travel platform. It transforms commodity transportation into a luxury concierge experience, creating powerful competitive moats through:

1. **Proprietary Content:** Exclusive winery database and curator notes
2. **Partner Network:** Restaurant and winery relationships
3. **Customer Data:** Preferences, ratings, and behavioral insights
4. **Technology Platform:** Real-time tracking, messaging, and automation
5. **Brand Loyalty:** Emotional connection and delightful experiences

By delivering exceptional value at every touchpoint—before, during, and after the tour—we create customers for life who become passionate advocates for the brand.

This is not just software. It's the future of wine country tourism.

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Next Review:** Pre-Development Planning (Q4 2025)
**Contact:** Ryan Madsen, Product Owner
