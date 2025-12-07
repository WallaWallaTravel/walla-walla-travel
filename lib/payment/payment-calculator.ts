/**
 * Payment Processing Calculator
 * Calculates fees and displays payment options with savings messaging
 */

import { getSetting } from '@/lib/settings/settings-service';

export interface PaymentOption {
  method: 'card' | 'check' | 'ach';
  label: string;
  icon: string;
  baseAmount: number;
  processingFee: number;
  customerPays: number;
  total: number;
  savings?: number;
  recommended?: boolean;
  description?: string;
}

/**
 * Calculate all payment options for a given amount
 */
export async function calculatePaymentOptions(baseAmount: number): Promise<PaymentOption[]> {
  const settings = await getSetting('payment_processing');
  
  // Card payment (with processing fee)
  const cardFee = (baseAmount * settings.card_percentage / 100) + settings.card_flat_fee;
  const cardCustomerPays = cardFee * (settings.pass_to_customer_percentage / 100);
  const cardTotal = baseAmount + cardCustomerPays;
  
  // Check payment (no fee)
  const checkTotal = baseAmount;
  const checkSavings = cardCustomerPays;
  
  return [
    {
      method: 'check',
      label: 'Check',
      icon: '✅',
      baseAmount,
      processingFee: 0,
      customerPays: 0,
      total: checkTotal,
      savings: checkSavings,
      recommended: true,
      description: settings.show_check_savings 
        ? `Save $${checkSavings.toFixed(2)} in processing fees!`
        : undefined
    },
    {
      method: 'card',
      label: 'Credit Card',
      icon: '💳',
      baseAmount,
      processingFee: cardFee,
      customerPays: cardCustomerPays,
      total: cardTotal,
      description: cardCustomerPays > 0 
        ? `Includes $${cardCustomerPays.toFixed(2)} processing fee`
        : undefined
    }
  ];
}

/**
 * Calculate just the card processing fee
 */
export async function calculateCardFee(amount: number): Promise<{
  processingFee: number;
  customerPays: number;
  total: number;
}> {
  const settings = await getSetting('payment_processing');
  
  const processingFee = (amount * settings.card_percentage / 100) + settings.card_flat_fee;
  const customerPays = processingFee * (settings.pass_to_customer_percentage / 100);
  
  return {
    processingFee,
    customerPays,
    total: amount + customerPays
  };
}

/**
 * Format payment option for display
 */
export function formatPaymentOption(option: PaymentOption): string {
  let text = `${option.icon} ${option.label}\n`;
  text += `Total: $${option.total.toFixed(2)}`;
  
  if (option.savings && option.savings > 0) {
    text += `\n💰 Save $${option.savings.toFixed(2)}!`;
  } else if (option.customerPays > 0) {
    text += `\n(includes $${option.customerPays.toFixed(2)} processing fee)`;
  }
  
  return text;
}

/**
 * Get recommended payment method
 */
export function getRecommendedPayment(options: PaymentOption[]): PaymentOption {
  return options.find(o => o.recommended) || options[0];
}

