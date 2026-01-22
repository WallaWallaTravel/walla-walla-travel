# ChatGPT Store & Online Booking - Handoff Summary

**Last Updated:** January 16, 2026

## Goal
Finalize components for ChatGPT Store submission to capture the AI assistant opportunity.

## ChatGPT Store Status

**Docs:** `docs/CHATGPT_STORE_SUBMISSION.md` (detailed submission guide)

### Three GPT Apps Planned
| App | Brand | Target |
|-----|-------|--------|
| Walla Walla Travel | `wwt` | B2B, corporate, full-service |
| NW Touring & Concierge | `nwtc` | Private tours, retail |
| Herding Cats Wine Tours | `hcwt` | Casual enthusiasts |

### What's Ready
- [x] API endpoints at `/api/gpt/*` (booking-status, create-inquiry, check-availability, get-recommendations, search-wineries)
- [x] OpenAPI spec at `/api/openapi` and `/api/gpt/openapi`
- [x] Privacy policy at `/privacy`
- [x] Terms of service at `/terms`
- [x] 512x512 brand icons created
- [x] Experience request system (`/api/v1/experience-requests`)

### What's Needed
- [ ] Screenshots for each app
- [ ] Final testing of API actions via ChatGPT
- [ ] Online booking flow completion
- [ ] Submit to OpenAI GPT store

## Online Booking Flow

### Current State
- Experience request form exists
- Proposal generation system built
- Booking service at `lib/services/booking.service.ts`

### Key Pages
```
app/book/                        # Main booking entry
app/(public)/shared-tours/       # Shared/group tours
app/proposals/[id]/              # Proposal viewing
app/proposals/[id]/accept/       # Accept & pay
```

### Key APIs
```
POST /api/v1/experience-requests  # Submit inquiry
POST /api/proposals               # Generate proposal
GET  /api/proposals/[id]          # View proposal
POST /api/gpt/create-inquiry      # ChatGPT creates booking inquiry
GET  /api/gpt/check-availability  # ChatGPT checks dates
```

## Priority Actions

1. **Test ChatGPT API Actions** - Verify all `/api/gpt/*` endpoints work correctly
2. **Complete Booking Flow** - Ensure seamless inquiry → proposal → payment
3. **Capture Screenshots** - For GPT store submission
4. **Submit to Store** - Follow `docs/CHATGPT_STORE_SUBMISSION.md`

## Quick Commands

```bash
# Start dev server
cd /Users/temp/walla-walla-final && npm run dev

# Test GPT API
curl https://walla-walla-final.vercel.app/api/gpt/openapi

# View booking page
open http://localhost:3000/book
```

## Key Files

```
docs/CHATGPT_STORE_SUBMISSION.md  # Full submission guide
app/api/gpt/                      # GPT-specific endpoints
app/api/v1/experience-requests/   # Experience request API
lib/services/booking.service.ts   # Booking logic
lib/api/openapi.ts               # OpenAPI spec
public/brands/                    # Brand icons (512x512)
```

## Test Credentials
- Admin: madsry@gmail.com / wwtRynMdsn03
