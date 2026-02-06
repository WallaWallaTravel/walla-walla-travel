'use client';

import React, { useState } from 'react';
import { MobileInput } from '@/components/mobile/MobileInput';
import { TouchButton } from '@/components/mobile/TouchButton';

interface LunchExpenseFormProps {
  onSubmit: (amount: number, description?: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

/**
 * LunchExpenseForm - Form for entering lunch expenses during tour completion
 *
 * Features:
 * - Amount input with dollar formatting
 * - Optional description
 * - Skip option if no lunch expense
 * - Mobile-optimized inputs
 */
export function LunchExpenseForm({ onSubmit, onSkip, isLoading = false }: LunchExpenseFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
      setError('');
    }
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount <= 0) {
      setError('Amount must be greater than $0');
      return;
    }

    if (numAmount > 1000) {
      setError('Amount seems too high (max $1,000)');
      return;
    }

    onSubmit(numAmount, description || undefined);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Lunch Expense</h2>
        <p className="text-gray-600 mt-1">Enter the total lunch cost for the tour group</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
          <MobileInput
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            error={error}
            className="pl-8 text-2xl font-semibold text-center"
            aria-label="Lunch expense amount"
          />
        </div>

        <MobileInput
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          aria-label="Expense description"
        />
      </div>

      <div className="space-y-3 pt-4">
        <TouchButton
          variant="primary"
          size="large"
          fullWidth
          onClick={handleSubmit}
          loading={isLoading}
          disabled={!amount}
        >
          Continue with Receipt
        </TouchButton>

        <TouchButton variant="ghost" size="large" fullWidth onClick={onSkip} disabled={isLoading}>
          Skip - No Lunch Expense
        </TouchButton>
      </div>
    </div>
  );
}
