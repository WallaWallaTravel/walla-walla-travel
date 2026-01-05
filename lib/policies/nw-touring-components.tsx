'use client';

/**
 * NW Touring & Concierge - Policy Components
 *
 * Standalone components for NW Touring direct bookings.
 * Used when bookings don't go through Walla Walla Travel.
 */

import { useState } from 'react';
import {
  NW_TOURING_FULL_TERMS,
  NW_TOURING_COMPLETE_TERMS,
  getNWTouringTermsSummary,
} from './nw-touring-full-terms';
import {
  NW_TOURING_COMPANY_INFO,
  VEHICLE_DAMAGE_FEES,
  getNWTouringDisplayName,
} from './nw-touring-terms';
import { CANCELLATION_TIERS, CANCELLATION_POLICY } from './cancellation-policy';

// ============================================================================
// FULL TERMS PAGE COMPONENT
// ============================================================================

interface NWTouringTermsPageProps {
  brand?: string; // 'Herding Cats Wine Tours' or default
}

export function NWTouringTermsPage({ brand }: NWTouringTermsPageProps) {
  const displayName = getNWTouringDisplayName(brand);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Terms and Conditions</h1>
        <p className="text-gray-600 mt-2">{displayName}</p>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: {NW_TOURING_FULL_TERMS.lastUpdated} | Version {NW_TOURING_FULL_TERMS.version}
        </p>
      </div>

      {/* Regulatory Info Banner */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-700">
          <strong>{NW_TOURING_COMPANY_INFO.legalName}</strong>
          <br />
          USDOT: {NW_TOURING_COMPANY_INFO.usdot} | MC: {NW_TOURING_COMPANY_INFO.mc}
          <br />
          Licensed Passenger Motor Carrier | {NW_TOURING_COMPANY_INFO.address?.city}, {NW_TOURING_COMPANY_INFO.address?.state}
        </p>
      </div>

      {/* Quick Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-900 mb-3">Key Points</h2>
        <ul className="grid md:grid-cols-2 gap-2">
          {getNWTouringTermsSummary().slice(0, 8).map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-blue-800 text-sm">
              <span className="text-blue-500">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Full Terms */}
      <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
        {NW_TOURING_COMPLETE_TERMS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {section.number}. {section.title}
            </h2>
            {section.content && (
              <p className="text-gray-700 leading-relaxed mb-4">{section.content}</p>
            )}
            {section.subsections && (
              <div className="space-y-4">
                {section.subsections.map((sub) => (
                  <div key={sub.id} className="pl-4 border-l-2 border-gray-200">
                    <p className="text-gray-700">
                      <strong className="text-gray-900">{sub.label}:</strong> {sub.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Vehicle Damage Fee Schedule */}
        <section id="fee-schedule">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Damage Fee Schedule</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Incident Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Fee</th>
                </tr>
              </thead>
              <tbody>
                {VEHICLE_DAMAGE_FEES.map((fee, index) => (
                  <tr key={fee.type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 capitalize font-medium">{fee.type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-gray-600">{fee.description}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {fee.fee > 0 ? `$${fee.fee}` : 'Actual cost'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            * Major damage is charged at actual repair or replacement cost.
          </p>
        </section>
      </div>

      {/* Contact Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Questions? Contact us at{' '}
          <a href={`mailto:${NW_TOURING_COMPANY_INFO.email}`} className="text-blue-600 hover:underline">
            {NW_TOURING_COMPANY_INFO.email}
          </a>{' '}
          or{' '}
          <a href={`tel:${NW_TOURING_COMPANY_INFO.phone}`} className="text-blue-600 hover:underline">
            {NW_TOURING_COMPANY_INFO.phone}
          </a>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// TERMS MODAL FOR BOOKING FLOW
// ============================================================================

interface NWTouringTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  brand?: string;
  showAcceptButton?: boolean;
}

export function NWTouringTermsModal({
  isOpen,
  onClose,
  onAccept,
  brand,
  showAcceptButton = false,
}: NWTouringTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'cancellation' | 'liability'>('terms');
  const displayName = getNWTouringDisplayName(brand);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Terms & Conditions</h2>
              <p className="text-gray-300 text-sm">{displayName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'terms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Booking Terms
            </button>
            <button
              onClick={() => setActiveTab('cancellation')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cancellation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Cancellation
            </button>
            <button
              onClick={() => setActiveTab('liability')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'liability'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Liability & Safety
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {activeTab === 'terms' && (
            <div className="space-y-6">
              {NW_TOURING_COMPLETE_TERMS.filter(s =>
                ['about_us', 'booking_reservations', 'services', 'guest_responsibilities'].includes(s.id)
              ).map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {section.number}. {section.title}
                  </h3>
                  <p className="text-gray-700 mb-3">{section.content}</p>
                  {section.subsections && (
                    <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                      {section.subsections.map((sub) => (
                        <p key={sub.id} className="text-gray-600 text-sm">
                          <strong>{sub.label}:</strong> {sub.content}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3">Quick Summary</h3>
                <ul className="space-y-2">
                  {CANCELLATION_POLICY.quickSummary.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-blue-800">
                      <span>{item.icon}</span>
                      <span><strong>{item.days}:</strong> {item.refund}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {CANCELLATION_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`border-l-4 pl-4 py-2 ${
                    tier.colorClass === 'green'
                      ? 'border-green-500'
                      : tier.colorClass === 'yellow'
                      ? 'border-yellow-500'
                      : 'border-red-500'
                  }`}
                >
                  <h4 className="font-bold text-gray-900">{tier.icon} {tier.label}</h4>
                  <p className="text-gray-700">{tier.description}</p>
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">Weather Cancellations</h4>
                <p className="text-gray-700">
                  {CANCELLATION_POLICY.sections.weatherAndEmergencies.severeWeather.description}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'liability' && (
            <div className="space-y-6">
              {NW_TOURING_COMPLETE_TERMS.filter(s =>
                s.number.startsWith('6')
              ).map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {section.number} {section.title}
                  </h3>
                  <p className="text-gray-700 mb-3">{section.content}</p>
                  {section.subsections && (
                    <ul className="space-y-2 text-gray-600">
                      {section.subsections.map((sub) => (
                        <li key={sub.id} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span><strong>{sub.label}:</strong> {sub.content}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {/* Fee Schedule */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Damage Fee Schedule</h3>
                <div className="space-y-2">
                  {VEHICLE_DAMAGE_FEES.map((fee) => (
                    <div key={fee.type} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <span className="font-medium capitalize">{fee.type.replace(/_/g, ' ')}</span>
                        <p className="text-sm text-gray-500">{fee.description}</p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {fee.fee > 0 ? `$${fee.fee}` : 'Actual cost'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              showAcceptButton
                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            Close
          </button>
          {showAcceptButton && onAccept && (
            <button
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              I Accept These Terms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TERMS ACCEPTANCE CHECKBOX
// ============================================================================

interface NWTouringTermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onViewTerms: () => void;
  brand?: string;
}

export function NWTouringTermsCheckbox({
  checked,
  onChange,
  onViewTerms,
  brand,
}: NWTouringTermsCheckboxProps) {
  const displayName = getNWTouringDisplayName(brand);

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the{' '}
          <button
            type="button"
            onClick={onViewTerms}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Terms and Conditions
          </button>{' '}
          of {displayName}, including the cancellation policy, liability provisions, and vehicle damage policy.
        </span>
      </label>

      <div className="text-xs text-gray-500 pl-8">
        By checking this box, you acknowledge that you understand and accept:
        <ul className="mt-1 space-y-0.5">
          <li>• Cancellation: Full refund 30+ days, 50% refund 15-29 days, no refund under 15 days</li>
          <li>• Vehicle cleaning fee up to $300 for excessive messes</li>
          <li>• Responsibility for any damage caused by your party</li>
          <li>• All alcohol consumers must be 21+</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT TERMS SUMMARY
// ============================================================================

interface NWTouringTermsSummaryProps {
  onViewFull: () => void;
  brand?: string;
}

export function NWTouringTermsSummary({ onViewFull, brand }: NWTouringTermsSummaryProps) {
  const displayName = getNWTouringDisplayName(brand);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{displayName} - Key Terms</h3>
        <button
          onClick={onViewFull}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View full terms
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Booking</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• Deposit required to confirm</li>
            <li>• Final payment 48hrs after tour</li>
            <li>• Tasting fees not included</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Cancellation</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• 30+ days: Full refund</li>
            <li>• 15-29 days: 50% refund</li>
            <li>• Under 15 days: No refund</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Safety</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• Must be 21+ to drink</li>
            <li>• USDOT licensed carrier</li>
            <li>• $1.5M liability insurance</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Vehicle</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• No smoking/vaping</li>
            <li>• $300 cleaning fee if needed</li>
            <li>• Damage billed at cost</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
