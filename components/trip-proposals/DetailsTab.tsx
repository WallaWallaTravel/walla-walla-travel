'use client';

import type { Brand, FormData } from './types';
import { TRIP_TYPE_OPTIONS } from '@/lib/types/trip-proposal';
import PhoneInput from '@/components/ui/PhoneInput';

interface DetailsTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  brands: Brand[];
}

export default function DetailsTab({ formData, setFormData, brands }: DetailsTabProps) {
  return (
    <div className="space-y-6">
      {/* Brand Selection */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Send As (Brand)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, brand_id: brand.id }))}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                formData.brand_id === brand.id
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: brand.primary_color || '#8B1538' }}
                />
                <span className="font-bold text-sm">{brand.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Customer Name *
          </label>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, customer_name: e.target.value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.customer_email}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, customer_email: e.target.value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Phone
          </label>
          <PhoneInput
            value={formData.customer_phone}
            onChange={(value) =>
              setFormData(prev => ({ ...prev, customer_phone: value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Party Size *
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.party_size}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, party_size: parseInt(e.target.value) || 1 }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Company / Organization
          </label>
          <input
            type="text"
            value={formData.customer_company}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, customer_company: e.target.value }))
            }
            placeholder="For corporate or group bookings"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
          />
        </div>
      </div>

      {/* Trip Type */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Trip Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TRIP_TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, trip_type: type.value }))}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                formData.trip_type === type.value
                  ? 'border-brand bg-brand-light'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-bold">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, start_date: e.target.value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={formData.end_date}
            min={formData.start_date}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, end_date: e.target.value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Valid Until
          </label>
          <input
            type="date"
            value={formData.valid_until}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, valid_until: e.target.value }))
            }
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
          />
        </div>
      </div>

      {/* Introduction */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Introduction (shown to client)
        </label>
        <textarea
          value={formData.introduction}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, introduction: e.target.value }))
          }
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
        />
      </div>

      {/* Internal Notes */}
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Internal Notes (staff only)
        </label>
        <textarea
          value={formData.internal_notes}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, internal_notes: e.target.value }))
          }
          rows={2}
          placeholder="Notes for staff reference..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand focus:ring-4 focus:ring-brand-light"
        />
      </div>
    </div>
  );
}
