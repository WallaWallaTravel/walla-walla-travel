/**
 * Admin Pricing Calculate API
 *
 * POST /api/admin/pricing/calculate
 *
 * Calculates pricing for a booking, with support for:
 * - Multi-vehicle bookings (large groups)
 * - Custom discounts
 * - Line item overrides
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculatePrice } from '@/lib/pricing-engine';
import { pool } from '@/lib/db';

const CalculatePricingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_hours: z.number().min(4).max(12),
  party_size: z.number().min(1).max(50),
  vehicle_ids: z.array(z.number()).optional(),
  custom_discount: z.number().min(0).max(100).optional(),
});

interface Vehicle {
  id: number;
  make: string;
  model: string;
  capacity: number;
  vehicle_type: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CalculatePricingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, duration_hours, party_size, vehicle_ids, custom_discount } = parsed.data;

    // If specific vehicles selected, calculate per-vehicle pricing
    const vehiclePricing: { vehicle: Vehicle; pricing: ReturnType<typeof calculatePrice> }[] = [];
    let totalFromVehicles = 0;

    if (vehicle_ids && vehicle_ids.length > 0) {
      // Get vehicle details
      const vehiclesResult = await pool.query<Vehicle>(
        `SELECT id, make, model, capacity, vehicle_type
         FROM vehicles
         WHERE id = ANY($1)`,
        [vehicle_ids]
      );

      // Calculate price for each vehicle based on its capacity portion
      for (const vehicle of vehiclesResult.rows) {
        // Determine how many guests this vehicle will carry
        const vehicleGuests = Math.min(vehicle.capacity, party_size);

        const pricing = calculatePrice({
          date,
          duration_hours,
          party_size: vehicleGuests,
          vehicle_type: vehicle.vehicle_type,
        });

        vehiclePricing.push({ vehicle, pricing });
        totalFromVehicles += pricing.total;
      }
    }

    // Calculate standard pricing for comparison/single vehicle
    const standardPricing = calculatePrice({
      date,
      duration_hours,
      party_size,
    });

    // Use multi-vehicle total if applicable, otherwise standard
    const baseTotal = vehiclePricing.length > 0 ? totalFromVehicles : standardPricing.total;
    const baseSubtotal = vehiclePricing.length > 0
      ? vehiclePricing.reduce((sum, vp) => sum + vp.pricing.subtotal, 0)
      : standardPricing.subtotal;
    const baseTaxes = vehiclePricing.length > 0
      ? vehiclePricing.reduce((sum, vp) => sum + vp.pricing.taxes, 0)
      : standardPricing.taxes;

    // Apply custom discount
    const discountAmount = custom_discount
      ? (baseSubtotal * custom_discount) / 100
      : 0;

    const finalSubtotal = baseSubtotal - discountAmount;
    const finalTaxes = finalSubtotal * 0.091; // WA state + local tax
    const finalTotal = finalSubtotal + finalTaxes;
    const deposit = finalTotal * 0.5;

    // Build breakdown
    const breakdown = [];

    // Duration base
    const durationLabels: Record<number, string> = {
      5: '5-Hour Tour',
      6: '6-Hour Tour',
    };
    breakdown.push({
      label: `${durationLabels[duration_hours] || `${duration_hours}-Hour Tour`} (base 4 guests)`,
      amount: standardPricing.duration_price,
      key: 'base',
    });

    // Additional guests
    if (party_size > 4) {
      const additionalGuests = party_size - 4;
      breakdown.push({
        label: `Additional Guests (${additionalGuests} × $50)`,
        amount: additionalGuests * 50,
        key: 'additional_guests',
      });
    }

    // Multi-vehicle surcharge (if applicable)
    if (vehiclePricing.length > 1) {
      const multiVehicleSurcharge = totalFromVehicles - standardPricing.total;
      if (multiVehicleSurcharge > 0) {
        breakdown.push({
          label: `Multi-Vehicle (${vehiclePricing.length} vehicles)`,
          amount: multiVehicleSurcharge,
          key: 'multi_vehicle',
        });
      }
    }

    // Weekend surcharge
    if (standardPricing.weekend_surcharge > 0) {
      breakdown.push({
        label: 'Weekend Surcharge (15%)',
        amount: standardPricing.weekend_surcharge,
        key: 'weekend',
      });
    }

    // Holiday surcharge
    if (standardPricing.holiday_surcharge > 0) {
      breakdown.push({
        label: 'Holiday Surcharge (25%)',
        amount: standardPricing.holiday_surcharge,
        key: 'holiday',
      });
    }

    // Large group discount
    if (standardPricing.large_group_discount > 0) {
      breakdown.push({
        label: `Large Group Discount (${party_size} guests, 10%)`,
        amount: -standardPricing.large_group_discount,
        key: 'group_discount',
      });
    }

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
        vehicleBreakdown: vehiclePricing.map(vp => ({
          vehicle_id: vp.vehicle.id,
          vehicle_name: `${vp.vehicle.make} ${vp.vehicle.model}`,
          amount: vp.pricing.total,
        })),
      },
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
