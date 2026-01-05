// Context Builder
// Builds rich context for AI from database

import { Pool } from 'pg'
import { searchBusinesses, formatBusinessForAI } from '@/lib/business-portal/business-knowledge'
import { logger } from '@/lib/logger'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export interface WineryInfo {
  id: number
  name: string
  description: string | null
  features: string[]
  location: string | null
}

export interface TourInfo {
  id: number
  name: string
  description: string | null
  duration_hours: number
  price: number
  max_guests: number
}

export interface BusinessContext {
  wineries: WineryInfo[]
  tours: TourInfo[]
  policies: {
    pickupAvailable: boolean
    minAge: number
    cancellationPolicy: string
  }
}

/**
 * Get winery information for AI context
 */
export async function getWineryContext(): Promise<WineryInfo[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, description, location
      FROM wineries
      WHERE active = true
      ORDER BY name
      LIMIT 20
    `)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      features: [],
      location: row.location
    }))
  } catch (error) {
    logger.warn('Context Builder: Wineries table not available', { error })
    return []
  }
}

/**
 * Get tour information for AI context
 */
export async function getTourContext(): Promise<TourInfo[]> {
  try {
    const result = await pool.query(`
      SELECT id, name, description, duration_hours, base_price, max_passengers
      FROM tours
      WHERE active = true
      ORDER BY name
      LIMIT 10
    `)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      duration_hours: row.duration_hours || 4,
      price: parseFloat(row.base_price) || 0,
      max_guests: row.max_passengers || 14
    }))
  } catch (error) {
    logger.warn('Context Builder: Tours table not available', { error })
    return []
  }
}

/**
 * Build complete business context
 */
export async function buildBusinessContext(): Promise<BusinessContext> {
  const [wineries, tours] = await Promise.all([
    getWineryContext(),
    getTourContext()
  ])

  return {
    wineries,
    tours,
    policies: {
      pickupAvailable: true,
      minAge: 21,
      cancellationPolicy: '24 hours notice required for full refund'
    }
  }
}

/**
 * Format context for AI system prompt
 */
export function formatContextForPrompt(context: BusinessContext): string {
  let prompt = ''

  // Wineries
  if (context.wineries.length > 0) {
    prompt += '\n\n## Available Wineries:\n'
    context.wineries.forEach(w => {
      prompt += `\n**${w.name}**`
      if (w.description) {
        prompt += `\n${w.description}`
      }
      if (w.location) {
        prompt += `\nLocation: ${w.location}`
      }
      prompt += '\n'
    })
  }

  // Tours
  if (context.tours.length > 0) {
    prompt += '\n\n## Available Tours:\n'
    context.tours.forEach(t => {
      prompt += `\n**${t.name}** - $${t.price} per person`
      if (t.description) {
        prompt += `\n${t.description}`
      }
      prompt += `\nDuration: ${t.duration_hours} hours`
      prompt += `\nMax guests: ${t.max_guests} people\n`
    })
  }

  // Policies
  prompt += '\n\n## Policies:\n'
  prompt += `- Minimum age: ${context.policies.minAge}+\n`
  prompt += `- Hotel pickup: ${context.policies.pickupAvailable ? 'Yes, complimentary within Walla Walla' : 'No'}\n`
  prompt += `- Cancellation: ${context.policies.cancellationPolicy}\n`

  return prompt
}

/**
 * Get Business Portal knowledge for AI context
 */
export async function getBusinessPortalContext(): Promise<string> {
  try {
    // Get all approved businesses from Business Portal
    const businesses = await searchBusinesses({});
    
    if (businesses.length === 0) {
      return '';
    }
    
    let context = '\n\n## Curated Business Directory:\n';
    context += '(These businesses have been personally vetted and reviewed by our tour operators)\n\n';
    
    businesses.slice(0, 20).forEach(business => {
      context += formatBusinessForAI(business);
      context += '\n---\n\n';
    });
    
    return context;
  } catch (error) {
    logger.warn('Context Builder: Business Portal not available', { error });
    return '';
  }
}

/**
 * Get pricing guidance for AI responses
 */
interface PricingDisplaySettings {
  consultation_required_under?: number;
  per_person_ranges_over?: number;
}

export async function getPricingGuidanceContext(): Promise<string> {
  try {
    const { getSetting } = await import('@/lib/settings/settings-service');
    const settings = await getSetting('pricing_display') as PricingDisplaySettings | null;

    if (!settings) {
      return '';
    }

    const consultationUnder = settings.consultation_required_under || 4;
    const perPersonOver = settings.per_person_ranges_over || 6;
    
    let guidance = '\n\n## CRITICAL: Pricing Response Guidelines\n\n';
    
    guidance += `**IMPORTANT:** How you quote pricing MUST vary based on group size:\n\n`;
    
    guidance += `### For groups of 1-${consultationUnder - 1} guests:\n`;
    guidance += `- DO NOT quote specific prices\n`;
    guidance += `- Pricing is too variable for small groups\n`;
    guidance += `- Instead say: "For smaller groups, pricing varies based on your preferences and timing. I recommend talking to Ryan directly - he'll design something perfect for your needs. You can schedule a consultation here: [Link to /book path: 'talk']"\n`;
    guidance += `- Direct them to the "Let's Talk First" booking flow\n\n`;
    
    guidance += `### For groups of ${consultationUnder}-${perPersonOver - 1} guests:\n`;
    guidance += `- You CAN quote total pricing\n`;
    guidance += `- Use conservative ranges with 10-15% buffer\n`;
    guidance += `- Example: "For ${consultationUnder} guests, a full-day tour typically runs $650-$850 depending on duration and wineries"\n`;
    guidance += `- Include tax in your quote (8.9%)\n`;
    guidance += `- Direct them to "Reserve & Customize" booking flow\n\n`;
    
    guidance += `### For groups of ${perPersonOver}+ guests:\n`;
    guidance += `- Use PER-PERSON pricing for clarity\n`;
    guidance += `- Conservative ranges (15-20% buffer)\n`;
    guidance += `- Example: "For ${perPersonOver} guests, pricing typically runs $110-$135 per person for a full-day wine country experience"\n`;
    guidance += `- Always mention this includes transportation and a great itinerary\n`;
    guidance += `- Include tax in per-person quote\n`;
    guidance += `- Direct them to "Reserve & Customize" booking flow\n\n`;
    
    guidance += `**General Rules:**\n`;
    guidance += `- NEVER give exact prices - always use ranges\n`;
    guidance += `- ALWAYS be conservative (quote high)\n`;
    guidance += `- ALWAYS include context (what's included, flexibility, etc.)\n`;
    guidance += `- NEVER promise specific wineries without consulting Ryan\n`;
    guidance += `- If unsure, default to "Let's Talk First" flow\n`;
    
    return guidance;
  } catch (error) {
    logger.warn('Context Builder: Could not load pricing guidance', { error });
    return '';
  }
}

/**
 * Build full system prompt with context
 */
export async function buildSystemPromptWithContext(basePrompt: string): Promise<string> {
  const [context, businessPortalContext, pricingGuidance] = await Promise.all([
    buildBusinessContext(),
    getBusinessPortalContext(),
    getPricingGuidanceContext()
  ]);
  
  const contextStr = formatContextForPrompt(context);
  
  return `${basePrompt}${contextStr}${businessPortalContext}${pricingGuidance}`;
}

