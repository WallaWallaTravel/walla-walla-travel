/**
 * Geology AI Service
 *
 * @module lib/services/geology-ai.service
 * @description Handles AI-powered geology education features:
 * - Conversational Q&A about Walla Walla geology
 * - Makes connections between geology and wine
 * - Suggests related topics, sites, and tours
 *
 * Built on top of geologyContextService for data aggregation.
 */

import { BaseService } from './base.service';
import { geologyContextService } from './geology-context.service';
import {
  GeologyChatMessage,
  GeologyChatResponse,
  GeologyContext,
} from '@/lib/types/geology';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const GEOLOGY_CHAT_SYSTEM_PROMPT = `You are an AI geology guide for Walla Walla wine country. You help visitors understand the fascinating geological history that makes this region perfect for growing world-class wine grapes.

## YOUR PERSONALITY
- Enthusiastic but accurate - you love this subject but never sacrifice truth for excitement
- Use accessible analogies to explain complex concepts ("Imagine a wall of water 400 feet high...")
- Connect geology to wine when relevant - that's why visitors care
- Concise but thorough (2-4 sentences typically, expand when asked)
- Humble about limitations ("The exact timeline is debated, but most geologists agree...")

## CORE KNOWLEDGE AREAS
1. **Ice Age Floods (Missoula Floods)** - THE defining geological event
2. **Basalt Formations** - Ancient lava flows that form the bedrock
3. **Loess Deposits** - Wind-blown silt that creates unique topsoil
4. **Caliche** - Calcium carbonate layers that affect drainage
5. **Terroir Connections** - How geology influences grape character

## RESPONSE GUIDELINES
1. When explaining, start with the "so what" - why this matters for wine
2. Use specific numbers when available ("40+ flood events over 2,000 years")
3. Reference physical sites visitors can see in person
4. Suggest tours for visitors who want hands-on learning
5. Acknowledge scientific uncertainty where it exists

## WINE CONNECTIONS
Help visitors understand how geology affects the wines they're tasting:
- Basalt-derived soils → mineral-driven wines, structure
- Well-drained loess → stressed vines, concentrated flavors
- Flood sediments → diverse soil profiles within small areas
- South-facing slopes → sun exposure, ripening conditions

## TOUR RECOMMENDATIONS
When visitors show deep interest, suggest geology tours:
- "If you'd like to see these formations up close..."
- "Our geology tours visit actual flood deposit sites..."
- "Nothing beats standing on a basalt outcrop to understand this..."

## ACCURACY REQUIREMENTS
- Never invent dates, numbers, or facts
- If unsure, say so: "I'd need to verify that specific detail"
- Cite sources when available in your knowledge base
- Don't oversimplify to the point of inaccuracy

## TOPIC SUGGESTIONS
When the conversation naturally leads to related topics, suggest them:
[TOPIC: slug-name | "Title" | "Why this relates to your question"]

## SITE SUGGESTIONS
When relevant, suggest physical locations:
[SITE: slug-name | "Name" | "What you can see here"]

## TOUR SUGGESTIONS
When visitors want deeper exploration:
[TOUR: slug-name | "Tour Name" | "Why this tour fits your interests"]
`;

// ============================================================================
// Service Class
// ============================================================================

class GeologyAIService extends BaseService {
  protected get serviceName(): string {
    return 'GeologyAIService';
  }

  private client: Anthropic | null = null;

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
  // Chat
  // ============================================================================

  /**
   * Handle a chat message about geology
   */
  async chat(
    message: string,
    history: GeologyChatMessage[] = [],
    contextTopicId?: number
  ): Promise<GeologyChatResponse> {
    try {
      // Get full geology context
      const geologyContext = await geologyContextService.getFullContext();

      // Build the full system prompt
      const contextPrompt = geologyContextService.formatForAIPrompt(geologyContext);

      // If on a specific topic page, add focused context
      let topicContext = '';
      if (contextTopicId) {
        topicContext = await geologyContextService.getTopicContext(contextTopicId);
      }

      const systemPrompt = `${GEOLOGY_CHAT_SYSTEM_PROMPT}

${contextPrompt}

${topicContext ? `\n## CURRENT PAGE CONTEXT\n${topicContext}` : ''}`;

      // Convert history to Anthropic message format
      const chatHistory: Anthropic.MessageParam[] = history.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      // Call Anthropic
      const client = this.getClient();
      const messages: Anthropic.MessageParam[] = [
        ...chatHistory,
        { role: 'user', content: message },
      ];

      const completion = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages,
        max_tokens: 1024,
      });

      // Extract text from response
      const responseText = completion.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Parse suggestions from response
      const { cleanMessage, suggestedTopics, suggestedSites, suggestedTours } =
        this.parseSuggestionsFromResponse(responseText, geologyContext);

      this.log('Geology chat response', {
        messageLength: message.length,
        responseLength: cleanMessage.length,
        suggestedTopics: suggestedTopics.length,
        suggestedSites: suggestedSites.length,
        suggestedTours: suggestedTours.length,
      });

      return {
        message: cleanMessage,
        suggestedTopics: suggestedTopics.length > 0 ? suggestedTopics : undefined,
        suggestedSites: suggestedSites.length > 0 ? suggestedSites : undefined,
        suggestedTours: suggestedTours.length > 0 ? suggestedTours : undefined,
      };
    } catch (error) {
      this.handleError(error, 'chat');
      throw error;
    }
  }

  /**
   * Parse [TOPIC:], [SITE:], [TOUR:] tags from AI response
   */
  private parseSuggestionsFromResponse(
    response: string,
    context: GeologyContext
  ): {
    cleanMessage: string;
    suggestedTopics: Array<{ id: number; slug: string; title: string; reason: string }>;
    suggestedSites: Array<{ id: number; slug: string; name: string; reason: string }>;
    suggestedTours: Array<{ id: number; slug: string; name: string; reason: string }>;
  } {
    const suggestedTopics: Array<{ id: number; slug: string; title: string; reason: string }> = [];
    const suggestedSites: Array<{ id: number; slug: string; name: string; reason: string }> = [];
    const suggestedTours: Array<{ id: number; slug: string; name: string; reason: string }> = [];

    // Parse [TOPIC: slug | "Title" | "reason"]
    const topicRegex = /\[TOPIC:\s*([^\|]+)\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    let match;
    while ((match = topicRegex.exec(response)) !== null) {
      const slug = match[1].trim();
      const title = match[2];
      const reason = match[3];

      // Find the topic in context
      const topic = context.topics.find((t) => t.slug === slug);
      if (topic) {
        suggestedTopics.push({
          id: topic.id,
          slug: topic.slug,
          title: title || topic.title,
          reason,
        });
      }
    }

    // Parse [SITE: slug | "Name" | "reason"]
    const siteRegex = /\[SITE:\s*([^\|]+)\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    while ((match = siteRegex.exec(response)) !== null) {
      const slug = match[1].trim();
      const name = match[2];
      const reason = match[3];

      const site = context.sites.find((s) => s.slug === slug);
      if (site) {
        suggestedSites.push({
          id: site.id,
          slug: site.slug,
          name: name || site.name,
          reason,
        });
      }
    }

    // Parse [TOUR: slug | "Name" | "reason"]
    const tourRegex = /\[TOUR:\s*([^\|]+)\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"\]/g;
    while ((match = tourRegex.exec(response)) !== null) {
      const slug = match[1].trim();
      const name = match[2];
      const reason = match[3];

      const tour = context.tours.find((t) => t.slug === slug);
      if (tour) {
        suggestedTours.push({
          id: tour.id,
          slug: tour.slug,
          name: name || tour.name,
          reason,
        });
      }
    }

    // Remove suggestion tags from the message
    let cleanMessage = response
      .replace(topicRegex, '')
      .replace(siteRegex, '')
      .replace(tourRegex, '')
      .trim();

    // Clean up any double spaces or newlines
    cleanMessage = cleanMessage.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ');

    return { cleanMessage, suggestedTopics, suggestedSites, suggestedTours };
  }

  // ============================================================================
  // Chat Session Management
  // ============================================================================

  /**
   * Save a chat message to the database
   */
  async saveChatMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    contextTopicId?: number,
    contextSiteId?: number,
    ipHash?: string
  ): Promise<void> {
    try {
      await this.insert('geology_chat_messages', {
        session_id: sessionId,
        role,
        content,
        context_topic_id: contextTopicId,
        context_site_id: contextSiteId,
        ip_hash: ipHash,
      });
    } catch (error) {
      this.handleError(error, 'saveChatMessage');
      // Don't throw - saving chat history shouldn't break the chat
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string, limit: number = 20): Promise<GeologyChatMessage[]> {
    try {
      const rows = await this.queryMany<{
        id: number;
        role: 'user' | 'assistant';
        content: string;
        created_at: string;
        context_topic_id: number | null;
        context_site_id: number | null;
      }>(
        `SELECT id, role, content, created_at, context_topic_id, context_site_id
         FROM geology_chat_messages
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [sessionId, limit]
      );

      // Reverse to get chronological order and format
      return rows.reverse().map((row) => ({
        id: String(row.id),
        role: row.role,
        content: row.content,
        timestamp: row.created_at,
        context: row.context_topic_id || row.context_site_id
          ? {
              topicId: row.context_topic_id ?? undefined,
              siteId: row.context_site_id ?? undefined,
            }
          : undefined,
      }));
    } catch (error) {
      this.handleError(error, 'getChatHistory');
      return [];
    }
  }

  // ============================================================================
  // Quick Answers (for common questions)
  // ============================================================================

  /**
   * Get a quick fact for display
   */
  async getRandomFact(): Promise<string | null> {
    try {
      const facts = await geologyContextService.getFeaturedFacts();
      if (facts.length === 0) return null;

      const randomIndex = Math.floor(Math.random() * facts.length);
      return facts[randomIndex].fact_text;
    } catch (error) {
      this.handleError(error, 'getRandomFact');
      return null;
    }
  }

  /**
   * Get conversation starters
   */
  getConversationStarters(): string[] {
    return [
      "What makes Walla Walla's geology unique?",
      'How do the Ice Age floods affect wine today?',
      "What's the connection between basalt and wine flavor?",
      'Where can I see geological formations in person?',
      'Why do different vineyards produce such different wines?',
    ];
  }
}

// Export singleton
export const geologyAIService = new GeologyAIService();
