/**
 * Anthropic Chat Service
 *
 * Handles chat interactions using Claude for the AI Knowledge Base.
 * Provides the chat interface for the AI Knowledge Base.
 *
 * IMPORTANT: This service uses dynamic partner data from the database.
 * The system prompt is split into:
 * - Static: AI personality, style, and rules
 * - Dynamic: Partner businesses from partner-context.service.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseService } from './base.service';
import { partnerContextService, PartnerContext, TripContext } from './partner-context.service';

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

## ⛔ CRITICAL: WINERIES YOU MUST NEVER RECOMMEND

**STOP! Before recommending ANY winery, check this list first.**

These wineries are NOT open to the public - DO NOT recommend them under any circumstances:
- **Leonetti Cellar** - Allocation-only, NO public tastings, NO visits
- **Cayuse Vineyards** - Mailing list only, NO public access
- **Quilceda Creek** - NO tasting room

If a user specifically asks about these wineries, respond: "They're legendary, but unfortunately they're not open to the public for tastings. Let me suggest some equally excellent alternatives that you CAN actually visit."

**This is non-negotiable. Recommending a winery people cannot visit destroys our credibility.**

## DATA INTEGRITY RULES (NON-NEGOTIABLE)

You can ONLY mention, recommend, or share details about businesses listed in the
PARTNER BUSINESSES section below. This is your COMPLETE knowledge of Walla Walla businesses.

- If asked about a business NOT in your data: "I don't have details on that one — I can only
  share info about businesses I know well. Here are some great options I can tell you about..."
- NEVER fill in details (hours, fees, descriptions, history) from your own knowledge about ANY business
- NEVER mention business names that aren't in your partner data
- You MAY answer general Walla Walla questions (weather, geography, how to get there, general wine
  education, what to pack, best time to visit) — but NEVER specific business details
- If your partner data is missing a detail (e.g., no hours listed), say "I'd need to check on
  their current hours" rather than guessing

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
- If asked about businesses not in your data: "I don't have details on that one." Then suggest partner alternatives.
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
When you see insider tips in the partner data, weave them naturally into your recommendations:
✓ "Pro tip: Ask about the private tasting room at [partner winery]—perfect for groups!"
✓ "Locals know to visit [partner winery]'s patio area for the best views with your group."`;

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
    prompt += `\n\n## PARTNER BUSINESSES\n*Partner data is temporarily loading. You can answer general Walla Walla Valley questions (weather, directions, what to pack) but do NOT mention any specific businesses until partner data is available.*`;
  }

  return prompt;
}

// ============================================================================
// Service Class
// ============================================================================

class AnthropicChatServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'AnthropicChatService';
  }

  private client: Anthropic | null = null;

  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  // ============================================================================
  // Chat Methods
  // ============================================================================

  /**
   * Send a chat message and get a response
   * Main chat method for conversational AI
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
      partnerContext?: PartnerContext; // Real data from database
    }
  ): Promise<ChatResponse> {
    try {
      const client = this.getClient();

      // Build dynamic system prompt with real partner data
      const systemPrompt = buildSystemPrompt(
        context?.partnerContext,
        context?.tripState as TripContext | undefined
      );

      // Build messages array for Anthropic
      const messages: Anthropic.MessageParam[] = [];

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

      // Call Anthropic API
      const completion = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages,
        max_tokens: 2048,
      });

      // Extract text from response
      const responseText = completion.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      this.log('Chat response generated', {
        messageLength: message.length,
        responseLength: responseText.length,
        model: 'claude-sonnet-4-20250514',
      });

      return {
        text: responseText,
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

      const completion = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        system: `Analyze this wine tour planning conversation and extract trip details. Return ONLY a JSON object with these fields (omit fields if not mentioned):
- partySize: number of guests (integer)
- dates: trip dates or timeframe (string like "March 15-17" or "next weekend")
- occasion: special event (string like "anniversary", "birthday", "corporate retreat")
- winePreferences: array of wine style preferences (["bold reds", "whites", "sparkling"])
- pace: trip pace (string: "relaxed", "moderate", "packed")
- wineriesMentioned: array of winery names discussed (only include actual winery names)
- hasLodgingNeeds: boolean if they need lodging help
- hasTransportNeeds: boolean if they need transportation

Return valid JSON only, no explanation.`,
        messages: [
          {
            role: 'user',
            content: conversationText,
          },
        ],
        max_tokens: 500,
      });

      // Extract text from response
      const responseText = completion.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

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
   * Check if Anthropic API is configured and accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const completion = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Say "OK" if you can hear me.' }],
        max_tokens: 10,
      });

      const text = completion.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

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
export const anthropicChatService = new AnthropicChatServiceClass();
