import { NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api-errors';
import { calculatePrice, validatePricingRequest } from '@/lib/pricing-engine';

/**
 * POST /api/bookings/calculate-price
 * Calculate detailed pricing for booking parameters
 * 
 * Body: {
 *   date: string (YYYY-MM-DD),
 *   duration_hours: number (4, 6, or 8),
 *   party_size: number (1-14),
 *   vehicle_type?: string (sedan, sprinter, luxury)
 * }
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

  // Determine vehicle type based on party size if not specified
  const selectedVehicleType = vehicle_type || (party_size > 4 ? 'sprinter' : 'sedan');

  // Calculate pricing
  const pricing = calculatePrice({
    date,
    duration_hours,
    party_size,
    vehicle_type: selectedVehicleType
  });

  // Calculate final payment date (48 hours before tour)
  const tourDate = new Date(date);
  const finalPaymentDate = new Date(tourDate);
  finalPaymentDate.setHours(finalPaymentDate.getHours() - 48);

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
        due_description: '48 hours before tour'
      },
      vehicle: {
        type: selectedVehicleType,
        recommended: party_size > 4 ? 'sprinter' : 'sedan'
      },
      policies: {
        cancellation: {
          '72_hours_plus': 'Full refund minus processing fee',
          '72_to_24_hours': '50% refund',
          'less_than_24_hours': 'No refund'
        },
        payment_schedule: {
          deposit: 'Due at booking (50%)',
          final_payment: 'Auto-charged 48 hours before tour (50%)'
        }
      }
    }
  });
});
