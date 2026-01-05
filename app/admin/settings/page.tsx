"use client";

/**
 * System Settings Admin Page
 * Single source of truth for all configurable settings
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface SystemSetting {
  setting_key: string;
  setting_value: string | number | boolean | Record<string, unknown>;
  setting_type: string;
  description: string;
  updated_at: string;
}

// Type for day type definitions
interface DayTypeDefinition {
  icon: string;
  label: string;
  description: string;
  days: number[];
}

interface DayTypes {
  sun_wed: DayTypeDefinition;
  thu_sat: DayTypeDefinition;
}

// Type for editable settings values
interface EditableSettingsValue {
  card_percentage?: number;
  card_flat_fee?: number;
  pass_to_customer_percentage?: number;
  show_check_savings?: boolean;
  sales_tax_rate?: number;
  consultation_required_under?: number;
  per_person_ranges_over?: number;
  corporate_response_time_hours?: number;
  reserve_refine_consultation_hours?: number;
  quick_book_min_party_size?: number;
  corporate_min_party_size?: number;
  reserve_refine?: Record<string, number>;
  show_per_person?: boolean;
  include_tax_in_display?: boolean;
  conservative_ranges?: boolean;
  [key: string]: unknown;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payment' | 'pricing' | 'booking'>('payment');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<EditableSettingsValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      logger.error('Failed to load settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const _startEdit = (setting: SystemSetting) => {
    setEditingKey(setting.setting_key);
    setEditValue(JSON.parse(JSON.stringify(setting.setting_value)));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue(null);
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: editingKey,
          setting_value: editValue
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        loadSettings();
        cancelEdit();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const _getSettingsByType = (type: string) => {
    return settings.filter(s => s.setting_type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const paymentSettings = settings.find(s => s.setting_key === 'payment_processing')?.setting_value as EditableSettingsValue | undefined;
  const depositSettings = settings.find(s => s.setting_key === 'deposit_rules')?.setting_value as EditableSettingsValue | undefined;
  const pricingDisplay = settings.find(s => s.setting_key === 'pricing_display')?.setting_value as EditableSettingsValue | undefined;
  const dayTypes = settings.find(s => s.setting_key === 'day_type_definitions')?.setting_value as DayTypes | undefined;
  const taxSettings = settings.find(s => s.setting_key === 'tax_settings')?.setting_value as EditableSettingsValue | undefined;
  const bookingFlow = settings.find(s => s.setting_key === 'booking_flow_settings')?.setting_value as EditableSettingsValue | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚙️ System Settings</h1>
              <p className="text-sm text-gray-600">Single source of truth for all configuration</p>
            </div>
            {message && (
              <div className={`px-4 py-2 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'payment', label: 'Payment & Fees', icon: '💳' },
              { id: 'pricing', label: 'Pricing Display', icon: '💰' },
              { id: 'booking', label: 'Booking Flows', icon: '📅' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'payment' | 'pricing' | 'booking')}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Payment Tab */}
        {activeTab === 'payment' && paymentSettings && (
          <div className="space-y-6">
            {/* Card Processing Fees */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Credit Card Processing</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Processing Percentage
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editingKey === 'payment_processing' ? editValue?.card_percentage : paymentSettings?.card_percentage}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          const newSettings = editingKey === 'payment_processing' 
                            ? { ...editValue, card_percentage: value }
                            : { ...paymentSettings, card_percentage: value };
                          setEditingKey('payment_processing');
                          setEditValue(newSettings);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flat Fee per Transaction
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingKey === 'payment_processing' ? editValue?.card_flat_fee : paymentSettings?.card_flat_fee}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          const newSettings = editingKey === 'payment_processing' 
                            ? { ...editValue, card_flat_fee: value }
                            : { ...paymentSettings, card_flat_fee: value };
                          setEditingKey('payment_processing');
                          setEditValue(newSettings);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pass to Customer (Surcharge)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        const newSettings = editingKey === 'payment_processing' 
                          ? { ...editValue, pass_to_customer_percentage: value }
                          : { ...paymentSettings, pass_to_customer_percentage: value };
                        setEditingKey('payment_processing');
                        setEditValue(newSettings);
                      }}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-blue-600 w-16">
                      {editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage) === 0) && "You absorb all fees"}
                    {((editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage) === 100) && "Customer pays all fees"}
                    {((editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage) ?? 0) > 0 &&
                     ((editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage) ?? 0) < 100 &&
                      `Customer pays ${editingKey === 'payment_processing' ? editValue?.pass_to_customer_percentage : paymentSettings?.pass_to_customer_percentage}% of fees`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_check_savings"
                    checked={editingKey === 'payment_processing' ? editValue?.show_check_savings : paymentSettings?.show_check_savings}
                    onChange={(e) => {
                      const newSettings = editingKey === 'payment_processing' 
                        ? { ...editValue, show_check_savings: e.target.checked }
                        : { ...paymentSettings, show_check_savings: e.target.checked };
                      setEditingKey('payment_processing');
                      setEditValue(newSettings);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="show_check_savings" className="text-sm text-gray-700">
                    Show &quot;Save $XX with check&quot; message to customers
                  </label>
                </div>

                {editingKey === 'payment_processing' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit Rules */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Deposit Requirements</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Reserve & Refine Flow</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        1-7 Guests
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">$</span>
                        <input
                          type="number"
                          min="0"
                          value={editingKey === 'deposit_rules' 
                            ? editValue?.reserve_refine?.['1-7'] 
                            : depositSettings?.reserve_refine?.['1-7'] || 0}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            const currentSettings = editingKey === 'deposit_rules' ? editValue : depositSettings;
                            const newSettings = {
                              ...currentSettings,
                              reserve_refine: {
                                ...currentSettings?.reserve_refine,
                                '1-7': value
                              }
                            };
                            setEditingKey('deposit_rules');
                            setEditValue(newSettings);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        8-14 Guests
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">$</span>
                        <input
                          type="number"
                          min="0"
                          value={editingKey === 'deposit_rules' 
                            ? editValue?.reserve_refine?.['8-14'] 
                            : depositSettings?.reserve_refine?.['8-14'] || 0}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            const currentSettings = editingKey === 'deposit_rules' ? editValue : depositSettings;
                            const newSettings = {
                              ...currentSettings,
                              reserve_refine: {
                                ...currentSettings?.reserve_refine,
                                '8-14': value
                              }
                            };
                            setEditingKey('deposit_rules');
                            setEditValue(newSettings);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Fixed deposit amounts to hold date/vehicle before finalizing details
                  </p>
                </div>

                {editingKey === 'deposit_rules' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tax Settings */}
            {taxSettings && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Tax Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Tax Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editingKey === 'tax_settings' ? editValue?.sales_tax_rate : taxSettings?.sales_tax_rate}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          const newSettings = editingKey === 'tax_settings' 
                            ? { ...editValue, sales_tax_rate: value }
                            : { ...taxSettings, sales_tax_rate: value };
                          setEditingKey('tax_settings');
                          setEditValue(newSettings);
                        }}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-gray-600">%</span>
                      <span className="text-sm text-gray-500">(Washington State)</span>
                    </div>
                  </div>

                  {editingKey === 'tax_settings' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing Display Settings</h2>
              <p className="text-gray-600 mb-6">
                Control how pricing is displayed to customers (AI Directory, quotes, etc.)
              </p>
              
              {pricingDisplay && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show_per_person"
                      checked={pricingDisplay?.show_per_person}
                      onChange={(e) => {
                        const newSettings = { ...pricingDisplay, show_per_person: e.target.checked };
                        setEditingKey('pricing_display');
                        setEditValue(newSettings);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="show_per_person" className="text-sm text-gray-700">
                      Show per-person pricing
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="include_tax_in_display"
                      checked={pricingDisplay?.include_tax_in_display}
                      onChange={(e) => {
                        const newSettings = { ...pricingDisplay, include_tax_in_display: e.target.checked };
                        setEditingKey('pricing_display');
                        setEditValue(newSettings);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="include_tax_in_display" className="text-sm text-gray-700">
                      Include tax in displayed prices
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="conservative_ranges"
                      checked={pricingDisplay?.conservative_ranges}
                      onChange={(e) => {
                        const newSettings = { ...pricingDisplay, conservative_ranges: e.target.checked };
                        setEditingKey('pricing_display');
                        setEditValue(newSettings);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="conservative_ranges" className="text-sm text-gray-700">
                      Use conservative price ranges (recommended for AI)
                    </label>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Smart Group Pricing Strategy</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          &quot;Consultation Required&quot; for groups under
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={editingKey === 'pricing_display' ? editValue?.consultation_required_under : pricingDisplay?.consultation_required_under}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 1 : parseInt(e.target.value);
                              const newSettings = editingKey === 'pricing_display' 
                                ? { ...editValue, consultation_required_under: value }
                                : { ...pricingDisplay, consultation_required_under: value };
                              setEditingKey('pricing_display');
                              setEditValue(newSettings);
                            }}
                            className="w-24 px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-gray-600">guests</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Groups ≤ this number directed to &quot;Let&apos;s Talk First&quot; (pricing too variable)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Per-person ranges for groups over
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={editingKey === 'pricing_display' ? editValue?.per_person_ranges_over : pricingDisplay?.per_person_ranges_over}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 1 : parseInt(e.target.value);
                              const newSettings = editingKey === 'pricing_display' 
                                ? { ...editValue, per_person_ranges_over: value }
                                : { ...pricingDisplay, per_person_ranges_over: value };
                              setEditingKey('pricing_display');
                              setEditValue(newSettings);
                            }}
                            className="w-24 px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-gray-600">guests</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Groups ≥ this number see &quot;$120-$145/person&quot; style pricing
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-3 text-xs text-gray-700">
                        <strong>Example with current settings:</strong>
                        <ul className="mt-2 space-y-1 ml-4">
                          <li>• 1-{((editingKey === 'pricing_display' ? editValue?.consultation_required_under : pricingDisplay?.consultation_required_under) ?? 1) - 1} guests → &quot;Contact us for custom pricing&quot;</li>
                          <li>• {editingKey === 'pricing_display' ? editValue?.consultation_required_under : pricingDisplay?.consultation_required_under}-{((editingKey === 'pricing_display' ? editValue?.per_person_ranges_over : pricingDisplay?.per_person_ranges_over) ?? 1) - 1} guests → Standard pricing ($650-$750)</li>
                          <li>• {editingKey === 'pricing_display' ? editValue?.per_person_ranges_over : pricingDisplay?.per_person_ranges_over}+ guests → Per-person ranges ($120-$145/person)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {editingKey === 'pricing_display' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Day Type Definitions */}
            {dayTypes && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Day Type Definitions</h2>
                <p className="text-gray-600 mb-6">
                  Define which days are &quot;Standard&quot; vs &quot;Premium&quot; for pricing
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {dayTypes.sun_wed.icon} {dayTypes.sun_wed.label}
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">{dayTypes.sun_wed.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <span
                          key={day}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dayTypes.sun_wed.days.includes(i)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {dayTypes.thu_sat.icon} {dayTypes.thu_sat.label}
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">{dayTypes.thu_sat.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <span
                          key={day}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dayTypes.thu_sat.days.includes(i)
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  💡 These definitions affect pricing tiers, wait time rates, and minimum hours
                </p>
              </div>
            )}
          </div>
        )}

        {/* Booking Tab */}
        {activeTab === 'booking' && bookingFlow && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Booking Flow Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corporate Response Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={editingKey === 'booking_flow_settings' && editValue ? editValue.corporate_response_time_hours : bookingFlow?.corporate_response_time_hours}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        const currentSettings = editingKey === 'booking_flow_settings' && editValue ? editValue : bookingFlow;
                        const newSettings = { ...currentSettings, corporate_response_time_hours: value };
                        setEditingKey('booking_flow_settings');
                        setEditValue(newSettings);
                      }}
                      onFocus={() => {
                        if (editingKey !== 'booking_flow_settings') {
                          setEditingKey('booking_flow_settings');
                          setEditValue({ ...bookingFlow });
                        }
                      }}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-gray-600">hours</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Promise to respond to corporate requests within this timeframe
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reserve & Refine Consultation Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={editingKey === 'booking_flow_settings' && editValue ? editValue.reserve_refine_consultation_hours : bookingFlow?.reserve_refine_consultation_hours}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        const currentSettings = editingKey === 'booking_flow_settings' && editValue ? editValue : bookingFlow;
                        const newSettings = { ...currentSettings, reserve_refine_consultation_hours: value };
                        setEditingKey('booking_flow_settings');
                        setEditValue(newSettings);
                      }}
                      onFocus={() => {
                        if (editingKey !== 'booking_flow_settings') {
                          setEditingKey('booking_flow_settings');
                          setEditValue({ ...bookingFlow });
                        }
                      }}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-gray-600">hours</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    How soon you&apos;ll reach out after they reserve
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quick Book Minimum Party Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingKey === 'booking_flow_settings' && editValue ? editValue.quick_book_min_party_size : bookingFlow?.quick_book_min_party_size}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        const currentSettings = editingKey === 'booking_flow_settings' && editValue ? editValue : bookingFlow;
                        const newSettings = { ...currentSettings, quick_book_min_party_size: value };
                        setEditingKey('booking_flow_settings');
                        setEditValue(newSettings);
                      }}
                      onFocus={() => {
                        if (editingKey !== 'booking_flow_settings') {
                          setEditingKey('booking_flow_settings');
                          setEditValue({ ...bookingFlow });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corporate Minimum Party Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingKey === 'booking_flow_settings' && editValue ? editValue.corporate_min_party_size : bookingFlow?.corporate_min_party_size}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        const currentSettings = editingKey === 'booking_flow_settings' && editValue ? editValue : bookingFlow;
                        const newSettings = { ...currentSettings, corporate_min_party_size: value };
                        setEditingKey('booking_flow_settings');
                        setEditValue(newSettings);
                      }}
                      onFocus={() => {
                        if (editingKey !== 'booking_flow_settings') {
                          setEditingKey('booking_flow_settings');
                          setEditValue({ ...bookingFlow });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {editingKey === 'booking_flow_settings' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

