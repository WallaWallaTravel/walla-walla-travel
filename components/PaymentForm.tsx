'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  bookingNumber: string;
  baseAmount: number;
  depositAmount: number;
  isDeposit?: boolean;
  passFeesToCustomer?: boolean;
  allowFeeToggle?: boolean;
}

function calculateProcessingFee(amount: number, method: 'card' | 'ach' | 'check'): number {
  switch (method) {
    case 'card': return (amount * 0.029); // Only pass on 2.9%, NOT the $0.30
    case 'ach': return Math.min(amount * 0.008, 5.00);
    case 'check': return 0;
    default: return (amount * 0.029);
  }
}

function PaymentFormInner({ bookingNumber, baseAmount, depositAmount, isDeposit = true, passFeesToCustomer = true }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach' | 'check'>('card');

  const amountToPay = isDeposit ? depositAmount : baseAmount;
  const suggestedTip = amountToPay * 0.20;
  const tipValue = parseFloat(tipAmount) || 0;
  const subtotal = amountToPay + tipValue;
  const processingFee = passFeesToCustomer ? calculateProcessingFee(subtotal, paymentMethod) : 0;
  const totalAmount = subtotal + processingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      if (paymentMethod === 'check') {
        alert('Check payment - mail to: Walla Walla Travel');
        setLoading(false);
        return;
      }

      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?booking=${bookingNumber}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment confirmation failed');
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">Payment Successful!</h3>
        <p className="text-green-700">Thank you for your payment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2 text-base">Booking Details</h3>
        <p className="text-gray-700 font-medium">Booking #{bookingNumber}</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-gray-900 text-base">
          <span className="font-medium">{isDeposit ? 'Deposit Amount' : 'Total Amount'}:</span>
          <span className="font-bold">${amountToPay.toFixed(2)}</span>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-base font-semibold text-gray-900 mb-2">
            Add a Tip for Your Driver (Optional)
          </label>
          <p className="text-sm text-gray-700 mb-3 font-medium">
            20% would be ${suggestedTip.toFixed(2)}
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 text-lg font-semibold">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold text-gray-900"
            />
          </div>
          {tipValue > 0 && (
            <p className="text-sm text-green-700 font-semibold mt-2">
              ✓ Thank you! Your driver appreciates your generosity.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-base font-semibold text-gray-900 mb-3">Payment Method</label>
          <div className="space-y-3">
            <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all">
              <input type="radio" name="payment-method" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="mr-3 w-5 h-5" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-base">Credit/Debit Card</div>
                <div className="text-sm text-gray-700 font-medium">Processing fee: ${(subtotal * 0.029).toFixed(2)} (2.9%)</div>
              </div>
            </label>
            <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all">
              <input type="radio" name="payment-method" value="ach" checked={paymentMethod === 'ach'} onChange={() => setPaymentMethod('ach')} className="mr-3 w-5 h-5" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-base">Bank Account (ACH)</div>
                <div className="text-sm text-gray-700 font-medium">Processing fee: ${Math.min(subtotal * 0.008, 5.00).toFixed(2)} (0.8%, max $5)</div>
              </div>
            </label>
            <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all">
              <input type="radio" name="payment-method" value="check" checked={paymentMethod === 'check'} onChange={() => setPaymentMethod('check')} className="mr-3 w-5 h-5" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-base">Check (No Processing Fee)</div>
                <div className="text-sm text-gray-700 font-medium">Mail to: Walla Walla Travel, PO Box 123, Walla Walla, WA 99362</div>
              </div>
            </label>
          </div>
        </div>

        {passFeesToCustomer && processingFee > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between text-gray-900 font-semibold text-base">
              <span>Processing Fee:</span>
              <span>${processingFee.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-700 mt-1 font-medium">This fee covers payment processing costs</p>
          </div>
        )}

        <div className="flex justify-between text-xl font-bold text-gray-900 border-t-2 border-gray-300 pt-4">
          <span>Total:</span>
          <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {paymentMethod !== 'check' && (
        <div className="border-2 border-gray-300 rounded-lg p-4">
          <PaymentElement />
        </div>
      )}

      {error && <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-900 font-semibold">{error}</div>}

      <button type="submit" disabled={loading || !stripe} className="w-full bg-blue-600 text-white py-5 rounded-lg font-bold text-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-lg">
        {loading ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
      </button>
      
      <p className="text-sm text-gray-700 text-center font-medium">
        🔒 Your payment is secure and encrypted
      </p>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_number: props.bookingNumber,
            amount: props.isDeposit ? props.depositAmount : props.baseAmount,
            customer_email: 'customer@example.com',
          }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to create payment intent');
        setClientSecret(data.data.client_secret);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Payment initialization failed');
      } finally {
        setLoading(false);
      }
    };
    createPaymentIntent();
  }, [props.bookingNumber, props.depositAmount, props.baseAmount, props.isDeposit]);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-6"><h3 className="text-red-900 font-semibold mb-2">Error</h3><p className="text-red-700">{error}</p></div>;
  if (!clientSecret) return null;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb', borderRadius: '8px', fontSizeBase: '16px', fontWeightNormal: '600' } } }}>
        <PaymentFormInner {...props} />
      </Elements>
    </div>
  );
}
