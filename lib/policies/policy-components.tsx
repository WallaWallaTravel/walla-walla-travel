'use client';

/**
 * Policy Components - Reusable UI components for displaying policies
 *
 * These components pull from the single source of truth policy files
 * and can be used across proposals, booking confirmations, terms pages, etc.
 */

import { useState } from 'react';
import {
  CANCELLATION_POLICY,
  CANCELLATION_TIERS,
} from './cancellation-policy';
import {
  NW_TOURING_TERMS,
  NW_TOURING_LIABILITY_SECTIONS,
  VEHICLE_DAMAGE_FEES,
  getLiabilitySummary,
  getNWTouringDisplayName,
} from './nw-touring-terms';
import {
  WWT_TERMS,
} from './wwt-terms';

// ============================================================================
// CANCELLATION POLICY COMPONENTS
// ============================================================================

interface CancellationPolicySummaryProps {
  showTitle?: boolean;
  compact?: boolean;
}

export function CancellationPolicySummary({
  showTitle = true,
  compact = false,
}: CancellationPolicySummaryProps) {
  if (compact) {
    return (
      <div className="text-sm text-gray-600">
        <strong>Cancellation:</strong> Full refund 30+ days, 50% refund 15-29 days,
        no refund &lt;15 days. Weather cancellations fully refunded.
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      {showTitle && (
        <h3 className="text-lg font-bold text-blue-900 mb-3">Cancellation Policy</h3>
      )}
      <ul className="space-y-2 text-blue-800">
        {CANCELLATION_POLICY.quickSummary.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span>{item.icon}</span>
            <span>
              <strong>{item.days}:</strong> {item.refund}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CancellationPolicyFullProps {
  showContact?: boolean;
}

export function CancellationPolicyFull({ showContact = true }: CancellationPolicyFullProps) {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cancellation Timeline</h2>
        <div className="space-y-4">
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
              <h3 className="text-lg font-bold text-gray-900">
                {tier.icon} {tier.label}
              </h3>
              <p className="text-gray-600 mt-1">
                <strong>{tier.refundPercentage}% Refund</strong>
              </p>
              <p className="text-gray-700 mt-2">{tier.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Weather & Emergencies */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Weather & Emergencies</h2>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Severe Weather:</strong>{' '}
            {CANCELLATION_POLICY.sections.weatherAndEmergencies.severeWeather.description}
          </p>
          <p>
            <strong>Emergencies:</strong>{' '}
            {CANCELLATION_POLICY.sections.weatherAndEmergencies.emergencies.description}
          </p>
        </div>
      </section>

      {/* Contact */}
      {showContact && (
        <section className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-2">Questions?</h3>
          <p className="text-gray-700">
            <strong>Email:</strong> {CANCELLATION_POLICY.contact.email}
            <br />
            <strong>Phone:</strong> {CANCELLATION_POLICY.contact.phone}
          </p>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// LIABILITY MODAL COMPONENT
// ============================================================================

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: string; // 'Herding Cats Wine Tours' or default to NW Touring
}

export function LiabilityModal({ isOpen, onClose, brand }: LiabilityModalProps) {
  if (!isOpen) return null;

  const displayName = getNWTouringDisplayName(brand);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Transportation Terms & Conditions</h2>
            <p className="text-gray-300 text-sm">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="space-y-6">
            {NW_TOURING_LIABILITY_SECTIONS.map((section) => (
              <div key={section.id}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {section.number} {section.title}
                </h3>
                <p className="text-gray-700">{section.content}</p>
                {section.subsections && (
                  <ul className="mt-3 space-y-2 text-gray-600">
                    {section.subsections.map((sub) => (
                      <li key={sub.id} className="flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span>
                          <strong>{sub.label}:</strong> {sub.content}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Vehicle Damage Fees Table */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Vehicle Damage Fee Schedule
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold">Type</th>
                      <th className="text-left py-2 px-3 font-semibold">Description</th>
                      <th className="text-right py-2 px-3 font-semibold">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VEHICLE_DAMAGE_FEES.map((fee) => (
                      <tr key={fee.type} className="border-b border-gray-200">
                        <td className="py-2 px-3 capitalize">{fee.type.replace('_', ' ')}</td>
                        <td className="py-2 px-3 text-gray-600">{fee.description}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          {fee.fee > 0 ? `$${fee.fee}` : 'Actual cost'}
                          {fee.notes && <span className="text-gray-500">*</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer info */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>
                <strong>Version:</strong> {NW_TOURING_TERMS.version} |{' '}
                <strong>Last Updated:</strong> {NW_TOURING_TERMS.lastUpdated}
              </p>
              <p className="mt-1">
                USDOT: {NW_TOURING_TERMS.company.usdot} | MC: {NW_TOURING_TERMS.company.mc}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIABILITY SUMMARY COMPONENT
// ============================================================================

interface LiabilitySummaryProps {
  onViewFull?: () => void;
  brand?: string;
}

export function LiabilitySummary({ onViewFull, brand }: LiabilitySummaryProps) {
  const displayName = getNWTouringDisplayName(brand);
  const summaryPoints = getLiabilitySummary();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Key Terms ({displayName})</h3>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View full terms
          </button>
        )}
      </div>
      <ul className="space-y-1 text-sm text-gray-600">
        {summaryPoints.slice(0, 5).map((point, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-gray-400">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// TERMS CHECKBOX COMPONENT
// ============================================================================

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onViewTerms?: () => void;
  onViewCancellation?: () => void;
  brand?: string;
  includeTransportation?: boolean;
}

export function TermsCheckbox({
  checked,
  onChange,
  onViewTerms,
  onViewCancellation,
  brand,
  includeTransportation = true,
}: TermsCheckboxProps) {
  const displayName = getNWTouringDisplayName(brand);

  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">
        I have read and agree to the{' '}
        <button
          type="button"
          onClick={onViewTerms}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Terms and Conditions
        </button>
        {includeTransportation && (
          <>
            {', '}
            <button
              type="button"
              onClick={onViewTerms}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Transportation Terms ({displayName})
            </button>
          </>
        )}
        {', and '}
        <button
          type="button"
          onClick={onViewCancellation}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Cancellation Policy
        </button>
        .
      </span>
    </label>
  );
}

// ============================================================================
// COMBINED TERMS MODAL
// ============================================================================

type TermsTab = 'wwt' | 'transportation' | 'cancellation';

interface CombinedTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TermsTab;
  brand?: string;
  showTransportation?: boolean;
}

export function CombinedTermsModal({
  isOpen,
  onClose,
  initialTab = 'wwt',
  brand,
  showTransportation = true,
}: CombinedTermsModalProps) {
  const [activeTab, setActiveTab] = useState<TermsTab>(initialTab);
  const displayName = getNWTouringDisplayName(brand);

  if (!isOpen) return null;

  const tabs = [
    { id: 'wwt' as const, label: 'Terms of Service' },
    ...(showTransportation
      ? [{ id: 'transportation' as const, label: `Transportation (${displayName})` }]
      : []),
    { id: 'cancellation' as const, label: 'Cancellation Policy' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Terms & Policies</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {activeTab === 'wwt' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Last updated: {WWT_TERMS.lastUpdated}
              </p>
              {WWT_TERMS.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {section.number}. {section.title}
                  </h3>
                  {section.content && (
                    <p className="text-gray-700">{section.content}</p>
                  )}
                  {section.subsections && (
                    <div className="mt-3 space-y-3">
                      {section.subsections.map((sub) => (
                        <div key={sub.id} className="pl-4 border-l-2 border-gray-200">
                          <p className="text-gray-700">
                            <strong>{sub.label}:</strong> {sub.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'transportation' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Transportation services provided by <strong>{displayName}</strong>
                  <br />
                  USDOT: {NW_TOURING_TERMS.company.usdot} | MC: {NW_TOURING_TERMS.company.mc}
                </p>
              </div>
              {NW_TOURING_LIABILITY_SECTIONS.map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {section.number} {section.title}
                  </h3>
                  <p className="text-gray-700">{section.content}</p>
                  {section.subsections && (
                    <ul className="mt-3 space-y-2 text-gray-600">
                      {section.subsections.map((sub) => (
                        <li key={sub.id} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>
                            <strong>{sub.label}:</strong> {sub.content}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cancellation' && (
            <CancellationPolicyFull showContact={true} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WRAPPER COMPONENT WITH STATE
// ============================================================================

interface PolicyDisplayProps {
  showCancellationSummary?: boolean;
  showLiabilitySummary?: boolean;
  showTermsCheckbox?: boolean;
  termsChecked?: boolean;
  onTermsChange?: (checked: boolean) => void;
  brand?: string;
  includeTransportation?: boolean;
}

export function PolicyDisplay({
  showCancellationSummary = true,
  showLiabilitySummary = true,
  showTermsCheckbox = false,
  termsChecked = false,
  onTermsChange,
  brand,
  includeTransportation = true,
}: PolicyDisplayProps) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [modalTab, setModalTab] = useState<TermsTab>('wwt');

  const openModal = (tab: TermsTab) => {
    setModalTab(tab);
    setShowTermsModal(true);
  };

  return (
    <div className="space-y-4">
      {showCancellationSummary && <CancellationPolicySummary />}

      {showLiabilitySummary && includeTransportation && (
        <LiabilitySummary
          onViewFull={() => openModal('transportation')}
          brand={brand}
        />
      )}

      {showTermsCheckbox && onTermsChange && (
        <TermsCheckbox
          checked={termsChecked}
          onChange={onTermsChange}
          onViewTerms={() => openModal('wwt')}
          onViewCancellation={() => openModal('cancellation')}
          brand={brand}
          includeTransportation={includeTransportation}
        />
      )}

      <CombinedTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialTab={modalTab}
        brand={brand}
        showTransportation={includeTransportation}
      />
    </div>
  );
}
