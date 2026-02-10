/**
 * Tests for Validation Middleware
 * @module lib/api/middleware/validation
 *
 * Tests validateBody, validateQuery, validateParams,
 * formatZodErrors, and pre-built schemas.
 */

import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  ValidationError,
  commonValidators,
  CreatePaymentIntentSchema,
  ConfirmPaymentSchema,
  CreateBookingSchema,
  LoginSchema,
} from '@/lib/api/middleware/validation';

// Helper to create a mock NextRequest
function createMockRequest(body: unknown, url = 'http://localhost/api/test') {
  return {
    url,
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { searchParams: new URL(url).searchParams },
  } as any;
}

function createMockRequestWithQuery(params: Record<string, string>) {
  const url = new URL('http://localhost/api/test');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return {
    url: url.toString(),
    nextUrl: { searchParams: url.searchParams },
  } as any;
}

describe('Validation Middleware', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  // ===========================================================================
  // validateBody
  // ===========================================================================

  describe('validateBody', () => {
    it('should return parsed data for valid body', async () => {
      const request = createMockRequest({ name: 'Alice', age: 30 });
      const result = await validateBody(request, testSchema);

      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should throw ValidationError for invalid body', async () => {
      const request = createMockRequest({ name: '', age: -1 });

      await expect(validateBody(request, testSchema)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError with field-level errors', async () => {
      const request = createMockRequest({ name: '', age: -1 });

      try {
        await validateBody(request, testSchema);
      } catch (error: any) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.errors).toBeDefined();
        expect(error.errors.name).toBeDefined();
        expect(error.errors.age).toBeDefined();
      }
    });

    it('should throw when JSON parsing fails', async () => {
      const request = { json: jest.fn().mockRejectedValue(new SyntaxError('Bad JSON')) } as any;

      await expect(validateBody(request, testSchema)).rejects.toThrow();
    });

    it('should throw ValidationError for missing required fields', async () => {
      const request = createMockRequest({});

      await expect(validateBody(request, testSchema)).rejects.toThrow(ValidationError);
    });

    it('should throw for extra fields when schema is strict', async () => {
      const strictSchema = z.object({ name: z.string() }).strict();
      const request = createMockRequest({ name: 'Alice', extra: 'field' });

      await expect(validateBody(request, strictSchema)).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // validateQuery
  // ===========================================================================

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should validate query parameters', () => {
      const request = createMockRequestWithQuery({ page: '1', limit: '20' });
      // Note: validateQuery uses request.url, not searchParams directly
      const result = validateQuery(request, querySchema);

      expect(result).toEqual({ page: '1', limit: '20' });
    });

    it('should throw ValidationError for invalid query', () => {
      const strictQuery = z.object({
        page: z.string().regex(/^\d+$/),
      });
      const request = createMockRequestWithQuery({ page: 'abc' });

      expect(() => validateQuery(request, strictQuery)).toThrow(ValidationError);
    });

    it('should handle empty query parameters', () => {
      const request = createMockRequestWithQuery({});
      const result = validateQuery(request, querySchema);

      expect(result).toEqual({});
    });
  });

  // ===========================================================================
  // validateParams
  // ===========================================================================

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^\d+$/),
    });

    it('should validate Promise-based params (Next.js 15)', async () => {
      const params = Promise.resolve({ id: '42' });
      const result = await validateParams(params, paramsSchema);

      expect(result).toEqual({ id: '42' });
    });

    it('should validate direct params', async () => {
      const params = { id: '42' };
      const result = await validateParams(params, paramsSchema);

      expect(result).toEqual({ id: '42' });
    });

    it('should throw ValidationError for invalid params', async () => {
      const params = Promise.resolve({ id: 'abc' });

      await expect(validateParams(params, paramsSchema)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing params', async () => {
      const params = Promise.resolve({});

      await expect(validateParams(params, paramsSchema)).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // Common Validators
  // ===========================================================================

  describe('commonValidators', () => {
    describe('email', () => {
      it('should accept valid emails', () => {
        expect(commonValidators.email.safeParse('test@example.com').success).toBe(true);
        expect(commonValidators.email.safeParse('user+tag@domain.co').success).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(commonValidators.email.safeParse('notanemail').success).toBe(false);
        expect(commonValidators.email.safeParse('').success).toBe(false);
      });

      it('should reject very long emails', () => {
        const longEmail = 'a'.repeat(250) + '@b.com';
        expect(commonValidators.email.safeParse(longEmail).success).toBe(false);
      });
    });

    describe('amount', () => {
      it('should accept valid currency amounts', () => {
        expect(commonValidators.amount.safeParse(10.50).success).toBe(true);
        expect(commonValidators.amount.safeParse(1).success).toBe(true);
        expect(commonValidators.amount.safeParse(999999).success).toBe(true);
      });

      it('should reject zero and negative', () => {
        expect(commonValidators.amount.safeParse(0).success).toBe(false);
        expect(commonValidators.amount.safeParse(-5).success).toBe(false);
      });

      it('should reject amounts over 1M', () => {
        expect(commonValidators.amount.safeParse(1000001).success).toBe(false);
      });

      it('should reject more than 2 decimal places', () => {
        expect(commonValidators.amount.safeParse(10.999).success).toBe(false);
      });

      it('should reject Infinity and NaN', () => {
        expect(commonValidators.amount.safeParse(Infinity).success).toBe(false);
        expect(commonValidators.amount.safeParse(NaN).success).toBe(false);
      });
    });

    describe('bookingNumber', () => {
      it('should accept valid formats', () => {
        expect(commonValidators.bookingNumber.safeParse('BK-001').success).toBe(true);
        expect(commonValidators.bookingNumber.safeParse('ABC123').success).toBe(true);
      });

      it('should reject empty and special chars', () => {
        expect(commonValidators.bookingNumber.safeParse('').success).toBe(false);
        expect(commonValidators.bookingNumber.safeParse('BK@001').success).toBe(false);
      });
    });

    describe('positiveInt', () => {
      it('should accept positive integers', () => {
        expect(commonValidators.positiveInt.safeParse(1).success).toBe(true);
        expect(commonValidators.positiveInt.safeParse(100).success).toBe(true);
      });

      it('should reject zero, negative, and decimals', () => {
        expect(commonValidators.positiveInt.safeParse(0).success).toBe(false);
        expect(commonValidators.positiveInt.safeParse(-1).success).toBe(false);
        expect(commonValidators.positiveInt.safeParse(1.5).success).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Pre-built Schemas
  // ===========================================================================

  describe('CreatePaymentIntentSchema', () => {
    it('should accept valid payment intent data', () => {
      const result = CreatePaymentIntentSchema.safeParse({
        booking_number: 'BK-001',
        amount: 150.00,
        payment_type: 'deposit',
      });
      expect(result.success).toBe(true);
    });

    it('should default payment_type to deposit', () => {
      const result = CreatePaymentIntentSchema.safeParse({
        booking_number: 'BK-001',
        amount: 150.00,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payment_type).toBe('deposit');
      }
    });

    it('should reject invalid payment types', () => {
      const result = CreatePaymentIntentSchema.safeParse({
        booking_number: 'BK-001',
        amount: 150.00,
        payment_type: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ConfirmPaymentSchema', () => {
    it('should accept valid payment intent ID', () => {
      const result = ConfirmPaymentSchema.safeParse({
        payment_intent_id: 'pi_abc123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid payment intent ID format', () => {
      const result = ConfirmPaymentSchema.safeParse({
        payment_intent_id: 'invalid_id',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty payment intent ID', () => {
      const result = ConfirmPaymentSchema.safeParse({
        payment_intent_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LoginSchema', () => {
    it('should accept valid login data', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = LoginSchema.safeParse({
        email: 'notanemail',
        password: 'secret123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateBookingSchema', () => {
    it('should accept valid booking data', () => {
      const result = CreateBookingSchema.safeParse({
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        tour_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        party_size: 4,
      });
      expect(result.success).toBe(true);
    });

    it('should reject party size of 0', () => {
      const result = CreateBookingSchema.safeParse({
        customer_name: 'John',
        customer_email: 'john@example.com',
        tour_date: new Date().toISOString(),
        party_size: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject party size over 100', () => {
      const result = CreateBookingSchema.safeParse({
        customer_name: 'John',
        customer_email: 'john@example.com',
        tour_date: new Date().toISOString(),
        party_size: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional special requests', () => {
      const result = CreateBookingSchema.safeParse({
        customer_name: 'John',
        customer_email: 'john@example.com',
        tour_date: new Date().toISOString(),
        party_size: 2,
        special_requests: 'Wheelchair accessible',
      });
      expect(result.success).toBe(true);
    });

    it('should reject special requests over 2000 chars', () => {
      const result = CreateBookingSchema.safeParse({
        customer_name: 'John',
        customer_email: 'john@example.com',
        tour_date: new Date().toISOString(),
        party_size: 2,
        special_requests: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});
