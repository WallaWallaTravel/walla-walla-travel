/**
 * Winery AI Service
 *
 * Specialized AI service for winery discovery and filter extraction.
 * Uses OpenAI GPT-4o to convert natural language queries into structured filters.
 */

import OpenAI from 'openai';
import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export interface WineryFilters {
  region?: string;
  amenities?: string[];
  wine_styles?: string[];
  max_tasting_fee?: number;
  fee_bucket?: 'free' | 'under20' | '20-40' | 'over40';
  reservation_required?: boolean;
  experience_tags?: string[];
  min_group_size?: number;
  search_query?: string;
}

export interface WineryRecommendation {
  filters: WineryFilters;
  explanation: string;
  followUpSuggestions: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface WineryMatchExplanation {
  wineryId: number;
  wineryName: string;
  matchReasons: string[];
  highlights: string[];
}

// ============================================================================
// System Prompts
// ============================================================================

const FILTER_EXTRACTION_PROMPT = `You are a helpful assistant for a Walla Walla wine country directory. Your job is to extract structured filter criteria from natural language queries about wineries.

## Available Filters

You can extract these filter types:

**region**: Walla Walla area (e.g., "Walla Walla Valley", "Downtown Walla Walla", "Southside")

**amenities**: Any of these (partial match OK):
- outdoor seating, picnic area, food available, private tastings
- tours available, wheelchair accessible, event space, club membership

**wine_styles**: Wine varietals like:
- Cabernet Sauvignon, Syrah, Merlot, Malbec, Tempranillo
- Chardonnay, Viognier, Riesling, Rosé
- Red blend, White blend, Sparkling

**fee_bucket**: One of:
- "free" (no tasting fee)
- "under20" (<$20)
- "20-40" ($20-$40)
- "over40" (>$40)

**reservation_required**: true or false

**experience_tags**: Any of these:
- intimate, boutique, family-friendly, romantic
- educational, scenic, dog-friendly, sustainable

**min_group_size**: Minimum group the winery can accommodate (extract from "can fit X people")

**search_query**: Free text search for specific winery names or keywords

## Response Format

Always respond with valid JSON in this exact format:
{
  "filters": {
    // only include filters that are explicitly or strongly implied in the query
  },
  "explanation": "Brief explanation of what you understood and what filters you applied",
  "followUpSuggestions": [
    "Suggestion for refining the search",
    "Another angle to explore"
  ],
  "confidence": "high" | "medium" | "low"
}

## Examples

Query: "Find me a dog-friendly winery with good Cab"
Response:
{
  "filters": {
    "experience_tags": ["dog-friendly"],
    "wine_styles": ["Cabernet Sauvignon"]
  },
  "explanation": "Looking for dog-friendly wineries known for Cabernet Sauvignon.",
  "followUpSuggestions": [
    "Would you prefer outdoor seating for your pup?",
    "Any particular price range for tastings?"
  ],
  "confidence": "high"
}

Query: "somewhere romantic for our anniversary, nothing too expensive"
Response:
{
  "filters": {
    "experience_tags": ["romantic"],
    "fee_bucket": "under20"
  },
  "explanation": "Searching for romantic wineries with affordable tasting fees for your anniversary celebration.",
  "followUpSuggestions": [
    "Would you like wineries with scenic views?",
    "Are you interested in private tasting experiences?"
  ],
  "confidence": "high"
}

Query: "we have a group of 15"
Response:
{
  "filters": {
    "min_group_size": 15
  },
  "explanation": "Looking for wineries that can accommodate groups of 15 or more.",
  "followUpSuggestions": [
    "Would you like wineries with event space for groups?",
    "Any wine preferences for the group?"
  ],
  "confidence": "high"
}

## Rules

1. Only include filters that are explicitly stated or strongly implied
2. Don't make assumptions beyond what's in the query
3. Use "medium" confidence when the intent is somewhat clear but could be interpreted differently
4. Use "low" confidence when the query is vague or you're guessing
5. Always provide helpful follow-up suggestions to refine the search`;

const MATCH_EXPLANATION_PROMPT = `You are a helpful wine concierge explaining why certain wineries match a visitor's criteria.

Given the original query, the filters applied, and winery data, explain why each winery is a good match.

Be concise (1-2 sentences per winery), specific, and focus on what makes each match special.

Format your response as a JSON array:
[
  {
    "wineryId": 1,
    "wineryName": "Example Winery",
    "matchReasons": ["Matches because..."],
    "highlights": ["Special feature 1", "Special feature 2"]
  }
]`;

// ============================================================================
// Service Class
// ============================================================================

class WineryAIServiceClass extends BaseService {
  protected get serviceName(): string {
    return 'WineryAIService';
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

  /**
   * Extract structured filters from a natural language query
   */
  async extractFilters(query: string): Promise<WineryRecommendation> {
    try {
      const client = this.getClient();

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: FILTER_EXTRACTION_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';

      this.log('Filter extraction completed', {
        queryLength: query.length,
        responseLength: responseText.length,
      });

      const result = JSON.parse(responseText) as WineryRecommendation;

      // Ensure required fields
      return {
        filters: result.filters || {},
        explanation: result.explanation || 'Processing your request...',
        followUpSuggestions: result.followUpSuggestions || [],
        confidence: result.confidence || 'medium',
      };
    } catch (error: unknown) {
      this.handleError(error, 'extractFilters');

      // Return fallback with search query
      return {
        filters: { search_query: query },
        explanation: 'Searching for wineries matching your request.',
        followUpSuggestions: [
          'Try being more specific about what you want',
          'Mention wine styles, amenities, or experience preferences',
        ],
        confidence: 'low',
      };
    }
  }

  /**
   * Generate explanations for why wineries match the query
   */
  async explainMatches(
    query: string,
    filters: WineryFilters,
    wineries: Array<{
      id: number;
      name: string;
      description?: string;
      wine_styles?: string[];
      features?: string[];
      experience_tags?: string[];
      tasting_fee?: number;
      region?: string;
    }>
  ): Promise<WineryMatchExplanation[]> {
    if (wineries.length === 0) {
      return [];
    }

    try {
      const client = this.getClient();

      // Prepare winery data for the prompt
      const wineryData = wineries.slice(0, 10).map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description?.slice(0, 200),
        wine_styles: w.wine_styles,
        features: w.features,
        experience_tags: w.experience_tags,
        tasting_fee: w.tasting_fee,
        region: w.region,
      }));

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for explanations (cost-effective)
        messages: [
          { role: 'system', content: MATCH_EXPLANATION_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              originalQuery: query,
              appliedFilters: filters,
              matchingWineries: wineryData,
            }),
          },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{"explanations":[]}';

      this.log('Match explanations generated', {
        wineryCount: wineries.length,
      });

      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed) ? parsed : parsed.explanations || [];
    } catch (error: unknown) {
      this.handleError(error, 'explainMatches');

      // Return basic explanations on error
      return wineries.slice(0, 10).map((w) => ({
        wineryId: w.id,
        wineryName: w.name,
        matchReasons: ['Matches your search criteria'],
        highlights: w.wine_styles?.slice(0, 2) || [],
      }));
    }
  }

  /**
   * Chat with context about winery discovery
   */
  async chat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    context?: {
      currentFilters?: WineryFilters;
      resultCount?: number;
    }
  ): Promise<{
    response: string;
    suggestedFilters?: WineryFilters;
    action?: 'search' | 'refine' | 'info';
  }> {
    try {
      const client = this.getClient();

      const systemPrompt = `You are a friendly wine country concierge for Walla Walla. Help visitors discover wineries based on their preferences.

${context?.currentFilters ? `Current search filters: ${JSON.stringify(context.currentFilters)}` : ''}
${context?.resultCount !== undefined ? `Current results: ${context.resultCount} wineries` : ''}

When helping users:
1. Be conversational and warm
2. Ask clarifying questions to understand their preferences
3. Suggest specific filters when appropriate
4. Keep responses concise (2-4 sentences)

If you think the user wants to search or refine their search, include a JSON block at the end:
\`\`\`filters
{"your": "filter suggestions"}
\`\`\`

Always end with a helpful question or suggestion.`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: message },
      ];

      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Try to extract filter suggestions
      let suggestedFilters: WineryFilters | undefined;
      const filterMatch = responseText.match(/```filters\n([\s\S]*?)\n```/);
      if (filterMatch) {
        try {
          suggestedFilters = JSON.parse(filterMatch[1]);
        } catch {
          // Ignore parse errors
        }
      }

      // Clean response text (remove filter block if present)
      const cleanResponse = responseText.replace(/```filters\n[\s\S]*?\n```/, '').trim();

      return {
        response: cleanResponse,
        suggestedFilters,
        action: suggestedFilters ? 'search' : 'info',
      };
    } catch (error: unknown) {
      this.handleError(error, 'chat');
      return {
        response: 'I apologize, but I encountered an issue. Could you rephrase your question?',
        action: 'info',
      };
    }
  }
}

// Export singleton instance
export const wineryAIService = new WineryAIServiceClass();
