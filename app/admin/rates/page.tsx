'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/rate-config';

// ============================================================================
// Rate Configuration Types
// ============================================================================

interface WineTourRateValues {
  base_rate: number;
  per_person_charge: number;
  per_person_threshold: number;
  minimum_hours: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
}

interface TransferRateValues {
  seatac_to_walla: number;
  walla_to_seatac: number;
  pasco_to_walla: number;
  walla_to_pasco: number;
  local_base: number;
  local_per_mile: number;
}

interface WaitTimeRateValues {
  hourly_rate: number;
  minimum_hours: number;
}

interface DepositsFeesValues {
  deposit_percentage: number;
  tax_rate: number;
  cancellation_days: number;
  cancellation_fee_percentage: number;
}

interface GratuityValues {
  default_percentage: number;
  quick_select_options: number[];
}

type RateConfigValue = WineTourRateValues | TransferRateValues | WaitTimeRateValues | DepositsFeesValues | GratuityValues | Record<string, number | boolean | number[]>;

interface RateConfig {
  id: number;
  config_key: string;
  config_value: RateConfigValue;
  description: string;
  last_updated_by: string;
  updated_at: string;
  created_at: string;
}

export default function RatesManagementPage() {
  const [rates, setRates] = useState<RateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<RateConfigValue>({});
  const [saveReason, setSaveReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/admin/rates');
      const data = await response.json();
      if (data.success) {
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (rate: RateConfig) => {
    setEditingKey(rate.config_key);
    setEditValues(rate.config_value);
    setSaveReason('');
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValues({});
    setSaveReason('');
  };

  const saveChanges = async (configKey: string) => {
    if (!saveReason.trim()) {
      alert('Please provide a reason for this rate change');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_key: configKey,
          config_value: editValues,
          changed_by: 'admin', // TODO: Get from auth session
          change_reason: saveReason
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchRates();
        setEditingKey(null);
        setEditValues({});
        setSaveReason('');
        alert('Rates updated successfully!');
      } else {
        alert('Failed to update rates: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving rates:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateEditValue = (key: string, value: number | boolean | number[]) => {
    setEditValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Rate Management</h1>
          <p className="text-gray-600">
            Manage global pricing rates for all services. Changes will apply to new proposals immediately.
          </p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Important:</strong> Rate changes affect all new proposals. Existing proposals will keep their original pricing.
            </p>
          </div>
        </div>

        {/* Rate Cards */}
        <div className="space-y-6">
          {rates.map((rate) => (
            <div key={rate.id} className="bg-white rounded-lg shadow-sm border-2 border-gray-200">
              {/* Card Header */}
              <div className="bg-[#FDF2F4] p-4 border-b-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {rate.config_key === 'wine_tours' && '🍷 Wine Tours'}
                      {rate.config_key === 'transfers' && '🚐 Transfers'}
                      {rate.config_key === 'wait_time' && '⏱️ Wait Time'}
                      {rate.config_key === 'deposits_and_fees' && '💳 Deposits & Fees'}
                      {rate.config_key === 'gratuity' && '💰 Gratuity'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{rate.description}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Last updated: {new Date(rate.updated_at).toLocaleDateString()}</p>
                    {rate.last_updated_by && <p>By: {rate.last_updated_by}</p>}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {editingKey === rate.config_key ? (
                  // Edit Mode
                  <div className="space-y-4">
                    {rate.config_key === 'wine_tours' && (
                      <WineTourRateEditor values={editValues as WineTourRateValues} onChange={updateEditValue} />
                    )}
                    {rate.config_key === 'transfers' && (
                      <TransferRateEditor values={editValues as TransferRateValues} onChange={updateEditValue} />
                    )}
                    {rate.config_key === 'wait_time' && (
                      <WaitTimeRateEditor values={editValues as WaitTimeRateValues} onChange={updateEditValue} />
                    )}
                    {rate.config_key === 'deposits_and_fees' && (
                      <DepositsFeesEditor values={editValues as DepositsFeesValues} onChange={updateEditValue} />
                    )}
                    {rate.config_key === 'gratuity' && (
                      <GratuityEditor values={editValues as GratuityValues} onChange={updateEditValue} />
                    )}

                    {/* Reason for Change */}
                    <div className="mt-6 pt-6 border-t-2 border-gray-200">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Reason for Rate Change *
                      </label>
                      <input
                        type="text"
                        value={saveReason}
                        onChange={(e) => setSaveReason(e.target.value)}
                        placeholder="e.g., Annual price increase, competitor adjustment, cost changes..."
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => saveChanges(rate.config_key)}
                        disabled={saving || !saveReason.trim()}
                        className="px-6 py-2 bg-[#8B1538] hover:bg-[#6D1028] text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    {rate.config_key === 'wine_tours' && (
                      <WineTourRateDisplay values={rate.config_value as WineTourRateValues} />
                    )}
                    {rate.config_key === 'transfers' && (
                      <TransferRateDisplay values={rate.config_value as TransferRateValues} />
                    )}
                    {rate.config_key === 'wait_time' && (
                      <WaitTimeRateDisplay values={rate.config_value as WaitTimeRateValues} />
                    )}
                    {rate.config_key === 'deposits_and_fees' && (
                      <DepositsFeesDisplay values={rate.config_value as DepositsFeesValues} />
                    )}
                    {rate.config_key === 'gratuity' && (
                      <GratuityDisplay values={rate.config_value as GratuityValues} />
                    )}

                    <button
                      onClick={() => startEditing(rate)}
                      className="mt-4 px-6 py-2 bg-[#8B1538] hover:bg-[#6D1028] text-white rounded-lg font-bold transition-colors"
                    >
                      Edit Rates
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Wine Tour Rate Components
function WineTourRateDisplay({ values }: { values: WineTourRateValues }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Base Hourly Rate</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.base_rate)}/hr</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Per Person Charge</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.per_person_charge)}/person</p>
        <p className="text-xs text-gray-500 mt-1">After {values.per_person_threshold} guests</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Minimum Hours</p>
        <p className="text-2xl font-bold text-gray-900">{values.minimum_hours} hrs</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Weekend Multiplier</p>
        <p className="text-2xl font-bold text-gray-900">{values.weekend_multiplier}x</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Holiday Multiplier</p>
        <p className="text-2xl font-bold text-gray-900">{values.holiday_multiplier}x</p>
      </div>
    </div>
  );
}

function WineTourRateEditor({ values, onChange }: { values: WineTourRateValues; onChange: (key: string, value: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Base Hourly Rate ($)</label>
        <input
          type="number"
          value={values.base_rate || 0}
          onChange={(e) => onChange('base_rate', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Per Person Charge ($)</label>
        <input
          type="number"
          value={values.per_person_charge || 0}
          onChange={(e) => onChange('per_person_charge', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Per Person Threshold</label>
        <input
          type="number"
          value={values.per_person_threshold || 0}
          onChange={(e) => onChange('per_person_threshold', parseInt(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Minimum Hours</label>
        <input
          type="number"
          value={values.minimum_hours || 0}
          onChange={(e) => onChange('minimum_hours', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Weekend Multiplier</label>
        <input
          type="number"
          step="0.1"
          value={values.weekend_multiplier || 0}
          onChange={(e) => onChange('weekend_multiplier', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Holiday Multiplier</label>
        <input
          type="number"
          step="0.1"
          value={values.holiday_multiplier || 0}
          onChange={(e) => onChange('holiday_multiplier', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
    </div>
  );
}

// Transfer Rate Components
function TransferRateDisplay({ values }: { values: TransferRateValues }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">SeaTac ↔ Walla Walla</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.seatac_to_walla)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Pasco ↔ Walla Walla</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.pasco_to_walla)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Local Transfer</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.local_base)} + {formatCurrency(values.local_per_mile)}/mi</p>
      </div>
    </div>
  );
}

function TransferRateEditor({ values, onChange }: { values: TransferRateValues; onChange: (key: string, value: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">SeaTac → Walla Walla ($)</label>
        <input
          type="number"
          value={values.seatac_to_walla || 0}
          onChange={(e) => onChange('seatac_to_walla', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Walla Walla → SeaTac ($)</label>
        <input
          type="number"
          value={values.walla_to_seatac || 0}
          onChange={(e) => onChange('walla_to_seatac', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Pasco → Walla Walla ($)</label>
        <input
          type="number"
          value={values.pasco_to_walla || 0}
          onChange={(e) => onChange('pasco_to_walla', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Walla Walla → Pasco ($)</label>
        <input
          type="number"
          value={values.walla_to_pasco || 0}
          onChange={(e) => onChange('walla_to_pasco', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Local Base Rate ($)</label>
        <input
          type="number"
          value={values.local_base || 0}
          onChange={(e) => onChange('local_base', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Per Mile Rate ($)</label>
        <input
          type="number"
          step="0.1"
          value={values.local_per_mile || 0}
          onChange={(e) => onChange('local_per_mile', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
    </div>
  );
}

// Wait Time Components
function WaitTimeRateDisplay({ values }: { values: WaitTimeRateValues }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Hourly Rate</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(values.hourly_rate)}/hr</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Minimum Hours</p>
        <p className="text-2xl font-bold text-gray-900">{values.minimum_hours} hrs</p>
      </div>
    </div>
  );
}

function WaitTimeRateEditor({ values, onChange }: { values: WaitTimeRateValues; onChange: (key: string, value: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Hourly Rate ($)</label>
        <input
          type="number"
          value={values.hourly_rate || 0}
          onChange={(e) => onChange('hourly_rate', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Minimum Hours</label>
        <input
          type="number"
          step="0.5"
          value={values.minimum_hours || 0}
          onChange={(e) => onChange('minimum_hours', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
    </div>
  );
}

// Deposits & Fees Components
function DepositsFeesDisplay({ values }: { values: DepositsFeesValues }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Deposit %</p>
        <p className="text-2xl font-bold text-gray-900">{values.deposit_percentage}%</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Tax Rate</p>
        <p className="text-2xl font-bold text-gray-900">{(values.tax_rate * 100).toFixed(2)}%</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Cancellation Window</p>
        <p className="text-2xl font-bold text-gray-900">{values.cancellation_days} days</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Cancellation Fee</p>
        <p className="text-2xl font-bold text-gray-900">{values.cancellation_fee_percentage}%</p>
      </div>
    </div>
  );
}

function DepositsFeesEditor({ values, onChange }: { values: DepositsFeesValues; onChange: (key: string, value: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Deposit Percentage (%)</label>
        <input
          type="number"
          value={values.deposit_percentage || 0}
          onChange={(e) => onChange('deposit_percentage', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Tax Rate (decimal, e.g., 0.089 for 8.9%)</label>
        <input
          type="number"
          step="0.001"
          value={values.tax_rate || 0}
          onChange={(e) => onChange('tax_rate', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Cancellation Window (days)</label>
        <input
          type="number"
          value={values.cancellation_days || 0}
          onChange={(e) => onChange('cancellation_days', parseInt(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Cancellation Fee (%)</label>
        <input
          type="number"
          value={values.cancellation_fee_percentage || 0}
          onChange={(e) => onChange('cancellation_fee_percentage', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
    </div>
  );
}

// Gratuity Components
function GratuityDisplay({ values }: { values: GratuityValues }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Default Percentage</p>
        <p className="text-2xl font-bold text-gray-900">{values.default_percentage}%</p>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-1">Quick Select Options</p>
        <p className="text-2xl font-bold text-gray-900">{values.quick_select_options.join('%, ')}%</p>
      </div>
    </div>
  );
}

function GratuityEditor({ values, onChange }: { values: GratuityValues; onChange: (key: string, value: number | boolean | number[]) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Default Percentage (%)</label>
        <input
          type="number"
          value={values.default_percentage || 0}
          onChange={(e) => onChange('default_percentage', parseInt(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Quick Select Options (comma-separated)</label>
        <input
          type="text"
          value={values.quick_select_options?.join(', ') || ''}
          onChange={(e) => onChange('quick_select_options', e.target.value.split(',').map((v: string) => parseInt(v.trim())))}
          placeholder="15, 18, 20, 25"
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
        />
      </div>
    </div>
  );
}
