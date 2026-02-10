/**
 * Tip Service
 *
 * @module lib/services/tip.service
 * @description Handles driver tip collection, tour completion, and expense tracking.
 * Supports QR code generation for guest payments and payroll export tracking.
 */

import { BaseService } from './base.service';
import { getStripe } from '@/lib/stripe';
import type Stripe from 'stripe';

// Lazy-load healthService to avoid pulling Prisma into serverless bundles
async function getHealthService() {
  const { healthService } = await import('@/lib/services/health.service');
  return healthService;
}
import type {
  TipRecord,
  TourCompletionResult,
  ExpenseRecord,
  TipPageData,
  TipPaymentResult,
} from '@/lib/validation/schemas/tip.schemas';

// ============================================================================
// Types
// ============================================================================

interface CreateExpenseData {
  booking_id: number;
  driver_id: number;
  expense_type: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  receipt_storage_path?: string;
}

interface CreateTourCompletionData {
  booking_id: number;
  driver_id: number;
  lunch_cost_total?: number;
  driver_notes?: string;
  tips_enabled?: boolean;
}

interface BookingInfo {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  total_price: number;
  driver_id: number;
  brand_id: number | null;
}

interface BrandInfo {
  brand_name: string;
  logo_url: string | null;
}

interface DriverInfo {
  name: string;
}

// ============================================================================
// Tip Service Class
// ============================================================================

class TipService extends BaseService {
  protected get serviceName(): string {
    return 'TipService';
  }

  // ============================================================================
  // Tip Code Generation
  // ============================================================================

  /**
   * Generate a unique tip code (6 characters, alphanumeric uppercase)
   */
  async generateUniqueTipCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if code already exists
      const exists = await this.exists('tour_completions', 'tip_code = $1', [code]);
      if (!exists) {
        return code;
      }
      attempts++;
    }

    // Fallback to longer code if collisions persist
    const timestamp = Date.now().toString(36).toUpperCase();
    return timestamp.slice(-6);
  }

  // ============================================================================
  // Tour Completion Methods
  // ============================================================================

  /**
   * Complete a tour and generate tip payment link
   */
  async completeTour(data: CreateTourCompletionData): Promise<TourCompletionResult> {
    const tipCode = await this.generateUniqueTipCode();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel';
    const tipPaymentLink = `${baseUrl}/tip/${tipCode}`;

    // Generate QR code URL using a free QR code API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tipPaymentLink)}`;

    const result = await this.insert<TourCompletionResult>('tour_completions', {
      booking_id: data.booking_id,
      driver_id: data.driver_id,
      lunch_cost_total: data.lunch_cost_total || null,
      driver_notes: data.driver_notes || null,
      tips_enabled: data.tips_enabled !== false,
      tip_code: tipCode,
      tip_payment_link: tipPaymentLink,
      tip_qr_code_url: qrCodeUrl,
      completed_at: new Date().toISOString(),
    });

    // Also update booking status to completed
    await this.query(
      `UPDATE bookings SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [data.booking_id]
    );

    this.log('Tour completed', {
      bookingId: data.booking_id,
      driverId: data.driver_id,
      tipCode,
    });

    return result;
  }

  /**
   * Get tour completion by booking ID
   */
  async getTourCompletion(bookingId: number): Promise<TourCompletionResult | null> {
    return this.queryOne<TourCompletionResult>(
      `SELECT * FROM tour_completions WHERE booking_id = $1`,
      [bookingId]
    );
  }

  /**
   * Get tour completion by tip code (for public tip page)
   */
  async getTourCompletionByTipCode(tipCode: string): Promise<TourCompletionResult | null> {
    return this.queryOne<TourCompletionResult>(
      `SELECT * FROM tour_completions WHERE tip_code = $1`,
      [tipCode]
    );
  }

  /**
   * Get tip page data for public tip payment page
   */
  async getTipPageData(tipCode: string): Promise<TipPageData | null> {
    const completion = await this.getTourCompletionByTipCode(tipCode);
    if (!completion) {
      return null;
    }

    // Get booking info
    const booking = await this.queryOne<BookingInfo>(
      `SELECT id, booking_number, customer_name, tour_date::text, total_price, driver_id, brand_id
       FROM bookings WHERE id = $1`,
      [completion.booking_id]
    );

    if (!booking) {
      return null;
    }

    // Get driver name
    const driver = await this.queryOne<DriverInfo>(
      `SELECT name FROM users WHERE id = $1`,
      [booking.driver_id]
    );

    // Get brand info if available
    let brandName = 'Walla Walla Travel';
    let brandLogoUrl: string | undefined;

    if (booking.brand_id) {
      const brand = await this.queryOne<BrandInfo>(
        `SELECT brand_name, logo_url FROM brands WHERE id = $1`,
        [booking.brand_id]
      );
      if (brand) {
        brandName = brand.brand_name;
        brandLogoUrl = brand.logo_url || undefined;
      }
    }

    return {
      booking_id: booking.id,
      driver_name: driver?.name || 'Your Driver',
      tour_date: booking.tour_date,
      tour_total: Number(booking.total_price),
      brand_name: brandName,
      brand_logo_url: brandLogoUrl,
      tips_enabled: completion.tips_enabled,
      tip_code: tipCode,
    };
  }

  // ============================================================================
  // Tip Payment Methods
  // ============================================================================

  /**
   * Create a Stripe payment intent for a tip
   */
  async createTipPaymentIntent(
    tipCode: string,
    amount: number,
    guestName?: string
  ): Promise<TipPaymentResult> {
    const pageData = await this.getTipPageData(tipCode);
    if (!pageData) {
      throw new Error('Invalid tip code');
    }

    if (!pageData.tips_enabled) {
      throw new Error('Tips are not enabled for this tour');
    }

    const stripe = getStripe();
    const hs = await getHealthService();
    const paymentIntent = await hs.withRetry(
      async () => {
        return stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            type: 'driver_tip',
            tip_code: tipCode,
            booking_id: String(pageData.booking_id),
            driver_name: pageData.driver_name,
            guest_name: guestName || '',
          },
          description: `Tip for ${pageData.driver_name} - ${pageData.brand_name}`,
        });
      },
      'stripe',
      3
    );

    // Create pending tip record
    const completion = await this.getTourCompletionByTipCode(tipCode);
    if (completion) {
      await this.insert('driver_tips', {
        booking_id: pageData.booking_id,
        driver_id: completion.driver_id,
        amount,
        guest_name: guestName || null,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        tip_source: 'qr_code',
      });
    }

    this.log('Tip payment intent created', {
      tipCode,
      amount,
      paymentIntentId: paymentIntent.id,
    });

    return {
      client_secret: paymentIntent.client_secret!,
      payment_intent_id: paymentIntent.id,
      amount,
    };
  }

  /**
   * Process successful tip payment (called from webhook)
   */
  async processTipPaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const { id: paymentIntentId, metadata, amount } = paymentIntent;
    const tipCode = metadata.tip_code;
    const guestName = metadata.guest_name || null;

    // Get charge details for card info
    let cardBrand: string | null = null;
    let cardLast4: string | null = null;
    let chargeId: string | null = null;

    if (paymentIntent.latest_charge) {
      const stripe = getStripe();
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
      chargeId = charge.id;
      if (charge.payment_method_details?.card) {
        cardBrand = charge.payment_method_details.card.brand || null;
        cardLast4 = charge.payment_method_details.card.last4 || null;
      }
    }

    // Update tip record
    await this.query(
      `UPDATE driver_tips
       SET payment_status = 'succeeded',
           stripe_charge_id = $1,
           card_brand = $2,
           card_last4 = $3,
           updated_at = NOW()
       WHERE stripe_payment_intent_id = $4`,
      [chargeId, cardBrand, cardLast4, paymentIntentId]
    );

    this.log('Tip payment succeeded', {
      paymentIntentId,
      tipCode,
      amount: amount / 100,
      guestName,
    });
  }

  /**
   * Process failed tip payment (called from webhook)
   */
  async processTipPaymentFailed(paymentIntentId: string): Promise<void> {
    await this.query(
      `UPDATE driver_tips
       SET payment_status = 'failed',
           updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId]
    );

    this.log('Tip payment failed', { paymentIntentId });
  }

  // ============================================================================
  // Tip History Methods
  // ============================================================================

  /**
   * Get tips for a specific driver
   */
  async getDriverTips(
    driverId: number,
    options: {
      startDate?: string;
      endDate?: string;
      status?: string;
      payrollExported?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tips: TipRecord[]; total: number }> {
    const conditions: string[] = ['dt.driver_id = $1'];
    const params: unknown[] = [driverId];
    let paramIndex = 2;

    if (options.startDate) {
      conditions.push(`dt.created_at >= $${paramIndex}::timestamptz`);
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`dt.created_at <= $${paramIndex}::timestamptz`);
      params.push(options.endDate + 'T23:59:59.999Z');
      paramIndex++;
    }

    if (options.status) {
      conditions.push(`dt.payment_status = $${paramIndex}`);
      params.push(options.status);
      paramIndex++;
    }

    if (options.payrollExported !== undefined) {
      conditions.push(`dt.payroll_exported = $${paramIndex}`);
      params.push(options.payrollExported);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM driver_tips dt WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    // Get tips with booking info
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const tips = await this.queryMany<TipRecord>(
      `SELECT dt.*,
              b.booking_number,
              b.customer_name,
              b.tour_date::text
       FROM driver_tips dt
       LEFT JOIN bookings b ON b.id = dt.booking_id
       WHERE ${whereClause}
       ORDER BY dt.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { tips, total };
  }

  /**
   * Get tips for a specific booking
   */
  async getBookingTips(bookingId: number): Promise<TipRecord[]> {
    return this.queryMany<TipRecord>(
      `SELECT * FROM driver_tips
       WHERE booking_id = $1 AND payment_status = 'succeeded'
       ORDER BY created_at DESC`,
      [bookingId]
    );
  }

  /**
   * Get total tips for a booking
   */
  async getBookingTipTotal(bookingId: number): Promise<number> {
    const result = await this.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text as total
       FROM driver_tips
       WHERE booking_id = $1 AND payment_status = 'succeeded'`,
      [bookingId]
    );
    return parseFloat(result?.total || '0');
  }

  /**
   * Mark tips as exported to payroll
   */
  async markTipsAsExported(tipIds: number[]): Promise<number> {
    if (tipIds.length === 0) return 0;

    const result = await this.query(
      `UPDATE driver_tips
       SET payroll_exported = true,
           payroll_exported_at = NOW(),
           updated_at = NOW()
       WHERE id = ANY($1) AND payroll_exported = false`,
      [tipIds]
    );

    return result.rowCount || 0;
  }

  // ============================================================================
  // Expense Methods
  // ============================================================================

  /**
   * Create a tour expense
   */
  async createExpense(data: CreateExpenseData): Promise<ExpenseRecord> {
    return this.insert<ExpenseRecord>('tour_expenses', {
      booking_id: data.booking_id,
      driver_id: data.driver_id,
      expense_type: data.expense_type,
      amount: data.amount,
      description: data.description || null,
      receipt_url: data.receipt_url || null,
      receipt_storage_path: data.receipt_storage_path || null,
      reimbursement_status: 'pending',
    });
  }

  /**
   * Update expense with receipt URL after upload
   */
  async updateExpenseReceipt(
    expenseId: number,
    receiptUrl: string,
    receiptStoragePath: string
  ): Promise<ExpenseRecord | null> {
    return this.update<ExpenseRecord>('tour_expenses', expenseId, {
      receipt_url: receiptUrl,
      receipt_storage_path: receiptStoragePath,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get expenses for a booking
   */
  async getBookingExpenses(bookingId: number): Promise<ExpenseRecord[]> {
    return this.queryMany<ExpenseRecord>(
      `SELECT * FROM tour_expenses
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [bookingId]
    );
  }

  /**
   * Get expenses for a driver
   */
  async getDriverExpenses(
    driverId: number,
    options: {
      startDate?: string;
      endDate?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ expenses: ExpenseRecord[]; total: number }> {
    const conditions: string[] = ['driver_id = $1'];
    const params: unknown[] = [driverId];
    let paramIndex = 2;

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex}::timestamptz`);
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex}::timestamptz`);
      params.push(options.endDate + 'T23:59:59.999Z');
      paramIndex++;
    }

    if (options.status) {
      conditions.push(`reimbursement_status = $${paramIndex}`);
      params.push(options.status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tour_expenses WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const expenses = await this.queryMany<ExpenseRecord>(
      `SELECT * FROM tour_expenses
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { expenses, total };
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Check if a driver is assigned to a booking
   */
  async isDriverAssignedToBooking(driverId: number, bookingId: number): Promise<boolean> {
    return this.exists('bookings', 'id = $1 AND driver_id = $2', [bookingId, driverId]);
  }

  /**
   * Check if a tour can be completed
   */
  async canCompleteTour(bookingId: number): Promise<{ canComplete: boolean; reason?: string }> {
    const booking = await this.queryOne<{ status: string; tour_date: string }>(
      `SELECT status, tour_date::text FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (!booking) {
      return { canComplete: false, reason: 'Booking not found' };
    }

    if (booking.status === 'cancelled') {
      return { canComplete: false, reason: 'Booking is cancelled' };
    }

    if (booking.status === 'completed') {
      return { canComplete: false, reason: 'Tour is already completed' };
    }

    // Check if tour date is today or in the past
    const tourDate = new Date(booking.tour_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tourDate > today) {
      return { canComplete: false, reason: 'Cannot complete future tours' };
    }

    return { canComplete: true };
  }
}

// Export singleton instance
export const tipService = new TipService();
