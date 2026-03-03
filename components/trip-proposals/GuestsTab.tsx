'use client';

import type { GuestData } from './types';
import PhoneInput from '@/components/ui/PhoneInput';

interface GuestsTabProps {
  guests: GuestData[];
  onAddGuest: () => void;
  onUpdateGuest: (index: number, updates: Partial<GuestData>) => void;
  onRemoveGuest: (index: number) => void;
}

export default function GuestsTab({
  guests,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
}: GuestsTabProps) {
  if (guests.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-2">👥</div>
        <p className="text-gray-600 font-bold mb-4">No guests added yet</p>
        <button
          type="button"
          onClick={onAddGuest}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg font-bold transition-colors"
        >
          + Add Guest
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {guests.map((guest, index) => (
        <div
          key={guest.id}
          className="border-2 border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <span className="font-bold">
                Guest {index + 1}
                {guest.is_primary && (
                  <span className="ml-2 px-2 py-0.5 bg-brand text-white text-xs rounded">
                    Primary
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveGuest(index)}
              className="text-red-600 hover:text-red-800 font-bold text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={guest.name}
              onChange={(e) => onUpdateGuest(index, { name: e.target.value })}
              placeholder="Name"
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
            <input
              type="email"
              value={guest.email || ''}
              onChange={(e) => onUpdateGuest(index, { email: e.target.value })}
              placeholder="Email"
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
            <PhoneInput
              value={guest.phone || ''}
              onChange={(value) => onUpdateGuest(index, { phone: value })}
              placeholder="Phone"
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
            <input
              type="text"
              value={guest.dietary_restrictions || ''}
              onChange={(e) =>
                onUpdateGuest(index, { dietary_restrictions: e.target.value })
              }
              placeholder="Dietary restrictions"
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddGuest}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-brand text-gray-600 hover:text-brand rounded-lg font-bold transition-colors"
      >
        + Add Another Guest
      </button>
    </div>
  );
}
