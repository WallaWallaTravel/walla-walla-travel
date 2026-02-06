'use client';

import React, { useState } from 'react';
import { LunchExpenseForm } from './LunchExpenseForm';
import { ReceiptPhotoCapture } from './ReceiptPhotoCapture';
import { TipQRCodeDisplay } from './TipQRCodeDisplay';
import { TouchButton } from '@/components/mobile/TouchButton';

type Step = 'lunch' | 'receipt' | 'qr' | 'error';

interface TourCompletionFlowProps {
  bookingId: number;
  bookingNumber: string;
  customerName: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface CompletionResult {
  tip_code: string;
  tip_payment_link: string;
  tip_qr_code_url: string;
}

/**
 * TourCompletionFlow - Multi-step flow for completing a tour
 *
 * Steps:
 * 1. Lunch expense entry (optional)
 * 2. Receipt photo capture (optional)
 * 3. Generate QR code and display
 */
export function TourCompletionFlow({
  bookingId,
  bookingNumber,
  customerName,
  onComplete,
  onCancel,
}: TourCompletionFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('lunch');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Form data
  const [lunchAmount, setLunchAmount] = useState<number | null>(null);
  const [lunchDescription, setLunchDescription] = useState<string | undefined>();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Completion result
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);

  const handleLunchSubmit = (amount: number, description?: string) => {
    setLunchAmount(amount);
    setLunchDescription(description);
    setCurrentStep('receipt');
  };

  const handleLunchSkip = () => {
    setLunchAmount(null);
    setCurrentStep('receipt');
  };

  const handleReceiptCapture = async (file: File) => {
    setReceiptFile(file);
    await completeTour(file);
  };

  const handleReceiptSkip = async () => {
    setReceiptFile(null);
    await completeTour(null);
  };

  const completeTour = async (receipt: File | null) => {
    setIsLoading(true);
    setError('');

    try {
      // If there's a lunch expense with receipt, upload it first
      if (lunchAmount && receipt) {
        const formData = new FormData();
        formData.append('booking_id', String(bookingId));
        formData.append('expense_type', 'lunch');
        formData.append('amount', String(lunchAmount));
        if (lunchDescription) {
          formData.append('description', lunchDescription);
        }
        formData.append('receipt', receipt);

        const expenseResponse = await fetch('/api/driver/expenses/upload-receipt', {
          method: 'POST',
          body: formData,
        });

        if (!expenseResponse.ok) {
          const expenseData = await expenseResponse.json();
          throw new Error(expenseData.error || 'Failed to upload expense');
        }
      }

      // Complete the tour
      const completeResponse = await fetch(`/api/driver/tours/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lunch_cost_total: lunchAmount,
          tips_enabled: true,
        }),
      });

      if (!completeResponse.ok) {
        const completeData = await completeResponse.json();
        throw new Error(completeData.error || 'Failed to complete tour');
      }

      const data = await completeResponse.json();
      setCompletionResult(data.completion);
      setCurrentStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    onComplete();
  };

  const handleRetry = () => {
    setError('');
    setCurrentStep('lunch');
  };

  // Progress indicator
  const getStepNumber = (): number => {
    switch (currentStep) {
      case 'lunch':
        return 1;
      case 'receipt':
        return 2;
      case 'qr':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {currentStep !== 'error' && (
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-2 rounded-full transition-colors ${
                  step <= getStepNumber() ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Tour info */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500">Completing tour</p>
        <p className="font-semibold text-gray-900">{customerName}</p>
        <p className="text-sm text-gray-500">Booking #{bookingNumber}</p>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {currentStep === 'lunch' && (
          <LunchExpenseForm
            onSubmit={handleLunchSubmit}
            onSkip={handleLunchSkip}
            isLoading={isLoading}
          />
        )}

        {currentStep === 'receipt' && (
          <ReceiptPhotoCapture
            onCapture={handleReceiptCapture}
            onSkip={handleReceiptSkip}
            isLoading={isLoading}
          />
        )}

        {currentStep === 'qr' && completionResult && (
          <TipQRCodeDisplay
            tipCode={completionResult.tip_code}
            tipPaymentLink={completionResult.tip_payment_link}
            qrCodeUrl={completionResult.tip_qr_code_url}
            onDone={handleDone}
          />
        )}

        {currentStep === 'error' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
              <p className="text-gray-600 mt-2">{error}</p>
            </div>

            <div className="space-y-3">
              <TouchButton variant="primary" size="large" fullWidth onClick={handleRetry}>
                Try Again
              </TouchButton>

              <TouchButton variant="ghost" size="large" fullWidth onClick={onCancel}>
                Cancel
              </TouchButton>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-gray-700">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
