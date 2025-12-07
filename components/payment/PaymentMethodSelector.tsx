"use client";

/**
 * Payment Method Selector Component
 * Shows payment options with savings messaging
 */

import { useState, useEffect } from 'react';

export interface PaymentOption {
  method: 'card' | 'check' | 'ach';
  label: string;
  icon: string;
  baseAmount: number;
  processingFee: number;
  customerPays: number;
  total: number;
  savings?: number;
  recommended?: boolean;
  description?: string;
}

interface PaymentMethodSelectorProps {
  amount: number;
  onSelect: (method: 'card' | 'check', total: number) => void;
  selectedMethod?: 'card' | 'check';
}

export function PaymentMethodSelector({ 
  amount, 
  onSelect, 
  selectedMethod = 'check' 
}: PaymentMethodSelectorProps) {
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<'card' | 'check'>(selectedMethod);

  useEffect(() => {
    loadPaymentOptions();
  }, [amount]);

  const loadPaymentOptions = async () => {
    try {
      const response = await fetch(`/api/payment/options?amount=${amount}`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data.options);
      }
    } catch (error) {
      console.error('Failed to load payment options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (method: 'card' | 'check') => {
    setSelected(method);
    const option = options.find(o => o.method === method);
    if (option) {
      onSelect(method, option.total);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Payment Method</h3>
      
      {options.map((option) => (
        <button
          key={option.method}
          type="button"
          onClick={() => handleSelect(option.method as 'card' | 'check')}
          className={`w-full p-4 rounded-lg border-2 transition text-left ${
            selected === option.method
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${option.recommended ? 'ring-2 ring-green-200' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{option.icon}</span>
                <span className="font-bold text-gray-900">{option.label}</span>
                {option.recommended && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    RECOMMENDED
                  </span>
                )}
              </div>
              
              {option.description && (
                <p className="text-sm text-gray-600 mb-2">{option.description}</p>
              )}
              
              {option.savings && option.savings > 0 && (
                <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Save ${option.savings.toFixed(2)}!</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${option.total.toFixed(2)}
              </div>
              {option.customerPays > 0 && (
                <div className="text-xs text-gray-500">
                  +${option.customerPays.toFixed(2)} fee
                </div>
              )}
            </div>
          </div>
          
          {/* Radio indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selected === option.method
                ? 'border-blue-600'
                : 'border-gray-300'
            }`}>
              {selected === option.method && (
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {selected === option.method ? 'Selected' : 'Select this option'}
            </span>
          </div>
        </button>
      ))}
      
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>💡 Why we recommend check:</strong> Credit card processing fees are passed to customers. 
          Paying by check saves you money and helps keep our costs down!
        </p>
      </div>
    </div>
  );
}

