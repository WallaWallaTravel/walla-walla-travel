/**
 * Trip AI Service
 *
 * @module lib/services/trip-ai.service
 * @description Handles AI-powered features for trip planning:
 * - Contextual chat that knows the trip details
 * - Smart stop suggestions based on itinerary state
 * - Action parsing from AI responses
 *
 * Built on top of partnerContextService for partner data.
 */

import { BaseService } from './base.service';
import { partnerContextService, TripContext } from './partner-context.service';
import {
  Trip,
  TripStop,
  StopType,
  TripChatMessage,
  TripAIAction,
  StopSuggestion,
} from '@/lib/types/trip-planner';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Local types for chat functionality
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Types (only service-specific response types)
// ============================================================================

// Re-export types for API routes that import from this service
export type { TripChatMessage, TripAIAction, StopSuggestion };

export interface SuggestionsResponse {
  suggestions: StopSuggestion[];
  insights?: string;
  proactiveTip?: string;
}

export interface TripChatResponse {
  message: string;
  actions?: TripAIAction[];
  refreshSuggestions?: boolean;
}

// ============================================================================
// Trip Context Builder
// ============================================================================

/**
 * Build a human-readable trip context for the AI system prompt
 */
function buildTripContextPrompt(trip: Trip): string {
  const parts: string[] = [];

  // Basic trip info
  parts.push(`TRIP: "${trip.title}"`);
  parts.push(`TYPE: ${trip.trip_type.replace('_', ' ')}`);
  parts.push(`GROUP SIZE: ${trip.expected_guests} guests`);

  // Dates
  if (trip.start_date) {
    const start = new Date(trip.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (trip.end_date && trip.end_date !== trip.start_date) {
      const end = new Date(trip.end_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      parts.push(`DATES: ${start} to ${end}`);
    } else {
      parts.push(`DATE: ${start}`);
    }
  } else if (trip.dates_flexible) {
    parts.push(`DATES: Flexible (not yet set)`);
  }

  // Preferences
  if (trip.preferences) {
    const prefs: string[] = [];
    if (trip.preferences.pace) prefs.push(`${trip.preferences.pace} pace`);
    if (trip.preferences.budget) prefs.push(`${trip.preferences.budget} budget`);
    if (trip.preferences.transportation === 'need_driver') prefs.push('needs driver');
    if (trip.preferences.transportation === 'self_drive') prefs.push('self-driving');
    if (prefs.length > 0) {
      parts.push(`PREFERENCES: ${prefs.join(', ')}`);
    }
  }

  // Current itinerary
  if (trip.stops.length > 0) {
    parts.push('\nCURRENT ITINERARY:');
    const stopsByDay: Record<number, TripStop[]> = {};
    trip.stops.forEach((stop) => {
      if (!stopsByDay[stop.day_number]) stopsByDay[stop.day_number] = [];
      stopsByDay[stop.day_number].push(stop);
    });

    Object.keys(stopsByDay)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((day) => {
        parts.push(`  Day ${day}:`);
        stopsByDay[day]
          .sort((a, b) => a.stop_order - b.stop_order)
          .forEach((stop) => {
            const time = stop.planned_arrival || '';
            const icon = getStopTypeIcon(stop.stop_type);
            parts.push(`    ${icon} ${stop.name}${time ? ` (${time})` : ''}`);
          });
      });
  } else {
    parts.push('\nCURRENT ITINERARY: Empty (no stops added yet)');
  }

  // Guests with dietary info
  const guestsWithDietary = trip.guests.filter((g) => g.dietary_restrictions);
  if (guestsWithDietary.length > 0) {
    parts.push('\nDIETARY RESTRICTIONS:');
    guestsWithDietary.forEach((g) => {
      parts.push(`  - ${g.name}: ${g.dietary_restrictions}`);
    });
  }

  return parts.join('\n');
}

function getStopTypeIcon(type: StopType): string {
  const icons: Record<StopType, string> = {
    winery: '🍷',
    restaurant: '🍽️',
    activity: '🎯',
    accommodation: '🏨',
    transportation: '🚐',
    custom: '📌',
  };
  return icons[type] || '📍';
}

// ============================================================================
// System Prompts
// ============================================================================

const TRIP_CHAT_SYSTEM_PROMPT = `You are an AI assistant helping plan a Walla Walla wine trip. You have access to the current trip details and can help users:
- Suggest wineries, restaurants, and activities
- Answer questions about timing and logistics
- Help optimize their itinerary

## YOUR PERSONALITY
- Warm, knowledgeable local wine insider
- Opinionated but friendly ("Honestly, Echolands is a must for architecture lovers")
- Concise but helpful (2-4 sentences per response)
- Proactive in offering suggestions

## RESPONSE GUIDELINES
1. When suggesting stops, explain WHY they fit this specific trip
2. Consider the current itinerary - don't suggest duplicates
3. For groups 8+, only suggest wineries that can accommodate large groups
4. For packed pace, suggest 4 wineries/day; for relaxed, 2-3
5. Prioritize partner wineries (marked with ★) but be natural about it

## ACTION SUGGESTIONS
When appropriate, suggest actions the user can take. Format these as:
[ACTION: add_stop | name="Winery Name" | type=winery | day=1 | reason="Perfect for bold reds"]
[ACTION: suggest_restaurant | reason="You'll need lunch between stops 2 and 3"]

Only include actions when they're genuinely helpful. Don't force them.

## PROACTIVE TIPS
Watch for these situations and offer help:
- Empty trip: Offer to suggest a starting point
- Day with 4+ stops: Warn about rushing
- No lunch spot: Suggest adding one
- Dietary restrictions + no suitable restaurant: Flag it

## WINERIES NOT OPEN TO PUBLIC
The following legendary wineries do NOT offer public tastings - never recommend them as stops:
- **Leonetti Cellar**: Iconic Walla Walla winery (est. 1977), known for exceptional Cabernet and Merlot. Membership/allocation only - no public visits.
- **Cayuse Vineyards**: Biodynamic pioneer, famous for Syrah from rocky vineyards. No public tasting room.

If asked about these wineries, briefly acknowledge their reputation but clarify they don't accept visitors. Suggest comparable alternatives that ARE open to the public.
`;

const SUGGESTIONS_SYSTEM_PROMPT = `You are helping generate smart stop suggestions for a Walla Walla wine trip.

Given the trip context and available partner businesses, suggest 2-3 stops that would fit well.

For each suggestion, provide:
1. Name of the business
2. Type (winery, restaurant, activity)
3. A brief, compelling reason why it fits THIS trip (1 sentence)
4. Recommended day number
5. Suggested arrival time if relevant

Consider:
- What's already on the itinerary (don't duplicate)
- Group size (only suggest places that can accommodate)
- Trip pace (relaxed = fewer stops, packed = more)
- Time of day (lunch spots between wineries)
- Occasion (anniversary = romantic spots, celebration = fun/festive)

## EXCLUDED WINERIES (Never suggest these)
- Leonetti Cellar - No public tastings (allocation only)
- Cayuse Vineyards - No public tasting room

These are legendary but not visitable. Never include them in suggestions.

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "Winery Name",
      "type": "winery",
      "reason": "Why this fits",
      "dayRecommendation": 1,
      "arrivalTime": "11:00 AM",
      "wineryId": 123
    }
  ],
  "insights": "Optional insight about the itinerary",
  "proactiveTip": "Optional tip if something needs attention"
}
`;

// ============================================================================
// Service Class
// ============================================================================

class TripAIService extends BaseService {
  protected get serviceName(): string {
    return 'TripAIService';
  }

  private client: GoogleGenerativeAI | null = null;

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

  // ============================================================================
  // Chat
  // ============================================================================

  /**
   * Handle a chat message in the context of a trip
   */
  async chat(
    trip: Trip,
    message: string,
    history: TripChatMessage[] = []
  ): Promise<TripChatResponse> {
    try {
      // Get partner context for AI
      const tripContext: TripContext = {
        partySize: trip.expected_guests,
        dates: trip.start_date,
        occasion: trip.trip_type,
        pace: trip.preferences?.pace,
      };
      const partnerContext = await partnerContextService.getRelevantPartners(tripContext);

      // Build the full system prompt
      const tripContextPrompt = buildTripContextPrompt(trip);
      const partnerSection = partnerContextService.formatForAIPrompt(partnerContext, tripContext);

      const systemPrompt = `${TRIP_CHAT_SYSTEM_PROMPT}

## CURRENT TRIP CONTEXT
${tripContextPrompt}

${partnerSection}`;

      // Build conversation prompt with history
      let conversationPrompt = systemPrompt + '\n\n';
      for (const h of history) {
        conversationPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n\n`;
      }
      conversationPrompt += `User: ${message}\n\nAssistant:`;

      // Call Gemini
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const result = await model.generateContent(conversationPrompt);
      const response = result.response;
      const responseText = response.text() || '';

      // Parse actions from response
      const { cleanMessage, actions } = this.parseActionsFromResponse(responseText);

      // Determine if suggestions should refresh
      const refreshSuggestions =
        actions.some((a) => a.type === 'add_stop' || a.type === 'refresh_suggestions') ||
        message.toLowerCase().includes('suggest') ||
        message.toLowerCase().includes('recommend');

      this.log('Trip chat response', {
        tripId: trip.id,
        messageLength: message.length,
        responseLength: cleanMessage.length,
        actionCount: actions.length,
      });

      return {
        message: cleanMessage,
        actions: actions.length > 0 ? actions : undefined,
        refreshSuggestions,
      };
    } catch (error) {
      this.handleError(error, 'chat');
      throw error;
    }
  }

  /**
   * Parse [ACTION: ...] tags from AI response
   */
  private parseActionsFromResponse(response: string): {
    cleanMessage: string;
    actions: TripAIAction[];
  } {
    const actions: TripAIAction[] = [];
    const actionRegex = /\[ACTION:\s*(\w+)\s*\|([^\]]+)\]/g;

    let match;
    while ((match = actionRegex.exec(response)) !== null) {
      const type = match[1] as TripAIAction['type'];
      const paramsStr = match[2];

      // Parse parameters
      const params: Record<string, string> = {};
      paramsStr.split('|').forEach((param) => {
        const [key, value] = param.split('=').map((s) => s.trim());
        if (key && value) {
          params[key] = value.replace(/^["']|["']$/g, '');
        }
      });

      const action: TripAIAction = {
        type,
        label: params.reason || params.name || 'Take action',
        data: {
          name: params.name,
          stopType: params.type as StopType,
          dayNumber: params.day ? parseInt(params.day) : undefined,
          notes: params.reason,
        },
      };

      actions.push(action);
    }

    // Remove action tags from the message
    const cleanMessage = response.replace(actionRegex, '').trim();

    return { cleanMessage, actions };
  }

  // ============================================================================
  // Suggestions
  // ============================================================================

  /**
   * Generate smart stop suggestions for a trip
   */
  async getSuggestions(
    trip: Trip,
    focusDay?: number,
    preferences?: { wineStyle?: string }
  ): Promise<SuggestionsResponse> {
    try {
      // Get partner context
      const tripContext: TripContext = {
        partySize: trip.expected_guests,
        dates: trip.start_date,
        occasion: trip.trip_type,
        pace: trip.preferences?.pace,
        winePreferences: preferences?.wineStyle ? [preferences.wineStyle] : undefined,
      };
      const partnerContext = await partnerContextService.getRelevantPartners(tripContext);

      // Build context for suggestions
      const tripContextPrompt = buildTripContextPrompt(trip);
      const partnerSection = partnerContextService.formatForAIPrompt(partnerContext, tripContext);

      const systemPrompt = `${SUGGESTIONS_SYSTEM_PROMPT}

## CURRENT TRIP
${tripContextPrompt}

${partnerSection}

${focusDay ? `Focus suggestions for Day ${focusDay}.` : ''}`;

      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${systemPrompt}\n\nGenerate smart stop suggestions for this trip. Return JSON only.`;
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text() || '{}';
      const parsed = JSON.parse(responseText);

      // Map suggestions with IDs
      const suggestions: StopSuggestion[] = (parsed.suggestions || []).map(
        (s: Omit<StopSuggestion, 'id'>, index: number) => ({
          ...s,
          id: `suggestion-${Date.now()}-${index}`,
        })
      );

      this.log('Generated suggestions', {
        tripId: trip.id,
        suggestionCount: suggestions.length,
      });

      return {
        suggestions,
        insights: parsed.insights,
        proactiveTip: parsed.proactiveTip,
      };
    } catch (error) {
      this.handleError(error, 'getSuggestions');
      // Return empty on error rather than throwing
      return { suggestions: [] };
    }
  }

  // ============================================================================
  // Proactive Tips
  // ============================================================================

  /**
   * Generate a proactive tip based on current trip state
   */
  getProactiveTip(trip: Trip): string | null {
    // No stops - offer to help start
    if (trip.stops.length === 0) {
      return "Ready to start planning? Tell me about your group and I'll suggest some great wineries.";
    }

    // Check for packed days
    const stopsByDay: Record<number, number> = {};
    trip.stops.forEach((s) => {
      stopsByDay[s.day_number] = (stopsByDay[s.day_number] || 0) + 1;
    });

    for (const [day, count] of Object.entries(stopsByDay)) {
      if (count >= 4 && trip.preferences?.pace !== 'packed') {
        return `Day ${day} has ${count} stops - that might feel rushed. Want me to suggest moving one to another day?`;
      }
    }

    // Check for dietary restrictions without suitable restaurant
    const hasRestrictions = trip.guests.some((g) => g.dietary_restrictions);
    const hasRestaurant = trip.stops.some((s) => s.stop_type === 'restaurant');
    if (hasRestrictions && !hasRestaurant) {
      return "I noticed some guests have dietary restrictions. Want me to suggest a restaurant that accommodates everyone?";
    }

    // Check if any day has no lunch break (3+ wineries, no restaurant)
    for (const [day, count] of Object.entries(stopsByDay)) {
      if (count >= 3) {
        const dayStops = trip.stops.filter((s) => s.day_number === parseInt(day));
        const hasLunch = dayStops.some((s) => s.stop_type === 'restaurant');
        if (!hasLunch) {
          return `Day ${day} looks full! Don't forget to grab lunch between tastings.`;
        }
      }
    }

    return null;
  }
}

// Export singleton
export const tripAIService = new TripAIService();
