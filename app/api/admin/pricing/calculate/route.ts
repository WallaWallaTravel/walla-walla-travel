/**
 * Admin Pricing Calculate API
 *
 * POST /api/admin/pricing/calculate
 *
 * Calculates pricing for a booking using the real hourly rate card.
 * Supports custom discounts and multi-vehicle bookings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { z } from 'zod';
import { calculatePrice } from '@/lib/pricing-engine';
import { getRates } from '@/lib/rate-config';

const CalculatePricingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_hours: z.number().min(1).max(12),
  party_size: z.number().min(1).max(50),
  vehicle_ids: z.array(z.number()).optional(),
  custom_discount: z.number().min(0).max(100).optional(),
});

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();
  const parsed = CalculatePricingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, duration_hours, party_size, custom_discount } = parsed.data;
    const rates = getRates();

    // Calculate pricing using real hourly rate card
    const pricing = calculatePrice({
      date,
      duration_hours,
      party_size,
    });

    // Apply custom discount if provided
    const discountAmount = custom_discount
      ? (pricing.subtotal * custom_discount) / 100
      : 0;

    const finalSubtotal = pricing.subtotal - discountAmount;
    const finalTaxes = finalSubtotal * rates.tax_rate;
    const finalTotal = finalSubtotal + finalTaxes;
    const deposit = finalTotal * rates.deposit_percentage;

    // Build breakdown for the console display
    const breakdown = [];

    // Hourly rate line
    const hoursLabel = pricing.billable_hours > duration_hours
      ? `${duration_hours}hr requested, ${pricing.billable_hours}hr min`
      : `${pricing.billable_hours}hr`;

    breakdown.push({
      label: `Wine Tour — ${pricing.rate_tier}, ${pricing.day_type} ($${pricing.hourly_rate}/hr × ${hoursLabel})`,
      amount: pricing.subtotal,
      key: 'base',
    });

    // Custom discount
    if (discountAmount > 0) {
      breakdown.push({
        label: `Staff Discount (${custom_discount}%)`,
        amount: -discountAmount,
        key: 'custom_discount',
        editable: true,
      });
    }

    // Subtotal
    breakdown.push({
      label: 'Subtotal',
      amount: finalSubtotal,
      key: 'subtotal',
    });

    // Taxes
    breakdown.push({
      label: 'WA State Tax (9.1%)',
      amount: finalTaxes,
      key: 'tax',
    });

    return NextResponse.json({
      success: true,
      data: {
        breakdown,
        subtotal: finalSubtotal,
        taxes: finalTaxes,
        total: finalTotal,
        deposit,
        // Extra info for the console
        hourly_rate: pricing.hourly_rate,
        billable_hours: pricing.billable_hours,
        day_type: pricing.day_type,
        rate_tier: pricing.rate_tier,
        minimum_hours: pricing.minimum_hours,
      },
    });
});
