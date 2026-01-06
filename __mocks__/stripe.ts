/**
 * Stripe Mock for Testing
 *
 * Comprehensive mock of the Stripe SDK for unit and integration tests.
 * Simulates payment intents, refunds, and webhook events.
 */

export const mockPaymentIntent = {
  id: 'pi_test_123456789',
  object: 'payment_intent',
  amount: 15000,
  currency: 'usd',
  status: 'succeeded',
  client_secret: 'pi_test_123456789_secret_test',
  created: Math.floor(Date.now() / 1000),
  metadata: {},
};

export const mockRefund = {
  id: 're_test_123456789',
  object: 'refund',
  amount: 15000,
  currency: 'usd',
  status: 'succeeded',
  payment_intent: 'pi_test_123456789',
  created: Math.floor(Date.now() / 1000),
};

export const mockCustomer = {
  id: 'cus_test_123456789',
  object: 'customer',
  email: 'test@example.com',
  name: 'Test Customer',
  created: Math.floor(Date.now() / 1000),
};

// Mock Stripe class
class MockStripe {
  paymentIntents = {
    create: jest.fn().mockResolvedValue(mockPaymentIntent),
    retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
    confirm: jest.fn().mockResolvedValue({ ...mockPaymentIntent, status: 'succeeded' }),
    cancel: jest.fn().mockResolvedValue({ ...mockPaymentIntent, status: 'canceled' }),
    update: jest.fn().mockResolvedValue(mockPaymentIntent),
  };

  refunds = {
    create: jest.fn().mockResolvedValue(mockRefund),
    retrieve: jest.fn().mockResolvedValue(mockRefund),
  };

  customers = {
    create: jest.fn().mockResolvedValue(mockCustomer),
    retrieve: jest.fn().mockResolvedValue(mockCustomer),
    update: jest.fn().mockResolvedValue(mockCustomer),
  };

  webhooks = {
    constructEvent: jest.fn().mockImplementation((payload, sig, secret) => {
      return JSON.parse(payload);
    }),
  };

  // Reset all mocks
  _reset() {
    this.paymentIntents.create.mockClear();
    this.paymentIntents.retrieve.mockClear();
    this.paymentIntents.confirm.mockClear();
    this.paymentIntents.cancel.mockClear();
    this.paymentIntents.update.mockClear();
    this.refunds.create.mockClear();
    this.refunds.retrieve.mockClear();
    this.customers.create.mockClear();
    this.customers.retrieve.mockClear();
    this.customers.update.mockClear();
    this.webhooks.constructEvent.mockClear();
  }

  // Configure specific mock responses
  _mockPaymentIntentStatus(status: string) {
    this.paymentIntents.retrieve.mockResolvedValue({
      ...mockPaymentIntent,
      status,
    });
  }

  _mockPaymentIntentError(error: Error) {
    this.paymentIntents.create.mockRejectedValue(error);
    this.paymentIntents.retrieve.mockRejectedValue(error);
  }

  _mockRefundError(error: Error) {
    this.refunds.create.mockRejectedValue(error);
  }
}

// Export singleton instance
export const stripe = new MockStripe();

// Default export for module import compatibility
export default function Stripe(_apiKey: string) {
  return stripe;
}

// Export for direct import
export { MockStripe };
