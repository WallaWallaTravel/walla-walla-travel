/**
 * Invoice Line Items Type Definitions
 * Supports per-person, per-hour, per-day, and fixed rate pricing
 */

export type RateType = 'fixed' | 'per_person' | 'per_hour' | 'per_day';

export type LineItemCategory =
  | 'base_tour'
  | 'additional_guest'
  | 'add_on'
  | 'discount'
  | 'processing_fee'
  | 'tip';

export interface InvoiceLineItem {
  id: string;
  invoiceId: number;
  description: string;
  category: LineItemCategory;

  // Rate calculation
  rateType: RateType;
  unitPrice: number;
  quantity: number;
  lineTotal: number;

  // For per-person rates
  includedInBase: number;

  // Tax handling
  isTaxable: boolean;
  taxRate: number;
  taxAmount: number;

  // Display
  displayOrder: number;
  isVisible: boolean;

  // Metadata
  sourcePricingRuleId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingTemplate {
  id: number;
  name: string;
  description?: string;
  serviceType?: 'wine_tour' | 'airport_transfer' | 'custom';
  isDefault: boolean;
  isActive: boolean;

  // Base pricing
  basePrice: number;
  baseGuestsIncluded: number;

  // Per-person pricing
  perPersonRate: number;
  maxGuests: number;

  // Duration pricing
  baseHours: number;
  perHourRate: number;

  // Weekend surcharge
  weekendSurchargeType: 'fixed' | 'percentage';
  weekendSurchargeValue: number;
  appliesFriday: boolean;
  appliesSaturday: boolean;
  appliesSunday: boolean;

  // Holiday surcharge
  holidaySurchargeType: 'fixed' | 'percentage';
  holidaySurchargeValue: number;

  // Large group discount
  largeGroupThreshold: number;
  largeGroupDiscountType: 'fixed' | 'percentage';
  largeGroupDiscountValue: number;

  createdAt: string;
  updatedAt: string;
}

export interface InvoiceWithLineItems {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  invoiceType: 'deposit' | 'final';
  usesLineItems: boolean;
  pricingTemplateId?: number;

  // Calculated totals (synced from line items)
  subtotal: number;
  tipAmount: number;
  taxAmount: number;
  processingFee: number;
  processingFeeCoveredByCustomer: boolean;
  totalAmount: number;

  // Line items
  lineItems: InvoiceLineItem[];

  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sentAt?: string;
  paidAt?: string;
  dueDate?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateLineItemsRequest {
  invoiceId: number;
  templateId?: number;
  guestCount: number;
  durationHours: number;
  tourDate: string;
  includeTip?: boolean;
  tipPercentage?: number;
}

export interface PriceBreakdown {
  baseTourTotal: number;
  additionalGuestTotal: number;
  addOnTotal: number;
  discountTotal: number;
  subtotal: number;
  taxTotal: number;
  tipTotal: number;
  processingFeeTotal: number;
  grandTotal: number;
  lineItems: InvoiceLineItem[];
}

/**
 * Calculate price breakdown from line items
 */
export function calculatePriceBreakdown(lineItems: InvoiceLineItem[]): PriceBreakdown {
  const baseTourTotal = lineItems
    .filter(item => item.category === 'base_tour')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const additionalGuestTotal = lineItems
    .filter(item => item.category === 'additional_guest')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const addOnTotal = lineItems
    .filter(item => item.category === 'add_on')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const discountTotal = lineItems
    .filter(item => item.category === 'discount')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const tipTotal = lineItems
    .filter(item => item.category === 'tip')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const processingFeeTotal = lineItems
    .filter(item => item.category === 'processing_fee')
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const taxTotal = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);

  const subtotal = baseTourTotal + additionalGuestTotal + addOnTotal + discountTotal;
  const grandTotal = subtotal + taxTotal + tipTotal + processingFeeTotal;

  return {
    baseTourTotal,
    additionalGuestTotal,
    addOnTotal,
    discountTotal,
    subtotal,
    taxTotal,
    tipTotal,
    processingFeeTotal,
    grandTotal,
    lineItems,
  };
}

/**
 * Calculate per-person line item total
 */
export function calculatePerPersonTotal(
  unitPrice: number,
  totalGuests: number,
  includedInBase: number
): number {
  const additionalGuests = Math.max(0, totalGuests - includedInBase);
  return unitPrice * additionalGuests;
}

/**
 * Format line item for display
 */
export function formatLineItemDescription(item: InvoiceLineItem): string {
  switch (item.rateType) {
    case 'per_person': {
      const additional = Math.max(0, item.quantity - item.includedInBase);
      if (additional === 0) return item.description;
      return `${item.description} (${additional} additional @ $${item.unitPrice.toFixed(2)}/person)`;
    }
    case 'per_hour':
      return `${item.description} (${item.quantity} hours @ $${item.unitPrice.toFixed(2)}/hr)`;
    case 'per_day':
      return `${item.description} (${item.quantity} days @ $${item.unitPrice.toFixed(2)}/day)`;
    default:
      return item.description;
  }
}

/**
 * Create a new line item with calculated totals
 */
export function createLineItem(
  params: Omit<InvoiceLineItem, 'id' | 'lineTotal' | 'taxAmount' | 'createdAt' | 'updatedAt'>
): Omit<InvoiceLineItem, 'id' | 'createdAt' | 'updatedAt'> {
  let lineTotal: number;

  switch (params.rateType) {
    case 'per_person':
      lineTotal = calculatePerPersonTotal(params.unitPrice, params.quantity, params.includedInBase);
      break;
    case 'per_hour':
    case 'per_day':
      lineTotal = params.unitPrice * params.quantity;
      break;
    default:
      lineTotal = params.unitPrice;
  }

  const taxAmount = params.isTaxable ? lineTotal * params.taxRate : 0;

  return {
    ...params,
    lineTotal,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}
