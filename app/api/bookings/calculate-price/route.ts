/**
 * Calculate Booking Price API
 * 
 * ✅ REFACTORED: Uses existing pricing helpers with standardized error handling
 */

import { NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { calculatePrice, validatePricingRequest } from '@/lib/pricing-engine';

/**
 * POST /api/bookings/calculate-price
 * Calculate detailed pricing for booking parameters
 * 
 * ✅ REFACTORED: Standardized error handling
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const { date, duration_hours, party_size, vehicle_type } = body;

  // Validate required fields
  if (!date || !duration_hours || !party_size) {
    throw new BadRequestError('Missing required fields: date, duration_hours, and party_size are required');
  }

  // Validate pricing request
  const validation = validatePricingRequest({
    date,
    duration_hours,
    party_size,
    vehicle_type
  });

  if (!validation.valid) {
    throw new BadRequestError(validation.errors.join(', '));
  }

  // All tours use sprinter vans
  const selectedVehicleType = 'sprinter';

  // Calculate pricing
  const pricing = calculatePrice({
    date,
    duration_hours,
    party_size,
    vehicle_type: selectedVehicleType
  });

  // Calculate final payment date (48 hours after tour concludes)
  // Parse as local time (new Date('YYYY-MM-DD') parses as UTC, causing timezone bugs)
  const [fpY, fpM, fpD] = date.split('-').map(Number);
  const tourDate = new Date(fpY, fpM - 1, fpD);
  const finalPaymentDate = new Date(tourDate);
  finalPaymentDate.setHours(finalPaymentDate.getHours() + 48);

  return NextResponse.json({
    success: true,
    data: {
      pricing: {
        base_price: pricing.base_price,
        subtotal: pricing.subtotal,
        weekend_surcharge: pricing.weekend_surcharge,
        holiday_surcharge: pricing.holiday_surcharge,
        large_group_discount: pricing.large_group_discount,
        taxes: pricing.taxes,
        total: pricing.total,
        deposit_required: pricing.deposit_required,
        estimated_gratuity: pricing.estimated_gratuity,
        breakdown: pricing.breakdown
      },
      deposit: {
        amount: pricing.deposit_required,
        percentage: 50,
        due_at: 'booking_confirmation'
      },
      balance: {
        amount: pricing.total - pricing.deposit_required,
        due_date: finalPaymentDate.toISOString().split('T')[0],
        due_description: '48 hours after tour concludes'
      },
      vehicle: {
        type: 'sprinter',
        recommended: 'sprinter'
      },
      policies: {
        cancellation: {
          '45_days_plus': '100% refund of deposit',
          '21_to_44_days': '50% refund of deposit',
          'within_21_days': 'No refund'
        },
        payment_schedule: {
          deposit: 'Due at booking (50%)',
          final_payment: 'Charged 48 hours after tour concludes (50%)'
        }
      }
    },
    timestamp: new Date().toISOString(),
  });
});
