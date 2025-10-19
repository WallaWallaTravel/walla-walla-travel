'use client';

import { useState } from 'react';
import PaymentForm from '@/components/PaymentForm';

export default function AdminPaymentSettings() {
  const [passFeesToCustomer, setPassFeesToCustomer] = useState(true);
  const [previewBooking] = useState({
    bookingNumber: 'WWT-2025-00001',
    baseAmount: 1190.40,
    depositAmount: 595.20,
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Admin Header */}
        <div className="bg-red-600 text-white rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">🔒 Admin Payment Settings</h1>
          <p className="text-red-100">This page is only visible to administrators</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Admin Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Fee Settings</h2>

            {/* Toggle Control */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
              <label className="flex items-start cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={passFeesToCustomer}
                    onChange={(e) => setPassFeesToCustomer(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
                <div className="ml-4">
                  <div className="text-lg font-bold text-gray-900">
                    {passFeesToCustomer ? '✅ Pass Fees to Customer' : '❌ Absorb All Fees'}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {passFeesToCustomer 
                      ? 'Processing fees will be added to the customer\'s total'
                      : 'You will pay all processing fees (fees not shown to customer)'}
                  </div>
                </div>
              </label>
            </div>

            {/* Fee Breakdown Table */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Payment Method</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Fee Structure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-900">Credit/Debit Card</td>
                    <td className="px-4 py-3 text-right text-gray-700">2.9% + $0.30</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-900">ACH/Bank Account</td>
                    <td className="px-4 py-3 text-right text-gray-700">0.8% (max $5.00)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-900">Check</td>
                    <td className="px-4 py-3 text-right text-green-700 font-bold">$0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Example Calculations */}
            <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">💡 Fee Calculation Examples</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">$595.20 via Card:</span>
                  <span className="font-bold text-gray-900">${((595.20 * 0.029) + 0.30).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">$595.20 via ACH:</span>
                  <span className="font-bold text-gray-900">${Math.min(595.20 * 0.008, 5.00).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">$595.20 via Check:</span>
                  <span className="font-bold text-green-700">$0.00</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                ⚠️ Fees are calculated dynamically based on the payment method selected by the customer
              </p>
            </div>

            {/* Current Status */}
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Current Status</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-700">
                  <strong>Fee Passthrough:</strong> {passFeesToCustomer ? 'ENABLED' : 'DISABLED'}
                </p>
                <p className="text-gray-700">
                  <strong>Customer Can Toggle:</strong> NO (admin control only)
                </p>
                <p className="text-gray-700">
                  <strong>Dynamic Fee Calculation:</strong> YES (varies by payment method)
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold text-green-900 mb-1">👁️ Customer View Preview</h2>
              <p className="text-sm text-green-800">This is what customers will see</p>
            </div>

            <PaymentForm 
              bookingNumber={previewBooking.bookingNumber}
              baseAmount={previewBooking.baseAmount}
              depositAmount={previewBooking.depositAmount}
              isDeposit={true}
              passFeesToCustomer={passFeesToCustomer}
              allowFeeToggle={false}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <div className="text-3xl mb-2">1️⃣</div>
              <h4 className="font-bold text-gray-900 mb-2">Toggle Fees</h4>
              <p className="text-sm text-gray-700">Use the switch above to enable/disable fee passthrough</p>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <div className="text-3xl mb-2">2️⃣</div>
              <h4 className="font-bold text-gray-900 mb-2">Dynamic Calculation</h4>
              <p className="text-sm text-gray-700">Fees automatically adjust based on payment method (Card/ACH/Check)</p>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <div className="text-3xl mb-2">3️⃣</div>
              <h4 className="font-bold text-gray-900 mb-2">Preview Changes</h4>
              <p className="text-sm text-gray-700">See exactly what customers see in real-time on the right</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
