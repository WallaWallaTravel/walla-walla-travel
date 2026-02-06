'use client';

import React, { useState } from 'react';

interface SuggestedTips {
  fifteen_percent: number;
  twenty_percent: number;
  twenty_five_percent: number;
}

interface TipAmountSelectorProps {
  suggestedTips: SuggestedTips;
  onSelect: (amount: number) => void;
  selectedAmount: number | null;
}

/**
 * TipAmountSelector - Percentage-based tip selection with custom amount option
 *
 * Features:
 * - 15%, 20%, 25% preset buttons
 * - Shows dollar amounts for each percentage
 * - Custom amount input option
 * - Large touch targets for mobile
 */
export function TipAmountSelector({
  suggestedTips,
  onSelect,
  selectedAmount,
}: TipAmountSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const presetOptions = [
    { label: '15%', amount: suggestedTips.fifteen_percent, percentage: 15 },
    { label: '20%', amount: suggestedTips.twenty_percent, percentage: 20 },
    { label: '25%', amount: suggestedTips.twenty_five_percent, percentage: 25 },
  ];

  const handlePresetSelect = (amount: number) => {
    setIsCustom(false);
    setCustomAmount('');
    onSelect(amount);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    onSelect(0);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setCustomAmount(value);
      const numAmount = parseFloat(value);
      if (!isNaN(numAmount) && numAmount > 0) {
        onSelect(numAmount);
      } else {
        onSelect(0);
      }
    }
  };

  const isPresetSelected = (amount: number) =>
    !isCustom && selectedAmount !== null && Math.abs(selectedAmount - amount) < 0.01;

  return (
    <div className="space-y-4">
      {/* Preset amount buttons */}
      <div className="grid grid-cols-3 gap-3">
        {presetOptions.map((option) => (
          <button
            key={option.percentage}
            onClick={() => handlePresetSelect(option.amount)}
            className={`
              p-4 rounded-xl border-2 transition-all
              ${
                isPresetSelected(option.amount)
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-opacity-30'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="text-center">
              <span
                className={`text-lg font-bold ${
                  isPresetSelected(option.amount) ? 'text-blue-600' : 'text-gray-900'
                }`}
              >
                {option.label}
              </span>
              <div
                className={`text-sm mt-1 ${
                  isPresetSelected(option.amount) ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                ${option.amount.toFixed(2)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom amount option */}
      <button
        onClick={handleCustomClick}
        className={`
          w-full p-4 rounded-xl border-2 transition-all
          ${
            isCustom
              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-opacity-30'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
          }
        `}
      >
        <span className={`font-semibold ${isCustom ? 'text-blue-600' : 'text-gray-900'}`}>
          Custom Amount
        </span>
      </button>

      {/* Custom amount input */}
      {isCustom && (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={customAmount}
            onChange={handleCustomAmountChange}
            placeholder="0.00"
            className="
              w-full px-4 py-4 pl-8 text-2xl font-semibold text-center
              border-2 border-gray-200 rounded-xl
              focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-opacity-30
              focus:outline-none
              placeholder:text-gray-400
            "
            style={{ fontSize: '24px' }}
            autoFocus
            aria-label="Custom tip amount"
          />
        </div>
      )}

      {/* Selected amount display */}
      {selectedAmount !== null && selectedAmount > 0 && (
        <div className="text-center mt-4 p-3 bg-green-50 rounded-lg">
          <span className="text-green-700 font-semibold">
            Tip Amount: ${selectedAmount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
