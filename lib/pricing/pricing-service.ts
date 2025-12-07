/**
 * Dynamic Pricing Service
 * Central pricing logic that queries database for rates and applies modifiers
 */

import { query } from '@/lib/db';

export interface PricingTier {
  id: number;
  service_type: string;
  tier_name: string;
  description: string;
  party_size_min: number;
  party_size_max: number;
  day_type: string;
  season: string;
  pricing_model: string;
  base_rate: number;
  hourly_rate: number;
  per_person_rate: number;
  per_mile_rate: number;
  minimum_charge: number;
  active: boolean;
  priority: number;
  notes: string;
}

export interface PricingModifier {
  id: number;
  name: string;
  description: string;
  modifier_type: string;
  value_type: string;
  value: number;
  priority: number;
  is_stackable: boolean;
}

export interface PriceCalculation {
  baseRate: number;
  tierUsed: PricingTier;
  modifiers: Array<{
    name: string;
    type: string;
    value: number;
    amount: number;
  }>;
  subtotal: number;
  totalModifierAmount: number;
  finalPrice: number;
  breakdown: string[];
  cacheKey?: string;
}

/**
 * Get pricing tier for given parameters
 */
export async function getPricingTier(params: {
  serviceType: string;
  partySize: number;
  date: Date;
}): Promise<PricingTier | null> {
  const { serviceType, partySize, date } = params;
  
  // Determine day type - handle multiple naming conventions
  const dayOfWeek = date.getDay();
  const isThuSat = dayOfWeek >= 4 && dayOfWeek <= 6; // Thursday, Friday, Saturday
  
  // Support both naming conventions: 'sun_wed'/'thu_sat' and 'weekday'/'weekend'
  const dayTypes = isThuSat 
    ? ['thu_sat', 'weekend', 'any'] 
    : ['sun_wed', 'weekday', 'any'];
  
  // Query for matching tier with multiple day type options
  const result = await query(`
    SELECT * FROM pricing_tiers
    WHERE service_type = $1
      AND party_size_min <= $2
      AND party_size_max >= $2
      AND (day_type = ANY($3) OR day_type IS NULL)
      AND active = true
      AND (effective_start_date IS NULL OR effective_start_date <= $4)
      AND (effective_end_date IS NULL OR effective_end_date >= $4)
    ORDER BY priority DESC, party_size_min DESC
    LIMIT 1
  `, [serviceType, partySize, dayTypes, date]);
  
  if (result.rows.length === 0) {
    // Fallback: try any matching tier regardless of day type
    const fallbackResult = await query(`
      SELECT * FROM pricing_tiers
      WHERE service_type = $1
        AND party_size_min <= $2
        AND party_size_max >= $2
        AND active = true
      ORDER BY priority DESC, party_size_min DESC
      LIMIT 1
    `, [serviceType, partySize]);
    
    return fallbackResult.rows[0] || null;
  }
  
  return result.rows[0];
}

/**
 * Get applicable modifiers for given parameters
 */
export async function getApplicableModifiers(params: {
  serviceType: string;
  partySize: number;
  date: Date;
  bookingAmount: number;
  advanceDays: number;
}): Promise<PricingModifier[]> {
  const { serviceType, partySize, date, bookingAmount, advanceDays } = params;
  const dayOfWeek = date.getDay();
  
  // Day of week column names
  const dayColumns = [
    'applies_sunday', 'applies_monday', 'applies_tuesday', 
    'applies_wednesday', 'applies_thursday', 'applies_friday', 'applies_saturday'
  ];
  const dayColumn = dayColumns[dayOfWeek];
  
  const result = await query(`
    SELECT * FROM pricing_modifiers
    WHERE active = true
      AND (applies_to_service_types IS NULL OR $1 = ANY(applies_to_service_types))
      AND (min_party_size IS NULL OR min_party_size <= $2)
      AND (max_party_size IS NULL OR max_party_size >= $2)
      AND (min_advance_days IS NULL OR min_advance_days <= $3)
      AND (min_booking_amount IS NULL OR min_booking_amount <= $4)
      AND (effective_start_date IS NULL OR effective_start_date <= $5)
      AND (effective_end_date IS NULL OR effective_end_date >= $5)
      AND ${dayColumn} = true
    ORDER BY priority DESC
  `, [serviceType, partySize, advanceDays, bookingAmount, date]);
  
  return result.rows;
}

/**
 * Calculate price for wine tour
 */
export async function calculateWineTourPrice(params: {
  partySize: number;
  durationHours: number;
  date: Date;
  applyModifiers?: boolean;
  advanceDays?: number;
}): Promise<PriceCalculation> {
  const { partySize, durationHours, date, applyModifiers = true, advanceDays = 0 } = params;
  
  // Get base tier
  const tier = await getPricingTier({
    serviceType: 'wine_tour',
    partySize,
    date
  });
  
  if (!tier) {
    throw new Error(`No pricing tier found for wine tour: ${partySize} guests`);
  }
  
  // Calculate base price
  const baseRate = tier.hourly_rate * durationHours;
  let finalPrice = baseRate;
  const breakdown: string[] = [
    `Base: ${tier.tier_name} at $${tier.hourly_rate}/hr × ${durationHours} hours = $${baseRate.toFixed(2)}`
  ];
  const appliedModifiers: Array<{name: string; type: string; value: number; amount: number}> = [];
  let totalModifierAmount = 0;
  
  // Apply modifiers if requested
  if (applyModifiers) {
    const modifiers = await getApplicableModifiers({
      serviceType: 'wine_tour',
      partySize,
      date,
      bookingAmount: baseRate,
      advanceDays
    });
    
    for (const modifier of modifiers) {
      let modifierAmount = 0;
      
      if (modifier.value_type === 'percentage') {
        modifierAmount = finalPrice * (modifier.value / 100);
      } else {
        modifierAmount = modifier.value;
      }
      
      // Apply modifier
      if (modifier.modifier_type === 'discount' || modifier.modifier_type === 'early_bird' || modifier.modifier_type === 'volume') {
        modifierAmount = -Math.abs(modifierAmount);
      } else {
        modifierAmount = Math.abs(modifierAmount);
      }
      
      appliedModifiers.push({
        name: modifier.name,
        type: modifier.modifier_type,
        value: modifier.value,
        amount: modifierAmount
      });
      
      totalModifierAmount += modifierAmount;
      
      if (!modifier.is_stackable) {
        break; // Don't apply more modifiers
      }
      
      if (modifier.is_stackable) {
        finalPrice += modifierAmount;
      }
    }
    
    if (appliedModifiers.length > 0) {
      appliedModifiers.forEach(mod => {
        breakdown.push(`${mod.name}: ${mod.amount >= 0 ? '+' : ''}$${mod.amount.toFixed(2)}`);
      });
    }
  }
  
  finalPrice = Math.max(finalPrice, tier.minimum_charge || 0);
  
  return {
    baseRate,
    tierUsed: tier,
    modifiers: appliedModifiers,
    subtotal: baseRate,
    totalModifierAmount,
    finalPrice,
    breakdown
  };
}

/**
 * Calculate price for transfer
 */
export async function calculateTransferPrice(params: {
  transferType: string;
  partySize: number;
  date: Date;
  applyModifiers?: boolean;
}): Promise<PriceCalculation> {
  const { transferType, partySize, date, applyModifiers = false } = params;
  
  // Get base tier - match by tier_name containing the transfer type
  const result = await query(`
    SELECT * FROM pricing_tiers
    WHERE service_type = 'airport_transfer'
      AND LOWER(tier_name) LIKE LOWER($1)
      AND party_size_min <= $2
      AND party_size_max >= $2
      AND active = true
    ORDER BY priority DESC
    LIMIT 1
  `, [`%${transferType}%`, partySize]);
  
  const tier = result.rows[0];
  
  if (!tier) {
    throw new Error(`No pricing tier found for transfer: ${transferType}`);
  }
  
  const baseRate = tier.base_rate;
  const finalPrice = baseRate;
  
  return {
    baseRate,
    tierUsed: tier,
    modifiers: [],
    subtotal: baseRate,
    totalModifierAmount: 0,
    finalPrice,
    breakdown: [
      `${tier.tier_name}: $${baseRate.toFixed(2)}`,
      tier.notes || 'Base rate - adjust for party size as needed'
    ]
  };
}

/**
 * Calculate price for wait time
 */
export async function calculateWaitTimePrice(params: {
  hours: number;
  partySize: number;
  date: Date;
}): Promise<PriceCalculation> {
  const { hours, partySize, date } = params;
  
  const tier = await getPricingTier({
    serviceType: 'wait_time',
    partySize,
    date
  });
  
  if (!tier) {
    throw new Error('No pricing tier found for wait time');
  }
  
  const baseRate = tier.hourly_rate * hours;
  
  return {
    baseRate,
    tierUsed: tier,
    modifiers: [],
    subtotal: baseRate,
    totalModifierAmount: 0,
    finalPrice: baseRate,
    breakdown: [
      `Wait Time: $${tier.hourly_rate}/hr × ${hours} hours = $${baseRate.toFixed(2)}`
    ]
  };
}

/**
 * Get all pricing tiers (for admin UI)
 */
export async function getAllPricingTiers(serviceType?: string): Promise<PricingTier[]> {
  const result = await query(
    serviceType
      ? 'SELECT * FROM pricing_tiers WHERE service_type = $1 ORDER BY service_type, party_size_min, day_type'
      : 'SELECT * FROM pricing_tiers ORDER BY service_type, party_size_min, day_type',
    serviceType ? [serviceType] : []
  );
  
  return result.rows;
}

/**
 * Get all pricing modifiers (for admin UI)
 */
export async function getAllPricingModifiers(): Promise<PricingModifier[]> {
  const result = await query(
    'SELECT * FROM pricing_modifiers ORDER BY priority DESC, name'
  );
  
  return result.rows;
}

/**
 * Update pricing tier
 */
export async function updatePricingTier(
  id: number,
  updates: Partial<PricingTier>,
  changedBy: number,
  changeReason: string
): Promise<void> {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
  
  await query(
    `UPDATE pricing_tiers SET ${setClause}, updated_at = NOW() WHERE id = $1`,
    [id, ...values]
  );
  
  // Log change
  await query(
    `INSERT INTO pricing_history (table_name, record_id, action, change_reason, changed_by)
     VALUES ('pricing_tiers', $1, 'updated', $2, $3)`,
    [id, changeReason, changedBy]
  );
}

/**
 * Create pricing tier
 */
export async function createPricingTier(
  tier: Omit<PricingTier, 'id'>,
  createdBy: number
): Promise<number> {
  const result = await query(`
    INSERT INTO pricing_tiers (
      service_type, tier_name, description,
      party_size_min, party_size_max, day_type, season,
      pricing_model, base_rate, hourly_rate, per_person_rate, per_mile_rate, minimum_charge,
      active, priority, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id
  `, [
    tier.service_type, tier.tier_name, tier.description,
    tier.party_size_min, tier.party_size_max, tier.day_type, tier.season,
    tier.pricing_model, tier.base_rate, tier.hourly_rate, tier.per_person_rate, tier.per_mile_rate, tier.minimum_charge,
    tier.active, tier.priority, tier.notes, createdBy
  ]);
  
  return result.rows[0].id;
}

