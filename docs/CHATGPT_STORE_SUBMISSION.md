# ChatGPT Store Submission Guide

**Last Updated:** January 8, 2026
**Status:** Ready for Submission

---

## Overview

Three GPT apps sharing one backend API, each targeting different market segments.

| App | Target Market | Brand Param |
|-----|---------------|-------------|
| Walla Walla Travel | B2B, corporate, events, full-service | `brand=wwt` |
| NW Touring & Concierge | Private tours, retail clients | `brand=nwtc` |
| Herding Cats Wine Tours | Casual wine enthusiasts, couples, friends | `brand=hcwt` |

---

## Submission URLs

### API Endpoint (shared)
```
https://wallawalla.travel/api/openapi
```

### Legal Pages
- **Privacy Policy:** https://wallawalla.travel/privacy
- **Terms of Service:** https://wallawalla.travel/terms

---

## App 1: Walla Walla Travel

### Icon
`public/brands/wwt-icon-512.png` (512x512 PNG)

### App Name
```
Walla Walla Travel
```

### Description (Short - 80 chars)
```
Plan your Walla Walla wine country trip with personalized concierge service.
```

### Description (Long)
```
Your personal wine country concierge for Walla Walla Valley. I help you:

- Plan custom wine tours for groups of any size
- Get insider recommendations for 130+ wineries
- Coordinate transportation and reservations
- Design corporate events and private tastings
- Create full-service trip itineraries

I connect directly to real-time availability and our concierge team handles all the coordination. Just tell me your dates, group size, and preferences!

Whether you're planning a corporate retreat, wedding party outing, or multi-day wine adventure, I'll help craft the perfect experience.
```

### Conversation Starters
```
- "I'm planning a corporate wine tour for 12 people in March"
- "What wineries do you recommend for a first-time visitor?"
- "Help me plan a 3-day wine weekend for my birthday"
- "We need transportation for a wedding party of 20"
```

### Category
```
Lifestyle > Travel
```

---

## App 2: NW Touring & Concierge

### Icon
`public/brands/nwtc-icon-512.png` (512x512 PNG)

### App Name
```
NW Touring & Concierge
```

### Description (Short - 80 chars)
```
Professional wine tour transportation in Walla Walla Valley. Book your ride.
```

### Description (Long)
```
Professional wine country transportation for Walla Walla Valley.

I help you:
- Book private wine tours with experienced drivers
- Get quotes for groups from 2-14 guests
- Plan custom routes through wine country
- Request airport transfers and special transportation

Our fleet serves Walla Walla's premier wine region with:
- Licensed, insured commercial vehicles
- Professional chauffeurs who know the valley
- Flexible scheduling and pickup locations

Tell me your group size and preferred date, and I'll help arrange your perfect wine country experience!
```

### Conversation Starters
```
- "I need transportation for 6 people this Saturday"
- "What's the cost for a half-day wine tour?"
- "Can you pick us up from our hotel downtown?"
- "We want to visit 4 wineries - what do you recommend?"
```

### Category
```
Lifestyle > Travel
```

---

## App 3: Herding Cats Wine Tours

### Icon
`public/brands/hcwt-icon-512.png` (512x512 PNG)

### App Name
```
Herding Cats Wine Tours
```

### Description (Short - 80 chars)
```
Discover Walla Walla wine country with a guide that makes it easy and fun.
```

### Description (Long)
```
Wine touring doesn't have to be stuffy! I'm your friendly guide to Walla Walla wine country.

I help you:
- Discover wineries that match your vibe and taste
- Get honest recommendations (not just the tourist spots)
- Plan relaxed, enjoyable wine experiences
- Find dog-friendly, scenic, and hidden gem wineries
- Request tours with our professional team

Whether you're a wine novice or enthusiast, I'll help you explore Walla Walla Valley's incredible wine scene without the pretense.

Just tell me what you're looking for - scenic views, bold reds, intimate tastings - and I'll point you in the right direction!
```

### Conversation Starters
```
- "What's a good winery for someone new to wine?"
- "Where can I bring my dog wine tasting?"
- "Recommend some off-the-beaten-path wineries"
- "Help me plan a relaxed day of wine tasting"
```

### Category
```
Lifestyle > Travel
```

### IMPORTANT: Brand Protection
**Never suggest or recommend:**
- Bachelorette parties
- Bachelor parties
- Party buses
- Pub crawls
- Any "party" focused experiences

**Always redirect party inquiries:**
> "We specialize in wine appreciation experiences focused on elegance and discovery. For party-style events, I'd recommend checking with local party bus services."

---

## Screenshots to Create

### For each app, capture:

1. **Conversation Start** - Show the app greeting and conversation starters
2. **Winery Recommendation** - Response showing winery details
3. **Tour Planning** - Multi-turn conversation planning a tour
4. **Booking Confirmation** - Show the experience request submission

### Screenshot Dimensions
- Recommended: 1280x800 or similar landscape ratio
- Max 4 screenshots per app

### Screenshot Pages to Capture

**For Walla Walla Travel:**
1. https://wallawalla.travel - Homepage
2. https://wallawalla.travel/book - Booking page
3. https://wallawalla.travel/wineries - Winery directory

**For NW Touring:**
1. https://wallawalla.travel/nw-touring - NW Touring landing
2. https://wallawalla.travel/book - Booking flow

**For Herding Cats:**
1. https://wallawalla.travel/herding-cats - Herding Cats landing
2. https://wallawalla.travel/wineries - Winery browser

---

## API Configuration

### Authentication
```
Type: None (public endpoints)
```

### Available Actions

| Action | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| List Wineries | GET | /wineries | Browse 130+ wineries |
| Get Winery | GET | /wineries/{slug} | Get winery details |
| Submit Request | POST | /experience-requests | Request a wine experience |
| Create Proposal | POST | /proposals | Generate custom proposal |

### Experience Request Schema
```json
{
  "contact_name": "string (required)",
  "contact_email": "string (required)",
  "party_size": "integer 1-50 (required)",
  "preferred_date": "YYYY-MM-DD (required)",
  "alternate_date": "YYYY-MM-DD (optional)",
  "preferred_time": "morning|afternoon|flexible",
  "winery_ids": [integer array],
  "experience_type": "wine_tour|private_tasting|group_event|corporate",
  "special_requests": "string",
  "dietary_restrictions": "string",
  "accessibility_needs": "string",
  "occasion": "string",
  "brand": "wwt|nwtc|hcwt",
  "source": "chatgpt",
  "source_session_id": "string"
}
```

---

## Submission Checklist

### Before Submission
- [x] API deployed and accessible at https://wallawalla.travel/api/openapi
- [x] Privacy policy live at /privacy
- [x] Terms of service live at /terms
- [x] 512x512 PNG icons created for all 3 brands
- [ ] Screenshots captured for each app
- [ ] OpenAI account with API access

### Submission Steps
1. Go to https://platform.openai.com/gpts
2. Click "Create a GPT"
3. Configure each GPT:
   - Upload icon
   - Enter name and descriptions
   - Add conversation starters
   - Under "Actions": Import OpenAPI spec from URL
   - Set authentication to "None"
4. Save and publish
5. Submit for review

---

## Support Contacts

- **Technical:** info@wallawalla.travel
- **Privacy:** privacy@wallawalla.travel
- **Phone:** (509) 200-8000

---

## Analytics Tracking

All requests from ChatGPT apps will have:
- `source: "chatgpt"`
- `brand`: The brand code for attribution

Monitor performance in admin dashboard at:
https://wallawalla.travel/admin/analytics
