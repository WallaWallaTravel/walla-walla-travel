'use client';

/**
 * Tip Selector Component
 * Allows customers to select or enter a custom tip amount
 */

import { useState, useEffect } from 'react';

interface TipOption {
  percentage: number;
  amount: number;
  label: string;
}

interface TipSelectorProps {
  baseAmount: number;
  onTipChange: (tipAmount: number, tipPercentage: number | null, tipType: 'percentage' | 'fixed' | 'none') => void;
  initialTipPercentage?: number;
  suggestedPercentages?: number[];
  tipLabel?: string;
  showSuggested?: boolean;
  allowCustom?: boolean;
}

export function TipSelector({
  baseAmount,
  onTipChange,
  initialTipPercentage = 20,
  suggestedPercentages = [15, 18, 20, 25],
  tipLabel = 'Gratuity for your driver',
  showSuggested = true,
  allowCustom = true,
}: TipSelectorProps) {
  const [selectedType, setSelectedType] = useState<'percentage' | 'fixed' | 'none'>('percentage');
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(initialTipPercentage);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [tipAmount, setTipAmount] = useState(0);

  // Calculate tip options
  const tipOptions: TipOption[] = suggestedPercentages.map(pct => ({
    percentage: pct,
    amount: Math.round(baseAmount * pct) / 100,
    label: `${pct}%`,
  }));

  // Update tip when selection changes
  useEffect(() => {
    let newTipAmount = 0;
    let newTipPercentage: number | null = null;
    let newTipType: 'percentage' | 'fixed' | 'none' = selectedType;

    if (selectedType === 'percentage' && selectedPercentage) {
      newTipAmount = Math.round(baseAmount * selectedPercentage) / 100;
      newTipPercentage = selectedPercentage;
    } else if (selectedType === 'fixed' && customAmount) {
      newTipAmount = parseFloat(customAmount) || 0;
      newTipPercentage = null;
    }

    setTipAmount(newTipAmount);
    onTipChange(newTipAmount, newTipPercentage, newTipType);
  }, [selectedType, selectedPercentage, customAmount, baseAmount, onTipChange]);

  const handlePercentageSelect = (percentage: number) => {
    setSelectedType('percentage');
    setSelectedPercentage(percentage);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow valid currency input
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
      setSelectedType('fixed');
      setSelectedPercentage(null);
    }
  };

  const handleNoTip = () => {
    setSelectedType('none');
    setSelectedPercentage(null);
    setCustomAmount('');
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-200">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <span className="text-2xl">💝</span>
        {tipLabel}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        100% of your tip goes directly to your driver
      </p>

      {/* Suggested tip buttons */}
      {showSuggested && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {tipOptions.map((option) => (
            <button
              key={option.percentage}
              type="button"
              onClick={() => handlePercentageSelect(option.percentage)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                selectedType === 'percentage' && selectedPercentage === option.percentage
                  ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-300'
                  : 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <div className="font-bold text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-600">${option.amount.toFixed(2)}</div>
            </button>
          ))}
        </div>
      )}

      {/* Custom tip input */}
      {allowCustom && (
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-4 py-3 rounded-lg border-2 transition ${
                  selectedType === 'fixed'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
                    : 'border-gray-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                }`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNoTip}
            className={`px-4 py-3 rounded-lg border-2 transition whitespace-nowrap self-end ${
              selectedType === 'none'
                ? 'border-gray-500 bg-gray-100'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            No Tip
          </button>
        </div>
      )}

      {/* Tip summary */}
      <div className="bg-white rounded-lg p-4 border border-amber-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Your tip:</span>
          <span className={`text-xl font-bold ${tipAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            ${tipAmount.toFixed(2)}
            {selectedType === 'percentage' && selectedPercentage && (
              <span className="text-sm font-normal text-gray-500 ml-1">
                ({selectedPercentage}%)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Thank you message for tips */}
      {tipAmount > 0 && (
        <p className="text-center text-sm text-amber-700 mt-3 font-medium">
          🙏 Thank you for showing appreciation for your driver!
        </p>
      )}
    </div>
  );
}
