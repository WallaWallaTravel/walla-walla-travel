/**
 * Pure utility functions for trip proposal calculations.
 */

import type { FormData, Totals } from './types';

export function calculateTotals(formData: FormData): Totals {
  // Services total (from service line items only — stops no longer carry pricing)
  let servicesTotal = 0;
  formData.inclusions.forEach(incl => {
    if (incl.pricing_type === 'per_person') {
      servicesTotal += incl.unit_price * formData.party_size;
    } else if (incl.pricing_type === 'per_day') {
      servicesTotal += incl.unit_price * incl.quantity;
    } else {
      servicesTotal += incl.unit_price;
    }
  });

  const subtotal = servicesTotal;
  const afterDiscount = subtotal - formData.discount_amount;
  const taxes = afterDiscount * (formData.tax_rate / 100);
  const gratuity = afterDiscount * (formData.gratuity_percentage / 100);
  const total = afterDiscount + taxes + gratuity;
  const deposit = total * (formData.deposit_percentage / 100);

  return {
    servicesTotal,
    subtotal,
    discount: formData.discount_amount,
    afterDiscount,
    taxes,
    gratuity,
    total,
    deposit,
    balance: total - deposit,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
