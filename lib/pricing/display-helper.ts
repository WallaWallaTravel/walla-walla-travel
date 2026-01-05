/**
 * Pricing Display Helper
 * Determines how to display pricing based on group size and settings
 */

import { getSetting } from '@/lib/settings/settings-service';

export type PricingDisplayStrategy = 
  | 'consultation_required' // Too small - custom pricing needed
  | 'standard_pricing'      // Safe to quote standard prices
  | 'per_person_ranges';    // Large enough for per-person ranges

export interface PricingDisplaySettings {
  consultation_required_under: number; // Groups ≤ this need custom pricing
  per_person_ranges_over: number;      // Groups ≥ this see per-person
  include_tax_in_display: boolean;
  conservative_ranges: boolean;
}

/**
 * Determine the pricing display strategy for a given group size
 */
export async function getPricingStrategy(partySize: number): Promise<{
  strategy: PricingDisplayStrategy;
  explanation: string;
  recommendedAction: string;
}> {
  const settings = await getSetting('pricing_display') as PricingDisplaySettings;
  
  if (!settings) {
    // Fallback defaults
    return {
      strategy: 'standard_pricing',
      explanation: 'Standard pricing applies',
      recommendedAction: 'show_quote'
    };
  }

  // Small groups - pricing too variable
  if (partySize < settings.consultation_required_under) {
    return {
      strategy: 'consultation_required',
      explanation: `Groups of ${partySize} require custom pricing - too variable to quote reliably`,
      recommendedAction: 'direct_to_consultation'
    };
  }

  // Large groups - per-person pricing more compelling
  if (partySize >= settings.per_person_ranges_over) {
    return {
      strategy: 'per_person_ranges',
      explanation: `Groups of ${partySize}+ see per-person pricing for clarity`,
      recommendedAction: 'show_per_person_range'
    };
  }

  // Middle ground - standard pricing works
  return {
    strategy: 'standard_pricing',
    explanation: `Groups of ${partySize} can use standard pricing`,
    recommendedAction: 'show_standard_quote'
  };
}

/**
 * Format a price for display based on strategy
 */
export function formatPriceForStrategy(
  strategy: PricingDisplayStrategy,
  basePrice: number,
  partySize: number,
  includeTax: boolean = true
): string {
  const taxRate = 1.089; // TODO: Get from settings
  const finalPrice = includeTax ? basePrice * taxRate : basePrice;

  switch (strategy) {
    case 'consultation_required':
      return 'Contact us for custom pricing';
    
    case 'per_person_ranges':
      const perPerson = finalPrice / partySize;
      const lowEnd = Math.floor(perPerson * 0.9); // 10% buffer
      const highEnd = Math.ceil(perPerson * 1.1);
      return `$${lowEnd}-$${highEnd}/person`;
    
    case 'standard_pricing':
      const low = Math.floor(finalPrice * 0.95);
      const high = Math.ceil(finalPrice * 1.05);
      return `$${low}-$${high}`;
  }
}

/**
 * Get booking flow recommendation based on strategy
 */
export function getRecommendedBookingFlow(strategy: PricingDisplayStrategy): {
  flow: 'quick' | 'reserve' | 'talk' | 'corporate';
  reason: string;
} {
  switch (strategy) {
    case 'consultation_required':
      return {
        flow: 'talk',
        reason: 'Small groups benefit from custom pricing discussion'
      };
    
    case 'standard_pricing':
      return {
        flow: 'reserve',
        reason: 'Perfect size for Reserve & Customize flow'
      };
    
    case 'per_person_ranges':
      return {
        flow: 'reserve',
        reason: 'Large groups work well with deposit + customization'
      };
  }
}

/**
 * Generate AI prompt guidance based on strategy
 */
export async function getAIPricingGuidance(partySize: number): Promise<string> {
  const { strategy, explanation: _explanation } = await getPricingStrategy(partySize);
  
  switch (strategy) {
    case 'consultation_required':
      return `For groups of ${partySize}, DO NOT quote specific prices. Instead say: "For smaller groups, pricing varies based on your preferences and timing. I recommend talking to Ryan directly - he'll design something perfect for your needs. [Link to consultation]"`;
    
    case 'per_person_ranges':
      return `For groups of ${partySize}, use PER-PERSON pricing ranges. Be conservative. Example: "For ${partySize} guests, pricing typically runs $110-$135 per person for a full-day wine country experience." Always mention this includes transportation.`;
    
    case 'standard_pricing':
      return `For groups of ${partySize}, you can quote TOTAL pricing with a small range for flexibility. Example: "For ${partySize} guests, a full-day tour typically runs $650-$850 depending on duration and wineries." Be conservative.`;
  }
}

