import { NextRequest } from 'next/server';
import { validate, calculatePriceSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * POST /api/bookings/calculate-price
 *
 * Calculate detailed pricing for booking parameters.
 * Returns pricing breakdown with all fees and charges.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validate(request, calculatePriceSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { date, duration_hours, party_size, vehicle_type, winery_count } = validation.data;

    // Determine vehicle type based on party size if not specified
    const selectedVehicleType = vehicle_type || (party_size <= 4 ? 'luxury_sedan' : 'sprinter');

    // Determine if weekend
    const tourDate = new Date(date);
    const dayOfWeek = tourDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    // Get pricing rule from database
    const pricingResult = await query(
      `SELECT
        base_price,
        price_per_hour,
        price_per_person,
        minimum_price,
        maximum_price,
        weekend_multiplier,
        holiday_multiplier
       FROM pricing_rules
       WHERE vehicle_type = $1
       AND duration_hours = $2
       AND is_active = true
       AND (valid_from IS NULL OR valid_from <= $3)
       AND (valid_until IS NULL OR valid_until >= $3)
       ORDER BY priority DESC, is_weekend DESC
       LIMIT 1`,
      [selectedVehicleType, duration_hours, date]
    );

    let basePrice = 0;
    let pricingRule = null;

    if (pricingResult.rows.length > 0) {
      pricingRule = pricingResult.rows[0];
      basePrice = parseFloat(pricingRule.base_price);

      // Apply weekend multiplier if applicable
      if (isWeekend && pricingRule.weekend_multiplier) {
        basePrice *= parseFloat(pricingRule.weekend_multiplier);
      }

      // Apply per-hour pricing if configured
      if (pricingRule.price_per_hour) {
        basePrice += parseFloat(pricingRule.price_per_hour) * duration_hours;
      }

      // Apply per-person pricing if configured
      if (pricingRule.price_per_person) {
        basePrice += parseFloat(pricingRule.price_per_person) * party_size;
      }

      // Apply minimum/maximum constraints
      if (pricingRule.minimum_price && basePrice < parseFloat(pricingRule.minimum_price)) {
        basePrice = parseFloat(pricingRule.minimum_price);
      }
      if (pricingRule.maximum_price && basePrice > parseFloat(pricingRule.maximum_price)) {
        basePrice = parseFloat(pricingRule.maximum_price);
      }
    } else {
      // Fallback pricing if no rule found
      const basePrices: Record<string, Record<number, number>> = {
        sprinter: {
          4.0: isWeekend ? 720 : 600,
          6.0: isWeekend ? 960 : 800,
          8.0: isWeekend ? 1200 : 1000
        },
        luxury_sedan: {
          4.0: isWeekend ? 480 : 400,
          6.0: isWeekend ? 640 : 533,
          8.0: isWeekend ? 800 : 667
        },
        suv: {
          4.0: isWeekend ? 600 : 500,
          6.0: isWeekend ? 800 : 667,
          8.0: isWeekend ? 1000 : 833
        }
      };
      basePrice = basePrices[selectedVehicleType]?.[duration_hours] || 800;
    }

    // Calculate additional fees
    const gratuity = basePrice * 0.15; // 15% suggested gratuity
    const taxes = basePrice * 0.09; // 9% sales tax (Walla Walla County rate)

    // Optional: Add winery tasting fees estimate
    const averageTastingFee = 20; // Average tasting fee per winery
    const estimatedTastingFees = winery_count ? winery_count * averageTastingFee * party_size : 0;

    // Calculate totals
    const subtotal = basePrice;
    const totalFees = gratuity + taxes;
    const totalPrice = subtotal + totalFees;
    const depositAmount = totalPrice * 0.5; // 50% deposit
    const balanceDue = totalPrice - depositAmount;

    // Calculate final payment date (48 hours before tour)
    const finalPaymentDate = new Date(tourDate);
    finalPaymentDate.setHours(finalPaymentDate.getHours() - 48);

    return successResponse({
      pricing: {
        base_price: Math.round(basePrice * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        fees: {
          gratuity: Math.round(gratuity * 100) / 100,
          gratuity_percentage: 15,
          taxes: Math.round(taxes * 100) / 100,
          tax_rate: 9
        },
        total: Math.round(totalPrice * 100) / 100,
        deposit: {
          amount: Math.round(depositAmount * 100) / 100,
          percentage: 50,
          due_at: 'booking_confirmation'
        },
        balance: {
          amount: Math.round(balanceDue * 100) / 100,
          due_date: finalPaymentDate.toISOString().split('T')[0],
          due_description: '48 hours before tour'
        }
      },
      estimates: {
        tasting_fees: winery_count ? {
          per_winery: averageTastingFee,
          total_per_person: winery_count * averageTastingFee,
          total_group: Math.round(estimatedTastingFees * 100) / 100,
          note: 'Tasting fees are paid directly to wineries and not included in tour price'
        } : null,
        total_experience_cost: winery_count ?
          Math.round((totalPrice + estimatedTastingFees) * 100) / 100 :
          Math.round(totalPrice * 100) / 100
      },
      breakdown: {
        vehicle_type: selectedVehicleType,
        duration_hours: duration_hours,
        party_size: party_size,
        is_weekend: isWeekend,
        day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        winery_count: winery_count || null
      },
      policies: {
        cancellation: {
          '72_hours_plus': 'Full refund minus processing fee',
          '72_to_24_hours': '50% refund',
          'less_than_24_hours': 'No refund'
        },
        payment_schedule: {
          deposit: 'Due at booking',
          final_payment: 'Auto-charged 48 hours before tour'
        }
      }
    });

  } catch (error) {
    console.error('❌ Calculate price error:', error);
    return errorResponse('Failed to calculate pricing. Please try again.', 500);
  }
}
