/**
 * Competitor AI Service
 *
 * @module lib/services/competitor-ai.service
 * @description AI-powered competitor analysis using Claude to:
 * - Assess threat levels of detected changes
 * - Generate strategic recommendations
 * - Identify differentiation opportunities
 * - Provide market positioning insights
 */

import { BaseService } from './base.service';
import { competitorMonitoringService } from './competitor-monitoring.service';
import Anthropic from '@anthropic-ai/sdk';
import type {
  CompetitorChange,
  Competitor,
  ThreatLevel,
  CompetitorSwot,
} from '@/types/competitors';

// ============================================================================
// Types
// ============================================================================

export interface AIChangeAnalysis {
  threatLevel: ThreatLevel;
  summary: string;
  strategicImplications: string;
  recommendedActions: string[];
  differentiationOpportunities: string[];
}

export interface AICompetitorAnalysis {
  overallThreat: ThreatLevel;
  competitivePosition: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  recommendedCounterStrategies: string[];
  opportunities: string[];
}

export interface AIMarketAnalysis {
  marketPosition: string;
  competitiveLandscape: string;
  pricingInsights: string;
  differentiationStrategy: string;
  priorityActions: string[];
}

// ============================================================================
// System Prompts
// ============================================================================

const CHANGE_ANALYSIS_SYSTEM_PROMPT = `You are a strategic business analyst for a premium wine tour company (NW Touring & Concierge) in Walla Walla, Washington. You analyze competitor changes to provide actionable strategic recommendations.

## OUR BUSINESS CONTEXT
- Premium wine tour operator with local expertise
- Owner-operated with deep winery relationships
- All-inclusive transparent pricing (no hidden fees)
- Full FMCSA compliance (USDOT 3603851)
- Premium vehicles, flexible customization
- Target market: visitors seeking authentic, high-quality wine country experiences

## YOUR ANALYSIS APPROACH
1. Assess the threat level objectively based on potential customer impact
2. Consider how this change affects our competitive position
3. Provide specific, actionable recommendations
4. Identify any opportunities this change creates for us
5. Be honest about risks but don't overreact to minor changes

## THREAT LEVEL DEFINITIONS
- HIGH: Could significantly impact our bookings (major price drops, new compelling offerings)
- MEDIUM: Notable but manageable (moderate price changes, new promotions)
- LOW: Minor competitive noise (small content updates, minor changes)
- NONE: No threat (changes that don't affect our market)
- OPPORTUNITY: Actually benefits us (competitor mistakes, market gaps they're creating)

## RESPONSE FORMAT
Provide analysis as JSON with this structure:
{
  "threatLevel": "high|medium|low|none|opportunity",
  "summary": "One sentence summary of the change impact",
  "strategicImplications": "What this means for our business",
  "recommendedActions": ["Action 1", "Action 2", ...],
  "differentiationOpportunities": ["Opportunity 1", ...]
}`;

const COMPETITOR_ANALYSIS_SYSTEM_PROMPT = `You are a strategic business analyst conducting a comprehensive competitor analysis for NW Touring & Concierge, a premium wine tour operator in Walla Walla, Washington.

## OUR COMPETITIVE ADVANTAGES
- Local owner with deep winery relationships
- All-inclusive pricing (vs competitors who add 20% fuel/gratuity)
- Full regulatory compliance (USDOT 3603851)
- Flexible customization for each tour
- Premium vehicle quality

## ANALYSIS GUIDELINES
1. Be objective about competitor strengths - acknowledge when they excel
2. Identify realistic opportunities, not wishful thinking
3. Recommendations should be specific and actionable
4. Consider the local market context (small wine region, word-of-mouth important)

## RESPONSE FORMAT
Provide analysis as JSON:
{
  "overallThreat": "high|medium|low",
  "competitivePosition": "Summary of their market position",
  "keyStrengths": ["Strength 1", ...],
  "keyWeaknesses": ["Weakness 1", ...],
  "recommendedCounterStrategies": ["Strategy 1", ...],
  "opportunities": ["Opportunity 1", ...]
}`;

// ============================================================================
// Service Class
// ============================================================================

class CompetitorAIService extends BaseService {
  protected get serviceName(): string {
    return 'CompetitorAIService';
  }

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Analyze a detected competitor change and provide strategic recommendations
   */
  async analyzeChange(change: CompetitorChange, competitor: Competitor): Promise<AIChangeAnalysis> {
    const client = this.getClient();

    const prompt = `Analyze this competitor change and provide strategic recommendations:

COMPETITOR: ${competitor.name}
COMPETITOR TYPE: ${competitor.competitor_type}
PRIORITY LEVEL: ${competitor.priority_level}
PRICING MODEL: ${competitor.pricing_model || 'Unknown'}

CHANGE DETECTED:
- Type: ${change.change_type}
- Significance: ${change.significance}
- Description: ${change.description}
${change.previous_value ? `- Previous Value: ${change.previous_value}` : ''}
${change.new_value ? `- New Value: ${change.new_value}` : ''}
${change.source_url ? `- Source URL: ${change.source_url}` : ''}

Provide your analysis as JSON.`;

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.3,
        system: CHANGE_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]) as AIChangeAnalysis;

      // Update the change record with AI analysis
      await this.updateChangeWithAnalysis(change.id, analysis);

      return analysis;
    } catch (error) {
      this.handleError(error, 'analyzeChange');
      // Return a fallback analysis
      return {
        threatLevel: change.significance === 'high' ? 'medium' : 'low',
        summary: 'AI analysis unavailable',
        strategicImplications: 'Manual review recommended',
        recommendedActions: ['Review the change manually', 'Consult with team'],
        differentiationOpportunities: [],
      };
    }
  }

  /**
   * Perform comprehensive analysis of a competitor
   */
  async analyzeCompetitor(competitorId: number): Promise<AICompetitorAnalysis> {
    const client = this.getClient();

    // Fetch competitor details
    const detail = await competitorMonitoringService.getCompetitorDetail(competitorId);
    if (!detail) {
      throw new Error('Competitor not found');
    }

    const { competitor, pricing, swot, recentChanges } = detail;

    // Format SWOT for prompt
    const swotSummary = this.formatSwotForPrompt(swot);

    const prompt = `Provide a comprehensive competitive analysis:

COMPETITOR: ${competitor.name}
WEBSITE: ${competitor.website_url}
TYPE: ${competitor.competitor_type}
PRIORITY: ${competitor.priority_level}
PRICING MODEL: ${competitor.pricing_model || 'Unknown'}
MINIMUM BOOKING: ${competitor.min_booking || 'Unknown'}
VEHICLES: ${competitor.vehicle_types?.join(', ') || 'Unknown'}

KNOWN PRICING:
${pricing.map((p) => `- ${p.pricing_name}: $${p.price_amount || '?'}/${p.price_unit || 'unit'} ${p.price_notes ? `(${p.price_notes})` : ''}`).join('\n')}

EXISTING SWOT ANALYSIS:
${swotSummary}

RECENT CHANGES (Last 30 days):
${recentChanges.slice(0, 5).map((c) => `- [${c.change_type}] ${c.title}: ${c.description}`).join('\n') || 'None detected'}

Provide your analysis as JSON.`;

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        system: COMPETITOR_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as AICompetitorAnalysis;
    } catch (error) {
      this.handleError(error, 'analyzeCompetitor');
      throw error;
    }
  }

  /**
   * Analyze overall market position across all competitors
   */
  async analyzeMarketPosition(): Promise<AIMarketAnalysis> {
    const client = this.getClient();

    // Fetch all competitors and pricing
    const competitors = await competitorMonitoringService.getCompetitors({ activeOnly: true });
    const comparison = await competitorMonitoringService.getPriceComparison();

    const competitorSummary = competitors
      .filter((c) => c.competitor_type === 'tour_operator')
      .map((c) => `- ${c.name} (${c.priority_level} priority): ${c.pricing_model || 'unknown model'}`)
      .join('\n');

    const pricingSummary = comparison
      .map((c) => {
        const basePrice = c.pricing.find((p) => p.type === 'hourly_rate' || p.type === 'per_person');
        return `- ${c.competitor_name}: ${basePrice ? `$${basePrice.amount}/${basePrice.unit}` : 'Unknown pricing'}`;
      })
      .join('\n');

    const prompt = `Analyze our market position in the Walla Walla wine tour market:

OUR BUSINESS: NW Touring & Concierge
- Premium wine tour operator
- Local owner with deep winery relationships
- All-inclusive pricing: $125/hour (private), $150/hour (group)
- Full regulatory compliance
- Flexible customization

COMPETITORS IN MARKET:
${competitorSummary}

PRICING LANDSCAPE:
${pricingSummary}

Analyze our market position and provide strategic recommendations as JSON:
{
  "marketPosition": "Our current position in the market",
  "competitiveLandscape": "Overview of competitive dynamics",
  "pricingInsights": "Analysis of pricing position",
  "differentiationStrategy": "How we should differentiate",
  "priorityActions": ["Action 1", "Action 2", ...]
}`;

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        system: `You are a strategic marketing analyst for wine tour businesses. Provide objective, data-driven market analysis with actionable recommendations.`,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as AIMarketAnalysis;
    } catch (error) {
      this.handleError(error, 'analyzeMarketPosition');
      throw error;
    }
  }

  /**
   * Generate SWOT suggestions for a competitor based on available data
   */
  async generateSwotSuggestions(competitorId: number): Promise<{
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  }> {
    const client = this.getClient();

    const competitor = await competitorMonitoringService.getCompetitorById(competitorId);
    if (!competitor) {
      throw new Error('Competitor not found');
    }

    const pricing = await competitorMonitoringService.getCompetitorPricing(competitorId);

    const prompt = `Based on this competitor information, suggest SWOT analysis items:

COMPETITOR: ${competitor.name}
WEBSITE: ${competitor.website_url}
DESCRIPTION: ${competitor.description || 'None provided'}
PRICING MODEL: ${competitor.pricing_model || 'Unknown'}
MINIMUM: ${competitor.min_booking || 'Unknown'}
VEHICLES: ${competitor.vehicle_types?.join(', ') || 'Unknown'}

KNOWN PRICING:
${pricing.map((p) => `- ${p.pricing_name}: $${p.price_amount}/${p.price_unit}`).join('\n') || 'No pricing data'}

Provide suggestions as JSON:
{
  "strengths": ["Potential strength 1", ...],
  "weaknesses": ["Potential weakness 1", ...],
  "opportunities": ["Opportunity for us 1", ...],
  "threats": ["Threat to us 1", ...]
}`;

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.5,
        system: `You are analyzing competitors for NW Touring & Concierge, a premium wine tour operator. Suggest realistic SWOT items based on available information. Be specific and actionable.`,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleError(error, 'generateSwotSuggestions');
      throw error;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async updateChangeWithAnalysis(changeId: number, analysis: AIChangeAnalysis): Promise<void> {
    await this.query(
      `UPDATE competitor_changes
       SET threat_level = $1,
           ai_analysis = $2,
           strategic_implications = $3,
           recommended_actions = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        analysis.threatLevel,
        analysis.summary,
        analysis.strategicImplications,
        JSON.stringify(analysis.recommendedActions),
        changeId,
      ]
    );
  }

  private formatSwotForPrompt(swot: CompetitorSwot[]): string {
    const grouped = {
      strengths: swot.filter((s) => s.category === 'strength'),
      weaknesses: swot.filter((s) => s.category === 'weakness'),
      opportunities: swot.filter((s) => s.category === 'opportunity'),
      threats: swot.filter((s) => s.category === 'threat'),
    };

    let result = '';

    if (grouped.strengths.length > 0) {
      result += `Strengths:\n${grouped.strengths.map((s) => `- ${s.title}`).join('\n')}\n\n`;
    }
    if (grouped.weaknesses.length > 0) {
      result += `Weaknesses:\n${grouped.weaknesses.map((s) => `- ${s.title}`).join('\n')}\n\n`;
    }
    if (grouped.opportunities.length > 0) {
      result += `Opportunities:\n${grouped.opportunities.map((s) => `- ${s.title}`).join('\n')}\n\n`;
    }
    if (grouped.threats.length > 0) {
      result += `Threats:\n${grouped.threats.map((s) => `- ${s.title}`).join('\n')}\n\n`;
    }

    return result || 'No existing SWOT items';
  }
}

// Export singleton instance
export const competitorAIService = new CompetitorAIService();
