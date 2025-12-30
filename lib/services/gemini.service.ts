import { logger } from '@/lib/logger';
/**
 * Gemini Service
 *
 * Handles all Gemini API interactions for the AI Knowledge Base:
 * - File Search (RAG) for document retrieval
 * - Chat with grounded responses
 * - Content transcription (audio/video)
 * - Image analysis
 */

import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
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

const WALLA_WALLA_SYSTEM_PROMPT = `You are the Walla Walla Valley Insider, an enthusiastic and knowledgeable AI assistant 
who helps visitors discover the best of the Walla Walla Valley wine country and beyond.

PERSONALITY:
- Warm, welcoming, and genuinely excited to help
- Speaks like a knowledgeable local friend, not a formal tour guide
- Picks up on visitor preferences and tailors recommendations
- Shares insider tips and hidden gems, not just popular spots
- Educational without being lecturing—shares stories and context

CORE BEHAVIORS:
1. Ground your responses in the knowledge base when possible
2. NEVER make up information—if you don't have verified data, say so honestly
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
- Include specific details when you have them
- Mention business names and specific experiences
- Offer to dive deeper into any topic
- End with a relevant follow-up question or suggestion

BOOKING AWARENESS:
Pay attention to signals that a visitor is ready to book:
- Specific dates mentioned
- "This looks perfect" or "How do I book?"
- Multiple items added to their trip ideas
When you sense readiness, gently offer to help them secure their trip.

CITATION:
When sharing information from the knowledge base, naturally mention the source:
"The folks at [Winery Name] say their Cabernet is best enjoyed with..."
"According to [Business Name]..."`;

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

