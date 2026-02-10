/**
 * Gemini Service
 *
 * Handles all Gemini API interactions for the AI Knowledge Base:
 * - File Search (RAG) for document retrieval
 * - Chat with grounded responses
 * - Content transcription (audio/video)
 * - Image analysis
 */

import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  text: string;
  sources?: string[];
  groundingMetadata?: Record<string, unknown>;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

export interface ImageAnalysisResult {
  description: string;
  extractedText?: string;
  topics?: string[];
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const WALLA_WALLA_SYSTEM_PROMPT = `You are the Walla Walla Valley Insider—think of yourself as a curious, well-connected local
who genuinely loves helping visitors discover wine country. You're not a tour guide reading from a script;
you're that friend who knows everyone and wants to understand what would make THIS trip unforgettable for THIS person.

═══════════════════════════════════════════════════════════════════════════════
PERSONALITY: The Curious Local Friend
═══════════════════════════════════════════════════════════════════════════════

You are INQUISITIVE first, informative second. Your goal is to understand their story before recommending anything.

- Genuinely curious about WHO they are and WHAT brought them to Walla Walla
- Warm and conversational—like chatting at a wine bar, not filling out a form
- You listen for the story behind the trip (anniversary? first wine tour? bucket list?)
- You pick up on hints and explore them ("You mentioned wanting outdoor seating—is there a special occasion?")
- You share little insider tidbits that invite them to respond, not just absorb
- You remember what they've told you and weave it naturally into the conversation

═══════════════════════════════════════════════════════════════════════════════
CONVERSATION FLOW: One Thread at a Time
═══════════════════════════════════════════════════════════════════════════════

**CRITICAL**: Do NOT ask multiple questions at once. This isn't a survey.

Instead, follow this natural discovery flow:

1. GREET & INVITE THEIR STORY
   Start by expressing genuine interest in their trip. Let them share what excites them.
   ✓ "Hey! So excited you're thinking about Walla Walla. What's bringing you to wine country?"
   ✗ "Welcome! When are you visiting? How many people? What wines do you like?"

2. BUILD ON WHAT THEY SHARE
   Whatever they say, show curiosity and dig one layer deeper.
   - If they mention an occasion: "Oh, a 10th anniversary—that's a big one! Do you want something romantic and intimate, or more celebratory and social?"
   - If they mention past trips: "Nice! What did you love most about Napa? I want to make sure Walla Walla hits those same notes."
   - If they mention preferences: "Interesting—you're drawn to smaller producers. Is that about the experience of meeting winemakers, or do you find the wines more interesting?"

3. GRADUALLY DISCOVER (in any order, as conversation allows):
   - The occasion or reason for the trip
   - Who's coming (party size AND dynamics—couple, friends, corporate?)
   - Their wine background (without making novices feel judged)
   - What else they enjoy (food, outdoors, art, history)
   - Their ideal pace (adventure-packed or relaxed and lingering)
   - Any practical needs (dietary, accessibility, timing)

4. MAKE CONNECTIONS OUT LOUD
   When you learn something, connect it to what you know:
   "You mentioned loving Pinot—there's a partner winery listed below that does an incredible one.
   And since you said you like meeting the actual winemakers, they're exactly that vibe."

═══════════════════════════════════════════════════════════════════════════════
FOLLOW-UP QUESTION PATTERNS
═══════════════════════════════════════════════════════════════════════════════

Use these patterns to go deeper without feeling like an interrogation:

**The Curious Follow-up**: "Tell me more about that..."
**The Contrast Question**: "Are you more of a [X] or [Y] person when it comes to [topic]?"
**The Story Probe**: "What made you choose Walla Walla specifically?"
**The Experience Check**: "Have you done wine tasting before, or is this your first rodeo?"
**The Preference Reveal**: "When you picture the perfect wine tasting, what does that look like?"
**The Hidden Agenda Finder**: "Is there anything you're hoping to avoid or skip on this trip?"

═══════════════════════════════════════════════════════════════════════════════
RESPONSE STYLE
═══════════════════════════════════════════════════════════════════════════════

- **Conversational, not listy**: Write like you talk, not like a brochure
- **Share, don't lecture**: Drop tidbits that invite response ("Fun fact: that winery's dog greets everyone at the door—do you travel with pets?")
- **One question per response** (unless natural to ask two tightly related ones)
- **Show your personality**: You can be playful, opinionated, enthusiastic
- **End with an open door**: Your response should invite them to share more

═══════════════════════════════════════════════════════════════════════════════
CORE RULES
═══════════════════════════════════════════════════════════════════════════════

1. GROUNDED: Only recommend what's in the knowledge base. Never invent.
2. HONEST: If you don't know, say so. "I'd need to check on that" is fine.
3. PERSONAL: Always explain WHY a recommendation fits THEM specifically.
4. PATIENT: Don't rush to recommendations. Understanding > efficiency.

═══════════════════════════════════════════════════════════════════════════════
DATA INTEGRITY (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

You can ONLY mention specific businesses that appear in the Knowledge Base Context
provided with each message. This is your COMPLETE business knowledge.

- If asked about a business not in your context: "I don't have details on that one —
  let me tell you about some places I know well."
- NEVER use your training data to fill in business details (hours, prices, history)
- You MAY discuss general Walla Walla topics (weather, geography, wine education,
  travel logistics) using general knowledge
- For business-specific details not in your context, say "I'd need to check on that"

═══════════════════════════════════════════════════════════════════════════════
WINERIES THAT DO NOT HOST GUESTS (NEVER RECOMMEND)
═══════════════════════════════════════════════════════════════════════════════

These famous wineries are NOT open for tastings - NEVER proactively recommend them:
- **Leonetti Cellar** - Allocation-only, no public tastings
- **Cayuse Vineyards** - Mailing list only, no public access
- **Quilceda Creek** - No tasting room

If someone specifically asks about these, say: "They're legendary, but unfortunately
they're not open to the public for tastings. I can suggest some equally excellent
alternatives that you CAN visit."

═══════════════════════════════════════════════════════════════════════════════
BOOKING AWARENESS
═══════════════════════════════════════════════════════════════════════════════

Watch for readiness signals:
- Specific dates locked in
- "This sounds perfect" / "How do I book?"
- They've shared enough that you could build an itinerary

When ready, transition naturally:
"This is shaping up beautifully! Want me to put together a draft itinerary, or would you rather chat with Ryan directly to nail down the details?"

═══════════════════════════════════════════════════════════════════════════════
CITATION
═══════════════════════════════════════════════════════════════════════════════

Weave sources naturally using business names from the context provided:
"The winemaker at [partner winery name] once shared that their Cabernet needs at least 2 hours to open up..."
"I was chatting with the folks at [partner restaurant name]—they're obsessed with their new seasonal menu."`;

// ============================================================================
// Service Class
// ============================================================================

class GeminiServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'GeminiService';
  }

  private client: GoogleGenerativeAI | null = null;

  /**
   * Get or create Gemini client
   */
  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }

  /**
   * Get the model for chat interactions
   */
  private getChatModel() {
    const client = this.getClient();
    return client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp', // Using latest flash model
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
      },
      systemInstruction: WALLA_WALLA_SYSTEM_PROMPT,
    });
  }

  /**
   * Get the model for transcription/analysis
   */
  private getAnalysisModel() {
    const client = this.getClient();
    return client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Lower temperature for factual tasks
        maxOutputTokens: 4096,
      },
    });
  }

  // ============================================================================
  // Chat Methods
  // ============================================================================

  /**
   * Send a chat message and get a response
   */
  async chat(
    message: string,
    history: ChatMessage[] = [],
    context?: { visitorProfile?: Record<string, unknown>; tripState?: Record<string, unknown> }
  ): Promise<ChatResponse> {
    try {
      const model = this.getChatModel();

      // Build conversation history
      const contents: Content[] = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Add context if available
      let enrichedMessage = message;
      if (context?.visitorProfile || context?.tripState) {
        enrichedMessage = this.enrichMessageWithContext(message, context);
      }

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: enrichedMessage }],
      });

      // Start chat and send message
      const chat = model.startChat({ history: contents.slice(0, -1) });
      const result = await chat.sendMessage(enrichedMessage);
      const response = result.response;

      this.log('Chat response generated', { messageLength: message.length });

      return {
        text: response.text(),
        // Note: File Search grounding metadata would be extracted here
        // when using the Files API with grounding enabled
      };
    } catch (error: unknown) {
      this.handleError(error, 'chat');
      throw error;
    }
  }

  /**
   * Enrich message with visitor context
   */
  private enrichMessageWithContext(
    message: string,
    context: { visitorProfile?: Record<string, unknown>; tripState?: Record<string, unknown> }
  ): string {
    const contextParts: string[] = [];

    if (context.visitorProfile) {
      contextParts.push(`[Visitor Profile: ${JSON.stringify(context.visitorProfile)}]`);
    }

    if (context.tripState) {
      const state = context.tripState;
      if (state.selections && Array.isArray(state.selections) && state.selections.length > 0) {
        contextParts.push(`[Trip Basket: ${JSON.stringify(state.selections)}]`);
      }
      if (state.dates) {
        contextParts.push(`[Dates: ${JSON.stringify(state.dates)}]`);
      }
    }

    if (contextParts.length > 0) {
      return `${contextParts.join(' ')}\n\nUser message: ${message}`;
    }

    return message;
  }

  // ============================================================================
  // Content Analysis Methods
  // ============================================================================

  /**
   * Transcribe audio content
   */
  async transcribeAudio(
    audioBase64: string,
    mimeType: string = 'audio/mp3'
  ): Promise<TranscriptionResult> {
    try {
      const model = this.getAnalysisModel();

      const prompt = `Transcribe this audio accurately and completely. 
Preserve the speaker's intent and key details.
If there are multiple speakers, try to distinguish them.
Format the transcription as clean, readable text.`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
      ]);

      this.log('Audio transcribed successfully');

      return {
        text: result.response.text(),
      };
    } catch (error: unknown) {
      this.handleError(error, 'transcribeAudio');
      throw error;
    }
  }

  /**
   * Analyze video content and extract information
   */
  async analyzeVideo(
    videoBase64: string,
    mimeType: string = 'video/mp4'
  ): Promise<TranscriptionResult> {
    try {
      const model = this.getAnalysisModel();

      const prompt = `Analyze this video and create a comprehensive text summary including:
1. Full transcription of all spoken content
2. Description of key visual elements (vineyard views, facilities, wine bottles, etc.)
3. Any text visible in the video (signs, labels, etc.)
4. Key topics and themes discussed

Format as a detailed document suitable for a travel knowledge base about the Walla Walla Valley.`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: videoBase64,
          },
        },
      ]);

      this.log('Video analyzed successfully');

      return {
        text: result.response.text(),
      };
    } catch (error: unknown) {
      this.handleError(error, 'analyzeVideo');
      throw error;
    }
  }

  /**
   * Analyze image and extract information
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<ImageAnalysisResult> {
    try {
      const model = this.getAnalysisModel();

      const prompt = `Analyze this image for a travel knowledge base about the Walla Walla Valley:

1. Describe what is shown in the image in detail
2. Extract any visible text (labels, signs, menus, wine names)
3. Identify relevant topics (e.g., wine tasting, vineyard, restaurant, etc.)
4. Note anything a visitor would find interesting or useful

Respond in JSON format:
{
  "description": "detailed description",
  "extractedText": "any text found in the image",
  "topics": ["topic1", "topic2"]
}`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ]);

      const responseText = result.response.text();

      // Try to parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If JSON parsing fails, return as description
      }

      this.log('Image analyzed successfully');

      return {
        description: responseText,
      };
    } catch (error: unknown) {
      this.handleError(error, 'analyzeImage');
      throw error;
    }
  }

  // ============================================================================
  // Content Pre-screening
  // ============================================================================

  /**
   * Pre-screen content for quality and appropriateness
   */
  async prescreenContent(
    content: string,
    businessName: string,
    contentType: string
  ): Promise<{
    recommendation: 'approve' | 'review' | 'reject';
    confidence: number;
    summary: string;
    flaggedClaims: string[];
    suggestedTopics: string[];
    concerns?: string;
  }> {
    try {
      const model = this.getAnalysisModel();

      const prompt = `Review this content submission for the Walla Walla Valley knowledge base.

CONTENT:
${content}

SOURCE:
Business: ${businessName}
Content Type: ${contentType}

EVALUATE:
1. FACTUAL: Does this contain verifiable facts about the business/area?
2. HELPFUL: Would a visitor find this information useful?
3. APPROPRIATE: Is the tone informative (not overly promotional)?
4. COMPLETE: Is there enough detail to be useful?
5. FLAGS: Any claims that should be manually verified? (hours, prices, awards)

RESPOND IN JSON:
{
  "recommendation": "approve" | "review" | "reject",
  "confidence": 0.0-1.0,
  "summary": "Brief description of content",
  "flaggedClaims": ["Any specific facts to verify"],
  "suggestedTopics": ["topic1", "topic2"],
  "concerns": "Any issues noted (optional)"
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.log('Content prescreened', { recommendation: parsed.recommendation });
        return parsed;
      }

      // Default response if parsing fails
      return {
        recommendation: 'review',
        confidence: 0.5,
        summary: 'Unable to fully analyze content',
        flaggedClaims: [],
        suggestedTopics: [],
        concerns: 'Automatic analysis incomplete',
      };
    } catch (error: unknown) {
      this.handleError(error, 'prescreenContent');
      // Return safe default on error
      return {
        recommendation: 'review',
        confidence: 0,
        summary: 'Error during analysis',
        flaggedClaims: [],
        suggestedTopics: [],
        concerns: 'Analysis failed - requires manual review',
      };
    }
  }

  // ============================================================================
  // Itinerary Generation
  // ============================================================================

  /**
   * Generate a personalized itinerary
   */
  async generateItinerary(
    visitorProfile: {
      partySize: number;
      partyType: string;
      wineExperience: string;
      interests: string[];
      pacePreference: string;
      specialOccasion?: string;
      dietaryRestrictions?: string[];
    },
    tripDates: { start: string; end: string },
    knowledgeBaseContext: string // Relevant content from the KB
  ): Promise<{
    itinerary: Record<string, unknown>;
    summary: string;
  }> {
    try {
      const model = this.getChatModel();

      const prompt = `Based on the visitor's preferences and the knowledge base information, create a detailed 
itinerary for their Walla Walla Valley trip.

VISITOR PROFILE:
${JSON.stringify(visitorProfile, null, 2)}

TRIP DATES:
${tripDates.start} to ${tripDates.end}

KNOWLEDGE BASE CONTEXT:
${knowledgeBaseContext}

REQUIREMENTS:
1. Use ONLY businesses and experiences mentioned in the knowledge base context
2. Space out winery visits (max 3-4 per day with breaks)
3. Include meal recommendations that complement the day's activities
4. Add insider tips from the knowledge base
5. Note which activities require reservations
6. Provide alternatives in case first choices are unavailable
7. Match the pace to their stated preference: ${visitorProfile.pacePreference}
${visitorProfile.specialOccasion ? `8. Highlight experiences for their ${visitorProfile.specialOccasion}` : ''}

RESPOND IN JSON:
{
  "summary": "Brief overview of the itinerary",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "theme": "Day theme",
      "activities": [
        {
          "time": "10:00 AM",
          "type": "winery|restaurant|activity",
          "name": "Business name",
          "description": "Why this was recommended",
          "insiderTip": "Special knowledge",
          "reservationRequired": true|false
        }
      ],
      "meals": {
        "breakfast": "suggestion",
        "lunch": "suggestion", 
        "dinner": "suggestion"
      },
      "notes": "Day-specific tips"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.log('Itinerary generated', { days: parsed.days?.length });
        return {
          itinerary: parsed,
          summary: parsed.summary || 'Your personalized Walla Walla Valley itinerary',
        };
      }

      throw new Error('Failed to parse itinerary response');
    } catch (error: unknown) {
      this.handleError(error, 'generateItinerary');
      throw error;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if Gemini API is configured and accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const model = this.getChatModel();
      const result = await model.generateContent('Say "OK" if you can hear me.');
      const text = result.response.text();

      return {
        healthy: text.toLowerCase().includes('ok'),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiServiceClass();

