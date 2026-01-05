/**
 * System Settings Service
 * Single source of truth for all configurable settings
 */

import { query } from '@/lib/db';

export interface SystemSetting {
  setting_key: string;
  setting_value: unknown;
  setting_type: string;
  description: string;
  updated_at: Date;
}

/**
 * Get a specific setting
 */
export async function getSetting(key: string): Promise<unknown> {
  const result = await query(
    'SELECT setting_value FROM system_settings WHERE setting_key = $1',
    [key]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].setting_value;
}

/**
 * Get all settings by type
 */
export async function getSettingsByType(type: string): Promise<SystemSetting[]> {
  const result = await query(
    'SELECT * FROM system_settings WHERE setting_type = $1 ORDER BY setting_key',
    [type]
  );
  
  return result.rows;
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<SystemSetting[]> {
  const result = await query(
    'SELECT * FROM system_settings ORDER BY setting_type, setting_key'
  );
  
  return result.rows;
}

/**
 * Update a setting
 */
export async function updateSetting(
  key: string,
  value: unknown,
  updatedBy?: number
): Promise<void> {
  await query(
    `UPDATE system_settings 
     SET setting_value = $1, updated_at = NOW(), updated_by = $2 
     WHERE setting_key = $3`,
    [JSON.stringify(value), updatedBy, key]
  );
}

/**
 * Get payment processing settings
 */
interface PaymentProcessingSettings {
  card_percentage: number;
  card_flat_fee: number;
  pass_to_customer_percentage: number;
  show_check_savings?: boolean;
}

export async function getPaymentProcessingSettings(): Promise<PaymentProcessingSettings> {
  const settings = await getSetting('payment_processing') as PaymentProcessingSettings | null;
  return settings ?? {
    card_percentage: 2.9,
    card_flat_fee: 0.30,
    pass_to_customer_percentage: 100,
    show_check_savings: true
  };
}

/**
 * Calculate payment processing fee
 */
export async function calculatePaymentFee(
  amount: number,
  paymentMethod: 'card' | 'check' | 'ach' = 'card'
): Promise<{
  baseAmount: number;
  processingFee: number;
  customerPays: number;
  total: number;
}> {
  const settings = await getPaymentProcessingSettings();
  
  if (paymentMethod === 'check') {
    return {
      baseAmount: amount,
      processingFee: 0,
      customerPays: 0,
      total: amount
    };
  }
  
  // Calculate card processing fee
  const processingFee = (amount * settings.card_percentage / 100) + settings.card_flat_fee;
  const customerPays = processingFee * (settings.pass_to_customer_percentage / 100);
  
  return {
    baseAmount: amount,
    processingFee,
    customerPays,
    total: amount + customerPays
  };
}

interface DepositRulesSettings {
  reserve_refine?: {
    '1-7': number;
    '8-14': number;
    per_vehicle_split?: boolean;
  };
}

/**
 * Get deposit amount for Reserve & Refine flow
 */
export async function getReserveRefineDeposit(partySize: number, vehicleCount: number = 1): Promise<number> {
  const settings = await getSetting('deposit_rules') as DepositRulesSettings | null;
  const rules = settings?.reserve_refine ?? { '1-7': 150, '8-14': 250 };

  // Determine deposit per vehicle
  let depositPerVehicle = 0;
  if (partySize <= 7) {
    depositPerVehicle = rules['1-7'];
  } else if (partySize <= 14) {
    depositPerVehicle = rules['8-14'];
  } else if (rules.per_vehicle_split) {
    // Split into multiple vehicles
    const guestsPerVehicle = Math.ceil(partySize / vehicleCount);
    depositPerVehicle = guestsPerVehicle <= 7 ? rules['1-7'] : rules['8-14'];
  }

  return depositPerVehicle * vehicleCount;
}

interface DayTypeSettings {
  thu_sat?: { days: number[] };
  sun_wed?: { days: number[] };
}

/**
 * Get day type for a given date
 */
export async function getDayType(date: Date): Promise<'sun_wed' | 'thu_sat'> {
  const settings = await getSetting('day_type_definitions') as DayTypeSettings | null;
  const dayOfWeek = date.getDay();

  const thuSatDays = settings?.thu_sat?.days ?? [4, 5, 6]; // Thu, Fri, Sat

  if (thuSatDays.includes(dayOfWeek)) {
    return 'thu_sat';
  }
  return 'sun_wed';
}

interface TaxSettings {
  sales_tax_rate: number;
  apply_to_transfers?: boolean;
  apply_to_services?: boolean;
}

/**
 * Get tax settings
 */
export async function getTaxSettings(): Promise<TaxSettings> {
  const settings = await getSetting('tax_settings') as TaxSettings | null;
  return settings ?? { sales_tax_rate: 0, apply_to_transfers: true, apply_to_services: true };
}

/**
 * Calculate tax
 */
export async function calculateTax(amount: number, serviceType?: string): Promise<number> {
  const settings = await getTaxSettings();

  // Check if tax applies to this service type
  if (serviceType === 'transfer' && !settings.apply_to_transfers) {
    return 0;
  }

  if (serviceType === 'service' && !settings.apply_to_services) {
    return 0;
  }

  return amount * (settings.sales_tax_rate / 100);
}

