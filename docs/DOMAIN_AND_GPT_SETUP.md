# Domain Migration & ChatGPT Store Setup Guide

**Created:** January 19, 2026
**Status:** Ready to Execute

---

## Part 1: Domain Migration (wallawalla.travel → Vercel)

### Current State
- `wallawalla.travel` points to Webflow (IP: 198.202.211.1)
- Vercel app runs at: `walla-walla-final.vercel.app`
- Vercel Project ID: `prj_4x2lma96hdAWWKSjcysvC9UXjmtZ`

### Step 1: Add Domain to Vercel

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Select Project**
   - Click on `walla-walla-final`

3. **Go to Settings → Domains**
   ```
   https://vercel.com/[your-team]/walla-walla-final/settings/domains
   ```

4. **Add Domain**
   - Click "Add"
   - Enter: `wallawalla.travel`
   - Click "Add"

5. **Vercel will show DNS configuration needed**

### Step 2: Update DNS Records

**Option A: Using Vercel Nameservers (Recommended)**

Update your domain registrar's nameservers to:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B: Keep Current Registrar (Manual DNS)**

Add these records at your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | 3600 |
| CNAME | www | cname.vercel-dns.com | 3600 |

### Step 3: Add www Subdomain (Optional but Recommended)

In Vercel Domains settings:
- Add: `www.wallawalla.travel`
- Configure redirect: `www` → `wallawalla.travel`

### Step 4: Verify SSL Certificate

Vercel automatically provisions SSL. Wait for:
- DNS propagation (up to 48 hours, usually faster)
- SSL certificate issuance (automatic)

### Step 5: Test

```bash
# Check DNS propagation
nslookup wallawalla.travel

# Should show Vercel IP: 76.76.21.21

# Test HTTPS
curl -I https://wallawalla.travel
```

### Rollback Plan

If issues occur, revert DNS to Webflow:
- A Record: `198.202.211.1`

---

## Part 2: ChatGPT Store Submission

### Prerequisites Checklist

- [x] API deployed and working
- [x] OpenAPI spec accessible at `/api/gpt/openapi`
- [x] Privacy policy at `/privacy`
- [x] Terms of service at `/terms`
- [x] Brand icons (512x512 PNG):
  - `public/brands/wwt-icon-512.png`
  - `public/brands/nwtc-icon-512.png`
  - `public/brands/hcwt-icon-512.png`
- [ ] Domain pointing to Vercel (Part 1 above)
- [ ] OpenAI account with GPT creation access

### URLs After Domain Migration

| Resource | URL |
|----------|-----|
| OpenAPI Spec | `https://wallawalla.travel/api/gpt/openapi` |
| Privacy Policy | `https://wallawalla.travel/privacy` |
| Terms of Service | `https://wallawalla.travel/terms` |

### Temporary URLs (Before Domain Migration)

| Resource | URL |
|----------|-----|
| OpenAPI Spec | `https://walla-walla-final.vercel.app/api/gpt/openapi` |
| Privacy Policy | `https://walla-walla-final.vercel.app/privacy` |
| Terms of Service | `https://walla-walla-final.vercel.app/terms` |

---

## Creating GPT #1: Walla Walla Travel

### Step 1: Go to GPT Builder
```
https://chatgpt.com/gpts/editor
```
Or: ChatGPT → Explore GPTs → Create

### Step 2: Configure GPT

**Name:**
```
Walla Walla Travel
```

**Description:**
```
Plan your Walla Walla wine country trip with personalized concierge service.
```

**Instructions (System Prompt):**
```
You are Walla Walla Travel's wine country concierge, a professional wine tour planning assistant for Walla Walla Valley, Washington.

Your role:
- Help users discover and book wine experiences
- Provide knowledgeable recommendations from 130+ local wineries
- Coordinate group tours, corporate events, and private tastings
- Use the API to check availability and create booking inquiries

Guidelines:
- Be warm, professional, and knowledgeable
- Always ask for: dates, group size, and preferences
- Recommend specific wineries based on user interests
- When ready to book, use the create-inquiry action
- Include the brand parameter: brand=wwt

Response style:
- Conversational but informative
- Include specific details about wineries
- Offer options at different price points
- Proactively suggest related experiences
```

**Conversation Starters:**
```
I'm planning a corporate wine tour for 12 people in March
What wineries do you recommend for a first-time visitor?
Help me plan a 3-day wine weekend for my birthday
We need transportation for a wedding party of 20
```

### Step 3: Upload Icon
- Upload: `public/brands/wwt-icon-512.png`

### Step 4: Configure Actions

1. Click "Create new action"
2. Select "Import from URL"
3. Enter: `https://wallawalla.travel/api/gpt/openapi`
   (Or use Vercel URL if domain not migrated yet)
4. Authentication: **None**
5. Privacy Policy: `https://wallawalla.travel/privacy`

### Step 5: Save & Publish
- Click "Save" (top right)
- Choose: "Everyone" or "Only people with a link"
- Click "Update"

---

## Creating GPT #2: NW Touring & Concierge

### Configuration

**Name:**
```
NW Touring & Concierge
```

**Description:**
```
Professional wine tour transportation in Walla Walla Valley. Book your ride.
```

**Instructions (System Prompt):**
```
You are NW Touring & Concierge's booking assistant, helping arrange professional wine tour transportation in Walla Walla Valley.

Your role:
- Help users book private wine tour transportation
- Provide quotes for groups of 2-14 guests
- Arrange custom wine country routes
- Handle airport transfers and special requests

Guidelines:
- Be professional and service-oriented
- Always confirm: date, group size, pickup location
- Explain vehicle options and pricing
- When ready to book, use the create-inquiry action
- Include the brand parameter: brand=nwtc

Fleet information:
- Licensed, insured commercial vehicles
- Professional chauffeurs who know the valley
- Flexible scheduling and pickup locations
```

**Conversation Starters:**
```
I need transportation for 6 people this Saturday
What's the cost for a half-day wine tour?
Can you pick us up from our hotel downtown?
We want to visit 4 wineries - what do you recommend?
```

### Upload Icon
- Upload: `public/brands/nwtc-icon-512.png`

### Configure Actions
Same as GPT #1 - import OpenAPI spec

---

## Creating GPT #3: Herding Cats Wine Tours

### Configuration

**Name:**
```
Herding Cats Wine Tours
```

**Description:**
```
Discover Walla Walla wine country with a guide that makes it easy and fun.
```

**Instructions (System Prompt):**
```
You are Herding Cats Wine Tours' friendly guide to Walla Walla wine country.

Your role:
- Help casual wine enthusiasts discover great wineries
- Give honest, unpretentious recommendations
- Find wineries that match user vibes and preferences
- Make wine touring feel relaxed and fun

Guidelines:
- Be friendly, casual, and genuine
- Avoid wine snobbery - make everyone feel welcome
- Highlight dog-friendly, scenic, and hidden gem spots
- When ready to book, use the create-inquiry action
- Include the brand parameter: brand=hcwt

IMPORTANT - Brand Protection:
- NEVER suggest bachelor parties, party buses, or pub crawls
- If asked about party events, politely redirect:
  "We specialize in wine appreciation experiences focused on elegance and discovery. For party-style events, I'd recommend checking with local party bus services."

Response style:
- Conversational and fun
- Share personal-feeling recommendations
- Emphasize the experience over the prestige
```

**Conversation Starters:**
```
What's a good winery for someone new to wine?
Where can I bring my dog wine tasting?
Recommend some off-the-beaten-path wineries
Help me plan a relaxed day of wine tasting
```

### Upload Icon
- Upload: `public/brands/hcwt-icon-512.png`

### Configure Actions
Same as GPT #1 - import OpenAPI spec

---

## Post-Submission Checklist

### After Creating Each GPT

- [ ] Test the GPT with sample conversations
- [ ] Verify API actions work correctly
- [ ] Check that inquiries appear in admin dashboard
- [ ] Confirm brand attribution is correct

### Submission for GPT Store

1. Go to each GPT's settings
2. Under "Publish", select "Everyone"
3. Submit for review
4. Wait for approval (typically 1-5 business days)

### Monitoring

- Check admin dashboard for incoming inquiries
- Filter by `source: chatgpt`
- Track brand attribution (wwt, nwtc, hcwt)

---

## Troubleshooting

### API Actions Not Working

1. Verify OpenAPI spec is accessible:
   ```bash
   curl https://wallawalla.travel/api/gpt/openapi
   ```

2. Check CORS headers are present:
   ```bash
   curl -I https://wallawalla.travel/api/gpt/openapi
   ```

3. Test individual endpoints manually

### Domain Not Resolving

1. Check DNS propagation:
   ```bash
   nslookup wallawalla.travel
   dig wallawalla.travel
   ```

2. Use DNS checker: https://dnschecker.org

3. Wait up to 48 hours for full propagation

### GPT Not Using API

1. Verify actions are configured correctly
2. Check privacy policy URL is accessible
3. Re-import OpenAPI spec

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gpt/openapi` | GET | OpenAPI specification |
| `/api/gpt/search-wineries` | GET | Search wineries |
| `/api/gpt/check-availability` | GET | Check tour dates |
| `/api/gpt/get-recommendations` | POST | Get recommendations |
| `/api/gpt/create-inquiry` | POST | Submit booking inquiry |
| `/api/gpt/booking-status` | GET | Check booking status |

### Brand Codes

| Brand | Code | Target |
|-------|------|--------|
| Walla Walla Travel | `wwt` | B2B, corporate |
| NW Touring & Concierge | `nwtc` | Private tours |
| Herding Cats Wine Tours | `hcwt` | Casual enthusiasts |
