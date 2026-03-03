'use client';

import type { FormData, InclusionData } from './types';
import { SERVICE_TEMPLATES, INCLUSION_TYPES, PRICING_TYPE_OPTIONS } from './types';
import { formatCurrency } from './utils';

interface PricingTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onAddServiceFromTemplate: (template: typeof SERVICE_TEMPLATES[number]) => void;
  onUpdateInclusion: (index: number, updates: Partial<InclusionData>) => void;
  onRemoveInclusion: (index: number) => void;
}

export default function PricingTab({
  formData,
  setFormData,
  onAddServiceFromTemplate,
  onUpdateInclusion,
  onRemoveInclusion,
}: PricingTabProps) {
  return (
    <div className="space-y-6">
      {/* Service Line Items */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Service Line Items</h3>

        {/* Quick-add template buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SERVICE_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => onAddServiceFromTemplate(template)}
              className="px-3 py-2 bg-gray-100 hover:bg-brand-light hover:text-brand text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200 hover:border-brand"
            >
              + {template.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {formData.inclusions.length === 0 && (
            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600 font-medium mb-1">No service line items yet</p>
              <p className="text-sm text-gray-500">Use the buttons above to add services</p>
            </div>
          )}

          {formData.inclusions.map((inclusion, index) => (
            <div
              key={inclusion.id}
              className="border-2 border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={inclusion.description}
                    onChange={(e) =>
                      onUpdateInclusion(index, { description: e.target.value })
                    }
                    placeholder="Description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={inclusion.pricing_type}
                    onChange={(e) =>
                      onUpdateInclusion(index, { pricing_type: e.target.value as InclusionData['pricing_type'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {PRICING_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveInclusion(index)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <select
                    value={inclusion.inclusion_type}
                    onChange={(e) =>
                      onUpdateInclusion(index, { inclusion_type: e.target.value })
                    }
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {INCLUSION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={inclusion.unit_price || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        onUpdateInclusion(index, {
                          unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Amount"
                      className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {inclusion.pricing_type === 'per_day' && (
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-xs">x</span>
                      <input
                        type="number"
                        min="1"
                        value={inclusion.quantity}
                        onChange={(e) =>
                          onUpdateInclusion(index, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center"
                      />
                    </div>
                  </div>
                )}
                <div className={`${inclusion.pricing_type === 'per_day' ? 'col-span-4' : 'col-span-6'} text-right`}>
                  <span className="text-sm text-gray-500">
                    {inclusion.pricing_type === 'per_person' && `$${inclusion.unit_price}/pp x ${formData.party_size} = `}
                    {inclusion.pricing_type === 'per_day' && `$${inclusion.unit_price} x ${inclusion.quantity} = `}
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(
                      inclusion.pricing_type === 'per_person'
                        ? inclusion.unit_price * formData.party_size
                        : inclusion.pricing_type === 'per_day'
                        ? inclusion.unit_price * inclusion.quantity
                        : inclusion.unit_price
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Discount Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.discount_amount}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  discount_amount: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Discount Reason
          </label>
          <input
            type="text"
            value={formData.discount_reason}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, discount_reason: e.target.value }))
            }
            placeholder="e.g., Repeat customer"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Tax Rate %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={formData.tax_rate}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                tax_rate: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Gratuity %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.gratuity_percentage}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                gratuity_percentage: parseInt(e.target.value) || 0,
              }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Deposit %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.deposit_percentage}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                deposit_percentage: parseInt(e.target.value) || 50,
              }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
          />
        </div>
      </div>
    </div>
  );
}
