'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { ErrorLogger } from '@/lib/error-logger';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const errorLogger = ErrorLogger.getInstance();

interface Invoice {
  id: number;
  invoice_number: string;
  subtotal: number;
  booking: {
    booking_number: string;
    customer_name: string;
    tour_date: string;
    actual_hours: number;
    hourly_rate: number;
    driver_name: string;
  };
}

export default function FinalInvoicePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.booking_id as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [bookingId]);

  const loadInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${bookingId}`);
      const data = await response.json();
      if (data.success) {
        setInvoice(data.invoice);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      errorLogger.logError('Invoice Load Failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (percentage: number) => {
    if (invoice) {
      const tipAmount = invoice.subtotal * percentage;
      setTip(tipAmount);
      setCustomTip('');
    }
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    setTip(amount);
  };

  const handlePayment = async () => {
    if (!invoice) return;

    setPaying(true);
    try {
      // Create payment intent with tip
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: invoice.subtotal + tip,
          tip_amount: tip,
          invoice_id: invoice.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to Stripe checkout or process payment
        window.location.href = data.payment_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      errorLogger.logError('Payment Failed', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600">This invoice may have already been paid.</p>
        </div>
      </div>
    );
  }

  const total = invoice.subtotal + tip;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Final Invoice</h1>
            <p className="text-gray-600 mt-2">Thank you for choosing Walla Walla Travel!</p>
          </div>

          {/* Invoice Details */}
          <div className="border-t border-b border-gray-200 py-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booking:</span>
              <span className="font-semibold text-gray-900">{invoice.booking.booking_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tour Date:</span>
              <span className="font-semibold text-gray-900">
                {new Date(invoice.booking.tour_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Driver:</span>
              <span className="font-semibold text-gray-900">{invoice.booking.driver_name}</span>
            </div>
          </div>

          {/* Service Hours */}
          <div className="py-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Service Hours:</span>
              <span className="font-semibold text-gray-900">{invoice.booking.actual_hours} hours</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Hourly Rate:</span>
              <span className="font-semibold text-gray-900">${invoice.booking.hourly_rate.toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-3">
              <span className="text-gray-900">Subtotal:</span>
              <span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Tip Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Add a Tip for Your Driver?</h2>
          <p className="text-gray-600 mb-6">
            Your driver {invoice.booking.driver_name} provided excellent service. 
            Tips are greatly appreciated!
          </p>

          {/* Suggested Tips */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => handleTipSelect(0.15)}
              className={`py-4 rounded-lg border-2 transition-all ${
                tip === invoice.subtotal * 0.15
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">15%</div>
              <div className="text-sm text-gray-600">${(invoice.subtotal * 0.15).toFixed(2)}</div>
            </button>
            <button
              onClick={() => handleTipSelect(0.20)}
              className={`py-4 rounded-lg border-2 transition-all ${
                tip === invoice.subtotal * 0.20
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">20%</div>
              <div className="text-sm text-gray-600">${(invoice.subtotal * 0.20).toFixed(2)}</div>
              <div className="text-xs text-blue-600 mt-1">Most Popular</div>
            </button>
            <button
              onClick={() => handleTipSelect(0.25)}
              className={`py-4 rounded-lg border-2 transition-all ${
                tip === invoice.subtotal * 0.25
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">25%</div>
              <div className="text-sm text-gray-600">${(invoice.subtotal * 0.25).toFixed(2)}</div>
            </button>
          </div>

          {/* Custom Tip */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Or enter a custom amount:
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-600 text-lg">$</span>
              <input
                type="number"
                value={customTip}
                onChange={(e) => handleCustomTip(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* No Tip Option */}
          <button
            onClick={() => { setTip(0); setCustomTip(''); }}
            className="text-gray-600 hover:text-gray-800 text-sm underline"
          >
            No tip this time
          </button>
        </div>

        {/* Total & Payment */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
          <div className="flex justify-between items-center mb-6">
            <span className="text-2xl font-bold">Total Amount:</span>
            <span className="text-4xl font-bold">${total.toFixed(2)}</span>
          </div>

          {tip > 0 && (
            <div className="text-sm mb-6 opacity-90">
              Includes ${tip.toFixed(2)} tip for {invoice.booking.driver_name}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying}
            className={`w-full py-4 rounded-lg font-bold text-xl transition-all ${
              paying
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-white text-blue-600 hover:bg-gray-100 shadow-lg'
            }`}
          >
            {paying ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>

          <p className="text-center text-sm mt-4 opacity-75">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

