# Multi-Model AI Directory Build Plan
**Start Date:** November 9, 2025  
**Timeline:** 3 weeks (15 working days)  
**Primary Model:** GPT-4o with multi-model support

---

## Executive Summary

Building a production-ready AI Directory with:
- ✅ GPT-4o as primary AI model (best quality, fine-tuning support)
- ✅ Multi-model architecture (switch models from dashboard)
- ✅ Voice + text input (iOS-compatible, server-side transcription)
- ✅ Full query logging and review system
- ✅ Conversion tracking (query → booking attribution)
- ✅ Analytics dashboard with insights
- ✅ Fine-tuning integration (train custom models on your data)
- ✅ A/B testing framework

**Expected Cost:** ~$100-250/month depending on usage  
**Break-even:** 1-3 bookings/month  
**ROI Target:** 10x+ (very achievable)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AI DIRECTORY INTERFACE                                      │
│  - Voice input (tap & speak) OR Text input                   │
│  - Works on iOS, Android, Desktop                            │
│  - Suggested questions                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  VOICE PROCESSING (if voice input)                          │
│  1. Browser records audio (MediaRecorder API)                │
│  2. POST to /api/voice/transcribe                           │
│  3. Deepgram converts audio → text                           │
│  4. Return transcript                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AI PROCESSING                                               │
│  1. Get active model config from database                    │
│  2. Select model (A/B test if enabled)                       │
│  3. Check cache (30-50% hit rate target)                    │
│  4. If not cached:                                           │
│     - Build context (business info, DB data)                 │
│     - Send to AI model (GPT-4o, Claude, etc.)               │
│     - Cache response                                         │
│  5. Return natural language response                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  RESULTS + LOGGING                                           │
│  - Display wineries/tours as cards                           │
│  - Track: view → click → booking                            │
│  - Log: query, model, response, cost, time                   │
│  - Request user feedback (thumbs up/down)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                             │
│  - Review all queries & responses                            │
│  - Rate quality (approve for training)                       │
│  - Switch AI models (no code changes!)                       │
│  - View analytics & ROI                                      │
│  - Export training data                                      │
│  - Create fine-tuned models                                  │
│  - A/B test different models                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Week 1: Foundation (Days 1-6)

### Day 1: Voice Infrastructure

**Morning (4 hours):**
- [ ] Set up Deepgram account and API key
- [ ] Create audio recorder hook (`lib/hooks/useAudioRecorder.ts`)
  - MediaRecorder API
  - WebM audio format (16kHz, mono)
  - Permission handling
  - iOS Safari compatibility
- [ ] Test audio recording on iOS Safari, Chrome, Firefox

**Afternoon (4 hours):**
- [ ] Build transcription API (`app/api/voice/transcribe/route.ts`)
  - Accept audio file upload
  - Send to Deepgram
  - Return transcript + confidence score
  - Error handling (rate limits, network failures)
- [ ] Test end-to-end: Record → Upload → Transcribe → Display

**Deliverable:** Voice recording works on all devices including iOS

**Files to create:**
- `lib/hooks/useAudioRecorder.ts`
- `app/api/voice/transcribe/route.ts`
- `lib/services/deepgram.ts`

---

### Day 2: Multi-Model Provider System

**Morning (4 hours):**
- [ ] Design provider abstraction layer
  - Base interface: `AIModelProvider`
  - Common methods: `generateResponse()`, `calculateCost()`
  - Provider implementations: OpenAI, Anthropic, Google
- [ ] Create model configuration system
  - Database table: `ai_settings`
  - Environment variables for API keys
  - Model registry with metadata

**Afternoon (4 hours):**
- [ ] Implement OpenAI provider (GPT-4o)
  - `lib/ai/providers/openai.ts`
  - Chat completions API
  - Token counting
  - Error handling & retries
- [ ] Implement Anthropic provider (Claude)
  - `lib/ai/providers/anthropic.ts`
  - Messages API
  - Token counting
- [ ] Implement Google provider (Gemini)
  - `lib/ai/providers/google.ts`
  - GenerativeAI API

**Deliverable:** Can switch between AI models via configuration

**Files to create:**
- `lib/ai/providers/base.ts`
- `lib/ai/providers/openai.ts`
- `lib/ai/providers/anthropic.ts`
- `lib/ai/providers/google.ts`
- `lib/ai/model-registry.ts`
- `migrations/create-ai-settings-table.sql`

---

### Day 3: AI Query Processing

**Morning (4 hours):**
- [ ] Build AI query endpoint (`app/api/ai/query/route.ts`)
  - Get active model from database
  - A/B test selection logic
  - Context building (business info, winery data)
  - Provider instantiation
  - Response generation
- [ ] Implement response caching
  - Query hash generation
  - Cache lookup
  - Cache storage (Redis or DB)
  - TTL management

**Afternoon (4 hours):**
- [ ] Create system prompt templates
  - Base prompt with business context
  - Winery recommendation prompt
  - Logistics/booking prompt
  - Dynamic context injection
- [ ] Test AI responses with sample queries
  - "Wineries with outdoor seating"
  - "Best tours for couples"
  - "Can you accommodate 15 people?"
  - "Do you pick up from hotels?"

**Deliverable:** AI can answer questions about wineries and tours

**Files to create:**
- `app/api/ai/query/route.ts`
- `lib/ai/context-builder.ts`
- `lib/ai/query-cache.ts`
- `lib/ai/prompts/templates.ts`
- `migrations/create-ai-cache-table.sql`

---

### Day 4: Query Logging & Tracking

**Morning (4 hours):**
- [ ] Create analytics event system
  - Database table: `ai_queries`
  - Event tracking functions
  - Session management
  - Anonymous user tracking
- [ ] Build query logging service
  - Log query text & intent
  - Log model & response
  - Log cost & performance
  - Link to session/user/booking

**Afternoon (4 hours):**
- [ ] Implement event tracking
  - `ai_directory_visit`
  - `ai_query`
  - `ai_result_click`
  - `booking_started`
  - `booking_completed`
- [ ] Create attribution system
  - Link sessions to bookings
  - Calculate conversion rates
  - Track revenue attribution

**Deliverable:** All user interactions are logged for analysis

**Files to create:**
- `lib/analytics/track.ts`
- `lib/analytics/attribution.ts`
- `migrations/create-ai-queries-table.sql`

---

### Day 5: AI Directory UI - Part 1

**Morning (4 hours):**
- [ ] Create AI Directory page (`app/ai-directory/page.tsx`)
  - Clean, modern layout
  - Hero section with description
  - Voice + text input toggle
- [ ] Build input interface
  - Text input with "Ask" button
  - Voice button (tap to record)
  - Recording indicator (animated)
  - Suggested questions chips

**Afternoon (4 hours):**
- [ ] Implement query submission
  - Handle text input
  - Handle voice transcription
  - Show loading state
  - Display AI response
- [ ] Add conversation history
  - Show previous Q&A in session
  - Scroll to new responses
  - Clear history button

**Deliverable:** Users can ask questions via text or voice

**Files to create:**
- `app/ai-directory/page.tsx`
- `components/ai-directory/QueryInput.tsx`
- `components/ai-directory/VoiceButton.tsx`
- `components/ai-directory/SuggestedQuestions.tsx`

---

### Day 6: AI Directory UI - Part 2

**Morning (4 hours):**
- [ ] Build results display
  - Winery/tour cards with images
  - Key information (hours, features, price)
  - "View Details" and "Book Now" buttons
  - Track clicks (conversion tracking)
- [ ] Add feedback mechanism
  - Thumbs up/down for each response
  - Optional text feedback
  - Store in database for review

**Afternoon (4 hours):**
- [ ] Mobile optimization
  - Responsive layout
  - Touch-friendly buttons (48px)
  - Optimized for iOS Safari
  - Loading states & error handling
- [ ] Accessibility
  - ARIA labels
  - Keyboard navigation
  - Screen reader support

**Deliverable:** Beautiful, functional AI Directory available to customers

**Files to create:**
- `components/ai-directory/ResponseDisplay.tsx`
- `components/ai-directory/ResultCard.tsx`
- `components/ai-directory/FeedbackWidget.tsx`
- `app/ai-directory/styles.module.css`

---

## Week 2: Admin Dashboard (Days 7-12)

### Day 7: Model Management Dashboard

**Morning (4 hours):**
- [ ] Create AI settings page (`app/admin/ai-settings/page.tsx`)
  - Model selection interface
  - Display all available models
  - Show cost per query
  - Indicate active model
- [ ] Build model configuration form
  - Temperature slider
  - Max tokens input
  - System prompt editor
  - Save configuration

**Afternoon (4 hours):**
- [ ] Implement model switching
  - API endpoint: `/api/admin/ai-settings`
  - Validate configuration
  - Update database
  - Test configuration (sample query)
- [ ] Add fallback model selection
  - Choose backup model
  - Automatic failover
  - Alert on failover events

**Deliverable:** Admin can switch AI models without code changes

**Files to create:**
- `app/admin/ai-settings/page.tsx`
- `app/api/admin/ai-settings/route.ts`
- `components/admin/ModelSelector.tsx`
- `components/admin/ModelConfigForm.tsx`

---

### Day 8: A/B Testing Framework

**Morning (4 hours):**
- [ ] Build A/B test configuration UI
  - Enable/disable toggle
  - Model A selector
  - Model B selector
  - Traffic split percentage (default 50/50)
  - Test duration
- [ ] Implement session-based routing
  - Consistent model per session
  - Track which variant user sees
  - Store in session data

**Afternoon (4 hours):**
- [ ] Create A/B test results dashboard
  - Side-by-side comparison
  - Queries per model
  - Avg rating per model
  - Conversion rate per model
  - Cost per model
  - Statistical significance
- [ ] Add "Deploy winner" action
  - Promote winning model to 100%
  - Archive test results

**Deliverable:** Can A/B test different AI models

**Files to create:**
- `components/admin/ABTestConfig.tsx`
- `components/admin/ABTestResults.tsx`
- `app/api/admin/ab-tests/route.ts`
- `lib/ai/ab-test-router.ts`

---

### Day 9: Query Review Interface - Part 1

**Morning (4 hours):**
- [ ] Create query browser (`app/admin/ai-directory/queries/page.tsx`)
  - Table view of all queries
  - Columns: Date, Query, Model, Cost, Rating, Outcome
  - Sorting & filtering
  - Pagination (50 per page)
- [ ] Build filter controls
  - Date range picker
  - Model filter
  - Rating filter (1-5 stars, unrated)
  - Outcome filter (booked, clicked, no action)
  - Search by query text

**Afternoon (4 hours):**
- [ ] Create query detail view
  - Full query text
  - Full response text
  - User session info
  - Model & cost details
  - Performance metrics (response time)
  - User feedback (rating, comments)
- [ ] Add navigation
  - Previous/Next query
  - Back to list
  - Quick filters

**Deliverable:** Admin can browse and review all AI queries

**Files to create:**
- `app/admin/ai-directory/queries/page.tsx`
- `app/admin/ai-directory/queries/[query_id]/page.tsx`
- `components/admin/QueryTable.tsx`
- `components/admin/QueryFilters.tsx`
- `components/admin/QueryDetail.tsx`

---

### Day 10: Query Review Interface - Part 2

**Morning (4 hours):**
- [ ] Build query rating system
  - Admin rating (Excellent, Good, Fair, Poor)
  - Add admin notes
  - Save to database
- [ ] Implement "Approve for training" workflow
  - Checkbox to mark query for training
  - Bulk approve action
  - Counter showing approved count
- [ ] Create response editor
  - Edit AI response
  - Save improved version
  - Mark as "edited by admin"

**Afternoon (4 hours):**
- [ ] Build training data export
  - Filter: Only approved queries
  - Format: JSONL (OpenAI fine-tuning format)
  - Include system prompt
  - Download button
  - Copy to clipboard button
- [ ] Add bulk actions
  - Select multiple queries
  - Bulk approve
  - Bulk delete
  - Bulk export

**Deliverable:** Admin can curate training data from real queries

**Files to create:**
- `components/admin/QueryRating.tsx`
- `components/admin/ResponseEditor.tsx`
- `components/admin/TrainingDataExporter.tsx`
- `app/api/admin/queries/export/route.ts`

---

### Day 11: Analytics Dashboard - Part 1

**Morning (4 hours):**
- [ ] Create analytics overview (`app/admin/ai-directory/analytics/page.tsx`)
  - Key metrics cards
    - Total queries
    - Unique users
    - Avg queries per user
    - Total cost
    - Bookings attributed
    - Current ROI
  - Date range selector
  - Chart showing queries over time

**Afternoon (4 hours):**
- [ ] Build conversion funnel visualization
  - Stage 1: AI Directory visits
  - Stage 2: Queries asked
  - Stage 3: Results clicked
  - Stage 4: Booking started
  - Stage 5: Booking completed
  - Show drop-off percentages
  - Compare to overall site conversion

**Deliverable:** Clear visibility into AI Directory performance

**Files to create:**
- `app/admin/ai-directory/analytics/page.tsx`
- `components/admin/analytics/MetricCard.tsx`
- `components/admin/analytics/QueryChart.tsx`
- `components/admin/analytics/ConversionFunnel.tsx`

---

### Day 12: Analytics Dashboard - Part 2

**Morning (4 hours):**
- [ ] Build "Top Queries" analysis
  - Most common queries (with count)
  - Queries with best conversion
  - Queries with worst ratings
  - Unanswered/poor response queries
- [ ] Create "Query Topics" breakdown
  - Classify queries by intent
    - Winery features (outdoor seating, food, etc.)
    - Logistics (pickup, timing, capacity)
    - Pricing
    - Availability
  - Pie chart or bar chart
  - Insights & recommendations

**Afternoon (4 hours):**
- [ ] Build cost analysis dashboard
  - Total API costs (by day, week, month)
  - Cost per query
  - Cost per booking
  - Cost per model (if A/B testing)
  - Budget alerts
  - Projected monthly cost
- [ ] Add export functionality
  - Export analytics to CSV
  - Export for accounting
  - Date range selection

**Deliverable:** Deep insights into usage, costs, and opportunities

**Files to create:**
- `components/admin/analytics/TopQueries.tsx`
- `components/admin/analytics/QueryTopics.tsx`
- `components/admin/analytics/CostAnalysis.tsx`
- `app/api/admin/analytics/export/route.ts`

---

## Week 3: Fine-Tuning & Polish (Days 13-15)

### Day 13: Fine-Tuning Integration

**Morning (4 hours):**
- [ ] Build fine-tuning UI (`app/admin/ai-directory/fine-tune/page.tsx`)
  - Show approved training examples count
  - Preview training data format
  - Model name input (e.g., "walla-walla-v1")
  - Description field
  - "Create Fine-Tuned Model" button
- [ ] Implement OpenAI fine-tuning API integration
  - Upload training file
  - Create fine-tuning job
  - Poll for status
  - Store model ID when complete

**Afternoon (4 hours):**
- [ ] Create fine-tuning status dashboard
  - List all fine-tuning jobs
  - Show status (pending, running, succeeded, failed)
  - Show progress
  - Cost estimate
  - Deploy button (make active model)
- [ ] Add model management
  - View all custom models
  - Rename models
  - Delete models
  - Compare performance

**Deliverable:** Can create custom GPT-4o models trained on real data

**Files to create:**
- `app/admin/ai-directory/fine-tune/page.tsx`
- `app/api/admin/fine-tune/create/route.ts`
- `app/api/admin/fine-tune/status/route.ts`
- `lib/ai/fine-tuning/openai.ts`
- `components/admin/FineTuningWizard.tsx`
- `components/admin/FineTuningStatus.tsx`

---

### Day 14: Testing & Optimization

**Full Day (8 hours):**
- [ ] End-to-end testing
  - Test voice input on iOS Safari
  - Test voice input on Android Chrome
  - Test text input on desktop
  - Test all user flows
  - Test admin dashboard features
- [ ] Performance optimization
  - Add caching headers
  - Optimize database queries
  - Add indexes if needed
  - Compress API responses
- [ ] Error handling review
  - Graceful degradation
  - User-friendly error messages
  - Logging for debugging
  - Retry logic for API failures
- [ ] Security review
  - Rate limiting
  - Input validation
  - API key protection
  - Admin authentication
- [ ] Cost monitoring setup
  - Alert thresholds
  - Daily cost email
  - Budget tracking

**Deliverable:** Production-ready, optimized system

---

### Day 15: Documentation & Deployment

**Morning (4 hours):**
- [ ] Write user documentation
  - How to use AI Directory
  - Voice vs text input
  - Sample questions
  - Troubleshooting
- [ ] Write admin documentation
  - How to review queries
  - How to switch models
  - How to create fine-tuned models
  - How to interpret analytics
  - Cost management

**Afternoon (4 hours):**
- [ ] Deploy to production
  - Set environment variables (API keys)
  - Run database migrations
  - Deploy to Vercel/Heroku
  - Verify all features work
  - Enable monitoring
- [ ] Post-launch checklist
  - Set up error tracking (Sentry)
  - Set up uptime monitoring
  - Configure cost alerts
  - Test on production
  - Announce to team

**Deliverable:** Live in production, fully documented

**Files to create:**
- `docs/USER_GUIDE_AI_DIRECTORY.md`
- `docs/ADMIN_GUIDE_AI_DIRECTORY.md`
- `docs/FINE_TUNING_GUIDE.md`
- `docs/TROUBLESHOOTING_AI_DIRECTORY.md`

---

## Database Schema

### ai_settings Table
```sql
CREATE TABLE ai_settings (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google'
  model VARCHAR(100) NOT NULL,    -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  display_name VARCHAR(100),
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 600,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT false,
  is_fallback BOOLEAN DEFAULT false,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_test_percentage INTEGER, -- 0-100, NULL means not in A/B test
  ab_test_group VARCHAR(1), -- 'A' or 'B'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_settings_active ON ai_settings(is_active) WHERE is_active = true;
```

### ai_queries Table
```sql
CREATE TABLE ai_queries (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER, -- NULL for anonymous
  
  -- Query details
  query_text TEXT NOT NULL,
  query_intent VARCHAR(100), -- 'winery_search', 'logistics', 'pricing', etc.
  query_hash VARCHAR(64), -- for cache lookup
  
  -- Model & response
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  system_prompt_hash VARCHAR(64),
  response_text TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER,
  api_cost DECIMAL(10, 6),
  
  -- A/B test tracking
  ab_test_group VARCHAR(1), -- 'A', 'B', or NULL
  
  -- User feedback
  user_rating INTEGER, -- 1-5 or NULL
  user_feedback_text TEXT,
  user_clicked_result BOOLEAN DEFAULT false,
  clicked_item_id INTEGER,
  clicked_item_type VARCHAR(50), -- 'winery', 'tour', etc.
  
  -- Conversion tracking
  resulted_in_booking BOOLEAN DEFAULT false,
  booking_id INTEGER REFERENCES bookings(id),
  booking_value DECIMAL(10, 2),
  
  -- Admin review
  admin_rating VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
  admin_notes TEXT,
  approved_for_training BOOLEAN DEFAULT false,
  edited_response TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

CREATE INDEX idx_ai_queries_session ON ai_queries(session_id);
CREATE INDEX idx_ai_queries_user ON ai_queries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ai_queries_date ON ai_queries(created_at DESC);
CREATE INDEX idx_ai_queries_model ON ai_queries(provider, model);
CREATE INDEX idx_ai_queries_intent ON ai_queries(query_intent);
CREATE INDEX idx_ai_queries_rating ON ai_queries(user_rating);
CREATE INDEX idx_ai_queries_training ON ai_queries(approved_for_training) WHERE approved_for_training = true;
CREATE INDEX idx_ai_queries_booking ON ai_queries(booking_id) WHERE booking_id IS NOT NULL;
```

### ai_query_cache Table
```sql
CREATE TABLE ai_query_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  system_prompt_hash VARCHAR(64),
  response_text TEXT NOT NULL,
  response_data JSONB, -- structured data (wineries, tours, etc.)
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  last_hit_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_cache_hash ON ai_query_cache(query_hash);
CREATE INDEX idx_ai_cache_expires ON ai_query_cache(expires_at);
CREATE INDEX idx_ai_cache_model ON ai_query_cache(model);
```

### ai_fine_tuning_jobs Table
```sql
CREATE TABLE ai_fine_tuning_jobs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  base_model VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) UNIQUE, -- provider's job ID
  fine_tuned_model VARCHAR(255), -- result model ID
  model_name VARCHAR(100), -- friendly name
  description TEXT,
  training_file_id VARCHAR(255),
  training_examples_count INTEGER,
  status VARCHAR(50), -- 'pending', 'running', 'succeeded', 'failed', 'cancelled'
  error_message TEXT,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_fine_tuning_status ON ai_fine_tuning_jobs(status);
CREATE INDEX idx_fine_tuning_date ON ai_fine_tuning_jobs(created_at DESC);
```

---

## Environment Variables Needed

```env
# OpenAI (GPT-4o)
OPENAI_API_KEY=sk-...

# Anthropic (Claude) - Optional
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini) - Optional
GOOGLE_AI_API_KEY=...

# Deepgram (Voice Transcription)
DEEPGRAM_API_KEY=...

# Optional: Redis for caching
REDIS_URL=redis://...

# Cost Alerts
COST_ALERT_EMAIL=admin@wallawallatravel.com
MONTHLY_BUDGET_LIMIT=500
```

---

## Cost Projections

### Month 1 (Initial Launch)
**Assumptions:**
- 3,000 visitors
- 20% use AI Directory (600 users)
- 5 queries per user average
- Total: 3,000 queries

**Costs:**
- Deepgram (voice): ~$8
- GPT-4o: ~$93
- **Total: ~$101**

**Break-even:** 1 booking @ $100+ margin

---

### Month 2 (Growing Adoption)
**Assumptions:**
- 3,500 visitors
- 30% use AI Directory (1,050 users)
- 5 queries per user
- Total: 5,250 queries

**Costs:**
- Deepgram: ~$14
- GPT-4o: ~$163
- **Total: ~$177**

**Break-even:** 2 bookings @ $100+ margin

---

### Month 3 (Optimized with Fine-Tuning)
**Assumptions:**
- 4,000 visitors
- 35% use AI Directory (1,400 users)
- 5 queries per user
- Total: 7,000 queries
- 40% cache hit rate (optimized)

**Costs:**
- Deepgram: ~$18
- GPT-4o (60% of queries): ~$138
- Cache hits (40%): ~$0
- **Total: ~$156** (savings from cache!)

**Break-even:** 2 bookings

---

## Success Metrics (30-Day Goals)

### Usage
- [ ] 500+ AI Directory users
- [ ] 2,000+ queries
- [ ] 30%+ cache hit rate
- [ ] 3+ queries per user average

### Quality
- [ ] 4.0+ average user rating
- [ ] 80%+ positive admin reviews
- [ ] < 10% poor response rate
- [ ] 500+ approved training examples

### Conversion
- [ ] 3%+ conversion rate (AI users → bookings)
- [ ] 10+ bookings attributed to AI
- [ ] Positive ROI (revenue > cost)

### Technical
- [ ] < 2 second average response time
- [ ] 99%+ uptime
- [ ] 0 critical errors
- [ ] Cost within budget

---

## Post-Launch Plan

### Week 1 After Launch
- Monitor usage closely
- Track conversion rates
- Gather user feedback
- Fix any bugs immediately
- Review query quality

### Week 2-4
- Review all queries for quality
- Identify common patterns
- Mark excellent responses for training
- Optimize system prompt based on learnings
- Add missing information to database

### Month 2
- Export training data (500+ examples)
- Create fine-tuned GPT-4o model
- A/B test: Base vs Fine-Tuned
- Analyze results
- Deploy winner

### Month 3+
- Continue optimization
- Scale based on results
- Expand to other areas (proposal generation, etc.)
- Consider additional features

---

## Risk Mitigation

### API Costs Exceed Budget
**Mitigation:**
- Set hard limits in dashboard
- Automatic alerts at 50%, 75%, 90% of budget
- Rate limiting per user
- Aggressive caching
- Fallback to cheaper model if budget hit

### Poor Response Quality
**Mitigation:**
- A/B test different models
- Optimize system prompts
- Add more context/examples
- Fine-tune on good responses
- Manual review & improvement

### Low Adoption
**Mitigation:**
- Prominent placement on site
- Clear value proposition
- Suggested questions to lower barrier
- Marketing campaign
- Incentives (discount for using AI Directory?)

### Technical Issues
**Mitigation:**
- Comprehensive error handling
- Fallback models
- Graceful degradation
- Monitoring & alerts
- Quick rollback capability

---

## Ready to Build?

**Next Steps:**
1. Get API keys (OpenAI, Deepgram)
2. Set up development environment
3. Start Day 1: Voice Infrastructure

**Let's do this! 🚀**

