/**
 * Pricing Service
 * 
 * Business logic for tour pricing calculations
 */

import { BaseService } from './base.service';

export interface PricingDetails {
  basePrice: number;
  gratuity: number;
  taxes: number;
  totalPrice: number;
  depositAmount: number;
  finalPaymentAmount: number;
  vehicleType: 'luxury_sedan' | 'sprinter';
}

export interface PricingInput {
  tourDate: string;
  partySize: number;
  durationHours: number;
}

export class PricingService extends BaseService {
  protected get serviceName(): string {
    return 'PricingService';
  }

  /**
   * Calculate pricing for a tour
   */
  async calculatePricing(input: PricingInput): Promise<PricingDetails> {
    this.log('Calculating pricing', input);

    const tourDate = new Date(input.tourDate);
    const dayOfWeek = tourDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Determine vehicle type based on party size
    const vehicleType = input.partySize <= 4 ? 'luxury_sedan' : 'sprinter';

    // Get pricing rule from database
    const pricingRule = await this.queryOne<{
      base_price: string;
      weekend_multiplier: string;
    }>(
      `SELECT base_price, weekend_multiplier
       FROM pricing_rules
       WHERE vehicle_type = $1
         AND duration_hours = $2
         AND is_active = true
       ORDER BY priority DESC, is_weekend DESC
       LIMIT 1`,
      [vehicleType, input.durationHours]
    );

    // Calculate base price
    let basePrice = 800; // Default fallback
    if (pricingRule) {
      basePrice = parseFloat(pricingRule.base_price);
      if (isWeekend && pricingRule.weekend_multiplier) {
        basePrice *= parseFloat(pricingRule.weekend_multiplier);
      }
    }

    // Calculate components
    const gratuity = basePrice * 0.15;
    const taxes = basePrice * 0.09;
    const totalPrice = basePrice + gratuity + taxes;
    const depositAmount = totalPrice * 0.5;
    const finalPaymentAmount = totalPrice - depositAmount;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      gratuity: Math.round(gratuity * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      depositAmount: Math.round(depositAmount * 100) / 100,
      finalPaymentAmount: Math.round(finalPaymentAmount * 100) / 100,
      vehicleType,
    };
  }

  /**
   * Calculate end time based on start time and duration
   */
  calculateEndTime(startTime: string, durationHours: number, tourDate: string): string {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const endDate = new Date(tourDate);
    endDate.setHours(startHours + durationHours, startMinutes, 0, 0);
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export const pricingService = new PricingService();




