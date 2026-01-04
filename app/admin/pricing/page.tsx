"use client";

/**
 * Admin Pricing Management
 * View and edit all pricing tiers and modifiers
 */

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/rate-config';

interface PricingTier {
  id: number;
  service_type: string;
  tier_name: string;
  description: string;
  party_size_min: number;
  party_size_max: number;
  day_type: string;
  pricing_model: string;
  base_rate: number;
  hourly_rate: number;
  minimum_charge: number;
  active: boolean;
  notes: string;
}

interface PricingModifier {
  id: number;
  name: string;
  description: string;
  modifier_type: string;
  value_type: string;
  value: number;
  active: boolean;
  priority: number;
}

// Pricing Calculator Component - Live/Reactive
function PricingCalculator() {
  const [serviceType, setServiceType] = useState<'wine_tour' | 'transfer' | 'wait_time'>('wine_tour');
  const [partySize, setPartySize] = useState(4);
  const [durationHours, setDurationHours] = useState(6);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferType, setTransferType] = useState('seatac');
  const [waitHours, setWaitHours] = useState(2);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Debounced auto-calculate whenever inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, partySize, durationHours, date, transferType, waitHours]);

  const calculatePrice = async () => {
    // Validate inputs before calling API
    if (!partySize || partySize < 1 || !date) return;
    if (serviceType === 'wine_tour' && (!durationHours || durationHours < 1)) return;
    if (serviceType === 'wait_time' && (!waitHours || waitHours < 0.5)) return;

    setCalculating(true);
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType,
          partySize,
          durationHours: serviceType === 'wine_tour' ? durationHours : undefined,
          date,
          transferType: serviceType === 'transfer' ? transferType : undefined,
          hours: serviceType === 'wait_time' ? waitHours : undefined,
          applyModifiers: false
        })
      });

      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // API returned HTML (error page) - use fallback calculation
        setResult({
          success: false,
          error: 'Pricing API unavailable',
          tierUsed: { tier_name: 'Fallback Estimate', notes: 'Database pricing not configured' },
          baseRate: serviceType === 'wine_tour' ? durationHours * 100 : 500,
          finalPrice: serviceType === 'wine_tour' ? durationHours * 100 : 500,
          breakdown: ['Using fallback estimate - pricing tiers not configured in database']
        });
        return;
      }

      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        setResult(data);
      } else {
        // API returned an error in JSON format
        setResult({
          success: false,
          error: data.error || data.details || 'Calculation failed',
          tierUsed: { tier_name: 'Error', notes: data.error || 'No matching pricing tier found' },
          baseRate: 0,
          finalPrice: 0,
          breakdown: [data.error || 'No pricing tier found for these parameters']
        });
      }
    } catch (error) {
      console.error('Calculation error:', error);
      // Show a fallback when API fails
      setResult({
        success: false,
        error: 'Connection error',
        tierUsed: { tier_name: 'Offline Estimate', notes: 'Could not connect to pricing API' },
        baseRate: serviceType === 'wine_tour' ? durationHours * 100 : 500,
        finalPrice: serviceType === 'wine_tour' ? durationHours * 100 : 500,
        breakdown: ['Using offline estimate - check server connection']
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="wine_tour">🍷 Wine Tour</option>
            <option value="transfer">✈️ Transfer</option>
            <option value="wait_time">⏰ Wait Time</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Party Size</label>
            <input
              type="number"
              min="1"
              max="14"
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {serviceType === 'wine_tour' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
            <input
              type="number"
              min="1"
              max="12"
              step="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {serviceType === 'transfer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
            <select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="seatac">SeaTac Airport</option>
              <option value="seattle">Seattle Downtown</option>
              <option value="pasco">Pasco Airport</option>
              <option value="walla">Walla Walla Airport</option>
            </select>
          </div>
        )}

        {serviceType === 'wait_time' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wait Hours</label>
            <input
              type="number"
              min="0.5"
              max="8"
              step="0.5"
              value={waitHours}
              onChange={(e) => setWaitHours(parseFloat(e.target.value) || 0.5)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Live indicator instead of button */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <span className={`w-2 h-2 rounded-full ${calculating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
          <span>{calculating ? 'Calculating...' : 'Live pricing - updates as you type'}</span>
        </div>
      </div>

      {/* Results */}
      <div>
        {result ? (
          <div className={`bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-200 transition-opacity ${calculating ? 'opacity-60' : 'opacity-100'}`}>
            <h4 className="text-lg font-bold text-gray-900 mb-4">💰 Pricing Result</h4>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tier Used:</span>
                <span className="font-medium text-gray-900">{result.tierUsed?.tier_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Base Rate:</span>
                <span className="font-medium text-gray-900">{formatCurrency(result.baseRate)}</span>
              </div>
              {result.modifiers && result.modifiers.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Applied Modifiers:</p>
                  {result.modifiers.map((mod: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs ml-2">
                      <span className="text-gray-600">{mod.name}:</span>
                      <span className={mod.amount < 0 ? 'text-green-600' : 'text-red-600'}>
                        {mod.amount >= 0 ? '+' : ''}{formatCurrency(mod.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t-2 border-blue-300 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Final Price:</span>
              <span className={`text-2xl font-bold text-blue-600 transition-all ${calculating ? 'opacity-50' : ''}`}>
                {formatCurrency(result.finalPrice)}
              </span>
            </div>

            {result.tierUsed?.notes && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  💡 {result.tierUsed.notes}
                </p>
              </div>
            )}

            {result.breakdown && result.breakdown.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-blue-600 cursor-pointer font-medium">
                  ▼ View Breakdown
                </summary>
                <div className="mt-2 bg-white rounded p-3 text-xs text-gray-700 space-y-1">
                  {result.breakdown.map((line: string, i: number) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300 text-center">
            <div className="animate-pulse">
              <p className="text-gray-500">Calculating initial price...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingAdminPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [modifiers, setModifiers] = useState<PricingModifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'modifiers' | 'calculator'>('tiers');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const getDayTypeLabel = (dayType: string): string => {
    switch (dayType) {
      case 'sun_wed': return 'Sun-Wed';
      case 'thu_sat': return 'Thu-Sat';
      case 'weekday': return 'Sun-Wed'; // Legacy
      case 'weekend': return 'Thu-Sat'; // Legacy
      case 'any': return 'Any Day';
      default: return dayType;
    }
  };

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      
      const tiersResponse = await fetch('/api/admin/pricing/tiers');
      if (tiersResponse.ok) {
        const data = await tiersResponse.json();
        setTiers(data.tiers);
      }
      
      const modifiersResponse = await fetch('/api/admin/pricing/modifiers');
      if (modifiersResponse.ok) {
        const data = await modifiersResponse.json();
        setModifiers(data.modifiers);
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEdit = async (tierId: number, field: string, value: any) => {
    try {
      const response = await fetch(`/api/admin/pricing/tiers/${tierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value,
          changeReason: `Quick edit: ${field}`
        })
      });

      if (response.ok) {
        loadPricingData();
      }
    } catch (error) {
      console.error('Error updating tier:', error);
    }
  };

  const handleToggleActive = async (tierId: number, currentActive: boolean) => {
    await handleQuickEdit(tierId, 'active', !currentActive);
  };

  const filteredTiers = serviceFilter === 'all' 
    ? tiers 
    : tiers.filter(t => t.service_type === serviceFilter);

  const serviceTypes = Array.from(new Set(tiers.map(t => t.service_type)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">💰 Pricing Management</h1>
              <p className="text-sm text-gray-600">Centralized pricing control</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                + New Tier
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition">
                View History
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'tiers', label: `Pricing Tiers (${tiers.length})`, icon: '💵' },
              { id: 'modifiers', label: `Discounts & Modifiers (${modifiers.length})`, icon: '🏷️' },
              { id: 'calculator', label: 'Pricing Calculator', icon: '🧮' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
        
        {/* Pricing Tiers Tab */}
        {activeTab === 'tiers' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Service Type:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setServiceFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                      serviceFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({tiers.length})
                  </button>
                  {serviceTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setServiceFilter(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                        serviceFilter === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.replace('_', ' ')} ({tiers.filter(t => t.service_type === type).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing Tiers Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTiers.map((tier) => (
                    <tr key={tier.id} className={!tier.active ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(tier.id, tier.active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            tier.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tier.active ? '✓ Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{tier.tier_name}</div>
                        {tier.description && (
                          <div className="text-xs text-gray-500">{tier.description}</div>
                        )}
                        {tier.notes && (
                          <div className="text-xs text-blue-600 mt-1">💡 {tier.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tier.party_size_min === tier.party_size_max 
                          ? tier.party_size_min 
                          : `${tier.party_size_min}-${tier.party_size_max}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {getDayTypeLabel(tier.day_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={tier.hourly_rate || tier.base_rate}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (newValue !== (tier.hourly_rate || tier.base_rate)) {
                              handleQuickEdit(
                                tier.id, 
                                tier.pricing_model === 'hourly' ? 'hourly_rate' : 'base_rate',
                                newValue
                              );
                            }
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm font-medium text-gray-900"
                        />
                        <span className="ml-1 text-xs text-gray-500">
                          {tier.pricing_model === 'hourly' ? '/hr' : 'flat'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tier.pricing_model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setEditingTier(tier);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTiers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No pricing tiers found for this filter.
              </div>
            )}
          </div>
        )}

        {/* Modifiers Tab */}
        {activeTab === 'modifiers' && (
          <div>
            <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">💡 About Modifiers</h3>
              <p className="text-gray-700 mb-3">
                Modifiers allow you to apply discounts, surcharges, or seasonal adjustments to your pricing.
                These are <strong>backend-only controls</strong> - they won't be publicly displayed unless you choose to.
              </p>
              <p className="text-sm text-gray-600">
                ✓ Early bird discounts | ✓ Volume discounts | ✓ Seasonal pricing | ✓ Holiday surcharges
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modifiers.map((modifier) => (
                    <tr key={modifier.id} className={!modifier.active ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          modifier.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {modifier.active ? '✓ Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{modifier.name}</div>
                        {modifier.description && (
                          <div className="text-xs text-gray-500">{modifier.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          modifier.modifier_type === 'discount' || modifier.modifier_type === 'early_bird' || modifier.modifier_type === 'volume'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {modifier.modifier_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {modifier.value_type === 'percentage' ? `${modifier.value}%` : formatCurrency(modifier.value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {modifier.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🧮 Pricing Calculator</h3>
            <p className="text-gray-600 mb-6">
              Test pricing calculations with different parameters before applying them to proposals.
            </p>
            
            <PricingCalculator />
          </div>
        )}
      </main>

      {/* Edit Tier Modal */}
      {showEditModal && editingTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Pricing Tier</h3>
              <p className="text-sm text-gray-600 mt-1">{editingTier.tier_name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <input
                  type="text"
                  value={editingTier.service_type}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {/* Tier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
                <input
                  type="text"
                  value={editingTier.tier_name}
                  onChange={(e) => setEditingTier({ ...editingTier, tier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingTier.description || ''}
                  onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Party Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Party Size</label>
                  <input
                    type="number"
                    value={editingTier.party_size_min}
                    onChange={(e) => setEditingTier({ ...editingTier, party_size_min: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Party Size</label>
                  <input
                    type="number"
                    value={editingTier.party_size_max}
                    onChange={(e) => setEditingTier({ ...editingTier, party_size_max: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Day Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day Type</label>
                <select
                  value={editingTier.day_type}
                  onChange={(e) => setEditingTier({ ...editingTier, day_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="sun_wed">Sun-Wed</option>
                  <option value="thu_sat">Thu-Sat</option>
                  <option value="any">Any Day</option>
                </select>
              </div>

              {/* Pricing Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                <select
                  value={editingTier.pricing_model}
                  onChange={(e) => setEditingTier({ ...editingTier, pricing_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="hourly">Hourly</option>
                  <option value="flat">Flat Rate</option>
                  <option value="per_person">Per Person</option>
                  <option value="per_mile">Per Mile</option>
                </select>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-2 gap-4">
                {editingTier.pricing_model === 'hourly' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTier.hourly_rate || 0}
                      onChange={(e) => setEditingTier({ ...editingTier, hourly_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTier.base_rate || 0}
                      onChange={(e) => setEditingTier({ ...editingTier, base_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Charge</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTier.minimum_charge || 0}
                    onChange={(e) => setEditingTier({ ...editingTier, minimum_charge: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingTier.notes || ''}
                  onChange={(e) => setEditingTier({ ...editingTier, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 4 hour minimum"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTier(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleQuickEdit(editingTier.id, 'tier_name', editingTier.tier_name);
                    await handleQuickEdit(editingTier.id, 'description', editingTier.description);
                    await handleQuickEdit(editingTier.id, 'party_size_min', editingTier.party_size_min);
                    await handleQuickEdit(editingTier.id, 'party_size_max', editingTier.party_size_max);
                    await handleQuickEdit(editingTier.id, 'day_type', editingTier.day_type);
                    await handleQuickEdit(editingTier.id, 'pricing_model', editingTier.pricing_model);
                    await handleQuickEdit(editingTier.id, 'hourly_rate', editingTier.hourly_rate);
                    await handleQuickEdit(editingTier.id, 'base_rate', editingTier.base_rate);
                    await handleQuickEdit(editingTier.id, 'minimum_charge', editingTier.minimum_charge);
                    await handleQuickEdit(editingTier.id, 'notes', editingTier.notes);
                    setShowEditModal(false);
                    setEditingTier(null);
                  } catch (error) {
                    console.error('Failed to save changes:', error);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

