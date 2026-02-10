/**
 * Winery AI Service
 *
 * Specialized AI service for winery discovery and filter extraction.
 * Uses Google Gemini to convert natural language queries into structured filters.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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

const FILTER_EXTRACTION_PROMPT = `You are a friendly wine concierge helping visitors discover Walla Walla wineries. Extract search filters from their requests and respond conversationally.

## Available Filters

**region**: "Walla Walla Valley", "Downtown Walla Walla", "Southside", etc.

**amenities**: outdoor seating, picnic area, food available, private tastings, tours available, wheelchair accessible, event space

**wine_styles**: Cabernet Sauvignon, Syrah, Merlot, Malbec, Tempranillo, Chardonnay, Viognier, Riesling, Rosé, Red blend, White blend

**fee_bucket**: "free", "under20", "20-40", "over40"

**reservation_required**: true or false

**experience_tags**: intimate, boutique, family-friendly, romantic, educational, scenic, dog-friendly, sustainable

**min_group_size**: Number for group accommodation

**search_query**: Specific winery names or keywords

## Response Format

Return JSON:
{
  "filters": { /* extracted filters */ },
  "explanation": "Friendly 1-sentence response about what you're finding",
  "followUpSuggestions": ["Question 1?", "Question 2?"],
  "confidence": "high" | "medium" | "low"
}

## CRITICAL RULES FOR "explanation"

1. NEVER say "The query suggests..." or "The query is asking..." - this sounds robotic
2. NEVER analyze or describe what the user said - just respond helpfully
3. Write like a friendly concierge speaking directly to them
4. If you found matches, be enthusiastic: "Great choices here!" or "I found some perfect spots!"
5. If the query is vague, ask a clarifying question in a friendly way

## Examples

Query: "dog-friendly with outdoor seating"
Response:
{
  "filters": { "experience_tags": ["dog-friendly"], "amenities": ["outdoor seating"] },
  "explanation": "Perfect! Here are wineries where your pup is welcome with outdoor space to enjoy.",
  "followUpSuggestions": ["Any favorite wine styles?", "Looking for a specific area?"],
  "confidence": "high"
}

Query: "romantic for anniversary"
Response:
{
  "filters": { "experience_tags": ["romantic"] },
  "explanation": "Congratulations! Here are some beautiful spots for your celebration.",
  "followUpSuggestions": ["Would scenic views make it extra special?", "Interested in private tastings?"],
  "confidence": "high"
}

Query: "low key and scenic"
Response:
{
  "filters": { "experience_tags": ["scenic", "intimate"] },
  "explanation": "I've found some relaxed wineries with beautiful views for you.",
  "followUpSuggestions": ["Do you prefer outdoor seating?", "Any wine styles you love?"],
  "confidence": "high"
}

Query: "Would you like wineries with outdoor seating?"
Response:
{
  "filters": { "amenities": ["outdoor seating"] },
  "explanation": "Adding outdoor seating to your search - here are some great patios!",
  "followUpSuggestions": ["Any wine preferences?", "Looking for food options too?"],
  "confidence": "high"
}

Query: "Do you have a preference for any specific wine styles?"
Response:
{
  "filters": {},
  "explanation": "Walla Walla is famous for Syrah and Cabernet! What sounds good to you?",
  "followUpSuggestions": ["I love bold reds like Cabernet", "Show me Syrah specialists", "I prefer lighter wines"],
  "confidence": "medium"
}

## Rules

1. Be warm and conversational - you're a helpful local guide
2. Only include filters that are clearly implied
3. When the query is a question (like "Do you prefer..."), treat it as the user answering YES
4. Follow-up suggestions should be short, clickable options (not full sentences)
5. NEVER use academic/analytical language like "The query indicates..."`;


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
   * Extract structured filters from a natural language query
   */
  async extractFilters(query: string): Promise<WineryRecommendation> {
    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent extraction
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${FILTER_EXTRACTION_PROMPT}\n\nUser Query: ${query}`;
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text() || '{}';

      this.log('Filter extraction completed', {
        queryLength: query.length,
        responseLength: responseText.length,
      });

      const parsed = JSON.parse(responseText) as WineryRecommendation;

      // Ensure required fields
      return {
        filters: parsed.filters || {},
        explanation: parsed.explanation || 'Processing your request...',
        followUpSuggestions: parsed.followUpSuggestions || [],
        confidence: parsed.confidence || 'medium',
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
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash', // Fast and cost-effective for explanations
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      });

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

      const prompt = `${MATCH_EXPLANATION_PROMPT}\n\n${JSON.stringify({
        originalQuery: query,
        appliedFilters: filters,
        matchingWineries: wineryData,
      })}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text() || '{"explanations":[]}';

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
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const systemPrompt = `You are a friendly wine country concierge for Walla Walla. Help visitors discover wineries based on their preferences.

IMPORTANT: You can only discuss wineries and businesses from the search results shown to the user. Do not mention specific business names, hours, fees, or details from your own knowledge. If asked about a specific business not in the results, say "I don't have details on that one — try searching for it in the directory!"

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

      // Build conversation as a single prompt with history
      let conversationPrompt = systemPrompt + '\n\n';
      for (const h of history) {
        conversationPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n\n`;
      }
      conversationPrompt += `User: ${message}\n\nAssistant:`;

      const result = await model.generateContent(conversationPrompt);
      const response = result.response;
      const responseText = response.text() || '';

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
