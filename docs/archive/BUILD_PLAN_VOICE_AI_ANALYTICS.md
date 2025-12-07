# Voice + AI Directory + Analytics: Build Plan
**Start Date:** November 8, 2025  
**Timeline:** 10 days  
**Goal:** Production-ready voice/AI system with conversion tracking

---

## ✅ Confirmed Requirements

1. **iOS Compatible** - Server-side voice transcription (works everywhere)
2. **Conversion Tracking** - Track AI usage → bookings
3. **Analytics Dashboard** - Part of main analytics suite
4. **Optimized from Day 1** - Caching, smart routing, cost control
5. **Real Traffic Ready** - Built for existing visitor flow

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Entry Points:                                               │
│  - Touring platform referral                                 │
│  - Direct traffic to Walla Walla Travel                      │
│  - Marketing campaigns                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AI DIRECTORY (Voice or Text)                                │
│  - "Find wineries with outdoor seating"                      │
│  - "Best tours for a birthday party"                         │
│  - Works on ALL devices (iOS, Android, desktop)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  VOICE PROCESSING (If voice input)                          │
│  1. Browser records audio (iOS compatible!)                  │
│  2. Send to /api/voice/transcribe                           │
│  3. Deepgram converts to text                                │
│  4. Return transcript to client                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AI PROCESSING                                               │
│  1. Check cache first (30-50% hit rate)                     │
│  2. If not cached, send to Claude                           │
│  3. Query database for results                               │
│  4. Generate natural response                                │
│  5. Cache for future                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  RESULTS + CONVERSION TRACKING                               │
│  - Show wineries/tours                                       │
│  - Track: Click to winery page                              │
│  - Track: Click "Book Now"                                   │
│  - Track: Booking created                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  ANALYTICS                                                   │
│  - Session tracking (anonymous → identified)                 │
│  - Funnel analysis (query → view → book)                    │
│  - ROI calculation (cost vs. revenue)                        │
│  - Usage patterns (what people ask)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Day-by-Day Build Plan

### Day 1: Foundation & Voice Infrastructure (8 hours)

**Morning:**
- [ ] Set up Deepgram account (API key)
- [ ] Create audio recorder hook (`lib/hooks/useAudioRecorder.ts`)
- [ ] Test audio recording on iOS Safari

**Afternoon:**
- [ ] Build transcription API (`app/api/voice/transcribe/route.ts`)
- [ ] Test end-to-end: Record → Transcribe → Display
- [ ] Error handling for permissions, network failures

**Deliverable:** Voice recording works on all devices including iOS

---

### Day 2: AI Integration & Caching (8 hours)

**Morning:**
- [ ] Set up Claude API (Anthropic key)
- [ ] Create AI query endpoint (`app/api/ai/query/route.ts`)
- [ ] Build response caching (Redis or in-memory)

**Afternoon:**
- [ ] Test AI responses with sample queries
- [ ] Implement query optimization
- [ ] Add rate limiting (prevent abuse)

**Deliverable:** AI can answer questions about wineries/tours

---

### Day 3: AI Directory UI (8 hours)

**Morning:**
- [ ] Create AI Directory page (`app/ai-directory/page.tsx`)
- [ ] Build voice + text input interface
- [ ] Add "suggested questions" feature

**Afternoon:**
- [ ] Results display component
- [ ] Link results to booking pages
- [ ] Mobile-optimized UI

**Deliverable:** Users can ask questions and get results

---

### Day 4: Conversion Tracking Foundation (8 hours)

**Morning:**
- [ ] Create analytics schema (events table)
- [ ] Build event tracking API (`app/api/analytics/track/route.ts`)
- [ ] Anonymous user session tracking

**Afternoon:**
- [ ] Track AI Directory events:
  - `ai_directory_visit`
  - `ai_query`
  - `ai_result_click`
  - `booking_started`
  - `booking_completed`

**Deliverable:** All key events are tracked

---

### Day 5: Analytics Dashboard - Part 1 (8 hours)

**Morning:**
- [ ] Create analytics page (`app/admin/analytics/page.tsx`)
- [ ] Database queries for metrics:
  - Daily active users
  - Total queries
  - Top queries
  - Conversion funnel

**Afternoon:**
- [ ] Charts and visualizations
- [ ] Date range filtering
- [ ] Export functionality

**Deliverable:** Basic analytics visible

---

### Day 6: Analytics Dashboard - Part 2 (8 hours)

**Morning:**
- [ ] ROI calculation dashboard
  - API costs per session
  - Revenue per session
  - Break-even analysis
- [ ] Cohort analysis (by traffic source)

**Afternoon:**
- [ ] Real-time usage monitoring
- [ ] Cost alerts (if spending exceeds budget)
- [ ] A/B test framework (for optimization)

**Deliverable:** Complete analytics suite

---

### Day 7: Optimization & Caching (6 hours)

**Morning:**
- [ ] Smart query routing:
  - Simple queries → cached responses
  - Complex queries → AI
- [ ] Response quality scoring

**Afternoon:**
- [ ] Cost optimization review
- [ ] Performance profiling
- [ ] Database indexing

**Deliverable:** System optimized for cost and speed

---

### Day 8: Voice Inspector Integration (6 hours)

**Morning:**
- [ ] Connect voice infrastructure to inspection system
- [ ] Update VoiceInspector to use server-side transcription
- [ ] Remove browser-only dependencies

**Afternoon:**
- [ ] Test inspections on iOS
- [ ] Add analytics tracking to inspections
- [ ] Polish UX

**Deliverable:** Voice inspections work on iOS

---

### Day 9: Integration Testing (8 hours)

**Full day testing:**
- [ ] Test complete user journey (touring site → AI → booking)
- [ ] iOS Safari testing
- [ ] Android Chrome testing
- [ ] Desktop testing
- [ ] Offline behavior
- [ ] Error scenarios
- [ ] Conversion tracking verification

**Deliverable:** System works end-to-end

---

### Day 10: Documentation & Deployment (6 hours)

**Morning:**
- [ ] User documentation
- [ ] Admin guide for analytics
- [ ] API documentation

**Afternoon:**
- [ ] Deploy to production
- [ ] Set up monitoring (Railway, Sentry)
- [ ] Configure alerts
- [ ] Verify production works

**Deliverable:** Live in production, ready for traffic

---

## Technical Stack

### Voice Processing
- **Recording:** MediaRecorder API (works on iOS!)
- **Transcription:** Deepgram ($200 free credit)
- **Format:** WebM audio (16kHz, mono)

### AI/LLM
- **Primary:** Claude 3.5 Haiku ($0.001/1K input, $0.005/1K output) - 3x cheaper!
- **Upgrade option:** Claude Sonnet for complex queries (if needed later)
- **Context:** Business info, winery database, tour options

**Why Haiku?**
- Perfect for straightforward Q&A (wineries, tours, recommendations)
- 3x cheaper than Sonnet ($33/mo vs $99/mo for 3K queries)
- Fast responses (better UX)
- Easy to upgrade to Sonnet if we need more reasoning power

### Analytics
- **Events:** PostgreSQL events table
- **Visualization:** Recharts (React charting library)
- **Export:** CSV download
- **Real-time:** Database polling (every 30 seconds)

### Caching
- **Strategy:** Query hash → response
- **TTL:** 1 hour for most queries
- **Storage:** Redis (if available) or in-memory
- **Hit rate target:** 30-50%

---

## Database Schema Extensions

### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER, -- NULL for anonymous
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- For cost tracking
  api_cost DECIMAL(10, 6),
  
  -- For conversion tracking
  booking_id INTEGER REFERENCES bookings(id),
  revenue_attributed DECIMAL(10, 2)
);

CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_date ON analytics_events(created_at DESC);
CREATE INDEX idx_events_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
```

### AI Query Cache Table

```sql
CREATE TABLE ai_query_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  response_data JSONB,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_cache_hash ON ai_query_cache(query_hash);
CREATE INDEX idx_cache_expires ON ai_query_cache(expires_at);
```

---

## Key Components to Build

### 1. Audio Recorder Hook
```typescript
// lib/hooks/useAudioRecorder.ts
export function useAudioRecorder() {
  // Works on iOS Safari!
  // Returns: isRecording, audioBlob, start, stop
}
```

### 2. Voice Transcription API
```typescript
// app/api/voice/transcribe/route.ts
export async function POST(request: NextRequest) {
  // Receives audio file
  // Sends to Deepgram
  // Returns transcript + confidence
}
```

### 3. AI Query API
```typescript
// app/api/ai/query/route.ts
export async function POST(request: NextRequest) {
  // Check cache first
  // Query Claude if not cached
  // Track costs
  // Return response
}
```

### 4. Analytics Tracking
```typescript
// lib/analytics/track.ts
export async function track(event: AnalyticsEvent) {
  // Track event
  // Link session → user → booking
  // Calculate attribution
}
```

### 5. Analytics Dashboard
```typescript
// app/admin/analytics/page.tsx
// Displays:
// - Usage metrics
// - Conversion funnel
// - ROI calculation
// - Top queries
// - Cost tracking
```

---

## Conversion Tracking Implementation

### Event Flow

```typescript
// 1. User arrives from touring platform
track({
  type: 'page_visit',
  page: '/ai-directory',
  source: 'touring_platform',
  session_id: 'abc123'
})

// 2. User asks question
track({
  type: 'ai_query',
  query: 'wineries with outdoor seating',
  session_id: 'abc123',
  cost: 0.007
})

// 3. User clicks result
track({
  type: 'result_click',
  winery_id: 42,
  session_id: 'abc123'
})

// 4. User starts booking
track({
  type: 'booking_started',
  winery_id: 42,
  session_id: 'abc123'
})

// 5. User completes booking
track({
  type: 'booking_completed',
  booking_id: 789,
  revenue: 450,
  session_id: 'abc123'
})

// Calculate attribution:
// session_id links all events
// Total cost: $0.007
// Revenue: $450
// ROI: 64,286x
```

---

## Analytics Dashboard Views

### 1. Overview
- Daily active users
- Total queries
- Total bookings attributed
- Current ROI
- Month-to-date costs

### 2. Conversion Funnel
```
Visitors: 3,000
  ↓ 20% (600)
AI Directory Users: 600
  ↓ 15% (90)
Clicked Result: 90
  ↓ 30% (27)
Started Booking: 27
  ↓ 67% (18)
Completed Booking: 18

Conversion Rate: 0.6% (visitors → bookings)
AI Conversion Rate: 3% (AI users → bookings)
```

### 3. Cost Analysis
- Total API costs
- Cost per query
- Cost per booking
- Break-even point
- Monthly trend

### 4. Query Analysis
- Most common queries
- Query success rate
- Average response time
- Cache hit rate

### 5. Traffic Sources
- Touring platform
- Direct
- Marketing campaigns
- Conversion by source

---

## Success Metrics (30-Day Goals)

**Usage:**
- [ ] 500+ AI Directory users
- [ ] 2,000+ queries
- [ ] 30%+ cache hit rate

**Conversion:**
- [ ] 10+ bookings attributed to AI
- [ ] 2%+ conversion rate (AI users → bookings)
- [ ] Measurable ROI

**Technical:**
- [ ] < 2 second response time
- [ ] 99%+ uptime
- [ ] < $300/month costs

**Qualitative:**
- [ ] Users find it useful (feedback)
- [ ] Clear value proposition
- [ ] Competitive advantage

---

## Pre-Launch Checklist

### APIs & Services
- [ ] Deepgram API key configured
- [ ] Anthropic API key configured (for Claude Haiku)
- [ ] Environment variables set in Railway
- [ ] Rate limiting configured
- [ ] Cost alerts set up (should be ~$40-70/month)

### Database
- [ ] Analytics tables created
- [ ] Cache table created
- [ ] Indexes added
- [ ] Migration tested

### Testing
- [ ] iOS Safari works
- [ ] Android Chrome works
- [ ] Desktop browsers work
- [ ] Offline graceful degradation
- [ ] Error handling tested

### Monitoring
- [ ] Railway analytics enabled
- [ ] Error tracking (Sentry)
- [ ] Cost monitoring dashboard
- [ ] Uptime monitoring

### Documentation
- [ ] User guide created
- [ ] Admin documentation
- [ ] API documentation
- [ ] Troubleshooting guide

---

## Post-Launch Plan

### Week 1
- Monitor usage closely
- Track conversion
- Gather user feedback
- Fix any bugs

### Week 2-4
- Optimize prompts based on actual queries
- Improve responses that don't convert
- Add features users request
- Refine analytics

### Month 2
- Calculate actual ROI
- Present findings
- Decide on next steps:
  - Scale up if working
  - Optimize if marginal
  - Pivot if not working

---

## API Keys Needed

Before we start building, you'll need:

### 1. Deepgram (Voice Transcription)
- Sign up: https://deepgram.com
- Free $200 credit (45,000 minutes)
- Get API key from dashboard

### 2. Anthropic Claude (AI)
- Sign up: https://console.anthropic.com
- Free $5 credit to start
- Get API key

**Once you have these, we can start building immediately.**

---

## Estimated Costs (First Month)

### Development
- **Cost:** $0 (our time together)
- **Time:** 10 days

### API Services
- Deepgram: ~$0-20 (likely covered by free tier)
- Claude Haiku: ~$15-35 (moderate usage - 3x cheaper than Sonnet!)
- **Total: $15-55 first month** 🎉

**Cost savings:** Using Haiku instead of Sonnet saves ~$60-70/month!

### Next Steps
- Month 2-3: ~$40-100 (growing usage, still affordable!)
- If successful: Scale costs, but ROI justified
- If not: Low investment, easy to pivot
- **Upgrade to Sonnet anytime if you need more sophisticated reasoning**

---

## Ready to Build?

**I need from you:**
1. **Deepgram API key** - Voice transcription
   - Sign up: https://deepgram.com
   - Free $200 credit (45,000 minutes!)
   
2. **Anthropic API key** - Claude Haiku
   - Sign up: https://console.anthropic.com
   - Free $5 credit to start
   - **We'll use Haiku (3x cheaper than Sonnet!)**

**Then I'll build:**
1. ✅ Voice system (iOS-compatible, server-side)
2. ✅ AI Directory (conversational, using Haiku)
3. ✅ Conversion tracking (measure ROI)
4. ✅ Analytics dashboard (see what works)
5. ✅ Smart optimizations (caching, cost controls)

**Expected monthly cost after free credits: $40-70**
*That's just 1 booking to break even!*

**Let's get those API keys and start building! 🚀**

