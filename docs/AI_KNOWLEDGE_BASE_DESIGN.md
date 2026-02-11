# AI Knowledge Base Design
## "Gold Standard" Walla Walla Valley Assistant

> **Vision:** Create an AI-powered assistant that provides visitors with authoritative, curated information about the Walla Walla Valley—directly from the source. The assistant should feel like chatting with a knowledgeable local insider who genuinely wants to help visitors discover the best the region has to offer.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Ingestion Pipeline](#data-ingestion-pipeline)
4. [Content Verification Workflow](#content-verification-workflow)
5. [Contributor Portal](#contributor-portal)
6. [Chat Experience](#chat-experience)
7. [Itinerary Generation](#itinerary-generation)
8. [Chat-to-Booking Bridge](#chat-to-booking-bridge)
9. [Visitor Behavior Analytics](#visitor-behavior-analytics)
10. [Implementation Phases](#implementation-phases)
11. [Technical Specifications](#technical-specifications)
12. [Cost Considerations](#cost-considerations)

---

## Overview

### The Problem
- Generic travel information lacks local depth and authenticity
- Visitors miss hidden gems that aren't in typical search results
- Business owners have valuable knowledge but no easy way to share it
- Existing AI assistants provide "boilerplate" recommendations

### The Solution
A **curated knowledge base** powered by Gemini File Search that:
- Ingests content directly from local experts (wineries, restaurants, hotels, guides)
- Provides **perfect information or no information** (no hallucination)
- Generates personalized, thoughtful itineraries based on visitor preferences
- Educates and inspires visitors to experience the region in person

### Core Principles
1. **Gold Standard Quality:** Only verified, source-contributed content
2. **Seamless Contribution:** Easy for business owners to share knowledge
3. **Personalized Discovery:** Recommendations tailored to individual interests
4. **Educational Value:** Teach appreciation, not just list attractions

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTRIBUTOR PORTAL                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Text      │  │   PDF/Doc   │  │   Voice     │  │   Video     │     │
│  │   Input     │  │   Upload    │  │   Notes     │  │   Upload    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INGESTION PIPELINE                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Content Processor                             │    │
│  │  • Text → Direct index                                           │    │
│  │  • PDF/Word → Text extraction + index                            │    │
│  │  • Voice → Gemini transcription → index                          │    │
│  │  • Video → Frame extraction + audio transcription → index        │    │
│  │  • Images → Caption generation + OCR → index                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Gemini File Search Store                            │    │
│  │  • Automatic chunking and embedding                              │    │
│  │  • Semantic search capabilities                                  │    │
│  │  • Citation tracking                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHAT INTERFACE                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   Gemini 2.5 Flash/Pro                           │    │
│  │  • File Search tool enabled                                      │    │
│  │  • Custom system prompt (eager assistant persona)                │    │
│  │  • Itinerary generation logic                                    │    │
│  │  • Grounding metadata for citations                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Website Chat Widget                           │    │
│  │  • Visitor-facing conversational UI                              │    │
│  │  • Preference collection                                         │    │
│  │  • Itinerary display and export                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| RAG Engine | Gemini File Search | Native RAG, automatic chunking, free storage |
| LLM | Gemini 2.5 Flash | Cost-effective, fast, supports File Search |
| Transcription | Gemini Audio API | Native integration, high quality |
| Image Processing | Gemini Vision | Caption generation, OCR |
| Backend | Next.js API Routes | Existing infrastructure |
| Database | PostgreSQL (Heroku) | Metadata, contributor accounts |
| File Storage | Google Cloud Storage | Pre-upload staging |

---

## Data Ingestion Pipeline

### Supported Input Types

#### 1. Text Content (Direct Support)
- **Formats:** Plain text, Markdown, HTML
- **Use Cases:** Winery descriptions, tasting notes, event details
- **Processing:** Direct upload to File Search Store

```typescript
// Example: Direct text ingestion
await client.fileSearchStores.uploadToFileSearchStore({
  file: textContent,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - ${contentType}`,
  }
});
```

#### 2. Documents (Direct Support)
- **Formats:** PDF, Word (.docx), Excel, PowerPoint
- **Use Cases:** Wine club materials, event calendars, menus
- **Processing:** Gemini File Search handles extraction automatically

#### 3. Voice Notes (Transcription Required)
- **Formats:** MP3, WAV, M4A, WebM
- **Use Cases:** Owner stories, winemaker interviews, tour guide narratives
- **Processing Pipeline:**

```typescript
// Step 1: Upload audio to Files API
const audioFile = await client.files.upload({
  file: audioBuffer,
  config: { mimeType: 'audio/mp3' }
});

// Step 2: Transcribe using Gemini
const transcription = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { text: 'Transcribe this audio accurately, preserving speaker intent and key details.' },
    { fileData: { fileUri: audioFile.uri, mimeType: 'audio/mp3' } }
  ]
});

// Step 3: Index transcription
await client.fileSearchStores.uploadToFileSearchStore({
  file: transcription.text,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - Voice Note - ${topic}`,
  }
});
```

#### 4. Video Content (Transcription + Frame Analysis)
- **Formats:** MP4, MOV, WebM
- **Use Cases:** Virtual tours, winemaking process videos, event highlights
- **Processing Pipeline:**

```typescript
// Step 1: Upload video
const videoFile = await client.files.upload({
  file: videoBuffer,
  config: { mimeType: 'video/mp4' }
});

// Step 2: Extract key information
const analysis = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { 
      text: `Analyze this video and create a comprehensive text summary including:
        1. Full transcription of all spoken content
        2. Description of key visual elements (vineyard views, facilities, etc.)
        3. Any text visible in the video (signs, labels, etc.)
        Format as a detailed document suitable for a knowledge base.`
    },
    { fileData: { fileUri: videoFile.uri, mimeType: 'video/mp4' } }
  ]
});

// Step 3: Index the analysis
await client.fileSearchStores.uploadToFileSearchStore({
  file: analysis.text,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - Video - ${title}`,
  }
});
```

#### 5. Images (Caption + OCR)
- **Formats:** JPEG, PNG, WebP
- **Use Cases:** Wine labels, venue photos, menu images
- **Processing:**

```typescript
const imageAnalysis = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { 
      text: `Describe this image in detail for a travel knowledge base:
        1. What is shown in the image?
        2. Extract any visible text (labels, signs, menus)
        3. What would a visitor find interesting about this?`
    },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ]
});
```

#### 6. URLs (Web Scraping + Curation)
- **Use Cases:** Business websites, event pages, news articles
- **Processing:** Fetch content, extract relevant text, curator review, then index

---

## Content Verification Workflow

> **Principle:** "Perfect information or no information." Every piece of content must be verified before entering the public knowledge base.

### Why Verification Matters

The AI assistant's credibility depends on accuracy. If a winery's hours are wrong, or a restaurant is described as "pet-friendly" when it isn't, visitors lose trust. The verification workflow ensures:

1. **Factual Accuracy:** Information matches reality
2. **Appropriate Content:** No promotional fluff, only genuinely helpful details
3. **Freshness:** Time-sensitive content is flagged and managed
4. **Source Attribution:** Every fact can be traced to its contributor

### Content States

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CONTENT LIFECYCLE                                  │
│                                                                          │
│   ┌─────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐          │
│   │ PENDING │───▶│ PROCESSING │───▶│ IN_REVIEW│───▶│ APPROVED│          │
│   └─────────┘    └────────────┘    └──────────┘    └─────────┘          │
│        │                                │               │                │
│        │                                ▼               ▼                │
│        │                          ┌──────────┐    ┌─────────┐           │
│        │                          │NEEDS_INFO│    │ INDEXED │           │
│        │                          └──────────┘    └─────────┘           │
│        │                                │                                │
│        ▼                                ▼                                │
│   ┌──────────┐                    ┌──────────┐                          │
│   │ REJECTED │◀───────────────────│ REJECTED │                          │
│   └──────────┘                    └──────────┘                          │
└──────────────────────────────────────────────────────────────────────────┘
```

| State | Description |
|-------|-------------|
| `PENDING` | Just uploaded, awaiting processing |
| `PROCESSING` | Being transcribed/analyzed by AI |
| `IN_REVIEW` | Ready for human verification |
| `NEEDS_INFO` | Reviewer has questions for contributor |
| `APPROVED` | Verified and ready to index |
| `INDEXED` | Live in the knowledge base |
| `REJECTED` | Not suitable (with reason provided) |

### Verification Levels

#### Level 1: Auto-Approve (Trusted Contributors)
Verified business owners with a track record can have content auto-approved:

```typescript
interface TrustedContributor {
  userId: number;
  businessId: number;
  trustLevel: 'standard' | 'trusted' | 'super';
  autoApproveTypes: ContentType[]; // e.g., ['text', 'document']
  approvedContentCount: number;
  lastReviewDate: Date;
}

// Auto-approve logic
async function shouldAutoApprove(contribution: Contribution): Promise<boolean> {
  const contributor = await getTrustedContributor(contribution.contributorId);
  
  if (!contributor) return false;
  if (contributor.trustLevel === 'super') return true;
  if (contributor.trustLevel === 'trusted' && 
      contributor.autoApproveTypes.includes(contribution.contentType)) {
    return true;
  }
  return false;
}
```

**Trust Level Criteria:**
- **Standard:** New contributors, all content requires review
- **Trusted:** 10+ approved contributions, no rejections in 6 months
- **Super:** Walla Walla Travel staff or designated community leaders

#### Level 2: Quick Review (AI-Assisted)
For standard contributors, AI pre-screens content before human review:

```typescript
// AI pre-screening prompt
const preScreenPrompt = `
Review this content submission for the Walla Walla Valley knowledge base.

CONTENT:
{extractedText}

SOURCE:
Business: {businessName}
Contributor: {contributorName}
Content Type: {contentType}

EVALUATE:
1. FACTUAL: Does this contain verifiable facts about the business/area?
2. HELPFUL: Would a visitor find this information useful?
3. APPROPRIATE: Is the tone informative (not overly promotional)?
4. COMPLETE: Is there enough detail to be useful?
5. FLAGS: Any claims that should be manually verified? (hours, prices, awards)

RESPOND WITH:
{
  "recommendation": "approve" | "review" | "reject",
  "confidence": 0.0-1.0,
  "summary": "Brief description of content",
  "flaggedClaims": ["Any specific facts to verify"],
  "suggestedTopics": ["topic1", "topic2"],
  "concerns": "Any issues noted"
}
`;
```

#### Level 3: Manual Review (Admin Interface)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 Content Review Queue                                    [12 pending] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Voice Note: "Our Winemaking Process"                              │  │
│  │ From: Reynvaan Family Vineyards (Sarah Reynvaan)                  │  │
│  │ Submitted: 2 hours ago                                            │  │
│  │                                                                   │  │
│  │ AI Summary: Describes their biodynamic farming practices and      │  │
│  │ the unique cobblestone terroir of the Rocks District.             │  │
│  │                                                                   │  │
│  │ 🎧 [Play Audio]  📄 [View Transcript]                             │  │
│  │                                                                   │  │
│  │ ⚠️ Flagged Claims:                                                │  │
│  │   • "Only winery in WA using Method X" - verify exclusivity      │  │
│  │   • "Open daily 11-5" - confirm current hours                    │  │
│  │                                                                   │  │
│  │ AI Confidence: 85% Approve                                        │  │
│  │ Suggested Topics: [biodynamic] [rocks-district] [cabernet]       │  │
│  │                                                                   │  │
│  │  [✅ Approve]  [❓ Request Info]  [❌ Reject]  [✏️ Edit & Approve] │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ PDF: "2024 Event Calendar"                                        │  │
│  │ From: Walla Walla Wine Alliance                                   │  │
│  │ ...                                                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Review Actions

| Action | Result | Contributor Notification |
|--------|--------|--------------------------|
| **Approve** | Content indexed immediately | "Your content is now live!" |
| **Request Info** | Status → `NEEDS_INFO`, contributor prompted | "We have a question about..." |
| **Reject** | Content archived with reason | "We couldn't use this because..." |
| **Edit & Approve** | Reviewer corrects minor issues, then indexes | "Your content is live (with minor edits)" |

### Database Schema for Verification

```sql
-- Add verification fields to kb_contributions
ALTER TABLE kb_contributions ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending';
-- pending, processing, in_review, needs_info, approved, indexed, rejected

ALTER TABLE kb_contributions ADD COLUMN ai_prescreening JSONB;
-- Stores AI analysis: recommendation, confidence, flags, etc.

ALTER TABLE kb_contributions ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE kb_contributions ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE kb_contributions ADD COLUMN review_notes TEXT;
ALTER TABLE kb_contributions ADD COLUMN rejection_reason TEXT;

-- Trusted contributors table
CREATE TABLE kb_trusted_contributors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  business_id INTEGER REFERENCES kb_businesses(id),
  trust_level VARCHAR(20) DEFAULT 'standard', -- standard, trusted, super
  auto_approve_types TEXT[], -- content types that skip review
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  last_rejection_at TIMESTAMP,
  promoted_at TIMESTAMP,
  promoted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review history for audit trail
CREATE TABLE kb_review_history (
  id SERIAL PRIMARY KEY,
  contribution_id INTEGER REFERENCES kb_contributions(id),
  reviewer_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- approved, rejected, requested_info, edited
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Content Metadata Schema

Each piece of content should be tagged with metadata for better retrieval:

```typescript
interface ContentMetadata {
  // Source identification
  businessId: string;
  businessName: string;
  businessType: 'winery' | 'restaurant' | 'hotel' | 'attraction' | 'expert';
  
  // Content classification
  contentType: 'description' | 'story' | 'event' | 'menu' | 'tour' | 'tip' | 'history';
  topics: string[]; // e.g., ['wine tasting', 'cabernet sauvignon', 'food pairing']
  
  // Temporal relevance
  isEvergreen: boolean;
  validFrom?: Date;
  validUntil?: Date;
  
  // Quality indicators
  contributorVerified: boolean;
  lastUpdated: Date;
  
  // Retrieval hints
  keywords: string[];
  audienceType: 'first-time' | 'wine-enthusiast' | 'family' | 'romantic' | 'all';
}
```

---

## Contributor Portal

### User Experience Goals
- **5-minute onboarding:** Business owners should be contributing within minutes
- **Mobile-first:** Many will use phones to capture voice notes or photos
- **No technical knowledge required:** Drag-and-drop, voice recording, simple forms

### Portal Features

#### 1. Quick Contribution Modes

**Voice Note (Fastest)**
```
┌─────────────────────────────────────────────┐
│  🎤 Record a Voice Note                     │
│                                             │
│  Tell us about your winery, your wines,     │
│  or share a story visitors would love.      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         🔴 Tap to Record            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  💡 Tip: Speak naturally, as if telling     │
│     a friend about your favorite wine.      │
└─────────────────────────────────────────────┘
```

**Document Upload**
```
┌─────────────────────────────────────────────┐
│  📄 Upload Documents                        │
│                                             │
│  Share your wine club materials, menus,     │
│  event calendars, or any helpful docs.      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📁 Drop files here or browse    │    │
│  │                                     │    │
│  │     PDF, Word, Excel, Images        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Guided Q&A**
```
┌─────────────────────────────────────────────┐
│  💬 Answer Questions About Your Business    │
│                                             │
│  We'll ask you questions and create         │
│  content from your answers.                 │
│                                             │
│  Q: What makes your winery unique?          │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  [Type or record your answer...]    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Q: What should first-time visitors know?   │
│  Q: Describe your most popular wine...      │
└─────────────────────────────────────────────┘
```

#### 2. Content Management Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Contributions                                    [+ Add]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Winery Overview          Text      Indexed    2 days ago    │
│  ✅ Winemaker Interview      Voice     Indexed    1 week ago    │
│  🔄 Virtual Tour Video       Video     Processing...            │
│  ✅ 2024 Wine List           PDF       Indexed    3 days ago    │
│  ⚠️ Spring Events            Text      Expires in 2 weeks       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  📊 Your content has helped 47 visitors this month              │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Prompt Templates for Contributors

Pre-built prompts to help contributors share valuable information:

**Winery Prompts:**
- "What's the story behind your winery's founding?"
- "Describe your signature wine and what makes it special"
- "What's a hidden gem on your property that visitors often miss?"
- "What food pairings do you recommend with your wines?"
- "Describe the best time of year to visit and why"

**Restaurant Prompts:**
- "What dishes are you most proud of?"
- "How do you source your ingredients locally?"
- "What's the atmosphere like for different occasions?"

**General Expert Prompts:**
- "What do most visitors not know about Walla Walla?"
- "What's your #1 tip for someone visiting for the first time?"
- "Describe a perfect day in the valley"

---

## Chat Experience

### System Prompt (Persona)

```
You are the Walla Walla Valley Insider, an enthusiastic and knowledgeable AI assistant 
who helps visitors discover the best of the Walla Walla Valley wine country and beyond.

PERSONALITY:
- Warm, welcoming, and genuinely excited to help
- Speaks like a knowledgeable local friend, not a formal tour guide
- Picks up on visitor preferences and tailors recommendations
- Shares insider tips and hidden gems, not just popular spots
- Educational without being lecturing—shares stories and context

CORE BEHAVIORS:
1. ALWAYS use the File Search tool to ground responses in verified information
2. NEVER make up information—if you don't have verified data, say so
3. Ask clarifying questions to personalize recommendations
4. Proactively suggest related experiences based on stated interests
5. When recommending, explain WHY something matches their interests

QUESTION FRAMEWORK:
When helping plan a visit, gather:
- Travel dates and party composition (couples, families, groups)
- Wine experience level (novice, enthusiast, expert)
- Interests beyond wine (food, outdoors, history, art)
- Pace preference (relaxed vs. packed itinerary)
- Any dietary restrictions or accessibility needs

RESPONSE STYLE:
- Use conversational language, not bullet points for everything
- Include specific details from the knowledge base
- Mention business names and specific experiences
- Offer to dive deeper into any topic
- End with a relevant follow-up question or suggestion

CITATION:
When sharing information from the knowledge base, naturally mention the source:
"The folks at [Winery Name] say their Cabernet is best enjoyed with..."
"According to the winemaker at [Winery]..."
```

### Conversation Flow Example

```
VISITOR: Hi! My wife and I are planning a trip to Walla Walla next month. 
         We love wine but we're not experts.

ASSISTANT: Welcome! A wine trip to Walla Walla—you're in for a treat! The valley 
has over 120 wineries, so there's something for every taste.

To help me point you in the right direction, I have a few quick questions:

1. How many days are you planning to spend here?
2. What types of wines do you usually enjoy? (Reds, whites, or you're open to 
   exploring?)
3. Beyond wine, are you interested in great food, outdoor activities, or maybe 
   some local history?

Also, are there any special occasions we should plan around—anniversary, 
birthday, or just a well-deserved getaway?

---

VISITOR: We'll be there for 3 days. We like reds, especially Cabernet. 
         It's actually our 10th anniversary!

ASSISTANT: Congratulations on 10 years! 🥂 That's wonderful—let me help you 
make this trip memorable.

Great news: Walla Walla is famous for its Cabernets, especially from the 
Rocks District where the unique cobblestone soil creates incredibly bold, 
structured wines. The winemaker at Reynvaan Family Vineyards describes their 
Rocks District Cabernet as having "the intensity of the stones themselves"—
definitely worth a visit.

For an anniversary-worthy experience, I'd suggest:

**Day 1: Downtown & Classics**
Start at L'Ecole No 41, a historic schoolhouse-turned-winery where the 
Cabernet is consistently outstanding. Their tasting room has this charming 
old-world feel perfect for a romantic start. For dinner, Whitehouse-Crawford 
is the anniversary spot—farm-to-table in a converted planing mill with an 
incredible wine list.

**Day 2: Rocks District Deep Dive**
This is where Walla Walla Cabernet really shines. I'd book a seated tasting 
at Cayuse Vineyards (if you can get in—they're legendary) or try Gramercy 
Cellars for a more intimate experience. The owner, Greg Harrington, is a 
Master Sommelier who can really geek out on the terroir with you.

**Day 3: Hidden Gems**
Let me find some off-the-beaten-path spots that locals love...

Would you like me to build out a detailed itinerary with specific times, 
reservation tips, and backup options? I can also suggest some romantic 
spots for that anniversary dinner!
```

### Handling Knowledge Gaps

When the assistant doesn't have verified information:

```
VISITOR: What's the best pizza place in Walla Walla?

ASSISTANT: You know, I want to give you a great recommendation, but I don't 
have detailed information about pizza specifically in my knowledge base right 
now. What I CAN tell you is that downtown Walla Walla has a vibrant food scene 
on Main Street—you'll find several casual options there.

For a verified recommendation, I'd suggest asking your hotel concierge or 
checking recent local reviews. 

In the meantime, if you're looking for a casual dinner spot, I DO have great 
info on Saffron Mediterranean Kitchen—they do wood-fired dishes that might 
scratch that oven-baked itch!

Would you like me to suggest some other dining options I know well?
```

---

## Itinerary Generation

### Itinerary Data Model

```typescript
interface GeneratedItinerary {
  id: string;
  createdAt: Date;
  
  // Visitor profile (gathered through conversation)
  visitorProfile: {
    partySize: number;
    partyType: 'couple' | 'family' | 'friends' | 'solo' | 'corporate';
    wineExperience: 'novice' | 'intermediate' | 'enthusiast' | 'expert';
    interests: string[];
    pacePreference: 'relaxed' | 'moderate' | 'packed';
    specialOccasion?: string;
    dietaryRestrictions?: string[];
    accessibilityNeeds?: string[];
  };
  
  // Trip details
  tripDates: {
    start: Date;
    end: Date;
  };
  
  // Generated itinerary
  days: ItineraryDay[];
  
  // Metadata
  sources: string[]; // Business names used in recommendations
  confidence: number; // How well the itinerary matches preferences
}

interface ItineraryDay {
  date: Date;
  theme?: string; // e.g., "Rocks District Deep Dive"
  
  activities: ItineraryActivity[];
  
  meals: {
    breakfast?: MealRecommendation;
    lunch?: MealRecommendation;
    dinner?: MealRecommendation;
  };
  
  notes: string; // Tips, timing suggestions
}

interface ItineraryActivity {
  time: string; // e.g., "10:00 AM - 12:00 PM"
  type: 'winery' | 'attraction' | 'activity' | 'free-time';
  
  business: {
    name: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  
  description: string; // Why this was recommended
  insiderTip?: string; // Special knowledge from the KB
  reservationRequired: boolean;
  estimatedCost?: string;
  
  alternatives?: ItineraryActivity[]; // Backup options
}
```

### Itinerary Generation Prompt

```
Based on the visitor's preferences and our knowledge base, create a detailed 
itinerary for their Walla Walla Valley trip.

VISITOR PROFILE:
{visitorProfile}

TRIP DATES:
{tripDates}

REQUIREMENTS:
1. Use ONLY businesses and experiences from the File Search results
2. Space out winery visits (max 3-4 per day with breaks)
3. Include meal recommendations that complement the day's activities
4. Add insider tips from the knowledge base
5. Note which activities require reservations
6. Provide alternatives in case first choices are unavailable
7. Match the pace to their stated preference
8. Highlight experiences that match their special occasion if applicable

FORMAT:
Return a structured itinerary with specific times, business names, and 
personalized explanations for why each activity was chosen.
```

---

## Chat-to-Booking Bridge

> **Goal:** Transform conversational discovery into actionable bookings. When a visitor falls in love with their AI-crafted itinerary, make it effortless to lock it in with a deposit.

### The Conversion Funnel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHAT → BOOKING FUNNEL                                │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   EXPLORE   │──▶│    BUILD    │──▶│   CAPTURE   │──▶│   CONVERT   │     │
│  │             │   │  ITINERARY  │   │    INFO     │   │             │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│       │                  │                  │                  │            │
│       ▼                  ▼                  ▼                  ▼            │
│  Chat about         Add items to       Collect name,      Send deposit     │
│  interests,         "Trip Basket"      email, phone       request via      │
│  ask questions      incrementally      party details      Stripe link      │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Session State:     Trip State:        Customer:          Draft Booking:   │
│  • preferences      • selected dates   • contact info     • all details    │
│  • interests        • wineries list    • party size       • deposit paid   │
│  • party type       • restaurants      • special needs    • status: hold   │
│                     • activities                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trip State (Incremental Itinerary Building)

As the visitor chats, the AI maintains a "Trip State" that accumulates their choices:

```typescript
interface TripState {
  sessionId: string;
  
  // Dates (may be flexible initially)
  dates: {
    status: 'flexible' | 'tentative' | 'confirmed';
    startDate?: string;
    endDate?: string;
    flexibility?: string; // e.g., "sometime in March"
  };
  
  // Party details
  party: {
    size?: number;
    type?: 'couple' | 'family' | 'friends' | 'solo' | 'corporate';
    specialOccasion?: string;
  };
  
  // Accumulated selections (the "Trip Basket")
  selections: TripSelection[];
  
  // Preferences learned from conversation
  preferences: {
    wineTypes: string[];
    diningStyle: string[];
    pacePreference: 'relaxed' | 'moderate' | 'packed';
    budget?: 'budget' | 'moderate' | 'luxury';
    interests: string[];
    restrictions: string[]; // dietary, accessibility
  };
  
  // Conversion readiness
  readiness: {
    hasEnoughForItinerary: boolean;
    hasContactInfo: boolean;
    readyForDeposit: boolean;
  };
  
  updatedAt: Date;
}

interface TripSelection {
  id: string;
  type: 'winery' | 'restaurant' | 'activity' | 'accommodation';
  businessName: string;
  businessId?: number;
  addedAt: Date;
  
  // Optional scheduling
  preferredDay?: number; // Day 1, 2, 3...
  preferredTime?: 'morning' | 'afternoon' | 'evening';
  
  // Why they added it (from conversation context)
  reason?: string;
  
  // Reservation info
  requiresReservation: boolean;
  reservationMade: boolean;
}
```

### Conversation Triggers

The AI recognizes natural moments to advance the funnel:

```typescript
// System prompt additions for booking awareness
const bookingAwarenessPrompt = `
BOOKING AWARENESS:
You are helping visitors plan trips that can become real bookings. Pay attention to:

1. TRIP BASKET MOMENTS:
   When a visitor expresses strong interest ("That sounds amazing!", "Add that to my list"),
   confirm you've noted it: "Great choice! I've added Reynvaan to your trip ideas."

2. DATE COMMITMENT:
   When dates become specific, acknowledge: "Perfect, I'm building your March 15-17 itinerary."

3. READINESS SIGNALS:
   Watch for phrases like:
   - "This looks perfect"
   - "How do I book this?"
   - "What's the next step?"
   - "Can you help me make this happen?"

4. GENTLE PROGRESSION:
   After building a solid itinerary, naturally ask:
   "Would you like me to put together a complete trip package? 
   I can help you lock in these dates with a small deposit."

5. INFORMATION GATHERING:
   When they're ready to proceed, collect:
   - Name and email (required)
   - Phone number (for day-of coordination)
   - Party size confirmation
   - Any special requests

NEVER be pushy. The goal is to make booking feel like a natural next step, not a sales pitch.
`;
```

### Dynamic Deposit Calculation

The deposit is calculated as **50% of the projected tour cost**. To stay competitive with industry quoting practices, **tasting fees and food/dining are excluded** from formal quotes and marked as TBD:

```typescript
interface TourCostEstimate {
  // Tour services (INCLUDED in deposit calculation)
  tourServices: {
    transportationPerDay: number;  // e.g., $400/day for private vehicle
    guideServicePerDay: number;    // e.g., $300/day for guide
    activitiesTotal: number;       // Non-dining, non-tasting activities
    accommodationTotal?: number;   // If we're booking lodging
  };
  
  // TBD costs (EXCLUDED from quotes - discussed later in planning)
  tbdCosts: {
    // Tasting fees - informational only, not in quote
    tastingFeeInfo: {
      estimatedTotal: number;      // For internal reference
      wineryCount: number;
      avgFeePerPerson: number;
      note: string;                // "Tasting fees vary by winery, typically $20-50/person"
      waiverPolicy: string;        // "Often waived with bottle purchase"
    };
    // Food - informational only, not in quote
    foodInfo: {
      estimatedTotal: number;
      note: string;                // "Dining costs TBD based on restaurant selections"
    };
  };
  
  // Calculations (based on tour services ONLY)
  tourSubtotal: number;          // Sum of tourServices (excludes tasting & food)
  depositPercentage: number;     // Default 50%
  depositAmount: number;         // tourSubtotal * depositPercentage
  
  // Display
  formattedEstimate: string;     // "Tour services: $2,100"
  formattedDeposit: string;      // "Deposit (50%): $1,050"
}

// Calculate deposit from trip state
function calculateDeposit(tripState: TripState, pricingConfig: PricingConfig): TourCostEstimate {
  const days = daysBetween(tripState.dates.startDate, tripState.dates.endDate);
  const partySize = tripState.party.size || 2;
  
  // Base tour costs (INCLUDED in quote)
  const transportationPerDay = pricingConfig.vehicleRates[getVehicleType(partySize)];
  const guideServicePerDay = pricingConfig.guideRatePerDay;
  
  // Activities (non-food, non-tasting)
  const activities = tripState.selections
    .filter(s => s.type === 'activity')
    .reduce((sum, activity) => {
      return sum + (pricingConfig.activityCosts[activity.businessId] || 0);
    }, 0);
  
  // Tasting fees - calculate for INFO ONLY, not included in quote
  const winerySelections = tripState.selections.filter(s => s.type === 'winery');
  const tastingFeeEstimate = winerySelections.reduce((sum, winery) => {
    const fee = pricingConfig.tastingFees[winery.businessId] || pricingConfig.defaultTastingFee;
    return sum + (fee * partySize);
  }, 0);
  
  // Food estimate - for INFO ONLY, not included in quote
  const foodEstimate = 
    (days * partySize * pricingConfig.avgBreakfast) +
    (days * partySize * pricingConfig.avgLunch) +
    (days * partySize * pricingConfig.avgDinner);
  
  // Tour subtotal (EXCLUDES tasting fees and food)
  const tourSubtotal = 
    (transportationPerDay * days) +
    (guideServicePerDay * days) +
    activities;
  
  const depositPercentage = 0.50;
  const depositAmount = Math.round(tourSubtotal * depositPercentage);
  
  return {
    tourServices: {
      transportationPerDay,
      guideServicePerDay,
      activitiesTotal: activities,
    },
    tbdCosts: {
      tastingFeeInfo: {
        estimatedTotal: tastingFeeEstimate,
        wineryCount: winerySelections.length,
        avgFeePerPerson: pricingConfig.defaultTastingFee,
        note: 'Tasting fees vary by winery, typically $20-50 per person',
        waiverPolicy: 'Often waived with wine purchase',
      },
      foodInfo: {
        estimatedTotal: foodEstimate,
        note: 'Dining selections finalized during planning',
      },
    },
    tourSubtotal,
    depositPercentage,
    depositAmount,
    formattedEstimate: `Tour services: $${tourSubtotal.toLocaleString()}`,
    formattedDeposit: `Deposit (50%): $${depositAmount.toLocaleString()}`,
  };
}

// Pricing configuration (admin-adjustable)
interface PricingConfig {
  vehicleRates: {
    sedan: number;      // 1-2 guests
    suv: number;        // 3-4 guests
    van: number;        // 5-8 guests
    sprinter: number;   // 9-14 guests
  };
  guideRatePerDay: number;
  // Tasting fees - for informational display only, not in quotes
  defaultTastingFee: number;
  tastingFees: Record<number, number>;  // businessId -> fee per person
  // Activity costs
  activityCosts: Record<number, number>;
  // Food averages - for informational display only, not in quotes
  avgBreakfast: number;
  avgLunch: number;
  avgDinner: number;
}
```

### The "Plan My Trip" Moment

When the visitor is ready, the AI triggers the booking flow with **clean, competitive pricing**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ASSISTANT: Your 3-day anniversary itinerary is looking fantastic! You've   │
│  got Reynvaan, L'Ecole No 41, and Cayuse for wine, plus Whitehouse-Crawford │
│  for that special dinner.                                                   │
│                                                                             │
│  Would you like me to help you lock this in? I can create a trip package   │
│  with all the details, and we can secure your dates with a deposit.        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎉 Plan My Trip                                                    │   │
│  │                                                                     │   │
│  │  Your Walla Walla Adventure                                         │   │
│  │  March 15-17, 2025 • 2 Guests • Anniversary                         │   │
│  │                                                                     │   │
│  │  ✓ 3 Winery Visits (Reynvaan, L'Ecole, Cayuse)                     │   │
│  │  ✓ Anniversary Dinner at Whitehouse-Crawford                        │   │
│  │  ✓ Private transportation & guide                                   │   │
│  │  ✓ Personalized itinerary with insider tips                        │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  💰 Tour Services                                                   │   │
│  │     Private Transportation (3 days)     $1,200                      │   │
│  │     Guide Service (3 days)                $900                      │   │
│  │     ─────────────────────────────────────────                       │   │
│  │     Tour Total                          $2,100                      │   │
│  │                                                                     │   │
│  │     Tasting fees & dining               TBD                         │   │
│  │     (Finalized during planning)                                     │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  To secure your dates, we just need:                                │   │
│  │                                                                     │   │
│  │  Name: [John Smith_________________]                                │   │
│  │  Email: [john@example.com__________]                                │   │
│  │  Phone: [(555) 123-4567____________]                                │   │
│  │                                                                     │   │
│  │  ✨ Deposit: $1,050 (50% of tour services)                          │   │
│  │     Fully refundable up to 7 days before your trip                  │   │
│  │     Applied to your final balance                                   │   │
│  │                                                                     │   │
│  │  [💳 Secure My Dates - $1,050 Deposit]                              │   │
│  │                                                                     │   │
│  │  Questions? Just ask me below!                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** Tasting fees (typically $20-50/person, often waived with purchase) and dining costs are discussed during the detailed planning phase after the deposit secures the dates. This keeps quotes clean and competitive while ensuring guests are fully informed before their trip.

### Draft Booking Generation

When the deposit is initiated, the system creates a `DraftBooking` with **tour services cost** (tasting & dining marked TBD):

```typescript
interface DraftBooking {
  id: string;
  
  // Source tracking
  chatSessionId: string;
  itineraryId?: string;
  
  // Customer info (collected in chat)
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Trip details (from Trip State)
  trip: {
    startDate: string;
    endDate: string;
    partySize: number;
    partyType: string;
    specialOccasion?: string;
  };
  
  // Itinerary summary
  itinerary: {
    wineries: string[];
    restaurants: string[];
    activities: string[];
    accommodationNotes?: string;
  };
  
  // AI-gathered context
  preferences: {
    wineTypes: string[];
    pacePreference: string;
    dietaryRestrictions: string[];
    accessibilityNeeds: string[];
    specialRequests: string;
  };
  
  // Cost breakdown - Tour Services ONLY (for quote)
  quotedCosts: {
    transportation: number;
    guideService: number;
    activities: number;
    tourTotal: number;           // Sum of above (deposit base)
  };
  
  // TBD costs - For planning reference, NOT in quote
  tbdCostsReference: {
    tastingFeesEstimate: number; // Internal reference only
    diningEstimate: number;      // Internal reference only
    wineryCount: number;
  };
  
  // Deposit tracking
  deposit: {
    percentage: number;          // 50% (0.50)
    baseAmount: number;          // tourTotal (excludes tasting & dining)
    amount: number;              // baseAmount * percentage
    status: 'pending' | 'paid' | 'refunded';
    stripePaymentIntentId?: string;
    paidAt?: Date;
  };
  
  // Booking lifecycle
  status: 'draft' | 'deposit_pending' | 'deposit_paid' | 'confirmed' | 'cancelled';
  
  // Admin workflow
  assignedTo?: number; // Staff member ID
  notes: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Deposit Flow Integration

```typescript
// API: Create draft booking from chat session
// POST /api/kb/booking/create-draft
async function createDraftBooking(req: NextRequest) {
  const { sessionId, customerInfo } = await req.json();
  
  // 1. Get trip state from chat session
  const tripState = await getTripState(sessionId);
  
  // 2. Get generated itinerary if exists
  const itinerary = await getLatestItinerary(sessionId);
  
  // 3. Get pricing configuration
  const pricingConfig = await getPricingConfig();
  
  // 4. Calculate tour cost and deposit (50% of tour services only)
  const costEstimate = calculateDeposit(tripState, pricingConfig);
  const days = daysBetween(tripState.dates.startDate, tripState.dates.endDate);
  
  // 5. Create draft booking - quote shows tour services only
  const draftBooking = await db.insert('kb_draft_bookings', {
    chat_session_id: sessionId,
    itinerary_id: itinerary?.id,
    customer_name: customerInfo.name,
    customer_email: customerInfo.email,
    customer_phone: customerInfo.phone,
    trip_start_date: tripState.dates.startDate,
    trip_end_date: tripState.dates.endDate,
    party_size: tripState.party.size,
    party_type: tripState.party.type,
    special_occasion: tripState.party.specialOccasion,
    itinerary_summary: JSON.stringify({
      wineries: tripState.selections.filter(s => s.type === 'winery').map(s => s.businessName),
      restaurants: tripState.selections.filter(s => s.type === 'restaurant').map(s => s.businessName),
      activities: tripState.selections.filter(s => s.type === 'activity').map(s => s.businessName),
    }),
    preferences: JSON.stringify(tripState.preferences),
    
    // QUOTED costs (tour services only - what customer sees)
    cost_transportation: costEstimate.tourServices.transportationPerDay * days,
    cost_guide: costEstimate.tourServices.guideServicePerDay * days,
    cost_activities: costEstimate.tourServices.activitiesTotal,
    cost_tour_total: costEstimate.tourSubtotal,
    
    // TBD costs (internal reference only - NOT shown in quote)
    tbd_tastings_estimate: costEstimate.tbdCosts.tastingFeeInfo.estimatedTotal,
    tbd_dining_estimate: costEstimate.tbdCosts.foodInfo.estimatedTotal,
    tbd_winery_count: costEstimate.tbdCosts.tastingFeeInfo.wineryCount,
    
    // Deposit calculation (based on tour services only)
    deposit_percentage: costEstimate.depositPercentage,
    deposit_base_amount: costEstimate.tourSubtotal,
    deposit_amount: costEstimate.depositAmount,
    status: 'draft',
  });
  
  // 6. Create Stripe payment intent with dynamic amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount: costEstimate.depositAmount * 100, // Convert to cents
    currency: 'usd',
    metadata: {
      draftBookingId: draftBooking.id,
      customerEmail: customerInfo.email,
      tripDates: `${tripState.dates.startDate} to ${tripState.dates.endDate}`,
      tourTotal: costEstimate.tourSubtotal.toString(),
      depositPercentage: '50',
    },
  });
  
  // 7. Update draft with payment intent
  await db.update('kb_draft_bookings', draftBooking.id, {
    stripe_payment_intent_id: paymentIntent.id,
    status: 'deposit_pending',
  });
  
  // 8. Return quote-friendly response (no tasting/dining amounts)
  return {
    draftBookingId: draftBooking.id,
    clientSecret: paymentIntent.client_secret,
    // Clean quote for customer display
    quote: {
      transportation: costEstimate.tourServices.transportationPerDay * days,
      guideService: costEstimate.tourServices.guideServicePerDay * days,
      activities: costEstimate.tourServices.activitiesTotal,
      tourTotal: costEstimate.tourSubtotal,
      depositAmount: costEstimate.depositAmount,
      depositPercentage: 50,
      // TBD items - no amounts, just acknowledgment
      tbdItems: ['Tasting fees', 'Dining'],
      tbdNote: 'Finalized during planning',
    },
  };
}

// Webhook: Handle successful deposit
// POST /api/webhooks/stripe
async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const draftBookingId = paymentIntent.metadata.draftBookingId;
    
    // 1. Update draft booking status
    await db.update('kb_draft_bookings', draftBookingId, {
      status: 'deposit_paid',
      deposit_paid_at: new Date(),
    });
    
    // 2. Send confirmation email to customer
    await sendDepositConfirmationEmail(draftBookingId);
    
    // 3. Notify admin team
    await notifyAdminNewBooking(draftBookingId);
    
    // 4. Create task in admin queue
    await createAdminTask({
      type: 'new_ai_booking',
      draftBookingId,
      priority: 'high',
      description: 'New booking from AI assistant - review and confirm',
    });
  }
}
```

### Admin Review Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎯 New AI-Generated Booking                              [Deposit: PAID]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Customer: John & Jane Smith                                                │
│  Email: john@example.com | Phone: (555) 123-4567                           │
│                                                                             │
│  Trip: March 15-17, 2025 (3 days)                                          │
│  Party: 2 guests, Couple, 10th Anniversary                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📋 AI-Generated Itinerary:                                                 │
│                                                                             │
│  Day 1 - Downtown & Classics                                                │
│    • 10:00 AM - L'Ecole No 41 (tasting)                                    │
│    • 1:00 PM - Lunch at Saffron Mediterranean                              │
│    • 3:00 PM - Pepper Bridge Winery                                        │
│    • 7:00 PM - Dinner at Whitehouse-Crawford ⭐ Anniversary                 │
│                                                                             │
│  Day 2 - Rocks District                                                     │
│    • 10:30 AM - Reynvaan Family Vineyards                                  │
│    • 1:00 PM - Lunch at The Marc                                           │
│    • 3:00 PM - Cayuse Vineyards (if available)                             │
│    ...                                                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🤖 AI Conversation Summary:                                                │
│  "Couple celebrating 10th anniversary. Love bold Cabernets. First time     │
│  to Walla Walla. Interested in learning about terroir. Prefer relaxed      │
│  pace with quality over quantity."                                          │
│                                                                             │
│  [📖 View Full Chat Transcript]                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Actions:                                                                   │
│  [✅ Convert to Full Booking]  [📞 Contact Customer]  [✏️ Modify Itinerary] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema for Booking Bridge

```sql
-- Draft bookings from AI chat
CREATE TABLE kb_draft_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  chat_session_id UUID REFERENCES kb_chat_sessions(id),
  itinerary_id UUID REFERENCES kb_itineraries(id),
  
  -- Customer
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Trip details
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  party_size INTEGER NOT NULL,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Itinerary
  itinerary_summary JSONB, -- wineries, restaurants, activities
  preferences JSONB, -- wine types, pace, restrictions
  special_requests TEXT,
  
  -- QUOTED costs (tour services only - shown to customer)
  cost_transportation DECIMAL(10,2),
  cost_guide DECIMAL(10,2),
  cost_activities DECIMAL(10,2),
  cost_tour_total DECIMAL(10,2) NOT NULL,     -- Base for deposit calculation
  
  -- TBD costs (internal reference only - NOT shown in quotes)
  tbd_tastings_estimate DECIMAL(10,2),        -- For planning reference
  tbd_dining_estimate DECIMAL(10,2),          -- For planning reference
  tbd_winery_count INTEGER,                   -- Number of wineries planned
  
  -- Deposit (50% of tour total, excludes tasting & dining)
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  deposit_base_amount DECIMAL(10,2) NOT NULL, -- = cost_tour_total
  deposit_amount DECIMAL(10,2) NOT NULL,      -- = base * percentage
  stripe_payment_intent_id VARCHAR(255),
  deposit_paid_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, deposit_pending, deposit_paid, confirmed, cancelled, refunded
  
  -- Admin workflow
  assigned_to INTEGER REFERENCES users(id),
  admin_notes TEXT,
  converted_booking_id INTEGER REFERENCES bookings(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing configuration (admin-managed)
CREATE TABLE kb_pricing_config (
  id SERIAL PRIMARY KEY,
  
  -- Vehicle rates (per day) - INCLUDED in quotes
  -- Fleet is Sprinter-only (no sedans, SUVs, or other vehicle types)
  rate_sprinter DECIMAL(10,2) DEFAULT 650.00,   -- All group sizes (1-14 guests)
  
  -- Guide rate - INCLUDED in quotes
  rate_guide_per_day DECIMAL(10,2) DEFAULT 300.00,
  
  -- Tasting fee defaults (for internal estimates only, NOT in quotes)
  default_tasting_fee DECIMAL(10,2) DEFAULT 25.00,
  tasting_fee_note VARCHAR(255) DEFAULT 'Typically $20-50 per person, often waived with purchase',
  
  -- Average meal costs (for internal estimates only, NOT in quotes)
  avg_breakfast DECIMAL(10,2) DEFAULT 20.00,
  avg_lunch DECIMAL(10,2) DEFAULT 35.00,
  avg_dinner DECIMAL(10,2) DEFAULT 75.00,
  
  -- Deposit settings
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  
  -- Active flag (only one active config)
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Business-specific pricing (internal reference)
CREATE TABLE kb_business_pricing (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id),
  
  -- For internal estimates only
  tasting_fee_per_person DECIMAL(10,2),
  tasting_waiver_policy VARCHAR(255),  -- e.g., "Waived with 2+ bottle purchase"
  activity_cost_total DECIMAL(10,2),   -- For activities
  
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip state persistence (for incremental building)
CREATE TABLE kb_trip_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id) UNIQUE,
  
  -- Dates
  dates_status VARCHAR(20) DEFAULT 'flexible',
  start_date DATE,
  end_date DATE,
  date_flexibility TEXT,
  
  -- Party
  party_size INTEGER,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Selections (the "basket")
  selections JSONB DEFAULT '[]',
  
  -- Learned preferences
  preferences JSONB DEFAULT '{}',
  
  -- Readiness flags
  ready_for_itinerary BOOLEAN DEFAULT FALSE,
  ready_for_deposit BOOLEAN DEFAULT FALSE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick session lookups
CREATE INDEX idx_trip_states_session ON kb_trip_states(session_id);
CREATE INDEX idx_draft_bookings_status ON kb_draft_bookings(status);
CREATE INDEX idx_draft_bookings_email ON kb_draft_bookings(customer_email);
```

### Conversion Metrics

Track the effectiveness of the chat-to-booking funnel:

```sql
-- Funnel analytics view
CREATE VIEW kb_conversion_funnel AS
SELECT 
  DATE_TRUNC('week', s.started_at) as week,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN s.message_count >= 5 THEN s.id END) as engaged_sessions,
  COUNT(DISTINCT ts.id) as sessions_with_selections,
  COUNT(DISTINCT CASE WHEN ts.ready_for_deposit THEN ts.id END) as ready_for_deposit,
  COUNT(DISTINCT db.id) as draft_bookings_created,
  COUNT(DISTINCT CASE WHEN db.status = 'deposit_paid' THEN db.id END) as deposits_paid,
  COUNT(DISTINCT CASE WHEN db.converted_booking_id IS NOT NULL THEN db.id END) as converted_to_booking
FROM kb_chat_sessions s
LEFT JOIN kb_trip_states ts ON s.id = ts.session_id
LEFT JOIN kb_draft_bookings db ON s.id = db.chat_session_id
GROUP BY DATE_TRUNC('week', s.started_at)
ORDER BY week DESC;
```

---

## Visitor Behavior Analytics

> **Goal:** Understand how visitors interact with the site to identify drop-off points, optimize engagement, and improve conversion rates. Track everything needed to make data-driven decisions about site improvements.

### Why This Matters

Without behavioral data, we're flying blind:
- Which pages cause visitors to leave?
- Where do they spend the most time?
- What content resonates?
- At what point do chat conversations convert (or not)?
- What's the journey from first visit to booking?

### Tracking Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VISITOR BEHAVIOR TRACKING                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     CLIENT-SIDE (Browser)                            │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Page Views   │  │ Interactions │  │ Time Tracking│               │   │
│  │  │ • URL        │  │ • Clicks     │  │ • Time on    │               │   │
│  │  │ • Referrer   │  │ • Scrolls    │  │   page       │               │   │
│  │  │ • UTM params │  │ • Form focus │  │ • Active vs  │               │   │
│  │  │ • Device     │  │ • Chat opens │  │   idle time  │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                 │                        │   │
│  │         └─────────────────┼─────────────────┘                        │   │
│  │                           ▼                                          │   │
│  │              ┌────────────────────────┐                              │   │
│  │              │   Event Collector      │                              │   │
│  │              │   (batched, debounced) │                              │   │
│  │              └───────────┬────────────┘                              │   │
│  └──────────────────────────┼───────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SERVER-SIDE (API)                                │   │
│  │                                                                      │   │
│  │  POST /api/analytics/events                                          │   │
│  │    • Validate & enrich events                                        │   │
│  │    • Associate with visitor session                                  │   │
│  │    • Store in PostgreSQL                                             │   │
│  │                                                                      │   │
│  └──────────────────────────┬───────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ANALYTICS DASHBOARD                              │   │
│  │                                                                      │   │
│  │  • Real-time visitor count                                           │   │
│  │  • Page performance metrics                                          │   │
│  │  • Conversion funnels                                                │   │
│  │  • Chat engagement analysis                                          │   │
│  │  • A/B test results                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Types to Track

#### 1. Session & Page Events

```typescript
interface SessionEvent {
  type: 'session_start' | 'session_end';
  visitorId: string;        // Anonymous ID (cookie/localStorage)
  sessionId: string;
  timestamp: Date;
  
  // Entry context
  entryUrl: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Device info
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screenSize: string;
  
  // Location (from IP, approximate)
  country?: string;
  region?: string;
  city?: string;
}

interface PageViewEvent {
  type: 'page_view';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  // Page info
  url: string;
  path: string;
  title: string;
  section: string;           // 'home', 'wineries', 'chat', 'booking', etc.
  
  // Navigation
  previousPage?: string;
  timeOnPreviousPage?: number;  // milliseconds
  
  // Engagement indicators
  scrollDepth?: number;      // 0-100%
  timeOnPage?: number;       // Updated on next page or session end
}
```

#### 2. Interaction Events

```typescript
interface InteractionEvent {
  type: 'click' | 'scroll' | 'form_focus' | 'form_submit' | 'hover';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  // Page context
  pageUrl: string;
  pageSection: string;
  
  // Element info
  elementType: string;       // 'button', 'link', 'image', etc.
  elementId?: string;
  elementClass?: string;
  elementText?: string;      // For buttons/links
  
  // Click-specific
  targetUrl?: string;        // For links
  
  // Scroll-specific
  scrollDepth?: number;      // 0-100%
  scrollDirection?: 'up' | 'down';
}

// Key interactions to track
const TRACKED_INTERACTIONS = [
  'cta_click',               // Any call-to-action button
  'chat_open',               // Opened chat widget
  'chat_message_sent',       // Sent a message
  'itinerary_view',          // Viewed generated itinerary
  'booking_form_start',      // Started filling booking form
  'booking_form_abandon',    // Left form without completing
  'deposit_initiated',       // Clicked pay deposit
  'deposit_completed',       // Payment successful
  'winery_card_click',       // Clicked on a winery listing
  'gallery_view',            // Viewed photo gallery
  'video_play',              // Started watching video
  'video_complete',          // Finished video
  'download_itinerary',      // Downloaded PDF itinerary
  'share_click',             // Shared content
];
```

#### 3. Chat-Specific Events

```typescript
interface ChatEvent {
  type: 'chat_open' | 'chat_close' | 'chat_message' | 'chat_suggestion_click';
  visitorId: string;
  sessionId: string;
  chatSessionId: string;
  timestamp: Date;
  
  // Message context (for chat_message)
  messageRole?: 'user' | 'assistant';
  messageLength?: number;
  topicsDiscussed?: string[];
  
  // Engagement metrics
  messagesInSession: number;
  timeInChat: number;        // Total time chat has been open
  
  // Conversion signals
  wineryMentioned?: string[];
  datesMentioned?: boolean;
  bookingIntentDetected?: boolean;
}
```

#### 4. Time & Engagement Events

```typescript
interface EngagementEvent {
  type: 'time_milestone' | 'idle_start' | 'idle_end' | 'tab_hidden' | 'tab_visible';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  pageUrl: string;
  
  // Time tracking
  activeTimeOnPage: number;  // Excludes idle time
  totalTimeOnPage: number;   // Includes idle
  idleThreshold: number;     // e.g., 30 seconds
  
  // Milestones (for time_milestone)
  milestone?: '30s' | '1m' | '2m' | '5m' | '10m';
}
```

### Client-Side Tracking Implementation

```typescript
// lib/analytics/tracker.ts

class VisitorTracker {
  private visitorId: string;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private idleTimeout: number = 30000;  // 30 seconds
  private lastActivity: number = Date.now();
  private isIdle: boolean = false;
  private pageStartTime: number = Date.now();
  private activeTime: number = 0;
  
  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.createSessionId();
    this.initializeTracking();
  }
  
  private getOrCreateVisitorId(): string {
    let id = localStorage.getItem('ww_visitor_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('ww_visitor_id', id);
    }
    return id;
  }
  
  private initializeTracking() {
    // Track session start
    this.trackSessionStart();
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track({ type: 'tab_hidden' });
        this.pauseActiveTime();
      } else {
        this.track({ type: 'tab_visible' });
        this.resumeActiveTime();
      }
    });
    
    // Scroll tracking (debounced)
    let maxScroll = 0;
    window.addEventListener('scroll', debounce(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        // Track milestones: 25%, 50%, 75%, 100%
        if ([25, 50, 75, 100].includes(scrollPercent)) {
          this.track({ type: 'scroll_milestone', scrollDepth: scrollPercent });
        }
      }
      this.recordActivity();
    }, 100));
    
    // Click tracking
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.trackClick(target);
      this.recordActivity();
    });
    
    // Idle detection
    setInterval(() => this.checkIdle(), 1000);
    
    // Flush events periodically
    setInterval(() => this.flushEvents(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.trackPageExit();
      this.flushEvents(true); // Sync flush
    });
    
    // Track time milestones
    this.startTimeMilestones();
  }
  
  private trackClick(element: HTMLElement) {
    // Determine if this is a significant click
    const isButton = element.tagName === 'BUTTON' || element.closest('button');
    const isLink = element.tagName === 'A' || element.closest('a');
    const isCTA = element.closest('[data-track="cta"]');
    
    if (isButton || isLink || isCTA) {
      this.track({
        type: 'click',
        elementType: element.tagName.toLowerCase(),
        elementId: element.id || undefined,
        elementText: element.textContent?.slice(0, 50),
        targetUrl: (element as HTMLAnchorElement).href || undefined,
        trackingLabel: element.getAttribute('data-track-label') || undefined,
      });
    }
  }
  
  private startTimeMilestones() {
    const milestones = [30, 60, 120, 300, 600]; // seconds
    milestones.forEach(seconds => {
      setTimeout(() => {
        if (!document.hidden) {
          this.track({ 
            type: 'time_milestone', 
            milestone: `${seconds}s`,
            activeTime: this.activeTime,
          });
        }
      }, seconds * 1000);
    });
  }
  
  // Public method for custom event tracking
  public track(event: Partial<AnalyticsEvent>) {
    const fullEvent: AnalyticsEvent = {
      ...event,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
    } as AnalyticsEvent;
    
    this.eventQueue.push(fullEvent);
  }
  
  private async flushEvents(sync: boolean = false) {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    const payload = JSON.stringify({ events });
    
    if (sync && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', payload);
    } else {
      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      } catch (e) {
        // Re-queue failed events
        this.eventQueue = [...events, ...this.eventQueue];
      }
    }
  }
}

// Initialize tracker
export const tracker = new VisitorTracker();

// Convenience methods
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  tracker.track({ type: 'custom', eventName: name, properties });
};

export const trackChatOpen = () => tracker.track({ type: 'chat_open' });
export const trackChatMessage = (role: 'user' | 'assistant', length: number) => {
  tracker.track({ type: 'chat_message', messageRole: role, messageLength: length });
};
```

### Database Schema for Analytics

```sql
-- Visitor sessions
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,  -- Anonymous persistent ID
  
  -- Entry context
  entry_url TEXT NOT NULL,
  entry_path VARCHAR(255),
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Device
  device_type VARCHAR(20),  -- mobile, tablet, desktop
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_size VARCHAR(20),
  
  -- Location (approximate)
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Session metrics
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  active_time_seconds INTEGER,
  
  -- Engagement flags
  opened_chat BOOLEAN DEFAULT FALSE,
  sent_chat_message BOOLEAN DEFAULT FALSE,
  viewed_itinerary BOOLEAN DEFAULT FALSE,
  started_booking BOOLEAN DEFAULT FALSE,
  completed_deposit BOOLEAN DEFAULT FALSE,
  
  -- Conversion tracking
  converted_to_booking BOOLEAN DEFAULT FALSE,
  booking_id INTEGER REFERENCES bookings(id)
);

-- Individual events
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id),
  visitor_id VARCHAR(255) NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100),  -- For custom events
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Page context
  page_url TEXT,
  page_path VARCHAR(255),
  page_section VARCHAR(50),
  
  -- Event-specific data
  properties JSONB,
  
  -- Element info (for interactions)
  element_type VARCHAR(50),
  element_id VARCHAR(100),
  element_text VARCHAR(255),
  target_url TEXT,
  
  -- Metrics
  scroll_depth INTEGER,
  time_on_page INTEGER,
  active_time INTEGER
);

-- Page performance (aggregated)
CREATE TABLE analytics_page_stats (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Traffic
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement
  avg_time_on_page INTEGER,  -- seconds
  avg_scroll_depth INTEGER,  -- percentage
  bounce_rate DECIMAL(5,2),  -- percentage
  
  -- Exits
  exit_count INTEGER DEFAULT 0,
  exit_rate DECIMAL(5,2),
  
  UNIQUE(page_path, date)
);

-- Visitor journey tracking
CREATE TABLE analytics_visitor_journeys (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) NOT NULL,
  
  -- First touch
  first_visit_at TIMESTAMP,
  first_referrer TEXT,
  first_utm_source VARCHAR(100),
  
  -- Engagement history
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Chat engagement
  chat_sessions INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  
  -- Conversion
  itineraries_generated INTEGER DEFAULT 0,
  booking_attempts INTEGER DEFAULT 0,
  deposits_paid INTEGER DEFAULT 0,
  total_booking_value DECIMAL(10,2) DEFAULT 0,
  
  -- Lifecycle
  last_visit_at TIMESTAMP,
  days_since_first_visit INTEGER,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_visitor ON analytics_events(visitor_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_sessions_visitor ON analytics_sessions(visitor_id);
CREATE INDEX idx_sessions_started ON analytics_sessions(started_at);
CREATE INDEX idx_page_stats_date ON analytics_page_stats(date);
```

### Analytics Dashboard Views

```sql
-- Real-time visitors (last 5 minutes)
CREATE VIEW analytics_realtime AS
SELECT 
  COUNT(DISTINCT visitor_id) as active_visitors,
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_open' THEN session_id END) as in_chat,
  COUNT(DISTINCT CASE WHEN page_path LIKE '/booking%' THEN session_id END) as on_booking
FROM analytics_events
WHERE timestamp > NOW() - INTERVAL '5 minutes';

-- Daily traffic summary
CREATE VIEW analytics_daily_summary AS
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  COUNT(DISTINCT visitor_id) as unique_visitors,
  AVG(page_views) as avg_pages_per_session,
  AVG(total_time_seconds) as avg_session_duration,
  SUM(CASE WHEN opened_chat THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 as chat_open_rate,
  SUM(CASE WHEN completed_deposit THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 as conversion_rate
FROM analytics_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Page performance ranking
CREATE VIEW analytics_page_performance AS
SELECT 
  page_path,
  SUM(page_views) as total_views,
  AVG(avg_time_on_page) as avg_time,
  AVG(avg_scroll_depth) as avg_scroll,
  AVG(bounce_rate) as bounce_rate,
  AVG(exit_rate) as exit_rate
FROM analytics_page_stats
WHERE date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY page_path
ORDER BY total_views DESC;

-- Chat engagement funnel
CREATE VIEW analytics_chat_funnel AS
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_open' THEN session_id END) as opened_chat,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_message' AND properties->>'role' = 'user' THEN session_id END) as sent_message,
  COUNT(DISTINCT CASE WHEN event_type = 'itinerary_view' THEN session_id END) as viewed_itinerary,
  COUNT(DISTINCT CASE WHEN event_type = 'deposit_initiated' THEN session_id END) as started_deposit,
  COUNT(DISTINCT CASE WHEN event_type = 'deposit_completed' THEN session_id END) as completed_deposit
FROM analytics_events
WHERE timestamp > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Drop-off analysis
CREATE VIEW analytics_dropoff_points AS
SELECT 
  page_path as exit_page,
  COUNT(*) as exits,
  AVG(time_on_page) as avg_time_before_exit,
  AVG(scroll_depth) as avg_scroll_before_exit
FROM analytics_events e
JOIN analytics_sessions s ON e.session_id = s.id
WHERE e.timestamp = (
  SELECT MAX(timestamp) FROM analytics_events 
  WHERE session_id = e.session_id
)
AND s.ended_at IS NOT NULL
GROUP BY page_path
ORDER BY exits DESC
LIMIT 20;
```

### Admin Analytics Dashboard UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Visitor Analytics Dashboard                        [Last 30 Days ▾]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   🟢 12     │ │   👥 847    │ │   💬 23%    │ │   💰 3.2%   │           │
│  │   Live Now  │ │   Visitors  │ │   Chat Rate │ │   Convert   │           │
│  │   +3 vs avg │ │   +12% ▲    │ │   +5% ▲     │ │   +0.8% ▲   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📈 Traffic & Engagement                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sessions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  Chat Opens ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │   │
│  │  Deposits ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪   │   │
│  │                                                                     │   │
│  │  Dec 1 ─────────────────────────────────────────────────── Dec 17   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔄 Conversion Funnel                      📄 Top Pages                     │
│  ┌────────────────────────────────┐       ┌────────────────────────────┐   │
│  │ Site Visitors      847  100%  │       │ /                    324 ▪ │   │
│  │       ▼                       │       │ /wineries            287 ▪ │   │
│  │ Opened Chat        195   23%  │       │ /experiences         156 ▪ │   │
│  │       ▼                       │       │ /about-walla-walla   134 ▪ │   │
│  │ Engaged (5+ msgs)  142   17%  │       │ /booking              89 ▪ │   │
│  │       ▼                       │       └────────────────────────────┘   │
│  │ Viewed Itinerary    67    8%  │                                        │
│  │       ▼                       │       ⚠️ High Exit Pages               │
│  │ Started Deposit     34    4%  │       ┌────────────────────────────┐   │
│  │       ▼                       │       │ /booking/payment  42% exit │   │
│  │ Completed Deposit   27  3.2%  │       │ /chat             28% exit │   │
│  └────────────────────────────────┘       │ /wineries/list    24% exit │   │
│                                           └────────────────────────────┘   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⏱️ Engagement Metrics                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Avg Session Duration: 4m 32s     Avg Pages/Session: 3.4            │   │
│  │  Avg Time on Page: 1m 48s         Avg Scroll Depth: 67%             │   │
│  │  Bounce Rate: 34%                 Return Visitor Rate: 28%          │   │
│  │                                                                     │   │
│  │  Chat Engagement:                                                   │   │
│  │  • Avg messages per session: 7.3                                    │   │
│  │  • Avg chat duration: 8m 15s                                        │   │
│  │  • Itinerary request rate: 34%                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔍 Traffic Sources                        📱 Devices                       │
│  ┌────────────────────────────────┐       ┌────────────────────────────┐   │
│  │ Direct           42% ████████ │       │ Desktop      58% █████████ │   │
│  │ Google           31% ██████   │       │ Mobile       35% █████     │   │
│  │ Instagram        12% ██       │       │ Tablet        7% █         │   │
│  │ Facebook          8% █        │       └────────────────────────────┘   │
│  │ Other             7% █        │                                        │
│  └────────────────────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Monitor

| Metric | Target | Action if Below Target |
|--------|--------|------------------------|
| **Bounce Rate** | < 40% | Improve landing page content, faster load |
| **Avg Session Duration** | > 3 min | Add engaging content, clearer CTAs |
| **Chat Open Rate** | > 20% | Better chat widget visibility, prompts |
| **Chat → Itinerary** | > 30% | Improve AI conversation flow |
| **Itinerary → Deposit** | > 40% | Simplify booking, clearer pricing |
| **Deposit Completion** | > 80% | Fix payment UX issues |
| **Return Visitor Rate** | > 25% | Email follow-ups, remarketing |

### A/B Testing Framework

```typescript
// Track experiments
interface Experiment {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    weight: number;  // 0-100, must sum to 100
  }[];
  targetMetric: string;  // e.g., 'deposit_completed'
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'completed';
}

// Assign visitor to variant
function getVariant(visitorId: string, experiment: Experiment): string {
  const hash = hashCode(visitorId + experiment.id);
  const bucket = Math.abs(hash) % 100;
  
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.id;
    }
  }
  return experiment.variants[0].id;
}

// Track experiment exposure
tracker.track({
  type: 'experiment_exposure',
  experimentId: 'chat_cta_test',
  variantId: 'variant_b',
});
```

### API Endpoints for Analytics

```typescript
// Ingest events
POST   /api/analytics/events           // Batch event ingestion

// Dashboard queries
GET    /api/analytics/realtime         // Live visitor count
GET    /api/analytics/summary          // Daily/weekly/monthly summary
GET    /api/analytics/funnel           // Conversion funnel data
GET    /api/analytics/pages            // Page performance
GET    /api/analytics/sources          // Traffic sources
GET    /api/analytics/chat             // Chat engagement metrics
GET    /api/analytics/dropoff          // Exit page analysis

// Visitor lookup
GET    /api/analytics/visitor/:id      // Individual visitor journey
GET    /api/analytics/session/:id      // Session replay data

// Experiments
GET    /api/analytics/experiments      // List experiments
POST   /api/analytics/experiments      // Create experiment
GET    /api/analytics/experiments/:id/results  // Experiment results
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic ingestion and chat working

- [ ] Set up Gemini API credentials and File Search Store
- [ ] Create basic ingestion API for text and documents
- [ ] Implement simple chat endpoint with File Search tool
- [ ] Build minimal contributor upload interface
- [ ] Seed with 10-20 test businesses

**Deliverable:** Working prototype that can answer questions from uploaded docs

### Phase 2: Multi-Modal Ingestion (Weeks 3-4)
**Goal:** Support all input types

- [ ] Add voice note transcription pipeline
- [ ] Add video processing pipeline
- [ ] Add image caption/OCR pipeline
- [ ] Implement URL content fetching
- [ ] Build content metadata system

**Deliverable:** Contributors can upload any content type

### Phase 3: Content Verification (Weeks 5-6)
**Goal:** Gold-standard quality control

- [ ] Implement content state machine (pending → review → approved → indexed)
- [ ] Build AI pre-screening pipeline
- [ ] Create admin review interface
- [ ] Implement trusted contributor system
- [ ] Add review history and audit trail

**Deliverable:** All content verified before going live

### Phase 4: Contributor Portal (Weeks 7-8)
**Goal:** Easy contribution experience

- [ ] Design and build contributor dashboard
- [ ] Implement guided Q&A contribution flow
- [ ] Add content management (edit, expire, delete)
- [ ] Create prompt templates for different business types
- [ ] Show content status and review feedback

**Deliverable:** Business owners can self-serve content contribution

### Phase 5: Enhanced Chat Experience (Weeks 9-10)
**Goal:** Personalized, itinerary-capable assistant

- [ ] Refine system prompt and persona
- [ ] Implement preference gathering flow
- [ ] Build Trip State persistence (incremental itinerary building)
- [ ] Build itinerary generation logic
- [ ] Add itinerary export (PDF, email)
- [ ] Create chat widget for website embedding

**Deliverable:** Full-featured AI assistant on the website

### Phase 6: Chat-to-Booking Bridge (Weeks 11-12)
**Goal:** Convert conversations to bookings

- [ ] Implement Trip State tracking across chat sessions
- [ ] Build dynamic deposit calculation (50% of tour, excluding food)
- [ ] Build "Plan My Trip" UI component with cost breakdown
- [ ] Create draft booking generation from chat
- [ ] Integrate Stripe for deposit collection
- [ ] Build admin review interface for AI-generated bookings
- [ ] Implement conversion to full booking workflow
- [ ] Create pricing configuration admin interface

**Deliverable:** Visitors can secure trips with deposits directly from chat

### Phase 7: Visitor Analytics (Weeks 13-14)
**Goal:** Comprehensive behavior tracking

- [ ] Implement client-side event tracking library
- [ ] Build event ingestion API with batching
- [ ] Create analytics database schema
- [ ] Build real-time visitor dashboard
- [ ] Implement conversion funnel visualization
- [ ] Add page performance tracking
- [ ] Create drop-off analysis reports
- [ ] Build A/B testing framework

**Deliverable:** Full visibility into visitor behavior and conversion optimization

### Phase 8: Scale & Polish (Weeks 15-16)
**Goal:** Production-ready system

- [ ] Onboard initial batch of contributors
- [ ] Gather feedback and iterate on UX
- [ ] Set up analytics alerts and monitoring
- [ ] Performance optimization
- [ ] Documentation and training materials
- [ ] Launch marketing coordination

**Deliverable:** Launch-ready AI Knowledge Base with booking integration and analytics

---

## Technical Specifications

### API Endpoints

```typescript
// Contributor Portal
POST   /api/kb/contribute/text       // Submit text content
POST   /api/kb/contribute/document   // Upload document
POST   /api/kb/contribute/voice      // Upload voice note
POST   /api/kb/contribute/video      // Upload video
POST   /api/kb/contribute/image      // Upload image
POST   /api/kb/contribute/url        // Submit URL for scraping

GET    /api/kb/contributions         // List contributor's content
DELETE /api/kb/contributions/:id     // Remove content

// Content Verification
GET    /api/kb/admin/review-queue    // Get pending content for review
POST   /api/kb/admin/review/:id      // Submit review decision
GET    /api/kb/admin/review-history  // Audit trail of reviews

// Chat
POST   /api/kb/chat                  // Send message, get response
GET    /api/kb/chat/:sessionId       // Get chat history
GET    /api/kb/chat/:sessionId/trip-state  // Get current trip state
POST   /api/kb/itinerary/generate    // Generate itinerary
GET    /api/kb/itinerary/:id/export  // Export itinerary as PDF

// Booking Bridge
POST   /api/kb/booking/create-draft  // Create draft booking from chat
GET    /api/kb/booking/draft/:id     // Get draft booking details
POST   /api/kb/booking/draft/:id/deposit  // Initiate deposit payment
POST   /api/kb/booking/draft/:id/convert  // Convert to full booking

// Admin
GET    /api/kb/admin/stats           // Usage statistics
GET    /api/kb/admin/content         // All content with filters
POST   /api/kb/admin/content/:id/approve  // Approve pending content
GET    /api/kb/admin/draft-bookings  // List AI-generated draft bookings
GET    /api/kb/admin/funnel-metrics  // Conversion funnel analytics
```

### Database Schema Additions

```sql
-- Contributor accounts (extends existing users)
ALTER TABLE users ADD COLUMN is_contributor BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN business_id INTEGER REFERENCES businesses(id);

-- Businesses (content sources)
CREATE TABLE kb_businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- winery, restaurant, hotel, attraction, expert
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content contributions
CREATE TABLE kb_contributions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id),
  contributor_id INTEGER REFERENCES users(id),
  
  -- Content identification
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- text, document, voice, video, image, url
  original_filename VARCHAR(255),
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, indexed, failed
  file_search_doc_id VARCHAR(255), -- Gemini File Search document ID
  
  -- Metadata
  topics TEXT[], -- Array of topic tags
  audience_type VARCHAR(50),
  is_evergreen BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  indexed_at TIMESTAMP,
  last_retrieved_at TIMESTAMP,
  retrieval_count INTEGER DEFAULT 0
);

-- Chat sessions
CREATE TABLE kb_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255), -- Anonymous or authenticated
  
  -- Gathered preferences
  visitor_profile JSONB,
  
  -- Session data
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Generated itineraries
  itinerary_generated BOOLEAN DEFAULT FALSE
);

-- Chat messages
CREATE TABLE kb_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES kb_chat_sessions(id),
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  
  -- Grounding metadata
  sources_used TEXT[], -- Business names cited
  grounding_metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated itineraries
CREATE TABLE kb_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id),
  
  -- Itinerary data
  trip_start DATE NOT NULL,
  trip_end DATE NOT NULL,
  itinerary_data JSONB NOT NULL,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exported_at TIMESTAMP,
  export_format VARCHAR(20) -- pdf, email
);
```

### Environment Variables

```bash
# Gemini API
GEMINI_API_KEY=your-api-key
GEMINI_FILE_SEARCH_STORE_ID=walla-walla-kb

# Optional: Google Cloud Storage for large file staging
GCS_BUCKET_NAME=walla-walla-kb-uploads
GCS_SERVICE_ACCOUNT_KEY=path/to/key.json
```

---

## Cost Considerations

### Gemini File Search Pricing

Based on [Gemini API File Search documentation](https://ai.google.dev/gemini-api/docs/file-search):

| Component | Cost |
|-----------|------|
| File Storage | **Free** |
| Embedding at Query Time | **Free** |
| Embedding at Index Time | $0.15 per 1M tokens |
| Retrieved Document Tokens | Standard input token pricing |
| Model Output | Standard output token pricing |

### Estimated Monthly Costs

**Assumptions:**
- 500 documents indexed (average 5,000 tokens each)
- 10,000 chat interactions per month
- Average 3 retrievals per chat (1,000 tokens each)

| Item | Calculation | Monthly Cost |
|------|-------------|--------------|
| Initial Indexing | 2.5M tokens × $0.15/1M | $0.38 (one-time) |
| Retrieved Tokens | 10,000 × 3 × 1,000 = 30M tokens | ~$3.75 |
| Model Input/Output | 10,000 × 2,000 avg tokens | ~$1.50 |
| **Total** | | **~$5-10/month** |

This is remarkably cost-effective compared to building custom RAG infrastructure.

---

## Next Steps

1. **Validate Architecture:** Review this design with stakeholders
2. **API Key Setup:** Obtain Gemini API access and create File Search Store
3. **Prototype:** Build Phase 1 foundation
4. **Content Strategy:** Identify first 20 businesses to onboard
5. **Contributor Outreach:** Prepare materials for business owner onboarding

---

## Changelog

### Version 1.3 (December 2024)
- **Competitive Quote Structure:** Tasting fees now excluded from formal quotes (like dining)
  - Quotes show only tour services: transportation, guide, activities
  - Tasting fees and dining marked as "TBD - Finalized during planning"
  - Keeps quotes competitive with industry standards
  - Internal estimates still tracked for planning reference
  - Tasting fee info (typical costs, waiver policies) available for education
- Replaced "pay as you go" language with "TBD" throughout

### Version 1.2 (December 2024)
- **Dynamic Deposit Calculation:** Deposit is now 50% of projected tour cost
  - Added `TourCostEstimate` interface with cost breakdown
  - Added `PricingConfig` for admin-adjustable rates
  - Updated "Plan My Trip" UI to show clean pricing
- **Visitor Behavior Analytics:** Comprehensive tracking system
  - Session, page view, interaction, and chat event tracking
  - Client-side tracker with batched event collection
  - Full database schema for analytics storage
  - Admin dashboard with real-time metrics, funnels, and drop-off analysis
  - A/B testing framework for optimization
  - Key metrics and targets for monitoring
- Updated implementation phases (now 8 phases)
- Added new database tables: `kb_pricing_config`, `kb_business_pricing`, `analytics_*`

### Version 1.1 (December 2024)
- Added **Content Verification Workflow** section with trust levels and AI pre-screening
- Added **Chat-to-Booking Bridge** section with Trip State, deposit flow, and admin review
- Updated implementation phases to include new features (now 7 phases)
- Added new API endpoints for verification and booking

### Version 1.0 (December 2024)
- Initial design document

---

*Document Version: 1.3*  
*Last Updated: December 2024*  
*Author: AI Development Team*



> **Vision:** Create an AI-powered assistant that provides visitors with authoritative, curated information about the Walla Walla Valley—directly from the source. The assistant should feel like chatting with a knowledgeable local insider who genuinely wants to help visitors discover the best the region has to offer.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Ingestion Pipeline](#data-ingestion-pipeline)
4. [Content Verification Workflow](#content-verification-workflow)
5. [Contributor Portal](#contributor-portal)
6. [Chat Experience](#chat-experience)
7. [Itinerary Generation](#itinerary-generation)
8. [Chat-to-Booking Bridge](#chat-to-booking-bridge)
9. [Visitor Behavior Analytics](#visitor-behavior-analytics)
10. [Implementation Phases](#implementation-phases)
11. [Technical Specifications](#technical-specifications)
12. [Cost Considerations](#cost-considerations)

---

## Overview

### The Problem
- Generic travel information lacks local depth and authenticity
- Visitors miss hidden gems that aren't in typical search results
- Business owners have valuable knowledge but no easy way to share it
- Existing AI assistants provide "boilerplate" recommendations

### The Solution
A **curated knowledge base** powered by Gemini File Search that:
- Ingests content directly from local experts (wineries, restaurants, hotels, guides)
- Provides **perfect information or no information** (no hallucination)
- Generates personalized, thoughtful itineraries based on visitor preferences
- Educates and inspires visitors to experience the region in person

### Core Principles
1. **Gold Standard Quality:** Only verified, source-contributed content
2. **Seamless Contribution:** Easy for business owners to share knowledge
3. **Personalized Discovery:** Recommendations tailored to individual interests
4. **Educational Value:** Teach appreciation, not just list attractions

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTRIBUTOR PORTAL                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Text      │  │   PDF/Doc   │  │   Voice     │  │   Video     │     │
│  │   Input     │  │   Upload    │  │   Notes     │  │   Upload    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INGESTION PIPELINE                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Content Processor                             │    │
│  │  • Text → Direct index                                           │    │
│  │  • PDF/Word → Text extraction + index                            │    │
│  │  • Voice → Gemini transcription → index                          │    │
│  │  • Video → Frame extraction + audio transcription → index        │    │
│  │  • Images → Caption generation + OCR → index                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Gemini File Search Store                            │    │
│  │  • Automatic chunking and embedding                              │    │
│  │  • Semantic search capabilities                                  │    │
│  │  • Citation tracking                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHAT INTERFACE                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   Gemini 2.5 Flash/Pro                           │    │
│  │  • File Search tool enabled                                      │    │
│  │  • Custom system prompt (eager assistant persona)                │    │
│  │  • Itinerary generation logic                                    │    │
│  │  • Grounding metadata for citations                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Website Chat Widget                           │    │
│  │  • Visitor-facing conversational UI                              │    │
│  │  • Preference collection                                         │    │
│  │  • Itinerary display and export                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| RAG Engine | Gemini File Search | Native RAG, automatic chunking, free storage |
| LLM | Gemini 2.5 Flash | Cost-effective, fast, supports File Search |
| Transcription | Gemini Audio API | Native integration, high quality |
| Image Processing | Gemini Vision | Caption generation, OCR |
| Backend | Next.js API Routes | Existing infrastructure |
| Database | PostgreSQL (Heroku) | Metadata, contributor accounts |
| File Storage | Google Cloud Storage | Pre-upload staging |

---

## Data Ingestion Pipeline

### Supported Input Types

#### 1. Text Content (Direct Support)
- **Formats:** Plain text, Markdown, HTML
- **Use Cases:** Winery descriptions, tasting notes, event details
- **Processing:** Direct upload to File Search Store

```typescript
// Example: Direct text ingestion
await client.fileSearchStores.uploadToFileSearchStore({
  file: textContent,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - ${contentType}`,
  }
});
```

#### 2. Documents (Direct Support)
- **Formats:** PDF, Word (.docx), Excel, PowerPoint
- **Use Cases:** Wine club materials, event calendars, menus
- **Processing:** Gemini File Search handles extraction automatically

#### 3. Voice Notes (Transcription Required)
- **Formats:** MP3, WAV, M4A, WebM
- **Use Cases:** Owner stories, winemaker interviews, tour guide narratives
- **Processing Pipeline:**

```typescript
// Step 1: Upload audio to Files API
const audioFile = await client.files.upload({
  file: audioBuffer,
  config: { mimeType: 'audio/mp3' }
});

// Step 2: Transcribe using Gemini
const transcription = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { text: 'Transcribe this audio accurately, preserving speaker intent and key details.' },
    { fileData: { fileUri: audioFile.uri, mimeType: 'audio/mp3' } }
  ]
});

// Step 3: Index transcription
await client.fileSearchStores.uploadToFileSearchStore({
  file: transcription.text,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - Voice Note - ${topic}`,
  }
});
```

#### 4. Video Content (Transcription + Frame Analysis)
- **Formats:** MP4, MOV, WebM
- **Use Cases:** Virtual tours, winemaking process videos, event highlights
- **Processing Pipeline:**

```typescript
// Step 1: Upload video
const videoFile = await client.files.upload({
  file: videoBuffer,
  config: { mimeType: 'video/mp4' }
});

// Step 2: Extract key information
const analysis = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { 
      text: `Analyze this video and create a comprehensive text summary including:
        1. Full transcription of all spoken content
        2. Description of key visual elements (vineyard views, facilities, etc.)
        3. Any text visible in the video (signs, labels, etc.)
        Format as a detailed document suitable for a knowledge base.`
    },
    { fileData: { fileUri: videoFile.uri, mimeType: 'video/mp4' } }
  ]
});

// Step 3: Index the analysis
await client.fileSearchStores.uploadToFileSearchStore({
  file: analysis.text,
  fileSearchStoreName: 'walla-walla-kb',
  config: {
    displayName: `${businessName} - Video - ${title}`,
  }
});
```

#### 5. Images (Caption + OCR)
- **Formats:** JPEG, PNG, WebP
- **Use Cases:** Wine labels, venue photos, menu images
- **Processing:**

```typescript
const imageAnalysis = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { 
      text: `Describe this image in detail for a travel knowledge base:
        1. What is shown in the image?
        2. Extract any visible text (labels, signs, menus)
        3. What would a visitor find interesting about this?`
    },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ]
});
```

#### 6. URLs (Web Scraping + Curation)
- **Use Cases:** Business websites, event pages, news articles
- **Processing:** Fetch content, extract relevant text, curator review, then index

---

## Content Verification Workflow

> **Principle:** "Perfect information or no information." Every piece of content must be verified before entering the public knowledge base.

### Why Verification Matters

The AI assistant's credibility depends on accuracy. If a winery's hours are wrong, or a restaurant is described as "pet-friendly" when it isn't, visitors lose trust. The verification workflow ensures:

1. **Factual Accuracy:** Information matches reality
2. **Appropriate Content:** No promotional fluff, only genuinely helpful details
3. **Freshness:** Time-sensitive content is flagged and managed
4. **Source Attribution:** Every fact can be traced to its contributor

### Content States

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CONTENT LIFECYCLE                                  │
│                                                                          │
│   ┌─────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐          │
│   │ PENDING │───▶│ PROCESSING │───▶│ IN_REVIEW│───▶│ APPROVED│          │
│   └─────────┘    └────────────┘    └──────────┘    └─────────┘          │
│        │                                │               │                │
│        │                                ▼               ▼                │
│        │                          ┌──────────┐    ┌─────────┐           │
│        │                          │NEEDS_INFO│    │ INDEXED │           │
│        │                          └──────────┘    └─────────┘           │
│        │                                │                                │
│        ▼                                ▼                                │
│   ┌──────────┐                    ┌──────────┐                          │
│   │ REJECTED │◀───────────────────│ REJECTED │                          │
│   └──────────┘                    └──────────┘                          │
└──────────────────────────────────────────────────────────────────────────┘
```

| State | Description |
|-------|-------------|
| `PENDING` | Just uploaded, awaiting processing |
| `PROCESSING` | Being transcribed/analyzed by AI |
| `IN_REVIEW` | Ready for human verification |
| `NEEDS_INFO` | Reviewer has questions for contributor |
| `APPROVED` | Verified and ready to index |
| `INDEXED` | Live in the knowledge base |
| `REJECTED` | Not suitable (with reason provided) |

### Verification Levels

#### Level 1: Auto-Approve (Trusted Contributors)
Verified business owners with a track record can have content auto-approved:

```typescript
interface TrustedContributor {
  userId: number;
  businessId: number;
  trustLevel: 'standard' | 'trusted' | 'super';
  autoApproveTypes: ContentType[]; // e.g., ['text', 'document']
  approvedContentCount: number;
  lastReviewDate: Date;
}

// Auto-approve logic
async function shouldAutoApprove(contribution: Contribution): Promise<boolean> {
  const contributor = await getTrustedContributor(contribution.contributorId);
  
  if (!contributor) return false;
  if (contributor.trustLevel === 'super') return true;
  if (contributor.trustLevel === 'trusted' && 
      contributor.autoApproveTypes.includes(contribution.contentType)) {
    return true;
  }
  return false;
}
```

**Trust Level Criteria:**
- **Standard:** New contributors, all content requires review
- **Trusted:** 10+ approved contributions, no rejections in 6 months
- **Super:** Walla Walla Travel staff or designated community leaders

#### Level 2: Quick Review (AI-Assisted)
For standard contributors, AI pre-screens content before human review:

```typescript
// AI pre-screening prompt
const preScreenPrompt = `
Review this content submission for the Walla Walla Valley knowledge base.

CONTENT:
{extractedText}

SOURCE:
Business: {businessName}
Contributor: {contributorName}
Content Type: {contentType}

EVALUATE:
1. FACTUAL: Does this contain verifiable facts about the business/area?
2. HELPFUL: Would a visitor find this information useful?
3. APPROPRIATE: Is the tone informative (not overly promotional)?
4. COMPLETE: Is there enough detail to be useful?
5. FLAGS: Any claims that should be manually verified? (hours, prices, awards)

RESPOND WITH:
{
  "recommendation": "approve" | "review" | "reject",
  "confidence": 0.0-1.0,
  "summary": "Brief description of content",
  "flaggedClaims": ["Any specific facts to verify"],
  "suggestedTopics": ["topic1", "topic2"],
  "concerns": "Any issues noted"
}
`;
```

#### Level 3: Manual Review (Admin Interface)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 Content Review Queue                                    [12 pending] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Voice Note: "Our Winemaking Process"                              │  │
│  │ From: Reynvaan Family Vineyards (Sarah Reynvaan)                  │  │
│  │ Submitted: 2 hours ago                                            │  │
│  │                                                                   │  │
│  │ AI Summary: Describes their biodynamic farming practices and      │  │
│  │ the unique cobblestone terroir of the Rocks District.             │  │
│  │                                                                   │  │
│  │ 🎧 [Play Audio]  📄 [View Transcript]                             │  │
│  │                                                                   │  │
│  │ ⚠️ Flagged Claims:                                                │  │
│  │   • "Only winery in WA using Method X" - verify exclusivity      │  │
│  │   • "Open daily 11-5" - confirm current hours                    │  │
│  │                                                                   │  │
│  │ AI Confidence: 85% Approve                                        │  │
│  │ Suggested Topics: [biodynamic] [rocks-district] [cabernet]       │  │
│  │                                                                   │  │
│  │  [✅ Approve]  [❓ Request Info]  [❌ Reject]  [✏️ Edit & Approve] │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ PDF: "2024 Event Calendar"                                        │  │
│  │ From: Walla Walla Wine Alliance                                   │  │
│  │ ...                                                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Review Actions

| Action | Result | Contributor Notification |
|--------|--------|--------------------------|
| **Approve** | Content indexed immediately | "Your content is now live!" |
| **Request Info** | Status → `NEEDS_INFO`, contributor prompted | "We have a question about..." |
| **Reject** | Content archived with reason | "We couldn't use this because..." |
| **Edit & Approve** | Reviewer corrects minor issues, then indexes | "Your content is live (with minor edits)" |

### Database Schema for Verification

```sql
-- Add verification fields to kb_contributions
ALTER TABLE kb_contributions ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending';
-- pending, processing, in_review, needs_info, approved, indexed, rejected

ALTER TABLE kb_contributions ADD COLUMN ai_prescreening JSONB;
-- Stores AI analysis: recommendation, confidence, flags, etc.

ALTER TABLE kb_contributions ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE kb_contributions ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE kb_contributions ADD COLUMN review_notes TEXT;
ALTER TABLE kb_contributions ADD COLUMN rejection_reason TEXT;

-- Trusted contributors table
CREATE TABLE kb_trusted_contributors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  business_id INTEGER REFERENCES kb_businesses(id),
  trust_level VARCHAR(20) DEFAULT 'standard', -- standard, trusted, super
  auto_approve_types TEXT[], -- content types that skip review
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  last_rejection_at TIMESTAMP,
  promoted_at TIMESTAMP,
  promoted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review history for audit trail
CREATE TABLE kb_review_history (
  id SERIAL PRIMARY KEY,
  contribution_id INTEGER REFERENCES kb_contributions(id),
  reviewer_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- approved, rejected, requested_info, edited
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Content Metadata Schema

Each piece of content should be tagged with metadata for better retrieval:

```typescript
interface ContentMetadata {
  // Source identification
  businessId: string;
  businessName: string;
  businessType: 'winery' | 'restaurant' | 'hotel' | 'attraction' | 'expert';
  
  // Content classification
  contentType: 'description' | 'story' | 'event' | 'menu' | 'tour' | 'tip' | 'history';
  topics: string[]; // e.g., ['wine tasting', 'cabernet sauvignon', 'food pairing']
  
  // Temporal relevance
  isEvergreen: boolean;
  validFrom?: Date;
  validUntil?: Date;
  
  // Quality indicators
  contributorVerified: boolean;
  lastUpdated: Date;
  
  // Retrieval hints
  keywords: string[];
  audienceType: 'first-time' | 'wine-enthusiast' | 'family' | 'romantic' | 'all';
}
```

---

## Contributor Portal

### User Experience Goals
- **5-minute onboarding:** Business owners should be contributing within minutes
- **Mobile-first:** Many will use phones to capture voice notes or photos
- **No technical knowledge required:** Drag-and-drop, voice recording, simple forms

### Portal Features

#### 1. Quick Contribution Modes

**Voice Note (Fastest)**
```
┌─────────────────────────────────────────────┐
│  🎤 Record a Voice Note                     │
│                                             │
│  Tell us about your winery, your wines,     │
│  or share a story visitors would love.      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         🔴 Tap to Record            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  💡 Tip: Speak naturally, as if telling     │
│     a friend about your favorite wine.      │
└─────────────────────────────────────────────┘
```

**Document Upload**
```
┌─────────────────────────────────────────────┐
│  📄 Upload Documents                        │
│                                             │
│  Share your wine club materials, menus,     │
│  event calendars, or any helpful docs.      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📁 Drop files here or browse    │    │
│  │                                     │    │
│  │     PDF, Word, Excel, Images        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Guided Q&A**
```
┌─────────────────────────────────────────────┐
│  💬 Answer Questions About Your Business    │
│                                             │
│  We'll ask you questions and create         │
│  content from your answers.                 │
│                                             │
│  Q: What makes your winery unique?          │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  [Type or record your answer...]    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Q: What should first-time visitors know?   │
│  Q: Describe your most popular wine...      │
└─────────────────────────────────────────────┘
```

#### 2. Content Management Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Contributions                                    [+ Add]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Winery Overview          Text      Indexed    2 days ago    │
│  ✅ Winemaker Interview      Voice     Indexed    1 week ago    │
│  🔄 Virtual Tour Video       Video     Processing...            │
│  ✅ 2024 Wine List           PDF       Indexed    3 days ago    │
│  ⚠️ Spring Events            Text      Expires in 2 weeks       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  📊 Your content has helped 47 visitors this month              │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Prompt Templates for Contributors

Pre-built prompts to help contributors share valuable information:

**Winery Prompts:**
- "What's the story behind your winery's founding?"
- "Describe your signature wine and what makes it special"
- "What's a hidden gem on your property that visitors often miss?"
- "What food pairings do you recommend with your wines?"
- "Describe the best time of year to visit and why"

**Restaurant Prompts:**
- "What dishes are you most proud of?"
- "How do you source your ingredients locally?"
- "What's the atmosphere like for different occasions?"

**General Expert Prompts:**
- "What do most visitors not know about Walla Walla?"
- "What's your #1 tip for someone visiting for the first time?"
- "Describe a perfect day in the valley"

---

## Chat Experience

### System Prompt (Persona)

```
You are the Walla Walla Valley Insider, an enthusiastic and knowledgeable AI assistant 
who helps visitors discover the best of the Walla Walla Valley wine country and beyond.

PERSONALITY:
- Warm, welcoming, and genuinely excited to help
- Speaks like a knowledgeable local friend, not a formal tour guide
- Picks up on visitor preferences and tailors recommendations
- Shares insider tips and hidden gems, not just popular spots
- Educational without being lecturing—shares stories and context

CORE BEHAVIORS:
1. ALWAYS use the File Search tool to ground responses in verified information
2. NEVER make up information—if you don't have verified data, say so
3. Ask clarifying questions to personalize recommendations
4. Proactively suggest related experiences based on stated interests
5. When recommending, explain WHY something matches their interests

QUESTION FRAMEWORK:
When helping plan a visit, gather:
- Travel dates and party composition (couples, families, groups)
- Wine experience level (novice, enthusiast, expert)
- Interests beyond wine (food, outdoors, history, art)
- Pace preference (relaxed vs. packed itinerary)
- Any dietary restrictions or accessibility needs

RESPONSE STYLE:
- Use conversational language, not bullet points for everything
- Include specific details from the knowledge base
- Mention business names and specific experiences
- Offer to dive deeper into any topic
- End with a relevant follow-up question or suggestion

CITATION:
When sharing information from the knowledge base, naturally mention the source:
"The folks at [Winery Name] say their Cabernet is best enjoyed with..."
"According to the winemaker at [Winery]..."
```

### Conversation Flow Example

```
VISITOR: Hi! My wife and I are planning a trip to Walla Walla next month. 
         We love wine but we're not experts.

ASSISTANT: Welcome! A wine trip to Walla Walla—you're in for a treat! The valley 
has over 120 wineries, so there's something for every taste.

To help me point you in the right direction, I have a few quick questions:

1. How many days are you planning to spend here?
2. What types of wines do you usually enjoy? (Reds, whites, or you're open to 
   exploring?)
3. Beyond wine, are you interested in great food, outdoor activities, or maybe 
   some local history?

Also, are there any special occasions we should plan around—anniversary, 
birthday, or just a well-deserved getaway?

---

VISITOR: We'll be there for 3 days. We like reds, especially Cabernet. 
         It's actually our 10th anniversary!

ASSISTANT: Congratulations on 10 years! 🥂 That's wonderful—let me help you 
make this trip memorable.

Great news: Walla Walla is famous for its Cabernets, especially from the 
Rocks District where the unique cobblestone soil creates incredibly bold, 
structured wines. The winemaker at Reynvaan Family Vineyards describes their 
Rocks District Cabernet as having "the intensity of the stones themselves"—
definitely worth a visit.

For an anniversary-worthy experience, I'd suggest:

**Day 1: Downtown & Classics**
Start at L'Ecole No 41, a historic schoolhouse-turned-winery where the 
Cabernet is consistently outstanding. Their tasting room has this charming 
old-world feel perfect for a romantic start. For dinner, Whitehouse-Crawford 
is the anniversary spot—farm-to-table in a converted planing mill with an 
incredible wine list.

**Day 2: Rocks District Deep Dive**
This is where Walla Walla Cabernet really shines. I'd book a seated tasting 
at Cayuse Vineyards (if you can get in—they're legendary) or try Gramercy 
Cellars for a more intimate experience. The owner, Greg Harrington, is a 
Master Sommelier who can really geek out on the terroir with you.

**Day 3: Hidden Gems**
Let me find some off-the-beaten-path spots that locals love...

Would you like me to build out a detailed itinerary with specific times, 
reservation tips, and backup options? I can also suggest some romantic 
spots for that anniversary dinner!
```

### Handling Knowledge Gaps

When the assistant doesn't have verified information:

```
VISITOR: What's the best pizza place in Walla Walla?

ASSISTANT: You know, I want to give you a great recommendation, but I don't 
have detailed information about pizza specifically in my knowledge base right 
now. What I CAN tell you is that downtown Walla Walla has a vibrant food scene 
on Main Street—you'll find several casual options there.

For a verified recommendation, I'd suggest asking your hotel concierge or 
checking recent local reviews. 

In the meantime, if you're looking for a casual dinner spot, I DO have great 
info on Saffron Mediterranean Kitchen—they do wood-fired dishes that might 
scratch that oven-baked itch!

Would you like me to suggest some other dining options I know well?
```

---

## Itinerary Generation

### Itinerary Data Model

```typescript
interface GeneratedItinerary {
  id: string;
  createdAt: Date;
  
  // Visitor profile (gathered through conversation)
  visitorProfile: {
    partySize: number;
    partyType: 'couple' | 'family' | 'friends' | 'solo' | 'corporate';
    wineExperience: 'novice' | 'intermediate' | 'enthusiast' | 'expert';
    interests: string[];
    pacePreference: 'relaxed' | 'moderate' | 'packed';
    specialOccasion?: string;
    dietaryRestrictions?: string[];
    accessibilityNeeds?: string[];
  };
  
  // Trip details
  tripDates: {
    start: Date;
    end: Date;
  };
  
  // Generated itinerary
  days: ItineraryDay[];
  
  // Metadata
  sources: string[]; // Business names used in recommendations
  confidence: number; // How well the itinerary matches preferences
}

interface ItineraryDay {
  date: Date;
  theme?: string; // e.g., "Rocks District Deep Dive"
  
  activities: ItineraryActivity[];
  
  meals: {
    breakfast?: MealRecommendation;
    lunch?: MealRecommendation;
    dinner?: MealRecommendation;
  };
  
  notes: string; // Tips, timing suggestions
}

interface ItineraryActivity {
  time: string; // e.g., "10:00 AM - 12:00 PM"
  type: 'winery' | 'attraction' | 'activity' | 'free-time';
  
  business: {
    name: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  
  description: string; // Why this was recommended
  insiderTip?: string; // Special knowledge from the KB
  reservationRequired: boolean;
  estimatedCost?: string;
  
  alternatives?: ItineraryActivity[]; // Backup options
}
```

### Itinerary Generation Prompt

```
Based on the visitor's preferences and our knowledge base, create a detailed 
itinerary for their Walla Walla Valley trip.

VISITOR PROFILE:
{visitorProfile}

TRIP DATES:
{tripDates}

REQUIREMENTS:
1. Use ONLY businesses and experiences from the File Search results
2. Space out winery visits (max 3-4 per day with breaks)
3. Include meal recommendations that complement the day's activities
4. Add insider tips from the knowledge base
5. Note which activities require reservations
6. Provide alternatives in case first choices are unavailable
7. Match the pace to their stated preference
8. Highlight experiences that match their special occasion if applicable

FORMAT:
Return a structured itinerary with specific times, business names, and 
personalized explanations for why each activity was chosen.
```

---

## Chat-to-Booking Bridge

> **Goal:** Transform conversational discovery into actionable bookings. When a visitor falls in love with their AI-crafted itinerary, make it effortless to lock it in with a deposit.

### The Conversion Funnel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHAT → BOOKING FUNNEL                                │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │   EXPLORE   │──▶│    BUILD    │──▶│   CAPTURE   │──▶│   CONVERT   │     │
│  │             │   │  ITINERARY  │   │    INFO     │   │             │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│       │                  │                  │                  │            │
│       ▼                  ▼                  ▼                  ▼            │
│  Chat about         Add items to       Collect name,      Send deposit     │
│  interests,         "Trip Basket"      email, phone       request via      │
│  ask questions      incrementally      party details      Stripe link      │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Session State:     Trip State:        Customer:          Draft Booking:   │
│  • preferences      • selected dates   • contact info     • all details    │
│  • interests        • wineries list    • party size       • deposit paid   │
│  • party type       • restaurants      • special needs    • status: hold   │
│                     • activities                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trip State (Incremental Itinerary Building)

As the visitor chats, the AI maintains a "Trip State" that accumulates their choices:

```typescript
interface TripState {
  sessionId: string;
  
  // Dates (may be flexible initially)
  dates: {
    status: 'flexible' | 'tentative' | 'confirmed';
    startDate?: string;
    endDate?: string;
    flexibility?: string; // e.g., "sometime in March"
  };
  
  // Party details
  party: {
    size?: number;
    type?: 'couple' | 'family' | 'friends' | 'solo' | 'corporate';
    specialOccasion?: string;
  };
  
  // Accumulated selections (the "Trip Basket")
  selections: TripSelection[];
  
  // Preferences learned from conversation
  preferences: {
    wineTypes: string[];
    diningStyle: string[];
    pacePreference: 'relaxed' | 'moderate' | 'packed';
    budget?: 'budget' | 'moderate' | 'luxury';
    interests: string[];
    restrictions: string[]; // dietary, accessibility
  };
  
  // Conversion readiness
  readiness: {
    hasEnoughForItinerary: boolean;
    hasContactInfo: boolean;
    readyForDeposit: boolean;
  };
  
  updatedAt: Date;
}

interface TripSelection {
  id: string;
  type: 'winery' | 'restaurant' | 'activity' | 'accommodation';
  businessName: string;
  businessId?: number;
  addedAt: Date;
  
  // Optional scheduling
  preferredDay?: number; // Day 1, 2, 3...
  preferredTime?: 'morning' | 'afternoon' | 'evening';
  
  // Why they added it (from conversation context)
  reason?: string;
  
  // Reservation info
  requiresReservation: boolean;
  reservationMade: boolean;
}
```

### Conversation Triggers

The AI recognizes natural moments to advance the funnel:

```typescript
// System prompt additions for booking awareness
const bookingAwarenessPrompt = `
BOOKING AWARENESS:
You are helping visitors plan trips that can become real bookings. Pay attention to:

1. TRIP BASKET MOMENTS:
   When a visitor expresses strong interest ("That sounds amazing!", "Add that to my list"),
   confirm you've noted it: "Great choice! I've added Reynvaan to your trip ideas."

2. DATE COMMITMENT:
   When dates become specific, acknowledge: "Perfect, I'm building your March 15-17 itinerary."

3. READINESS SIGNALS:
   Watch for phrases like:
   - "This looks perfect"
   - "How do I book this?"
   - "What's the next step?"
   - "Can you help me make this happen?"

4. GENTLE PROGRESSION:
   After building a solid itinerary, naturally ask:
   "Would you like me to put together a complete trip package? 
   I can help you lock in these dates with a small deposit."

5. INFORMATION GATHERING:
   When they're ready to proceed, collect:
   - Name and email (required)
   - Phone number (for day-of coordination)
   - Party size confirmation
   - Any special requests

NEVER be pushy. The goal is to make booking feel like a natural next step, not a sales pitch.
`;
```

### Dynamic Deposit Calculation

The deposit is calculated as **50% of the projected tour cost**. To stay competitive with industry quoting practices, **tasting fees and food/dining are excluded** from formal quotes and marked as TBD:

```typescript
interface TourCostEstimate {
  // Tour services (INCLUDED in deposit calculation)
  tourServices: {
    transportationPerDay: number;  // e.g., $400/day for private vehicle
    guideServicePerDay: number;    // e.g., $300/day for guide
    activitiesTotal: number;       // Non-dining, non-tasting activities
    accommodationTotal?: number;   // If we're booking lodging
  };
  
  // TBD costs (EXCLUDED from quotes - discussed later in planning)
  tbdCosts: {
    // Tasting fees - informational only, not in quote
    tastingFeeInfo: {
      estimatedTotal: number;      // For internal reference
      wineryCount: number;
      avgFeePerPerson: number;
      note: string;                // "Tasting fees vary by winery, typically $20-50/person"
      waiverPolicy: string;        // "Often waived with bottle purchase"
    };
    // Food - informational only, not in quote
    foodInfo: {
      estimatedTotal: number;
      note: string;                // "Dining costs TBD based on restaurant selections"
    };
  };
  
  // Calculations (based on tour services ONLY)
  tourSubtotal: number;          // Sum of tourServices (excludes tasting & food)
  depositPercentage: number;     // Default 50%
  depositAmount: number;         // tourSubtotal * depositPercentage
  
  // Display
  formattedEstimate: string;     // "Tour services: $2,100"
  formattedDeposit: string;      // "Deposit (50%): $1,050"
}

// Calculate deposit from trip state
function calculateDeposit(tripState: TripState, pricingConfig: PricingConfig): TourCostEstimate {
  const days = daysBetween(tripState.dates.startDate, tripState.dates.endDate);
  const partySize = tripState.party.size || 2;
  
  // Base tour costs (INCLUDED in quote)
  const transportationPerDay = pricingConfig.vehicleRates[getVehicleType(partySize)];
  const guideServicePerDay = pricingConfig.guideRatePerDay;
  
  // Activities (non-food, non-tasting)
  const activities = tripState.selections
    .filter(s => s.type === 'activity')
    .reduce((sum, activity) => {
      return sum + (pricingConfig.activityCosts[activity.businessId] || 0);
    }, 0);
  
  // Tasting fees - calculate for INFO ONLY, not included in quote
  const winerySelections = tripState.selections.filter(s => s.type === 'winery');
  const tastingFeeEstimate = winerySelections.reduce((sum, winery) => {
    const fee = pricingConfig.tastingFees[winery.businessId] || pricingConfig.defaultTastingFee;
    return sum + (fee * partySize);
  }, 0);
  
  // Food estimate - for INFO ONLY, not included in quote
  const foodEstimate = 
    (days * partySize * pricingConfig.avgBreakfast) +
    (days * partySize * pricingConfig.avgLunch) +
    (days * partySize * pricingConfig.avgDinner);
  
  // Tour subtotal (EXCLUDES tasting fees and food)
  const tourSubtotal = 
    (transportationPerDay * days) +
    (guideServicePerDay * days) +
    activities;
  
  const depositPercentage = 0.50;
  const depositAmount = Math.round(tourSubtotal * depositPercentage);
  
  return {
    tourServices: {
      transportationPerDay,
      guideServicePerDay,
      activitiesTotal: activities,
    },
    tbdCosts: {
      tastingFeeInfo: {
        estimatedTotal: tastingFeeEstimate,
        wineryCount: winerySelections.length,
        avgFeePerPerson: pricingConfig.defaultTastingFee,
        note: 'Tasting fees vary by winery, typically $20-50 per person',
        waiverPolicy: 'Often waived with wine purchase',
      },
      foodInfo: {
        estimatedTotal: foodEstimate,
        note: 'Dining selections finalized during planning',
      },
    },
    tourSubtotal,
    depositPercentage,
    depositAmount,
    formattedEstimate: `Tour services: $${tourSubtotal.toLocaleString()}`,
    formattedDeposit: `Deposit (50%): $${depositAmount.toLocaleString()}`,
  };
}

// Pricing configuration (admin-adjustable)
interface PricingConfig {
  vehicleRates: {
    sedan: number;      // 1-2 guests
    suv: number;        // 3-4 guests
    van: number;        // 5-8 guests
    sprinter: number;   // 9-14 guests
  };
  guideRatePerDay: number;
  // Tasting fees - for informational display only, not in quotes
  defaultTastingFee: number;
  tastingFees: Record<number, number>;  // businessId -> fee per person
  // Activity costs
  activityCosts: Record<number, number>;
  // Food averages - for informational display only, not in quotes
  avgBreakfast: number;
  avgLunch: number;
  avgDinner: number;
}
```

### The "Plan My Trip" Moment

When the visitor is ready, the AI triggers the booking flow with **clean, competitive pricing**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ASSISTANT: Your 3-day anniversary itinerary is looking fantastic! You've   │
│  got Reynvaan, L'Ecole No 41, and Cayuse for wine, plus Whitehouse-Crawford │
│  for that special dinner.                                                   │
│                                                                             │
│  Would you like me to help you lock this in? I can create a trip package   │
│  with all the details, and we can secure your dates with a deposit.        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎉 Plan My Trip                                                    │   │
│  │                                                                     │   │
│  │  Your Walla Walla Adventure                                         │   │
│  │  March 15-17, 2025 • 2 Guests • Anniversary                         │   │
│  │                                                                     │   │
│  │  ✓ 3 Winery Visits (Reynvaan, L'Ecole, Cayuse)                     │   │
│  │  ✓ Anniversary Dinner at Whitehouse-Crawford                        │   │
│  │  ✓ Private transportation & guide                                   │   │
│  │  ✓ Personalized itinerary with insider tips                        │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  💰 Tour Services                                                   │   │
│  │     Private Transportation (3 days)     $1,200                      │   │
│  │     Guide Service (3 days)                $900                      │   │
│  │     ─────────────────────────────────────────                       │   │
│  │     Tour Total                          $2,100                      │   │
│  │                                                                     │   │
│  │     Tasting fees & dining               TBD                         │   │
│  │     (Finalized during planning)                                     │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  To secure your dates, we just need:                                │   │
│  │                                                                     │   │
│  │  Name: [John Smith_________________]                                │   │
│  │  Email: [john@example.com__________]                                │   │
│  │  Phone: [(555) 123-4567____________]                                │   │
│  │                                                                     │   │
│  │  ✨ Deposit: $1,050 (50% of tour services)                          │   │
│  │     Fully refundable up to 7 days before your trip                  │   │
│  │     Applied to your final balance                                   │   │
│  │                                                                     │   │
│  │  [💳 Secure My Dates - $1,050 Deposit]                              │   │
│  │                                                                     │   │
│  │  Questions? Just ask me below!                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** Tasting fees (typically $20-50/person, often waived with purchase) and dining costs are discussed during the detailed planning phase after the deposit secures the dates. This keeps quotes clean and competitive while ensuring guests are fully informed before their trip.

### Draft Booking Generation

When the deposit is initiated, the system creates a `DraftBooking` with **tour services cost** (tasting & dining marked TBD):

```typescript
interface DraftBooking {
  id: string;
  
  // Source tracking
  chatSessionId: string;
  itineraryId?: string;
  
  // Customer info (collected in chat)
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Trip details (from Trip State)
  trip: {
    startDate: string;
    endDate: string;
    partySize: number;
    partyType: string;
    specialOccasion?: string;
  };
  
  // Itinerary summary
  itinerary: {
    wineries: string[];
    restaurants: string[];
    activities: string[];
    accommodationNotes?: string;
  };
  
  // AI-gathered context
  preferences: {
    wineTypes: string[];
    pacePreference: string;
    dietaryRestrictions: string[];
    accessibilityNeeds: string[];
    specialRequests: string;
  };
  
  // Cost breakdown - Tour Services ONLY (for quote)
  quotedCosts: {
    transportation: number;
    guideService: number;
    activities: number;
    tourTotal: number;           // Sum of above (deposit base)
  };
  
  // TBD costs - For planning reference, NOT in quote
  tbdCostsReference: {
    tastingFeesEstimate: number; // Internal reference only
    diningEstimate: number;      // Internal reference only
    wineryCount: number;
  };
  
  // Deposit tracking
  deposit: {
    percentage: number;          // 50% (0.50)
    baseAmount: number;          // tourTotal (excludes tasting & dining)
    amount: number;              // baseAmount * percentage
    status: 'pending' | 'paid' | 'refunded';
    stripePaymentIntentId?: string;
    paidAt?: Date;
  };
  
  // Booking lifecycle
  status: 'draft' | 'deposit_pending' | 'deposit_paid' | 'confirmed' | 'cancelled';
  
  // Admin workflow
  assignedTo?: number; // Staff member ID
  notes: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Deposit Flow Integration

```typescript
// API: Create draft booking from chat session
// POST /api/kb/booking/create-draft
async function createDraftBooking(req: NextRequest) {
  const { sessionId, customerInfo } = await req.json();
  
  // 1. Get trip state from chat session
  const tripState = await getTripState(sessionId);
  
  // 2. Get generated itinerary if exists
  const itinerary = await getLatestItinerary(sessionId);
  
  // 3. Get pricing configuration
  const pricingConfig = await getPricingConfig();
  
  // 4. Calculate tour cost and deposit (50% of tour services only)
  const costEstimate = calculateDeposit(tripState, pricingConfig);
  const days = daysBetween(tripState.dates.startDate, tripState.dates.endDate);
  
  // 5. Create draft booking - quote shows tour services only
  const draftBooking = await db.insert('kb_draft_bookings', {
    chat_session_id: sessionId,
    itinerary_id: itinerary?.id,
    customer_name: customerInfo.name,
    customer_email: customerInfo.email,
    customer_phone: customerInfo.phone,
    trip_start_date: tripState.dates.startDate,
    trip_end_date: tripState.dates.endDate,
    party_size: tripState.party.size,
    party_type: tripState.party.type,
    special_occasion: tripState.party.specialOccasion,
    itinerary_summary: JSON.stringify({
      wineries: tripState.selections.filter(s => s.type === 'winery').map(s => s.businessName),
      restaurants: tripState.selections.filter(s => s.type === 'restaurant').map(s => s.businessName),
      activities: tripState.selections.filter(s => s.type === 'activity').map(s => s.businessName),
    }),
    preferences: JSON.stringify(tripState.preferences),
    
    // QUOTED costs (tour services only - what customer sees)
    cost_transportation: costEstimate.tourServices.transportationPerDay * days,
    cost_guide: costEstimate.tourServices.guideServicePerDay * days,
    cost_activities: costEstimate.tourServices.activitiesTotal,
    cost_tour_total: costEstimate.tourSubtotal,
    
    // TBD costs (internal reference only - NOT shown in quote)
    tbd_tastings_estimate: costEstimate.tbdCosts.tastingFeeInfo.estimatedTotal,
    tbd_dining_estimate: costEstimate.tbdCosts.foodInfo.estimatedTotal,
    tbd_winery_count: costEstimate.tbdCosts.tastingFeeInfo.wineryCount,
    
    // Deposit calculation (based on tour services only)
    deposit_percentage: costEstimate.depositPercentage,
    deposit_base_amount: costEstimate.tourSubtotal,
    deposit_amount: costEstimate.depositAmount,
    status: 'draft',
  });
  
  // 6. Create Stripe payment intent with dynamic amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount: costEstimate.depositAmount * 100, // Convert to cents
    currency: 'usd',
    metadata: {
      draftBookingId: draftBooking.id,
      customerEmail: customerInfo.email,
      tripDates: `${tripState.dates.startDate} to ${tripState.dates.endDate}`,
      tourTotal: costEstimate.tourSubtotal.toString(),
      depositPercentage: '50',
    },
  });
  
  // 7. Update draft with payment intent
  await db.update('kb_draft_bookings', draftBooking.id, {
    stripe_payment_intent_id: paymentIntent.id,
    status: 'deposit_pending',
  });
  
  // 8. Return quote-friendly response (no tasting/dining amounts)
  return {
    draftBookingId: draftBooking.id,
    clientSecret: paymentIntent.client_secret,
    // Clean quote for customer display
    quote: {
      transportation: costEstimate.tourServices.transportationPerDay * days,
      guideService: costEstimate.tourServices.guideServicePerDay * days,
      activities: costEstimate.tourServices.activitiesTotal,
      tourTotal: costEstimate.tourSubtotal,
      depositAmount: costEstimate.depositAmount,
      depositPercentage: 50,
      // TBD items - no amounts, just acknowledgment
      tbdItems: ['Tasting fees', 'Dining'],
      tbdNote: 'Finalized during planning',
    },
  };
}

// Webhook: Handle successful deposit
// POST /api/webhooks/stripe
async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const draftBookingId = paymentIntent.metadata.draftBookingId;
    
    // 1. Update draft booking status
    await db.update('kb_draft_bookings', draftBookingId, {
      status: 'deposit_paid',
      deposit_paid_at: new Date(),
    });
    
    // 2. Send confirmation email to customer
    await sendDepositConfirmationEmail(draftBookingId);
    
    // 3. Notify admin team
    await notifyAdminNewBooking(draftBookingId);
    
    // 4. Create task in admin queue
    await createAdminTask({
      type: 'new_ai_booking',
      draftBookingId,
      priority: 'high',
      description: 'New booking from AI assistant - review and confirm',
    });
  }
}
```

### Admin Review Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎯 New AI-Generated Booking                              [Deposit: PAID]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Customer: John & Jane Smith                                                │
│  Email: john@example.com | Phone: (555) 123-4567                           │
│                                                                             │
│  Trip: March 15-17, 2025 (3 days)                                          │
│  Party: 2 guests, Couple, 10th Anniversary                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📋 AI-Generated Itinerary:                                                 │
│                                                                             │
│  Day 1 - Downtown & Classics                                                │
│    • 10:00 AM - L'Ecole No 41 (tasting)                                    │
│    • 1:00 PM - Lunch at Saffron Mediterranean                              │
│    • 3:00 PM - Pepper Bridge Winery                                        │
│    • 7:00 PM - Dinner at Whitehouse-Crawford ⭐ Anniversary                 │
│                                                                             │
│  Day 2 - Rocks District                                                     │
│    • 10:30 AM - Reynvaan Family Vineyards                                  │
│    • 1:00 PM - Lunch at The Marc                                           │
│    • 3:00 PM - Cayuse Vineyards (if available)                             │
│    ...                                                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🤖 AI Conversation Summary:                                                │
│  "Couple celebrating 10th anniversary. Love bold Cabernets. First time     │
│  to Walla Walla. Interested in learning about terroir. Prefer relaxed      │
│  pace with quality over quantity."                                          │
│                                                                             │
│  [📖 View Full Chat Transcript]                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Actions:                                                                   │
│  [✅ Convert to Full Booking]  [📞 Contact Customer]  [✏️ Modify Itinerary] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema for Booking Bridge

```sql
-- Draft bookings from AI chat
CREATE TABLE kb_draft_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  chat_session_id UUID REFERENCES kb_chat_sessions(id),
  itinerary_id UUID REFERENCES kb_itineraries(id),
  
  -- Customer
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Trip details
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  party_size INTEGER NOT NULL,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Itinerary
  itinerary_summary JSONB, -- wineries, restaurants, activities
  preferences JSONB, -- wine types, pace, restrictions
  special_requests TEXT,
  
  -- QUOTED costs (tour services only - shown to customer)
  cost_transportation DECIMAL(10,2),
  cost_guide DECIMAL(10,2),
  cost_activities DECIMAL(10,2),
  cost_tour_total DECIMAL(10,2) NOT NULL,     -- Base for deposit calculation
  
  -- TBD costs (internal reference only - NOT shown in quotes)
  tbd_tastings_estimate DECIMAL(10,2),        -- For planning reference
  tbd_dining_estimate DECIMAL(10,2),          -- For planning reference
  tbd_winery_count INTEGER,                   -- Number of wineries planned
  
  -- Deposit (50% of tour total, excludes tasting & dining)
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  deposit_base_amount DECIMAL(10,2) NOT NULL, -- = cost_tour_total
  deposit_amount DECIMAL(10,2) NOT NULL,      -- = base * percentage
  stripe_payment_intent_id VARCHAR(255),
  deposit_paid_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, deposit_pending, deposit_paid, confirmed, cancelled, refunded
  
  -- Admin workflow
  assigned_to INTEGER REFERENCES users(id),
  admin_notes TEXT,
  converted_booking_id INTEGER REFERENCES bookings(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing configuration (admin-managed)
CREATE TABLE kb_pricing_config (
  id SERIAL PRIMARY KEY,
  
  -- Vehicle rates (per day) - INCLUDED in quotes
  -- Fleet is Sprinter-only (no sedans, SUVs, or other vehicle types)
  rate_sprinter DECIMAL(10,2) DEFAULT 650.00,   -- All group sizes (1-14 guests)
  
  -- Guide rate - INCLUDED in quotes
  rate_guide_per_day DECIMAL(10,2) DEFAULT 300.00,
  
  -- Tasting fee defaults (for internal estimates only, NOT in quotes)
  default_tasting_fee DECIMAL(10,2) DEFAULT 25.00,
  tasting_fee_note VARCHAR(255) DEFAULT 'Typically $20-50 per person, often waived with purchase',
  
  -- Average meal costs (for internal estimates only, NOT in quotes)
  avg_breakfast DECIMAL(10,2) DEFAULT 20.00,
  avg_lunch DECIMAL(10,2) DEFAULT 35.00,
  avg_dinner DECIMAL(10,2) DEFAULT 75.00,
  
  -- Deposit settings
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  
  -- Active flag (only one active config)
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Business-specific pricing (internal reference)
CREATE TABLE kb_business_pricing (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id),
  
  -- For internal estimates only
  tasting_fee_per_person DECIMAL(10,2),
  tasting_waiver_policy VARCHAR(255),  -- e.g., "Waived with 2+ bottle purchase"
  activity_cost_total DECIMAL(10,2),   -- For activities
  
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip state persistence (for incremental building)
CREATE TABLE kb_trip_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id) UNIQUE,
  
  -- Dates
  dates_status VARCHAR(20) DEFAULT 'flexible',
  start_date DATE,
  end_date DATE,
  date_flexibility TEXT,
  
  -- Party
  party_size INTEGER,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Selections (the "basket")
  selections JSONB DEFAULT '[]',
  
  -- Learned preferences
  preferences JSONB DEFAULT '{}',
  
  -- Readiness flags
  ready_for_itinerary BOOLEAN DEFAULT FALSE,
  ready_for_deposit BOOLEAN DEFAULT FALSE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick session lookups
CREATE INDEX idx_trip_states_session ON kb_trip_states(session_id);
CREATE INDEX idx_draft_bookings_status ON kb_draft_bookings(status);
CREATE INDEX idx_draft_bookings_email ON kb_draft_bookings(customer_email);
```

### Conversion Metrics

Track the effectiveness of the chat-to-booking funnel:

```sql
-- Funnel analytics view
CREATE VIEW kb_conversion_funnel AS
SELECT 
  DATE_TRUNC('week', s.started_at) as week,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN s.message_count >= 5 THEN s.id END) as engaged_sessions,
  COUNT(DISTINCT ts.id) as sessions_with_selections,
  COUNT(DISTINCT CASE WHEN ts.ready_for_deposit THEN ts.id END) as ready_for_deposit,
  COUNT(DISTINCT db.id) as draft_bookings_created,
  COUNT(DISTINCT CASE WHEN db.status = 'deposit_paid' THEN db.id END) as deposits_paid,
  COUNT(DISTINCT CASE WHEN db.converted_booking_id IS NOT NULL THEN db.id END) as converted_to_booking
FROM kb_chat_sessions s
LEFT JOIN kb_trip_states ts ON s.id = ts.session_id
LEFT JOIN kb_draft_bookings db ON s.id = db.chat_session_id
GROUP BY DATE_TRUNC('week', s.started_at)
ORDER BY week DESC;
```

---

## Visitor Behavior Analytics

> **Goal:** Understand how visitors interact with the site to identify drop-off points, optimize engagement, and improve conversion rates. Track everything needed to make data-driven decisions about site improvements.

### Why This Matters

Without behavioral data, we're flying blind:
- Which pages cause visitors to leave?
- Where do they spend the most time?
- What content resonates?
- At what point do chat conversations convert (or not)?
- What's the journey from first visit to booking?

### Tracking Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VISITOR BEHAVIOR TRACKING                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     CLIENT-SIDE (Browser)                            │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Page Views   │  │ Interactions │  │ Time Tracking│               │   │
│  │  │ • URL        │  │ • Clicks     │  │ • Time on    │               │   │
│  │  │ • Referrer   │  │ • Scrolls    │  │   page       │               │   │
│  │  │ • UTM params │  │ • Form focus │  │ • Active vs  │               │   │
│  │  │ • Device     │  │ • Chat opens │  │   idle time  │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                 │                        │   │
│  │         └─────────────────┼─────────────────┘                        │   │
│  │                           ▼                                          │   │
│  │              ┌────────────────────────┐                              │   │
│  │              │   Event Collector      │                              │   │
│  │              │   (batched, debounced) │                              │   │
│  │              └───────────┬────────────┘                              │   │
│  └──────────────────────────┼───────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SERVER-SIDE (API)                                │   │
│  │                                                                      │   │
│  │  POST /api/analytics/events                                          │   │
│  │    • Validate & enrich events                                        │   │
│  │    • Associate with visitor session                                  │   │
│  │    • Store in PostgreSQL                                             │   │
│  │                                                                      │   │
│  └──────────────────────────┬───────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ANALYTICS DASHBOARD                              │   │
│  │                                                                      │   │
│  │  • Real-time visitor count                                           │   │
│  │  • Page performance metrics                                          │   │
│  │  • Conversion funnels                                                │   │
│  │  • Chat engagement analysis                                          │   │
│  │  • A/B test results                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Types to Track

#### 1. Session & Page Events

```typescript
interface SessionEvent {
  type: 'session_start' | 'session_end';
  visitorId: string;        // Anonymous ID (cookie/localStorage)
  sessionId: string;
  timestamp: Date;
  
  // Entry context
  entryUrl: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Device info
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screenSize: string;
  
  // Location (from IP, approximate)
  country?: string;
  region?: string;
  city?: string;
}

interface PageViewEvent {
  type: 'page_view';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  // Page info
  url: string;
  path: string;
  title: string;
  section: string;           // 'home', 'wineries', 'chat', 'booking', etc.
  
  // Navigation
  previousPage?: string;
  timeOnPreviousPage?: number;  // milliseconds
  
  // Engagement indicators
  scrollDepth?: number;      // 0-100%
  timeOnPage?: number;       // Updated on next page or session end
}
```

#### 2. Interaction Events

```typescript
interface InteractionEvent {
  type: 'click' | 'scroll' | 'form_focus' | 'form_submit' | 'hover';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  // Page context
  pageUrl: string;
  pageSection: string;
  
  // Element info
  elementType: string;       // 'button', 'link', 'image', etc.
  elementId?: string;
  elementClass?: string;
  elementText?: string;      // For buttons/links
  
  // Click-specific
  targetUrl?: string;        // For links
  
  // Scroll-specific
  scrollDepth?: number;      // 0-100%
  scrollDirection?: 'up' | 'down';
}

// Key interactions to track
const TRACKED_INTERACTIONS = [
  'cta_click',               // Any call-to-action button
  'chat_open',               // Opened chat widget
  'chat_message_sent',       // Sent a message
  'itinerary_view',          // Viewed generated itinerary
  'booking_form_start',      // Started filling booking form
  'booking_form_abandon',    // Left form without completing
  'deposit_initiated',       // Clicked pay deposit
  'deposit_completed',       // Payment successful
  'winery_card_click',       // Clicked on a winery listing
  'gallery_view',            // Viewed photo gallery
  'video_play',              // Started watching video
  'video_complete',          // Finished video
  'download_itinerary',      // Downloaded PDF itinerary
  'share_click',             // Shared content
];
```

#### 3. Chat-Specific Events

```typescript
interface ChatEvent {
  type: 'chat_open' | 'chat_close' | 'chat_message' | 'chat_suggestion_click';
  visitorId: string;
  sessionId: string;
  chatSessionId: string;
  timestamp: Date;
  
  // Message context (for chat_message)
  messageRole?: 'user' | 'assistant';
  messageLength?: number;
  topicsDiscussed?: string[];
  
  // Engagement metrics
  messagesInSession: number;
  timeInChat: number;        // Total time chat has been open
  
  // Conversion signals
  wineryMentioned?: string[];
  datesMentioned?: boolean;
  bookingIntentDetected?: boolean;
}
```

#### 4. Time & Engagement Events

```typescript
interface EngagementEvent {
  type: 'time_milestone' | 'idle_start' | 'idle_end' | 'tab_hidden' | 'tab_visible';
  visitorId: string;
  sessionId: string;
  timestamp: Date;
  
  pageUrl: string;
  
  // Time tracking
  activeTimeOnPage: number;  // Excludes idle time
  totalTimeOnPage: number;   // Includes idle
  idleThreshold: number;     // e.g., 30 seconds
  
  // Milestones (for time_milestone)
  milestone?: '30s' | '1m' | '2m' | '5m' | '10m';
}
```

### Client-Side Tracking Implementation

```typescript
// lib/analytics/tracker.ts

class VisitorTracker {
  private visitorId: string;
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private idleTimeout: number = 30000;  // 30 seconds
  private lastActivity: number = Date.now();
  private isIdle: boolean = false;
  private pageStartTime: number = Date.now();
  private activeTime: number = 0;
  
  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.createSessionId();
    this.initializeTracking();
  }
  
  private getOrCreateVisitorId(): string {
    let id = localStorage.getItem('ww_visitor_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('ww_visitor_id', id);
    }
    return id;
  }
  
  private initializeTracking() {
    // Track session start
    this.trackSessionStart();
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track({ type: 'tab_hidden' });
        this.pauseActiveTime();
      } else {
        this.track({ type: 'tab_visible' });
        this.resumeActiveTime();
      }
    });
    
    // Scroll tracking (debounced)
    let maxScroll = 0;
    window.addEventListener('scroll', debounce(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        // Track milestones: 25%, 50%, 75%, 100%
        if ([25, 50, 75, 100].includes(scrollPercent)) {
          this.track({ type: 'scroll_milestone', scrollDepth: scrollPercent });
        }
      }
      this.recordActivity();
    }, 100));
    
    // Click tracking
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.trackClick(target);
      this.recordActivity();
    });
    
    // Idle detection
    setInterval(() => this.checkIdle(), 1000);
    
    // Flush events periodically
    setInterval(() => this.flushEvents(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.trackPageExit();
      this.flushEvents(true); // Sync flush
    });
    
    // Track time milestones
    this.startTimeMilestones();
  }
  
  private trackClick(element: HTMLElement) {
    // Determine if this is a significant click
    const isButton = element.tagName === 'BUTTON' || element.closest('button');
    const isLink = element.tagName === 'A' || element.closest('a');
    const isCTA = element.closest('[data-track="cta"]');
    
    if (isButton || isLink || isCTA) {
      this.track({
        type: 'click',
        elementType: element.tagName.toLowerCase(),
        elementId: element.id || undefined,
        elementText: element.textContent?.slice(0, 50),
        targetUrl: (element as HTMLAnchorElement).href || undefined,
        trackingLabel: element.getAttribute('data-track-label') || undefined,
      });
    }
  }
  
  private startTimeMilestones() {
    const milestones = [30, 60, 120, 300, 600]; // seconds
    milestones.forEach(seconds => {
      setTimeout(() => {
        if (!document.hidden) {
          this.track({ 
            type: 'time_milestone', 
            milestone: `${seconds}s`,
            activeTime: this.activeTime,
          });
        }
      }, seconds * 1000);
    });
  }
  
  // Public method for custom event tracking
  public track(event: Partial<AnalyticsEvent>) {
    const fullEvent: AnalyticsEvent = {
      ...event,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
    } as AnalyticsEvent;
    
    this.eventQueue.push(fullEvent);
  }
  
  private async flushEvents(sync: boolean = false) {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    const payload = JSON.stringify({ events });
    
    if (sync && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', payload);
    } else {
      try {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      } catch (e) {
        // Re-queue failed events
        this.eventQueue = [...events, ...this.eventQueue];
      }
    }
  }
}

// Initialize tracker
export const tracker = new VisitorTracker();

// Convenience methods
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  tracker.track({ type: 'custom', eventName: name, properties });
};

export const trackChatOpen = () => tracker.track({ type: 'chat_open' });
export const trackChatMessage = (role: 'user' | 'assistant', length: number) => {
  tracker.track({ type: 'chat_message', messageRole: role, messageLength: length });
};
```

### Database Schema for Analytics

```sql
-- Visitor sessions
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL,  -- Anonymous persistent ID
  
  -- Entry context
  entry_url TEXT NOT NULL,
  entry_path VARCHAR(255),
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Device
  device_type VARCHAR(20),  -- mobile, tablet, desktop
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_size VARCHAR(20),
  
  -- Location (approximate)
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Session metrics
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  active_time_seconds INTEGER,
  
  -- Engagement flags
  opened_chat BOOLEAN DEFAULT FALSE,
  sent_chat_message BOOLEAN DEFAULT FALSE,
  viewed_itinerary BOOLEAN DEFAULT FALSE,
  started_booking BOOLEAN DEFAULT FALSE,
  completed_deposit BOOLEAN DEFAULT FALSE,
  
  -- Conversion tracking
  converted_to_booking BOOLEAN DEFAULT FALSE,
  booking_id INTEGER REFERENCES bookings(id)
);

-- Individual events
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id),
  visitor_id VARCHAR(255) NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100),  -- For custom events
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Page context
  page_url TEXT,
  page_path VARCHAR(255),
  page_section VARCHAR(50),
  
  -- Event-specific data
  properties JSONB,
  
  -- Element info (for interactions)
  element_type VARCHAR(50),
  element_id VARCHAR(100),
  element_text VARCHAR(255),
  target_url TEXT,
  
  -- Metrics
  scroll_depth INTEGER,
  time_on_page INTEGER,
  active_time INTEGER
);

-- Page performance (aggregated)
CREATE TABLE analytics_page_stats (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Traffic
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement
  avg_time_on_page INTEGER,  -- seconds
  avg_scroll_depth INTEGER,  -- percentage
  bounce_rate DECIMAL(5,2),  -- percentage
  
  -- Exits
  exit_count INTEGER DEFAULT 0,
  exit_rate DECIMAL(5,2),
  
  UNIQUE(page_path, date)
);

-- Visitor journey tracking
CREATE TABLE analytics_visitor_journeys (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) NOT NULL,
  
  -- First touch
  first_visit_at TIMESTAMP,
  first_referrer TEXT,
  first_utm_source VARCHAR(100),
  
  -- Engagement history
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Chat engagement
  chat_sessions INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  
  -- Conversion
  itineraries_generated INTEGER DEFAULT 0,
  booking_attempts INTEGER DEFAULT 0,
  deposits_paid INTEGER DEFAULT 0,
  total_booking_value DECIMAL(10,2) DEFAULT 0,
  
  -- Lifecycle
  last_visit_at TIMESTAMP,
  days_since_first_visit INTEGER,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_visitor ON analytics_events(visitor_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_sessions_visitor ON analytics_sessions(visitor_id);
CREATE INDEX idx_sessions_started ON analytics_sessions(started_at);
CREATE INDEX idx_page_stats_date ON analytics_page_stats(date);
```

### Analytics Dashboard Views

```sql
-- Real-time visitors (last 5 minutes)
CREATE VIEW analytics_realtime AS
SELECT 
  COUNT(DISTINCT visitor_id) as active_visitors,
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_open' THEN session_id END) as in_chat,
  COUNT(DISTINCT CASE WHEN page_path LIKE '/booking%' THEN session_id END) as on_booking
FROM analytics_events
WHERE timestamp > NOW() - INTERVAL '5 minutes';

-- Daily traffic summary
CREATE VIEW analytics_daily_summary AS
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  COUNT(DISTINCT visitor_id) as unique_visitors,
  AVG(page_views) as avg_pages_per_session,
  AVG(total_time_seconds) as avg_session_duration,
  SUM(CASE WHEN opened_chat THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 as chat_open_rate,
  SUM(CASE WHEN completed_deposit THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 as conversion_rate
FROM analytics_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Page performance ranking
CREATE VIEW analytics_page_performance AS
SELECT 
  page_path,
  SUM(page_views) as total_views,
  AVG(avg_time_on_page) as avg_time,
  AVG(avg_scroll_depth) as avg_scroll,
  AVG(bounce_rate) as bounce_rate,
  AVG(exit_rate) as exit_rate
FROM analytics_page_stats
WHERE date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY page_path
ORDER BY total_views DESC;

-- Chat engagement funnel
CREATE VIEW analytics_chat_funnel AS
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_open' THEN session_id END) as opened_chat,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_message' AND properties->>'role' = 'user' THEN session_id END) as sent_message,
  COUNT(DISTINCT CASE WHEN event_type = 'itinerary_view' THEN session_id END) as viewed_itinerary,
  COUNT(DISTINCT CASE WHEN event_type = 'deposit_initiated' THEN session_id END) as started_deposit,
  COUNT(DISTINCT CASE WHEN event_type = 'deposit_completed' THEN session_id END) as completed_deposit
FROM analytics_events
WHERE timestamp > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Drop-off analysis
CREATE VIEW analytics_dropoff_points AS
SELECT 
  page_path as exit_page,
  COUNT(*) as exits,
  AVG(time_on_page) as avg_time_before_exit,
  AVG(scroll_depth) as avg_scroll_before_exit
FROM analytics_events e
JOIN analytics_sessions s ON e.session_id = s.id
WHERE e.timestamp = (
  SELECT MAX(timestamp) FROM analytics_events 
  WHERE session_id = e.session_id
)
AND s.ended_at IS NOT NULL
GROUP BY page_path
ORDER BY exits DESC
LIMIT 20;
```

### Admin Analytics Dashboard UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Visitor Analytics Dashboard                        [Last 30 Days ▾]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   🟢 12     │ │   👥 847    │ │   💬 23%    │ │   💰 3.2%   │           │
│  │   Live Now  │ │   Visitors  │ │   Chat Rate │ │   Convert   │           │
│  │   +3 vs avg │ │   +12% ▲    │ │   +5% ▲     │ │   +0.8% ▲   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📈 Traffic & Engagement                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sessions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  Chat Opens ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │   │
│  │  Deposits ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪   │   │
│  │                                                                     │   │
│  │  Dec 1 ─────────────────────────────────────────────────── Dec 17   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔄 Conversion Funnel                      📄 Top Pages                     │
│  ┌────────────────────────────────┐       ┌────────────────────────────┐   │
│  │ Site Visitors      847  100%  │       │ /                    324 ▪ │   │
│  │       ▼                       │       │ /wineries            287 ▪ │   │
│  │ Opened Chat        195   23%  │       │ /experiences         156 ▪ │   │
│  │       ▼                       │       │ /about-walla-walla   134 ▪ │   │
│  │ Engaged (5+ msgs)  142   17%  │       │ /booking              89 ▪ │   │
│  │       ▼                       │       └────────────────────────────┘   │
│  │ Viewed Itinerary    67    8%  │                                        │
│  │       ▼                       │       ⚠️ High Exit Pages               │
│  │ Started Deposit     34    4%  │       ┌────────────────────────────┐   │
│  │       ▼                       │       │ /booking/payment  42% exit │   │
│  │ Completed Deposit   27  3.2%  │       │ /chat             28% exit │   │
│  └────────────────────────────────┘       │ /wineries/list    24% exit │   │
│                                           └────────────────────────────┘   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⏱️ Engagement Metrics                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Avg Session Duration: 4m 32s     Avg Pages/Session: 3.4            │   │
│  │  Avg Time on Page: 1m 48s         Avg Scroll Depth: 67%             │   │
│  │  Bounce Rate: 34%                 Return Visitor Rate: 28%          │   │
│  │                                                                     │   │
│  │  Chat Engagement:                                                   │   │
│  │  • Avg messages per session: 7.3                                    │   │
│  │  • Avg chat duration: 8m 15s                                        │   │
│  │  • Itinerary request rate: 34%                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔍 Traffic Sources                        📱 Devices                       │
│  ┌────────────────────────────────┐       ┌────────────────────────────┐   │
│  │ Direct           42% ████████ │       │ Desktop      58% █████████ │   │
│  │ Google           31% ██████   │       │ Mobile       35% █████     │   │
│  │ Instagram        12% ██       │       │ Tablet        7% █         │   │
│  │ Facebook          8% █        │       └────────────────────────────┘   │
│  │ Other             7% █        │                                        │
│  └────────────────────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Monitor

| Metric | Target | Action if Below Target |
|--------|--------|------------------------|
| **Bounce Rate** | < 40% | Improve landing page content, faster load |
| **Avg Session Duration** | > 3 min | Add engaging content, clearer CTAs |
| **Chat Open Rate** | > 20% | Better chat widget visibility, prompts |
| **Chat → Itinerary** | > 30% | Improve AI conversation flow |
| **Itinerary → Deposit** | > 40% | Simplify booking, clearer pricing |
| **Deposit Completion** | > 80% | Fix payment UX issues |
| **Return Visitor Rate** | > 25% | Email follow-ups, remarketing |

### A/B Testing Framework

```typescript
// Track experiments
interface Experiment {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    weight: number;  // 0-100, must sum to 100
  }[];
  targetMetric: string;  // e.g., 'deposit_completed'
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'completed';
}

// Assign visitor to variant
function getVariant(visitorId: string, experiment: Experiment): string {
  const hash = hashCode(visitorId + experiment.id);
  const bucket = Math.abs(hash) % 100;
  
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.id;
    }
  }
  return experiment.variants[0].id;
}

// Track experiment exposure
tracker.track({
  type: 'experiment_exposure',
  experimentId: 'chat_cta_test',
  variantId: 'variant_b',
});
```

### API Endpoints for Analytics

```typescript
// Ingest events
POST   /api/analytics/events           // Batch event ingestion

// Dashboard queries
GET    /api/analytics/realtime         // Live visitor count
GET    /api/analytics/summary          // Daily/weekly/monthly summary
GET    /api/analytics/funnel           // Conversion funnel data
GET    /api/analytics/pages            // Page performance
GET    /api/analytics/sources          // Traffic sources
GET    /api/analytics/chat             // Chat engagement metrics
GET    /api/analytics/dropoff          // Exit page analysis

// Visitor lookup
GET    /api/analytics/visitor/:id      // Individual visitor journey
GET    /api/analytics/session/:id      // Session replay data

// Experiments
GET    /api/analytics/experiments      // List experiments
POST   /api/analytics/experiments      // Create experiment
GET    /api/analytics/experiments/:id/results  // Experiment results
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic ingestion and chat working

- [ ] Set up Gemini API credentials and File Search Store
- [ ] Create basic ingestion API for text and documents
- [ ] Implement simple chat endpoint with File Search tool
- [ ] Build minimal contributor upload interface
- [ ] Seed with 10-20 test businesses

**Deliverable:** Working prototype that can answer questions from uploaded docs

### Phase 2: Multi-Modal Ingestion (Weeks 3-4)
**Goal:** Support all input types

- [ ] Add voice note transcription pipeline
- [ ] Add video processing pipeline
- [ ] Add image caption/OCR pipeline
- [ ] Implement URL content fetching
- [ ] Build content metadata system

**Deliverable:** Contributors can upload any content type

### Phase 3: Content Verification (Weeks 5-6)
**Goal:** Gold-standard quality control

- [ ] Implement content state machine (pending → review → approved → indexed)
- [ ] Build AI pre-screening pipeline
- [ ] Create admin review interface
- [ ] Implement trusted contributor system
- [ ] Add review history and audit trail

**Deliverable:** All content verified before going live

### Phase 4: Contributor Portal (Weeks 7-8)
**Goal:** Easy contribution experience

- [ ] Design and build contributor dashboard
- [ ] Implement guided Q&A contribution flow
- [ ] Add content management (edit, expire, delete)
- [ ] Create prompt templates for different business types
- [ ] Show content status and review feedback

**Deliverable:** Business owners can self-serve content contribution

### Phase 5: Enhanced Chat Experience (Weeks 9-10)
**Goal:** Personalized, itinerary-capable assistant

- [ ] Refine system prompt and persona
- [ ] Implement preference gathering flow
- [ ] Build Trip State persistence (incremental itinerary building)
- [ ] Build itinerary generation logic
- [ ] Add itinerary export (PDF, email)
- [ ] Create chat widget for website embedding

**Deliverable:** Full-featured AI assistant on the website

### Phase 6: Chat-to-Booking Bridge (Weeks 11-12)
**Goal:** Convert conversations to bookings

- [ ] Implement Trip State tracking across chat sessions
- [ ] Build dynamic deposit calculation (50% of tour, excluding food)
- [ ] Build "Plan My Trip" UI component with cost breakdown
- [ ] Create draft booking generation from chat
- [ ] Integrate Stripe for deposit collection
- [ ] Build admin review interface for AI-generated bookings
- [ ] Implement conversion to full booking workflow
- [ ] Create pricing configuration admin interface

**Deliverable:** Visitors can secure trips with deposits directly from chat

### Phase 7: Visitor Analytics (Weeks 13-14)
**Goal:** Comprehensive behavior tracking

- [ ] Implement client-side event tracking library
- [ ] Build event ingestion API with batching
- [ ] Create analytics database schema
- [ ] Build real-time visitor dashboard
- [ ] Implement conversion funnel visualization
- [ ] Add page performance tracking
- [ ] Create drop-off analysis reports
- [ ] Build A/B testing framework

**Deliverable:** Full visibility into visitor behavior and conversion optimization

### Phase 8: Scale & Polish (Weeks 15-16)
**Goal:** Production-ready system

- [ ] Onboard initial batch of contributors
- [ ] Gather feedback and iterate on UX
- [ ] Set up analytics alerts and monitoring
- [ ] Performance optimization
- [ ] Documentation and training materials
- [ ] Launch marketing coordination

**Deliverable:** Launch-ready AI Knowledge Base with booking integration and analytics

---

## Technical Specifications

### API Endpoints

```typescript
// Contributor Portal
POST   /api/kb/contribute/text       // Submit text content
POST   /api/kb/contribute/document   // Upload document
POST   /api/kb/contribute/voice      // Upload voice note
POST   /api/kb/contribute/video      // Upload video
POST   /api/kb/contribute/image      // Upload image
POST   /api/kb/contribute/url        // Submit URL for scraping

GET    /api/kb/contributions         // List contributor's content
DELETE /api/kb/contributions/:id     // Remove content

// Content Verification
GET    /api/kb/admin/review-queue    // Get pending content for review
POST   /api/kb/admin/review/:id      // Submit review decision
GET    /api/kb/admin/review-history  // Audit trail of reviews

// Chat
POST   /api/kb/chat                  // Send message, get response
GET    /api/kb/chat/:sessionId       // Get chat history
GET    /api/kb/chat/:sessionId/trip-state  // Get current trip state
POST   /api/kb/itinerary/generate    // Generate itinerary
GET    /api/kb/itinerary/:id/export  // Export itinerary as PDF

// Booking Bridge
POST   /api/kb/booking/create-draft  // Create draft booking from chat
GET    /api/kb/booking/draft/:id     // Get draft booking details
POST   /api/kb/booking/draft/:id/deposit  // Initiate deposit payment
POST   /api/kb/booking/draft/:id/convert  // Convert to full booking

// Admin
GET    /api/kb/admin/stats           // Usage statistics
GET    /api/kb/admin/content         // All content with filters
POST   /api/kb/admin/content/:id/approve  // Approve pending content
GET    /api/kb/admin/draft-bookings  // List AI-generated draft bookings
GET    /api/kb/admin/funnel-metrics  // Conversion funnel analytics
```

### Database Schema Additions

```sql
-- Contributor accounts (extends existing users)
ALTER TABLE users ADD COLUMN is_contributor BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN business_id INTEGER REFERENCES businesses(id);

-- Businesses (content sources)
CREATE TABLE kb_businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- winery, restaurant, hotel, attraction, expert
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content contributions
CREATE TABLE kb_contributions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id),
  contributor_id INTEGER REFERENCES users(id),
  
  -- Content identification
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- text, document, voice, video, image, url
  original_filename VARCHAR(255),
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, indexed, failed
  file_search_doc_id VARCHAR(255), -- Gemini File Search document ID
  
  -- Metadata
  topics TEXT[], -- Array of topic tags
  audience_type VARCHAR(50),
  is_evergreen BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  indexed_at TIMESTAMP,
  last_retrieved_at TIMESTAMP,
  retrieval_count INTEGER DEFAULT 0
);

-- Chat sessions
CREATE TABLE kb_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255), -- Anonymous or authenticated
  
  -- Gathered preferences
  visitor_profile JSONB,
  
  -- Session data
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Generated itineraries
  itinerary_generated BOOLEAN DEFAULT FALSE
);

-- Chat messages
CREATE TABLE kb_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES kb_chat_sessions(id),
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  
  -- Grounding metadata
  sources_used TEXT[], -- Business names cited
  grounding_metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated itineraries
CREATE TABLE kb_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id),
  
  -- Itinerary data
  trip_start DATE NOT NULL,
  trip_end DATE NOT NULL,
  itinerary_data JSONB NOT NULL,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exported_at TIMESTAMP,
  export_format VARCHAR(20) -- pdf, email
);
```

### Environment Variables

```bash
# Gemini API
GEMINI_API_KEY=your-api-key
GEMINI_FILE_SEARCH_STORE_ID=walla-walla-kb

# Optional: Google Cloud Storage for large file staging
GCS_BUCKET_NAME=walla-walla-kb-uploads
GCS_SERVICE_ACCOUNT_KEY=path/to/key.json
```

---

## Cost Considerations

### Gemini File Search Pricing

Based on [Gemini API File Search documentation](https://ai.google.dev/gemini-api/docs/file-search):

| Component | Cost |
|-----------|------|
| File Storage | **Free** |
| Embedding at Query Time | **Free** |
| Embedding at Index Time | $0.15 per 1M tokens |
| Retrieved Document Tokens | Standard input token pricing |
| Model Output | Standard output token pricing |

### Estimated Monthly Costs

**Assumptions:**
- 500 documents indexed (average 5,000 tokens each)
- 10,000 chat interactions per month
- Average 3 retrievals per chat (1,000 tokens each)

| Item | Calculation | Monthly Cost |
|------|-------------|--------------|
| Initial Indexing | 2.5M tokens × $0.15/1M | $0.38 (one-time) |
| Retrieved Tokens | 10,000 × 3 × 1,000 = 30M tokens | ~$3.75 |
| Model Input/Output | 10,000 × 2,000 avg tokens | ~$1.50 |
| **Total** | | **~$5-10/month** |

This is remarkably cost-effective compared to building custom RAG infrastructure.

---

## Next Steps

1. **Validate Architecture:** Review this design with stakeholders
2. **API Key Setup:** Obtain Gemini API access and create File Search Store
3. **Prototype:** Build Phase 1 foundation
4. **Content Strategy:** Identify first 20 businesses to onboard
5. **Contributor Outreach:** Prepare materials for business owner onboarding

---

## Changelog

### Version 1.3 (December 2024)
- **Competitive Quote Structure:** Tasting fees now excluded from formal quotes (like dining)
  - Quotes show only tour services: transportation, guide, activities
  - Tasting fees and dining marked as "TBD - Finalized during planning"
  - Keeps quotes competitive with industry standards
  - Internal estimates still tracked for planning reference
  - Tasting fee info (typical costs, waiver policies) available for education
- Replaced "pay as you go" language with "TBD" throughout

### Version 1.2 (December 2024)
- **Dynamic Deposit Calculation:** Deposit is now 50% of projected tour cost
  - Added `TourCostEstimate` interface with cost breakdown
  - Added `PricingConfig` for admin-adjustable rates
  - Updated "Plan My Trip" UI to show clean pricing
- **Visitor Behavior Analytics:** Comprehensive tracking system
  - Session, page view, interaction, and chat event tracking
  - Client-side tracker with batched event collection
  - Full database schema for analytics storage
  - Admin dashboard with real-time metrics, funnels, and drop-off analysis
  - A/B testing framework for optimization
  - Key metrics and targets for monitoring
- Updated implementation phases (now 8 phases)
- Added new database tables: `kb_pricing_config`, `kb_business_pricing`, `analytics_*`

### Version 1.1 (December 2024)
- Added **Content Verification Workflow** section with trust levels and AI pre-screening
- Added **Chat-to-Booking Bridge** section with Trip State, deposit flow, and admin review
- Updated implementation phases to include new features (now 7 phases)
- Added new API endpoints for verification and booking

### Version 1.0 (December 2024)
- Initial design document

---

*Document Version: 1.3*  
*Last Updated: December 2024*  
*Author: AI Development Team*

