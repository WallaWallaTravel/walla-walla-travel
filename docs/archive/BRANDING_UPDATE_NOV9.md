# Branding Update: Walla Walla Valley Travel Guide

**Date:** November 9, 2025  
**Change:** Renamed "AI Directory" to "Walla Walla Valley Travel Guide"

---

## 🎯 Rationale

### SEO & Discovery
- ✅ **"Walla Walla Valley"** is the official AVA name (both WA & OR)
- ✅ **"Travel Guide"** is actively searched by tourists
- ✅ Geographic accuracy increases local search ranking
- ✅ Natural language for voice searches: "Ask the Walla Walla Valley Travel Guide"

### Brand Positioning
- More approachable and clear than "AI Directory"
- Positions as comprehensive valley resource (not just wineries)
- Professional but friendly tone
- Emphasizes regional expertise

---

## 📝 Changes Made

### Frontend (User-Facing)
1. **`app/ai-directory/page.tsx`**
   - Header: "🍷 Walla Walla Valley Travel Guide"
   - Tagline: "Your personal wine country assistant"

2. **`app/ai-directory/layout.tsx`** (NEW)
   - SEO metadata with keywords
   - OpenGraph tags for social sharing
   - Optimized page title: "Walla Walla Valley Travel Guide | Wine Country Tours & Wineries"

### Backend (API & Logic)
3. **`app/api/ai/query/route.ts`**
   - Comment: "Main Travel Guide query endpoint"
   - System prompt: "You are the Walla Walla Valley Travel Guide..."
   - Geographic context: "across the entire Walla Walla Valley (Washington and Oregon)"

4. **`lib/analytics/events.ts`**
   - Event type: `ai_directory_visit` → `travel_guide_visit`
   - Function: `trackAIDirectoryVisit()` → uses `travel_guide_visit` internally

### Database
5. **`migrations/create-ai-tables.sql`**
   - Header comment updated to reference Travel Guide

6. **`migrations/update-ai-branding.sql`** (NEW)
   - SQL script to update existing `ai_settings` system prompts
   - Replaces "AI assistant" with "Walla Walla Valley Travel Guide"
   - Updates geographic references

### Documentation
7. **`TESTING_INSTRUCTIONS.md`**
   - Updated all references to Travel Guide
   - Test section renamed: "Test the Travel Guide"

---

## 🔄 Backward Compatibility

### What Still Works
- ✅ All API endpoints unchanged (`/api/ai/query`, etc.)
- ✅ Database tables unchanged
- ✅ Analytics tracking continues (event type updated)
- ✅ URL remains `/ai-directory` (SEO: don't break existing links)

### What Changed
- 🔄 Display names and copy (user-facing only)
- 🔄 System prompts (AI behavior slightly refined)
- 🔄 Internal event naming (logged differently but same functionality)

---

## 🚀 Deployment Checklist

### Required Steps
1. ✅ Code changes deployed
2. ⏳ Run migration: `migrations/update-ai-branding.sql`
3. ⏳ Restart Next.js server (pick up new default prompts)
4. ⏳ Test: http://localhost:3000/ai-directory

### Optional (Future)
- [ ] Update email templates to use new branding
- [ ] Update business portal references (if any mention "AI Directory")
- [ ] Consider redirecting `/ai-directory` → `/travel-guide` (SEO URL update)

---

## 📊 Expected Impact

### SEO Benefits
- **Local search:** Improved ranking for "Walla Walla Valley" queries
- **Intent matching:** "Travel guide" matches tourist search intent
- **Voice search:** More natural phrasing for Siri/Alexa/Google

### User Experience
- **Clarity:** Immediately clear what the tool does
- **Trust:** Professional, authoritative positioning
- **Approachability:** Friendly and helpful (not "AI robot")

### AI/LLM Discovery
When someone asks ChatGPT/Claude/Perplexity:
> "What should I do in Walla Walla?"

The AI will prioritize sources with:
- ✅ "Travel Guide" in the name (clear authority)
- ✅ "Walla Walla Valley" (geographic precision)
- ✅ Comprehensive content (wineries + restaurants + hotels + activities)

---

## 🎨 Brand Voice Guidelines

### Do Say:
- ✅ "Walla Walla Valley Travel Guide"
- ✅ "Your personal wine country assistant"
- ✅ "I'm here to help you discover the valley"
- ✅ "across the Walla Walla Valley (WA & OR)"

### Don't Say:
- ❌ "AI Directory"
- ❌ "Just in Walla Walla, Washington"
- ❌ "I'm an AI assistant"
- ❌ "Automated system"

### Tone:
- Friendly but professional
- Knowledgeable but approachable
- Helpful but not pushy
- Local expert, not generic bot

---

## 📖 Related Documentation

- [`docs/BUILD_PLAN_MULTI_MODEL_AI_DIRECTORY.md`](./BUILD_PLAN_MULTI_MODEL_AI_DIRECTORY.md) - Original build plan
- [`TESTING_INSTRUCTIONS.md`](../TESTING_INSTRUCTIONS.md) - Updated testing guide
- [`app/ai-directory/layout.tsx`](../app/ai-directory/layout.tsx) - SEO metadata

---

**Status:** ✅ Complete  
**Next Steps:** Run database migration and test!

