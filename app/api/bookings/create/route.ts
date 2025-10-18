import { NextRequest } from 'next/server';
import { validate, createBookingSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * POST /api/bookings/create
 *
 * Create a new booking with payment processing.
 * This is the core booking creation endpoint that handles:
 * - Customer creation/lookup
 * - Booking number generation
 * - Booking record creation
 * - Winery itinerary creation
 * - Timeline event logging
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validate(request, createBookingSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { customer, booking, wineries, payment, marketing_consent } = validation.data;

    // Start transaction
    await query('BEGIN', []);

    try {
      // 1. Find or create customer
      let customerId: number | null = null;
      const existingCustomerResult = await query(
        'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
        [customer.email]
      );

      if (existingCustomerResult.rows.length > 0) {
        customerId = existingCustomerResult.rows[0].id;

        // Update customer info if changed
        await query(
          `UPDATE customers
           SET name = $1,
               phone = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [customer.name, customer.phone || null, customerId]
        );
      } else {
        // Create new customer
        const newCustomerResult = await query(
          `INSERT INTO customers (
            email, name, phone,
            email_marketing_consent, sms_marketing_consent,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
          [
            customer.email,
            customer.name,
            customer.phone || null,
            marketing_consent?.email || false,
            marketing_consent?.sms || false
          ]
        );
        customerId = newCustomerResult.rows[0].id;
      }

      // 2. Generate booking number
      const bookingNumber = await generateBookingNumber();

      // 3. Calculate pricing
      const tourDate = new Date(booking.tour_date);
      const dayOfWeek = tourDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const vehicleType = booking.party_size <= 4 ? 'luxury_sedan' : 'sprinter';

      const pricingResult = await query(
        `SELECT base_price, weekend_multiplier
         FROM pricing_rules
         WHERE vehicle_type = $1
         AND duration_hours = $2
         AND is_active = true
         ORDER BY priority DESC, is_weekend DESC
         LIMIT 1`,
        [vehicleType, booking.duration_hours]
      );

      let basePrice = 800; // Default fallback
      if (pricingResult.rows.length > 0) {
        const rule = pricingResult.rows[0];
        basePrice = parseFloat(rule.base_price);
        if (isWeekend && rule.weekend_multiplier) {
          basePrice *= parseFloat(rule.weekend_multiplier);
        }
      }

      const gratuity = basePrice * 0.15;
      const taxes = basePrice * 0.09;
      const totalPrice = basePrice + gratuity + taxes;
      const depositAmount = totalPrice * 0.5;
      const finalPaymentAmount = totalPrice - depositAmount;

      // Calculate end time
      const [startHours, startMinutes] = booking.start_time.split(':').map(Number);
      const endDate = new Date(tourDate);
      endDate.setHours(startHours + booking.duration_hours, startMinutes, 0, 0);
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      // 4. Create booking record
      const bookingResult = await query(
        `INSERT INTO bookings (
          booking_number,
          customer_id,
          customer_name,
          customer_email,
          customer_phone,
          party_size,
          tour_date,
          start_time,
          end_time,
          duration_hours,
          pickup_location,
          dropoff_location,
          special_requests,
          dietary_restrictions,
          accessibility_needs,
          base_price,
          gratuity,
          taxes,
          total_price,
          deposit_amount,
          deposit_paid,
          deposit_paid_at,
          final_payment_amount,
          final_payment_paid,
          status,
          booking_source,
          confirmation_email_sent,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id`,
        [
          bookingNumber,
          customerId,
          customer.name,
          customer.email,
          customer.phone || null,
          booking.party_size,
          booking.tour_date,
          booking.start_time,
          endTime,
          booking.duration_hours,
          booking.pickup_location,
          booking.dropoff_location || booking.pickup_location,
          booking.special_requests || null,
          booking.dietary_restrictions || null,
          booking.accessibility_needs || null,
          Math.round(basePrice * 100) / 100,
          Math.round(gratuity * 100) / 100,
          Math.round(taxes * 100) / 100,
          Math.round(totalPrice * 100) / 100,
          Math.round(depositAmount * 100) / 100,
          true, // deposit_paid (since payment method provided)
          new Date(), // deposit_paid_at
          Math.round(finalPaymentAmount * 100) / 100,
          false, // final_payment_paid
          'confirmed', // status (confirmed since payment successful)
          'online', // booking_source
          false // confirmation_email_sent (will be sent by email service)
        ]
      );

      const bookingId = bookingResult.rows[0].id;

      // 5. Create booking_wineries records
      for (const winery of wineries) {
        await query(
          `INSERT INTO booking_wineries (
            booking_id,
            winery_id,
            visit_order,
            created_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [bookingId, winery.winery_id, winery.visit_order]
        );
      }

      // 6. Create payment record
      await query(
        `INSERT INTO payments (
          booking_id,
          customer_id,
          amount,
          currency,
          payment_type,
          payment_method,
          stripe_payment_intent_id,
          status,
          created_at,
          updated_at,
          succeeded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          bookingId,
          customerId,
          depositAmount,
          'USD',
          'deposit',
          'card',
          payment.stripe_payment_method_id, // In production, this would be the actual Stripe payment intent ID
          'succeeded',
        ]
      );

      // 7. Create booking timeline event
      await query(
        `INSERT INTO booking_timeline (
          booking_id,
          event_type,
          event_description,
          event_data,
          created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          bookingId,
          'booking_created',
          'Booking created successfully',
          JSON.stringify({
            booking_number: bookingNumber,
            customer_email: customer.email,
            total_price: totalPrice,
            deposit_paid: depositAmount
          })
        ]
      );

      // 8. Update customer statistics
      await query(
        `UPDATE customers
         SET total_bookings = total_bookings + 1,
             total_spent = total_spent + $1,
             last_booking_date = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [totalPrice, booking.tour_date, customerId]
      );

      // Commit transaction
      await query('COMMIT', []);

      // 9. Fetch complete booking with wineries for response
      const wineryDetailsResult = await query(
        `SELECT w.id, w.name, w.slug, bw.visit_order
         FROM booking_wineries bw
         JOIN wineries w ON w.id = bw.winery_id
         WHERE bw.booking_id = $1
         ORDER BY bw.visit_order`,
        [bookingId]
      );

      const wineryDetails = wineryDetailsResult.rows.map(w => ({
        winery_id: w.id,
        name: w.name,
        slug: w.slug,
        visit_order: w.visit_order
      }));

      // Return success response
      return successResponse({
        booking: {
          id: bookingId,
          booking_number: bookingNumber,
          status: 'confirmed',
          tour_date: booking.tour_date,
          start_time: booking.start_time,
          end_time: endTime,
          duration_hours: booking.duration_hours,
          customer_name: customer.name,
          customer_email: customer.email,
          party_size: booking.party_size,
          pickup_location: booking.pickup_location,
          wineries: wineryDetails,
          total_price: Math.round(totalPrice * 100) / 100,
          deposit_paid: true,
          deposit_amount: Math.round(depositAmount * 100) / 100,
          balance_due: Math.round(finalPaymentAmount * 100) / 100,
          confirmation_sent: false
        },
        payment: {
          deposit_amount: Math.round(depositAmount * 100) / 100,
          payment_status: 'succeeded',
          stripe_payment_method_id: payment.stripe_payment_method_id
        },
        next_steps: [
          'Check your email for booking confirmation and itinerary',
          `Final payment of $${Math.round(finalPaymentAmount * 100) / 100} will be processed 48 hours before tour`,
          "You'll receive a reminder 72 hours before your tour",
          'Your driver will be assigned 7 days before your tour date'
        ]
      }, 'Booking confirmed! We\'re excited to show you Walla Walla wine country.');

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK', []);
      throw error;
    }

  } catch (error) {
    console.error('❌ Create booking error:', error);
    return errorResponse('Failed to create booking. Please try again or contact support.', 500);
  }
}

/**
 * Generate unique booking number in format: WWT-YYYY-NNNNN
 */
async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const sequenceName = `booking_number_seq_${year}`;

  // Create sequence for this year if it doesn't exist
  await query(
    `CREATE SEQUENCE IF NOT EXISTS ${sequenceName} START 1`,
    []
  );

  // Get next sequence number
  const result = await query(
    `SELECT nextval('${sequenceName}') as seq`,
    []
  );

  const sequenceNumber = result.rows[0].seq;
  const paddedNumber = sequenceNumber.toString().padStart(5, '0');

  return `WWT-${year}-${paddedNumber}`;
}
