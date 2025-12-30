import { logger } from '@/lib/logger';
/**
 * Invoice Line Item Service
 * Handles creating and managing line-item based invoices
 *
 * Supports three actual Walla Walla Travel pricing models:
 * 1. Hourly Tours - tiered by guest count + day of week
 * 2. Fixed Rate Private Tours - negotiated flat rate
 * 3. Shared Group Tours - per-person ticketed
 */

import {
  InvoiceLineItem,
  PricingTemplate,
  GenerateLineItemsRequest,
  PriceBreakdown,
  calculatePriceBreakdown,
  createLineItem,
  LineItemCategory,
  RateType,
} from '@/lib/types/invoice-line-items';

import {
  calculateHourlyTourPrice,
  calculateSharedTourPrice,
  calculateFixedTourPrice,
  getHourlyTourRate,
  formatDayType,
  formatPrice,
  DayType,
  HourlyTourPriceResult,
  SharedTourPriceResult,
  FixedTourPriceResult,
  InvoiceLineItemCategory,
} from '@/lib/types/pricing-models';

const DEFAULT_TAX_RATE = 0.089; // WA state tax

/**
 * Generate line items for an invoice based on a pricing template
 */
export function generateLineItems(params: {
  template: PricingTemplate;
  guestCount: number;
  durationHours: number;
  tourDate: Date;
  includeTip?: boolean;
  tipPercentage?: number;
  includeProcessingFee?: boolean;
  processingFeePercentage?: number;
  processingFeeFlatRate?: number;
}): Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] {
  const {
    template,
    guestCount,
    durationHours,
    tourDate,
    includeTip = false,
    tipPercentage = 20,
    includeProcessingFee = false,
    processingFeePercentage = 2.9,
    processingFeeFlatRate = 0.3,
  } = params;

  const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] = [];
  let displayOrder = 0;

  // Check for weekend
  const dayOfWeek = tourDate.getDay();
  const isWeekend =
    (dayOfWeek === 0 && template.appliesSunday) ||
    (dayOfWeek === 5 && template.appliesFriday) ||
    (dayOfWeek === 6 && template.appliesSaturday);

  // Calculate additional guests and hours
  const additionalGuests = Math.max(0, guestCount - template.baseGuestsIncluded);
  const extraHours = Math.max(0, durationHours - template.baseHours);

  // 1. Base tour price
  displayOrder++;
  lineItems.push(
    createLineItem({
      invoiceId: 0, // Will be set when saved
      description: `${template.baseHours}-Hour Wine Tour (up to ${template.baseGuestsIncluded} guests)`,
      category: 'base_tour',
      rateType: 'fixed',
      unitPrice: template.basePrice,
      quantity: 1,
      includedInBase: 0,
      isTaxable: true,
      taxRate: DEFAULT_TAX_RATE,
      displayOrder,
      isVisible: true,
      notes: 'Base tour package',
    })
  );

  // 2. Per-person rate for additional guests
  if (additionalGuests > 0 && template.perPersonRate > 0) {
    displayOrder++;
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Additional Guests (${additionalGuests} @ $${template.perPersonRate}/person)`,
        category: 'additional_guest',
        rateType: 'per_person',
        unitPrice: template.perPersonRate,
        quantity: guestCount,
        includedInBase: template.baseGuestsIncluded,
        isTaxable: true,
        taxRate: DEFAULT_TAX_RATE,
        displayOrder,
        isVisible: true,
        notes: `For guests ${template.baseGuestsIncluded + 1} through ${guestCount}`,
      })
    );
  }

  // 3. Extra hours
  if (extraHours > 0 && template.perHourRate > 0) {
    displayOrder++;
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Additional Hours (${extraHours} @ $${template.perHourRate}/hour)`,
        category: 'add_on',
        rateType: 'per_hour',
        unitPrice: template.perHourRate,
        quantity: extraHours,
        includedInBase: 0,
        isTaxable: true,
        taxRate: DEFAULT_TAX_RATE,
        displayOrder,
        isVisible: true,
        notes: `Extended tour beyond ${template.baseHours} hours`,
      })
    );
  }

  // 4. Weekend surcharge
  if (isWeekend && template.weekendSurchargeValue > 0) {
    displayOrder++;
    const surchargeAmount =
      template.weekendSurchargeType === 'percentage'
        ? template.basePrice * (template.weekendSurchargeValue / 100)
        : template.weekendSurchargeValue;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description:
          template.weekendSurchargeType === 'percentage'
            ? `Weekend Rate (+${template.weekendSurchargeValue}%)`
            : 'Weekend Rate',
        category: 'add_on',
        rateType: 'fixed',
        unitPrice: surchargeAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: true,
        taxRate: DEFAULT_TAX_RATE,
        displayOrder,
        isVisible: true,
        notes: 'Premium pricing for weekend dates',
      })
    );
  }

  // 5. Large group discount
  if (
    guestCount >= template.largeGroupThreshold &&
    template.largeGroupDiscountValue > 0
  ) {
    // Calculate subtotal for discount
    const currentSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

    displayOrder++;
    const discountAmount =
      template.largeGroupDiscountType === 'percentage'
        ? currentSubtotal * (template.largeGroupDiscountValue / 100)
        : template.largeGroupDiscountValue;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description:
          template.largeGroupDiscountType === 'percentage'
            ? `Large Group Discount (${template.largeGroupThreshold}+ guests, -${template.largeGroupDiscountValue}%)`
            : `Large Group Discount (${template.largeGroupThreshold}+ guests)`,
        category: 'discount',
        rateType: 'fixed',
        unitPrice: -discountAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false, // Discounts not taxable
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Volume discount for large parties',
      })
    );
  }

  // 6. Optional tip
  if (includeTip && tipPercentage > 0) {
    const taxableSubtotal = lineItems
      .filter((item) => item.category !== 'processing_fee')
      .reduce((sum, item) => sum + item.lineTotal, 0);

    displayOrder++;
    const tipAmount = taxableSubtotal * (tipPercentage / 100);

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Gratuity (${tipPercentage}%)`,
        category: 'tip',
        rateType: 'fixed',
        unitPrice: tipAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false, // Tips not taxable
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Driver gratuity',
      })
    );
  }

  // 7. Optional processing fee
  if (includeProcessingFee) {
    const totalBeforeFee = lineItems.reduce(
      (sum, item) => sum + item.lineTotal + item.taxAmount,
      0
    );

    displayOrder++;
    const processingFee =
      totalBeforeFee * (processingFeePercentage / 100) + processingFeeFlatRate;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: 'Credit Card Processing Fee',
        category: 'processing_fee',
        rateType: 'fixed',
        unitPrice: Math.round(processingFee * 100) / 100,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false, // Processing fees not taxable
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: `${processingFeePercentage}% + $${processingFeeFlatRate.toFixed(2)} per transaction`,
      })
    );
  }

  return lineItems;
}

/**
 * Create default pricing templates for different tour types
 */
export function getDefaultPricingTemplates(): PricingTemplate[] {
  return [
    {
      id: 1,
      name: 'Standard Wine Tour - 6 Hours',
      description: 'Full day wine tasting tour with up to 4 guests included',
      serviceType: 'wine_tour',
      isDefault: true,
      isActive: true,
      basePrice: 900,
      baseGuestsIncluded: 4,
      perPersonRate: 50,
      maxGuests: 14,
      baseHours: 6,
      perHourRate: 150,
      weekendSurchargeType: 'percentage',
      weekendSurchargeValue: 15,
      appliesFriday: true,
      appliesSaturday: true,
      appliesSunday: true,
      holidaySurchargeType: 'percentage',
      holidaySurchargeValue: 25,
      largeGroupThreshold: 10,
      largeGroupDiscountType: 'percentage',
      largeGroupDiscountValue: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Half Day Wine Tour - 4 Hours',
      description: 'Afternoon wine tasting tour with up to 4 guests included',
      serviceType: 'wine_tour',
      isDefault: false,
      isActive: true,
      basePrice: 600,
      baseGuestsIncluded: 4,
      perPersonRate: 50,
      maxGuests: 14,
      baseHours: 4,
      perHourRate: 150,
      weekendSurchargeType: 'percentage',
      weekendSurchargeValue: 15,
      appliesFriday: true,
      appliesSaturday: true,
      appliesSunday: true,
      holidaySurchargeType: 'percentage',
      holidaySurchargeValue: 25,
      largeGroupThreshold: 10,
      largeGroupDiscountType: 'percentage',
      largeGroupDiscountValue: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'Extended Wine Tour - 8 Hours',
      description: 'Full day wine experience with up to 4 guests included',
      serviceType: 'wine_tour',
      isDefault: false,
      isActive: true,
      basePrice: 1200,
      baseGuestsIncluded: 4,
      perPersonRate: 50,
      maxGuests: 14,
      baseHours: 8,
      perHourRate: 150,
      weekendSurchargeType: 'percentage',
      weekendSurchargeValue: 15,
      appliesFriday: true,
      appliesSaturday: true,
      appliesSunday: true,
      holidaySurchargeType: 'percentage',
      holidaySurchargeValue: 25,
      largeGroupThreshold: 10,
      largeGroupDiscountType: 'percentage',
      largeGroupDiscountValue: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Calculate quick price estimate for booking forms
 */
export function calculateQuickEstimate(params: {
  template: PricingTemplate;
  guestCount: number;
  durationHours: number;
  tourDate: Date;
}): {
  basePrice: number;
  additionalGuestCost: number;
  extraHoursCost: number;
  weekendSurcharge: number;
  discount: number;
  subtotal: number;
  estimatedTax: number;
  estimatedTotal: number;
} {
  const { template, guestCount, durationHours, tourDate } = params;

  const additionalGuests = Math.max(0, guestCount - template.baseGuestsIncluded);
  const extraHours = Math.max(0, durationHours - template.baseHours);

  const dayOfWeek = tourDate.getDay();
  const isWeekend =
    (dayOfWeek === 0 && template.appliesSunday) ||
    (dayOfWeek === 5 && template.appliesFriday) ||
    (dayOfWeek === 6 && template.appliesSaturday);

  const basePrice = template.basePrice;
  const additionalGuestCost = additionalGuests * template.perPersonRate;
  const extraHoursCost = extraHours * template.perHourRate;

  let weekendSurcharge = 0;
  if (isWeekend) {
    weekendSurcharge =
      template.weekendSurchargeType === 'percentage'
        ? basePrice * (template.weekendSurchargeValue / 100)
        : template.weekendSurchargeValue;
  }

  const subtotalBeforeDiscount =
    basePrice + additionalGuestCost + extraHoursCost + weekendSurcharge;

  let discount = 0;
  if (guestCount >= template.largeGroupThreshold) {
    discount =
      template.largeGroupDiscountType === 'percentage'
        ? subtotalBeforeDiscount * (template.largeGroupDiscountValue / 100)
        : template.largeGroupDiscountValue;
  }

  const subtotal = subtotalBeforeDiscount - discount;
  const estimatedTax = subtotal * DEFAULT_TAX_RATE;
  const estimatedTotal = subtotal + estimatedTax;

  return {
    basePrice,
    additionalGuestCost,
    extraHoursCost,
    weekendSurcharge,
    discount,
    subtotal,
    estimatedTax,
    estimatedTotal,
  };
}

/**
 * Format a quick price estimate for display
 */
export function formatQuickEstimate(estimate: ReturnType<typeof calculateQuickEstimate>): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(estimate.estimatedTotal)}`;
}

// ============================================================================
// ACTUAL WALLA WALLA TRAVEL PRICING MODELS
// ============================================================================

/**
 * Generate line items for an HOURLY wine tour
 * Uses tiered pricing based on guest count and day of week
 */
export function generateHourlyTourLineItems(params: {
  guestCount: number;
  hours: number;
  tourDate: Date | string;
  includeTip?: boolean;
  tipPercentage?: number;
  includeProcessingFee?: boolean;
  processingFeePercentage?: number;
  processingFeeFlatRate?: number;
}): Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] {
  const {
    guestCount,
    hours,
    tourDate,
    includeTip = false,
    tipPercentage = 20,
    includeProcessingFee = false,
    processingFeePercentage = 2.9,
    processingFeeFlatRate = 0.3,
  } = params;

  const pricing = calculateHourlyTourPrice(guestCount, hours, tourDate);
  const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] = [];
  let displayOrder = 0;

  // 1. Main tour line item
  displayOrder++;
  lineItems.push(
    createLineItem({
      invoiceId: 0,
      description: `Wine Tour - ${pricing.billableHours} hours (${pricing.tierName}, ${formatDayType(pricing.dayType)})`,
      category: 'base_tour' as LineItemCategory,
      rateType: 'per_hour' as RateType,
      unitPrice: pricing.hourlyRate,
      quantity: pricing.billableHours,
      includedInBase: 0,
      isTaxable: true,
      taxRate: DEFAULT_TAX_RATE,
      displayOrder,
      isVisible: true,
      notes: `$${pricing.hourlyRate}/hour × ${pricing.billableHours} hours`,
    })
  );

  // 2. Optional tip
  if (includeTip && tipPercentage > 0) {
    displayOrder++;
    const tipAmount = pricing.subtotal * (tipPercentage / 100);
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Gratuity (${tipPercentage}%)`,
        category: 'tip' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: tipAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Driver gratuity',
      })
    );
  }

  // 3. Optional processing fee
  if (includeProcessingFee) {
    const totalBeforeFee = lineItems.reduce(
      (sum, item) => sum + item.lineTotal + item.taxAmount,
      0
    );
    displayOrder++;
    const processingFee =
      totalBeforeFee * (processingFeePercentage / 100) + processingFeeFlatRate;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: 'Credit Card Processing Fee',
        category: 'processing_fee' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: Math.round(processingFee * 100) / 100,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: `${processingFeePercentage}% + $${processingFeeFlatRate.toFixed(2)}`,
      })
    );
  }

  return lineItems;
}

/**
 * Generate line items for a SHARED (ticketed) tour
 * Per-person pricing at $95 or $115 with lunch
 */
export function generateSharedTourLineItems(params: {
  ticketCount: number;
  includesLunch?: boolean;
  includeTip?: boolean;
  tipPercentage?: number;
  includeProcessingFee?: boolean;
  processingFeePercentage?: number;
  processingFeeFlatRate?: number;
}): Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] {
  const {
    ticketCount,
    includesLunch = true,
    includeTip = false,
    tipPercentage = 20,
    includeProcessingFee = false,
    processingFeePercentage = 2.9,
    processingFeeFlatRate = 0.3,
  } = params;

  const pricing = calculateSharedTourPrice(ticketCount, includesLunch);
  const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] = [];
  let displayOrder = 0;

  // 1. Ticket line item
  displayOrder++;
  const tourName = includesLunch ? 'Shared Wine Tour with Lunch' : 'Shared Wine Tour';
  lineItems.push(
    createLineItem({
      invoiceId: 0,
      description: `${ticketCount} × ${tourName}`,
      category: 'base_tour' as LineItemCategory,
      rateType: 'per_person' as RateType,
      unitPrice: pricing.perPersonRate,
      quantity: ticketCount,
      includedInBase: 0, // All tickets are charged
      isTaxable: true,
      taxRate: DEFAULT_TAX_RATE,
      displayOrder,
      isVisible: true,
      notes: `$${pricing.perPersonRate} per person${includesLunch ? ' (includes lunch)' : ''}`,
    })
  );

  // 2. Optional tip
  if (includeTip && tipPercentage > 0) {
    displayOrder++;
    const tipAmount = pricing.subtotal * (tipPercentage / 100);
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Gratuity (${tipPercentage}%)`,
        category: 'tip' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: tipAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Driver gratuity',
      })
    );
  }

  // 3. Optional processing fee
  if (includeProcessingFee) {
    const totalBeforeFee = lineItems.reduce(
      (sum, item) => sum + item.lineTotal + item.taxAmount,
      0
    );
    displayOrder++;
    const processingFee =
      totalBeforeFee * (processingFeePercentage / 100) + processingFeeFlatRate;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: 'Credit Card Processing Fee',
        category: 'processing_fee' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: Math.round(processingFee * 100) / 100,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: `${processingFeePercentage}% + $${processingFeeFlatRate.toFixed(2)}`,
      })
    );
  }

  return lineItems;
}

/**
 * Generate line items for a FIXED RATE private tour
 * Negotiated flat rate for couples/custom bookings
 */
export function generateFixedTourLineItems(params: {
  description: string;
  fixedAmount: number;
  includeTip?: boolean;
  tipPercentage?: number;
  includeProcessingFee?: boolean;
  processingFeePercentage?: number;
  processingFeeFlatRate?: number;
}): Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] {
  const {
    description,
    fixedAmount,
    includeTip = false,
    tipPercentage = 20,
    includeProcessingFee = false,
    processingFeePercentage = 2.9,
    processingFeeFlatRate = 0.3,
  } = params;

  const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] = [];
  let displayOrder = 0;

  // 1. Fixed rate tour line item
  displayOrder++;
  lineItems.push(
    createLineItem({
      invoiceId: 0,
      description,
      category: 'base_tour' as LineItemCategory,
      rateType: 'fixed' as RateType,
      unitPrice: fixedAmount,
      quantity: 1,
      includedInBase: 0,
      isTaxable: true,
      taxRate: DEFAULT_TAX_RATE,
      displayOrder,
      isVisible: true,
      notes: 'Private tour - negotiated rate',
    })
  );

  // 2. Optional tip
  if (includeTip && tipPercentage > 0) {
    displayOrder++;
    const tipAmount = fixedAmount * (tipPercentage / 100);
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Gratuity (${tipPercentage}%)`,
        category: 'tip' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: tipAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Driver gratuity',
      })
    );
  }

  // 3. Optional processing fee
  if (includeProcessingFee) {
    const totalBeforeFee = lineItems.reduce(
      (sum, item) => sum + item.lineTotal + item.taxAmount,
      0
    );
    displayOrder++;
    const processingFee =
      totalBeforeFee * (processingFeePercentage / 100) + processingFeeFlatRate;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: 'Credit Card Processing Fee',
        category: 'processing_fee' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: Math.round(processingFee * 100) / 100,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: `${processingFeePercentage}% + $${processingFeeFlatRate.toFixed(2)}`,
      })
    );
  }

  return lineItems;
}

/**
 * Generate line items for an airport/local transfer
 */
export function generateTransferLineItems(params: {
  routeName: string;
  fixedRate: number;
  origin?: string;
  destination?: string;
  includeTip?: boolean;
  tipPercentage?: number;
  includeProcessingFee?: boolean;
  processingFeePercentage?: number;
  processingFeeFlatRate?: number;
}): Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] {
  const {
    routeName,
    fixedRate,
    origin,
    destination,
    includeTip = false,
    tipPercentage = 20,
    includeProcessingFee = false,
    processingFeePercentage = 2.9,
    processingFeeFlatRate = 0.3,
  } = params;

  const lineItems: Omit<InvoiceLineItem, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[] = [];
  let displayOrder = 0;

  // 1. Transfer line item
  displayOrder++;
  lineItems.push(
    createLineItem({
      invoiceId: 0,
      description: routeName,
      category: 'base_tour' as LineItemCategory,
      rateType: 'fixed' as RateType,
      unitPrice: fixedRate,
      quantity: 1,
      includedInBase: 0,
      isTaxable: true,
      taxRate: DEFAULT_TAX_RATE,
      displayOrder,
      isVisible: true,
      notes: origin && destination ? `${origin} to ${destination}` : undefined,
    })
  );

  // 2. Optional tip
  if (includeTip && tipPercentage > 0) {
    displayOrder++;
    const tipAmount = fixedRate * (tipPercentage / 100);
    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: `Gratuity (${tipPercentage}%)`,
        category: 'tip' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: tipAmount,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: 'Driver gratuity',
      })
    );
  }

  // 3. Optional processing fee
  if (includeProcessingFee) {
    const totalBeforeFee = lineItems.reduce(
      (sum, item) => sum + item.lineTotal + item.taxAmount,
      0
    );
    displayOrder++;
    const processingFee =
      totalBeforeFee * (processingFeePercentage / 100) + processingFeeFlatRate;

    lineItems.push(
      createLineItem({
        invoiceId: 0,
        description: 'Credit Card Processing Fee',
        category: 'processing_fee' as LineItemCategory,
        rateType: 'fixed' as RateType,
        unitPrice: Math.round(processingFee * 100) / 100,
        quantity: 1,
        includedInBase: 0,
        isTaxable: false,
        taxRate: 0,
        displayOrder,
        isVisible: true,
        notes: `${processingFeePercentage}% + $${processingFeeFlatRate.toFixed(2)}`,
      })
    );
  }

  return lineItems;
}
