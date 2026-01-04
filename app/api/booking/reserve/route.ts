/**
 * Reserve & Refine Booking API
 * Allows customers to put down a deposit to hold their date
 * Then Ryan calls within 24 hours to customize
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { getSetting } from '@/lib/settings/settings-service';
import { sendReservationConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReserveRequest {
  // Contact Info
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  
  // Event Details
  partySize: number;
  preferredDate: string;
  alternateDate?: string;
  eventType: string;
  specialRequests?: string;
  brandId?: number; // Which brand is handling this reservation
  
  // Payment
  paymentMethod: 'check' | 'card';
  depositAmount: number;
}

/**
 * POST /api/booking/reserve
 * Create a reservation with deposit
 */
export async function POST(request: NextRequest) {
  try {
    const data: ReserveRequest = await request.json();
    
    // Validate required fields
    if (!data.contactName || !data.contactEmail || !data.contactPhone) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      );
    }
    
    if (!data.preferredDate || data.partySize < 1) {
      return NextResponse.json(
        { error: 'Date and party size are required' },
        { status: 400 }
      );
    }
    
    // Get deposit settings
    const depositSettings = await getSetting('deposit_rules');
    const bookingSettings = await getSetting('booking_flow_settings');
    
    // Validate deposit amount
    const expectedDeposit = data.partySize <= 7 
      ? depositSettings?.reserve_refine?.['1-7'] || 250
      : depositSettings?.reserve_refine?.['8-14'] || 350;
    
    if (Math.abs(data.depositAmount - expectedDeposit) > 50) {
      return NextResponse.json(
        { error: `Invalid deposit amount. Expected approximately $${expectedDeposit}` },
        { status: 400 }
      );
    }
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // 1. Create or find customer
      let customerId: number;
      
      const existingCustomer = await query(
        'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
        [data.contactEmail]
      );
      
      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].id;
        
        // Update customer info
        await query(
          `UPDATE customers 
           SET name = $1, phone = $2, updated_at = NOW() 
           WHERE id = $3`,
          [data.contactName, data.contactPhone, customerId]
        );
      } else {
        // Create new customer
        const newCustomer = await query(
          `INSERT INTO customers (email, name, phone, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [data.contactEmail, data.contactName, data.contactPhone]
        );
        customerId = newCustomer.rows[0].id;
      }
      
      // 2. Generate reservation number
      const reservationNumber = `RES${Date.now().toString().slice(-8)}`;
      
      // 3. Create reservation record
      const reservation = await query(
        `INSERT INTO reservations (
          reservation_number,
          customer_id,
          party_size,
          preferred_date,
          alternate_date,
          event_type,
          special_requests,
          deposit_amount,
          deposit_paid,
          payment_method,
          status,
          brand_id,
          consultation_deadline,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() + INTERVAL '24 hours', NOW(), NOW())
        RETURNING id`,
        [
          reservationNumber,
          customerId,
          data.partySize,
          data.preferredDate,
          data.alternateDate || null,
          data.eventType,
          data.specialRequests || null,
          data.depositAmount,
          data.paymentMethod === 'check' ? false : true, // Card paid immediately, check pending
          data.paymentMethod,
          'pending', // Status: pending → contacted → confirmed → completed
          data.brandId || 1, // Default to Walla Walla Travel
          bookingSettings?.reserve_refine_consultation_hours || 24
        ]
      );
      
      const reservationId = reservation.rows[0].id;
      
      // 4. If card payment, create payment record (for now, just log it)
      if (data.paymentMethod === 'card') {
        await query(
          `INSERT INTO payments (
            reservation_id,
            customer_id,
            amount,
            payment_type,
            payment_method,
            status,
            created_at
          ) VALUES ($1, $2, $3, 'deposit', 'card', 'pending', NOW())`,
          [reservationId, customerId, data.depositAmount]
        );
      }
      
      // 5. Log activity
      await query(
        `INSERT INTO activity_log (
          activity_type,
          user_type,
          user_id,
          description,
          metadata,
          created_at
        ) VALUES ('reservation_created', 'customer', $1, $2, $3, NOW())`,
        [
          customerId,
          `New reservation ${reservationNumber} for ${data.partySize} guests on ${data.preferredDate}`,
          JSON.stringify({
            reservation_id: reservationId,
            reservation_number: reservationNumber,
            deposit_amount: data.depositAmount,
            payment_method: data.paymentMethod
          })
        ]
      );
      
      await query('COMMIT');
      
      // Send confirmation email
      const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${reservationId}`;
      
      try {
        await sendReservationConfirmation(
          {
            customer_name: data.contactName,
            reservation_number: reservationNumber,
            party_size: data.partySize,
            preferred_date: data.preferredDate,
            event_type: data.eventType,
            deposit_amount: data.depositAmount,
            payment_method: data.paymentMethod,
            consultation_hours: bookingSettings?.reserve_refine_consultation_hours || 24,
            confirmation_url: confirmationUrl
          },
          data.contactEmail,
          data.brandId || 1 // Pass brand ID for brand-specific email template
        );
      } catch (emailError) {
        logger.error('Reserve & Refine email send failed', { error: emailError });
        // Don't fail the reservation if email fails
      }
      
      logger.info('New reserve & refine reservation', {
        reservationNumber,
        partySize: data.partySize,
        depositAmount: data.depositAmount,
        paymentMethod: data.paymentMethod
      });
      
      return NextResponse.json({
        success: true,
        reservationId,
        reservationNumber,
        message: data.paymentMethod === 'card' 
          ? 'Reservation created! Processing payment...'
          : 'Reservation created! Please mail your check.'
      });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Reserve & Refine API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create reservation', details: message },
      { status: 500 }
    );
  }
}

