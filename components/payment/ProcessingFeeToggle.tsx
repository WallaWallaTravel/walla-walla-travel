'use client';

/**
 * Admin Processing Fee Settings Component
 * Backend control for operators to configure how processing fees are handled
 * NOT for customer-facing use - this is an admin setting
 */

import { useState } from 'react';

interface ProcessingFeeSettingsProps {
  currentSettings: {
    passFeesToCustomer: boolean;
    feePercentage: number;
    flatFee: number;
    passPercentage: number; // What % of the fee to pass (0-100)
  };
  onSave: (settings: {
    passFeesToCustomer: boolean;
    passPercentage: number;
  }) => void;
}

export function ProcessingFeeSettings({
  currentSettings,
  onSave,
}: ProcessingFeeSettingsProps) {
  const [passToCustomer, setPassToCustomer] = useState(currentSettings.passFeesToCustomer);
  const [passPercentage, setPassPercentage] = useState(currentSettings.passPercentage);

  const handleSave = () => {
    onSave({
      passFeesToCustomer: passToCustomer,
      passPercentage: passToCustomer ? passPercentage : 0,
    });
  };

  // Example calculation for preview
  const exampleAmount = 500;
  const exampleFee = (exampleAmount * currentSettings.feePercentage / 100) + currentSettings.flatFee;
  const customerPays = passToCustomer ? (exampleFee * passPercentage / 100) : 0;
  const businessAbsorbs = exampleFee - customerPays;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <span className="text-2xl">💳</span>
        Processing Fee Settings
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Configure how credit card processing fees are handled for invoices and payments
      </p>

      {/* Current Fee Structure */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-700 mb-2">Current Fee Structure</h4>
        <div className="text-sm text-gray-600">
          <p>{currentSettings.feePercentage}% + ${currentSettings.flatFee.toFixed(2)} per transaction</p>
          <p className="text-xs text-gray-500 mt-1">(Stripe standard pricing)</p>
        </div>
      </div>

      {/* Pass to Customer Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-semibold text-gray-900">Pass fees to customer</label>
            <p className="text-sm text-gray-600">Add processing fee to customer&apos;s invoice</p>
          </div>
          <button
            type="button"
            onClick={() => setPassToCustomer(!passToCustomer)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              passToCustomer ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                passToCustomer ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Percentage Slider (only shown if passing to customer) */}
        {passToCustomer && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <label className="font-semibold text-gray-900 block mb-2">
              Percentage to pass: {passPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={passPercentage}
              onChange={(e) => setPassPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (absorb all)</span>
              <span>50%</span>
              <span>100% (pass all)</span>
            </div>
          </div>
        )}
      </div>

      {/* Example Preview */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Example: ${exampleAmount} invoice</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Processing fee:</span>
            <span className="font-medium">${exampleFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Customer pays:</span>
            <span className="font-medium text-blue-600">${customerPays.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Business absorbs:</span>
            <span className="font-medium text-orange-600">${businessAbsorbs.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between font-bold">
              <span>Customer total:</span>
              <span>${(exampleAmount + customerPays).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="mt-6 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
      >
        Save Settings
      </button>
    </div>
  );
}

/**
 * Display component for showing fee breakdown on invoices
 * This is what customers see - just informational, no choices
 */
interface ProcessingFeeDisplayProps {
  baseAmount: number;
  processingFee: number;
  showFee: boolean;
}

export function ProcessingFeeDisplay({
  baseAmount,
  processingFee,
  showFee,
}: ProcessingFeeDisplayProps) {
  if (!showFee || processingFee <= 0) {
    return null;
  }

  return (
    <div className="flex justify-between text-sm text-gray-600 py-1">
      <span>Processing Fee</span>
      <span>${processingFee.toFixed(2)}</span>
    </div>
  );
}
