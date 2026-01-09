/**
 * OpenAI Chat Service
 *
 * Handles chat interactions using OpenAI GPT-4o for the AI Knowledge Base.
 * Provides the same interface as gemini.service.ts for drop-in replacement.
 *
 * IMPORTANT: This service now uses dynamic partner data from the database.
 * The system prompt is split into:
 * - Static: AI personality, style, and rules
 * - Dynamic: Partner businesses from partner-context.service.ts
 */

import OpenAI from 'openai';
import { BaseService } from './base.service';
import { partnerContextService, PartnerContext, TripContext } from './partner-context.service';

// ============================================================================
// Types (same as gemini.service.ts for compatibility)
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

export interface TripTags {
  partySize?: number;
  dates?: string;
  occasion?: string;
  winePreferences?: string[];
  pace?: string;
  wineriesMentioned?: string[];
  hasLodgingNeeds?: boolean;
  hasTransportNeeds?: boolean;
}

// ============================================================================
// System Prompt - Static Base (personality, style, rules)
// ============================================================================

const STATIC_SYSTEM_PROMPT = `You're a local wine insider helping plan Walla Walla trips. Be warm, knowledgeable, and concise.

## YOUR STYLE
- Share one interesting detail, then ask one question
- Keep responses short (2-4 sentences max)
- Be specific about places, not generic
- Have opinions: "Honestly, if I had to pick one..."

## USING TRIP CONTEXT
When the user's message includes [Trip Context: {...}], use it to make SMART recommendations:
- **partySize**: For groups 10+, ONLY recommend wineries that list capacity for that size. Check the Max group field.
- **dates**: Only recommend businesses that are open on those dates.
- **occasion**: Match vibe to occasion using the Vibe/experience tags provided.
- **pace**: Standard = 3 wineries (optimal). Full Day = 4 wineries (for those wanting more). Never suggest 2 wineries—doesn't meet tour minimums.
- **winePreferences**: Match preferences to winery wine styles listed.

IMPORTANT: If trip context is provided, tailor your recommendations to it. Don't suggest businesses that won't work for their group size or dates.

## TOUR PLANNING KNOWLEDGE
**Ideal day:** 3 wineries is optimal—enough variety without rushing. 4 wineries for a full day experience. Never recommend just 2 wineries (doesn't meet our tour minimums).

**Grand finales (end-of-day wow factor):** Look for wineries with "views", "architecture", or "grand finale" in their experience tags.

**Picnic-friendly:** Look for wineries that mention "picnic" in features or insider tips.

**Lunch partner:** The Wine Country Store does great picnic provisions.

## PARTNER PRIORITY RULES
- **ALWAYS** recommend partner businesses first—these are our priority relationships
- Partners have detailed insider tips and stories—USE THEM in your responses
- If asked about non-partner businesses: Be neutral. Don't criticize, but don't actively recommend either.
- **If asked about Leonetti or Cayuse:** "They're legendary, but unfortunately they're not open to the public for tastings anymore."
- **NEVER recommend other tour companies.** We handle the planning and appointments.

## BOOKING ENCOURAGEMENT
Gently guide toward booking with us:
- "We handle all the appointments and logistics—takes the stress out of it"
- "We know which spots to hit when, so you're not backtracking"
- "Ready to lock in dates? We can put together a custom itinerary"

## RESPONSE FORMAT
Keep it tight:
✓ "Echolands has jaw-dropping architecture—perfect finale spot. Bold reds or something lighter?"
✗ Long paragraphs about multiple wineries at once

## USING INSIDER TIPS
When you see 💡 insider tips in the partner data, weave them naturally into your recommendations:
✓ "Pro tip: Ask for the Conjurer room at Sleight of Hand—perfect for groups!"
✓ "Locals know to visit Amavi's gazebo for the best views with your group of 12."`;

// ============================================================================
// Dynamic Section Builder
// ============================================================================

/**
 * Build the full system prompt with dynamic partner data
 */
function buildSystemPrompt(partnerContext?: PartnerContext, tripContext?: TripContext): string {
  let prompt = STATIC_SYSTEM_PROMPT;

  if (partnerContext) {
    // Add dynamic partner section using the service's formatter
    const partnerSection = partnerContextService.formatForAIPrompt(partnerContext, tripContext);
    prompt += '\n\n' + partnerSection;
  } else {
    // Fallback message if no partner data (should rarely happen)
    prompt += `\n\n## PARTNER BUSINESSES\n*Partner data temporarily unavailable. Provide general Walla Walla wine country guidance.*`;
  }

  return prompt;
}

// ============================================================================
// Service Class
// ============================================================================

class OpenAIChatServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'OpenAIChatService';
  }

  private client: OpenAI | null = null;

  /**
   * Get or create OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  // ============================================================================
  // Chat Methods
  // ============================================================================

  /**
   * Send a chat message and get a response
   * Interface matches gemini.service.ts for compatibility
   *
   * @param message - User's message
   * @param history - Conversation history
   * @param context - Trip state AND partner context (from database)
   */
  async chat(
    message: string,
    history: ChatMessage[] = [],
    context?: {
      visitorProfile?: Record<string, unknown>;
      tripState?: Record<string, unknown>;
      partnerContext?: PartnerContext; // NEW: Real data from database
    }
  ): Promise<ChatResponse> {
    try {
      const client = this.getClient();

      // Build dynamic system prompt with real partner data
      const systemPrompt = buildSystemPrompt(
        context?.partnerContext,
        context?.tripState as TripContext | undefined
      );

      // Build messages array for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      for (const msg of history) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }

      // Add context if available
      let enrichedMessage = message;
      if (context?.visitorProfile || context?.tripState) {
        enrichedMessage = this.enrichMessageWithContext(message, context);
      }

      // Add current message
      messages.push({ role: 'user', content: enrichedMessage });

      // Call OpenAI API
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      this.log('Chat response generated', {
        messageLength: message.length,
        responseLength: responseText.length,
        model: 'gpt-4o',
      });

      return {
        text: responseText,
        // OpenAI doesn't have native grounding, but we pass KB context in the message
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

      // Build a human-readable trip context summary
      const tripDetails: string[] = [];
      if (state.partySize) tripDetails.push(`${state.partySize} guests`);
      if (state.dates) tripDetails.push(`visiting ${state.dates}`);
      if (state.occasion) tripDetails.push(`${state.occasion} trip`);
      if (state.pace) tripDetails.push(`${state.pace} pace`);
      if (state.winePreferences && Array.isArray(state.winePreferences) && state.winePreferences.length > 0) {
        tripDetails.push(`prefers: ${state.winePreferences.join(', ')}`);
      }

      if (tripDetails.length > 0) {
        contextParts.push(`[Trip Context: ${tripDetails.join(', ')}]`);
      }

      // Legacy support for selections/dates format
      if (state.selections && Array.isArray(state.selections) && state.selections.length > 0) {
        contextParts.push(`[Trip Basket: ${JSON.stringify(state.selections)}]`);
      }
    }

    if (contextParts.length > 0) {
      return `${contextParts.join(' ')}\n\nUser message: ${message}`;
    }

    return message;
  }

  // ============================================================================
  // Tag Extraction
  // ============================================================================

  /**
   * Extract trip planning tags from conversation
   */
  async extractTags(history: ChatMessage[]): Promise<TripTags> {
    try {
      const client = this.getClient();

      // Build conversation summary for analysis
      const conversationText = history
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for efficiency
        messages: [
          {
            role: 'system',
            content: `Analyze this wine tour planning conversation and extract trip details. Return ONLY a JSON object with these fields (omit fields if not mentioned):
- partySize: number of guests (integer)
- dates: trip dates or timeframe (string like "March 15-17" or "next weekend")
- occasion: special event (string like "anniversary", "birthday", "corporate retreat")
- winePreferences: array of wine style preferences (["bold reds", "whites", "sparkling"])
- pace: trip pace (string: "relaxed", "moderate", "packed")
- wineriesMentioned: array of winery names discussed (only include actual winery names)
- hasLodgingNeeds: boolean if they need lodging help
- hasTransportNeeds: boolean if they need transportation

Return valid JSON only, no explanation.`,
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';

      // Parse JSON response
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const tags = JSON.parse(cleanJson) as TripTags;

      this.log('Tags extracted', { tagCount: Object.keys(tags).length });

      return tags;
    } catch (error: unknown) {
      this.handleError(error, 'extractTags');
      // Return empty tags on error (don't break chat)
      return {};
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if OpenAI API is configured and accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "OK" if you can hear me.' }],
        max_tokens: 10,
      });

      const text = completion.choices[0]?.message?.content || '';
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
export const openaiChatService = new OpenAIChatServiceClass();
