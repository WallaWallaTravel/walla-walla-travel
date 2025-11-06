/**
 * Smart Service Card - Progressive Disclosure
 * 
 * Starts simple, expands only where needed
 */

'use client';

import { useState } from 'react';
import { SmartTimeInput } from '@/components/shared/form-inputs/SmartTimeInput';
import { SmartLocationInput } from '@/components/shared/form-inputs/SmartLocationInput';
import { WinerySelector } from './winery-selector';
import { formatCurrency } from '@/lib/rate-config';

interface ServiceItem {
  id: string;
  service_type: 'wine_tour' | 'airport_transfer' | 'local_transfer' | 'regional_transfer' | 'wait_time' | 'custom';
  name: string;
  date: string;
  party_size: number;
  
  // Wine tour
  duration_hours?: number;
  tour_type?: '2_winery' | '3_winery' | '4_winery' | 'custom';
  selected_wineries?: Array<{ id: number; name: string; city: string }>;
  start_time?: string;
  pickup_location?: string;
  
  // Transfer
  transfer_route?: string;
  pickup_location?: string;
  dropoff_location?: string;
  
  // Common
  description?: string;
  notes?: string;
  calculated_price: number;
  
  // Pricing override
  pricing_override?: {
    enabled: boolean;
    pricing_mode?: 'hourly' | 'fixed';
    custom_hourly_rate?: number;
    custom_total: number;
    override_reason?: string;
  };
}

interface SmartServiceCardProps {
  item: ServiceItem;
  index: number;
  wineries: Array<{ id: number; name: string; city: string }>;
  onUpdate: (updates: Partial<ServiceItem>) => void;
  onRemove: () => void;
}

export function SmartServiceCard({ item, index, wineries, onUpdate, onRemove }: SmartServiceCardProps) {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<{
    wineries: boolean;
    pickupDetails: boolean;
    transferDetails: boolean;
    customNotes: boolean;
    pricingOverride: boolean;
  }>({
    wineries: false,
    pickupDetails: false,
    transferDetails: false,
    customNotes: false,
    pricingOverride: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getServiceIcon = () => {
    const icons = {
      wine_tour: '🍷',
      airport_transfer: '✈️',
      local_transfer: '🚐',
      regional_transfer: '🚐',
      wait_time: '⏱️',
      custom: '📋'
    };
    return icons[item.service_type] || '📋';
  };

  const getTourTypeLabel = () => {
    const labels = {
      '2_winery': '2 Winery Tour',
      '3_winery': '3 Winery Tour',
      '4_winery': '4 Winery Tour',
      'custom': 'Custom Wine Tour'
    };
    return labels[item.tour_type || '3_winery'];
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getServiceIcon()}</span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600">Service #{index + 1}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 font-medium text-sm"
        >
          Remove
        </button>
      </div>

      {/* Simple Summary (Always Visible) */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Date:</span>
            <p className="font-medium text-gray-900">{new Date(item.date).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Guests:</span>
            <p className="font-medium text-gray-900">{item.party_size}</p>
          </div>
          {item.service_type === 'wine_tour' && (
            <>
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium text-gray-900">{item.duration_hours || 6} hours</p>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <p className="font-medium text-gray-900">{getTourTypeLabel()}</p>
              </div>
            </>
          )}
          {(item.service_type === 'airport_transfer' || item.service_type === 'local_transfer' || item.service_type === 'regional_transfer') && item.transfer_route && (
            <div className="col-span-2">
              <span className="text-gray-600">Route:</span>
              <p className="font-medium text-gray-900">{item.transfer_route}</p>
            </div>
          )}
        </div>
      </div>

      {/* Basic Fields */}
      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Date *</label>
            <input
              type="date"
              value={item.date}
              onChange={(e) => onUpdate({ date: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Party Size *</label>
            <input
              type="number"
              min="1"
              max="14"
              value={item.party_size}
              onChange={(e) => onUpdate({ party_size: parseInt(e.target.value) || 1 })}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              required
            />
          </div>
        </div>

        {/* Wine Tour: Duration & Tour Type */}
        {item.service_type === 'wine_tour' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Duration</label>
              <div className="flex gap-2 mb-2">
                {[5, 5.5, 6, 6.5].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => onUpdate({ duration_hours: hours })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      item.duration_hours === hours
                        ? 'bg-[#8B1538] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Tour Type</label>
              <select
                value={item.tour_type || '3_winery'}
                onChange={(e) => onUpdate({ tour_type: e.target.value as any })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
              >
                <option value="2_winery">2 Winery Tour</option>
                <option value="3_winery">3 Winery Tour</option>
                <option value="4_winery">4 Winery Tour</option>
                <option value="custom">Custom Tour</option>
              </select>
            </div>
          </div>
        )}

        {/* Airport/Local/Regional Transfer: Route */}
        {(item.service_type === 'airport_transfer' || item.service_type === 'local_transfer' || item.service_type === 'regional_transfer') && (
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Route Description</label>
            <input
              type="text"
              value={item.transfer_route || ''}
              onChange={(e) => onUpdate({ transfer_route: e.target.value })}
              placeholder="e.g., SeaTac → Walla Walla, Hotel → Downtown"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
            />
          </div>
        )}
      </div>

      {/* Expandable Sections */}
      <div className="space-y-3 mb-4">
        {/* Wine Tour: Specific Wineries */}
        {item.service_type === 'wine_tour' && !expandedSections.wineries && (
          <button
            type="button"
            onClick={() => toggleSection('wineries')}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors text-sm font-medium text-left"
          >
            + Add Specific Wineries (optional)
          </button>
        )}

        {item.service_type === 'wine_tour' && expandedSections.wineries && (
          <div className="border-2 border-[#8B1538] rounded-lg p-4 bg-[#FDF2F4]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900">Specific Wineries</label>
              <button
                type="button"
                onClick={() => toggleSection('wineries')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                − Remove Details
              </button>
            </div>
            <WinerySelector
              selectedWineries={item.selected_wineries || []}
              allWineries={wineries}
              onUpdate={(selected) => onUpdate({ selected_wineries: selected })}
              descriptionFieldId={`description-${item.id}`}
            />
          </div>
        )}

        {/* Wine Tour: Pickup Details */}
        {item.service_type === 'wine_tour' && !expandedSections.pickupDetails && (
          <button
            type="button"
            onClick={() => toggleSection('pickupDetails')}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors text-sm font-medium text-left"
          >
            + Add Pickup Time & Location (optional)
          </button>
        )}

        {item.service_type === 'wine_tour' && expandedSections.pickupDetails && (
          <div className="border-2 border-[#8B1538] rounded-lg p-4 bg-[#FDF2F4]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900">Pickup Details</label>
              <button
                type="button"
                onClick={() => toggleSection('pickupDetails')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                − Remove Details
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SmartTimeInput
                value={item.start_time || ''}
                onChange={(time) => onUpdate({ start_time: time })}
                label="Pickup Time"
                serviceType="wine_tour"
              />
              <SmartLocationInput
                value={item.pickup_location || ''}
                onChange={(location) => onUpdate({ pickup_location: location })}
                label="Pickup Location"
              />
            </div>
          </div>
        )}

        {/* Transfer: Specific Locations */}
        {(item.service_type === 'airport_transfer' || item.service_type === 'local_transfer' || item.service_type === 'regional_transfer') && !expandedSections.transferDetails && (
          <button
            type="button"
            onClick={() => toggleSection('transferDetails')}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors text-sm font-medium text-left"
          >
            + Add Specific Pickup & Dropoff (optional)
          </button>
        )}

        {(item.service_type === 'airport_transfer' || item.service_type === 'local_transfer' || item.service_type === 'regional_transfer') && expandedSections.transferDetails && (
          <div className="border-2 border-[#8B1538] rounded-lg p-4 bg-[#FDF2F4]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900">Transfer Details</label>
              <button
                type="button"
                onClick={() => toggleSection('transferDetails')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                − Remove Details
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SmartLocationInput
                value={item.pickup_location || ''}
                onChange={(location) => onUpdate({ pickup_location: location })}
                label="Pickup Location"
              />
              <SmartLocationInput
                value={item.dropoff_location || ''}
                onChange={(location) => onUpdate({ dropoff_location: location })}
                label="Dropoff Location"
              />
            </div>
          </div>
        )}

        {/* Custom Notes */}
        {!expandedSections.customNotes && (
          <button
            type="button"
            onClick={() => toggleSection('customNotes')}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors text-sm font-medium text-left"
          >
            + Add Custom Notes (optional)
          </button>
        )}

        {expandedSections.customNotes && (
          <div className="border-2 border-[#8B1538] rounded-lg p-4 bg-[#FDF2F4]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900">Custom Notes</label>
              <button
                type="button"
                onClick={() => toggleSection('customNotes')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                − Remove Details
              </button>
            </div>
            <textarea
              id={`description-${item.id}`}
              value={item.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={3}
              placeholder="Add any special requests or notes for this service..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
            />
          </div>
        )}

        {/* Pricing Override */}
        {!expandedSections.pricingOverride && (
          <button
            type="button"
            onClick={() => toggleSection('pricingOverride')}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors text-sm font-medium text-left"
          >
            + Override Pricing (optional)
          </button>
        )}

        {expandedSections.pricingOverride && (
          <div className="border-2 border-[#8B1538] rounded-lg p-4 bg-[#FDF2F4]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-900">Pricing Override</label>
              <button
                type="button"
                onClick={() => toggleSection('pricingOverride')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                − Remove Override
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Standard Price: <span className="text-gray-900">{formatCurrency(item.calculated_price)}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.pricing_override?.custom_total || 0}
                    onChange={(e) => onUpdate({
                      pricing_override: {
                        enabled: true,
                        custom_total: parseFloat(e.target.value) || 0,
                        override_reason: item.pricing_override?.override_reason
                      }
                    })}
                    className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason (Internal Note)</label>
                <input
                  type="text"
                  value={item.pricing_override?.override_reason || ''}
                  onChange={(e) => onUpdate({
                    pricing_override: {
                      enabled: true,
                      custom_total: item.pricing_override?.custom_total || 0,
                      override_reason: e.target.value
                    }
                  })}
                  placeholder="e.g., Corporate discount, repeat customer..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Display */}
      <div className="bg-[#FAF6ED] rounded-lg p-3 border-2 border-[#D4AF37]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Service Price:</span>
          <span className="text-2xl font-bold text-[#8B1538]">
            {formatCurrency(item.pricing_override?.enabled ? item.pricing_override.custom_total : item.calculated_price)}
          </span>
        </div>
      </div>
    </div>
  );
}

