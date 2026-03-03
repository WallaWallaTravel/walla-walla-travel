'use client';

import type { StopData, Winery, Restaurant, Hotel } from './types';
import { STOP_TYPES } from './types';

interface StopCardProps {
  stop: StopData;
  wineries: Winery[];
  restaurants: Restaurant[];
  hotels: Hotel[];
  onUpdate: (updates: Partial<StopData>) => void;
  onRemove: () => void;
}

export default function StopCard({
  stop,
  wineries,
  restaurants,
  hotels,
  onUpdate,
  onRemove,
}: StopCardProps) {
  const stopType = STOP_TYPES.find((t) => t.value === stop.stop_type);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{stopType?.icon || '📍'}</span>
          <span className="font-bold text-sm">{stopType?.label || 'Stop'}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm font-bold"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Venue Selection based on type */}
        {stop.stop_type === 'winery' && (
          <div className="col-span-2">
            <select
              value={stop.winery_id || ''}
              onChange={(e) => onUpdate({ winery_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select winery...</option>
              {wineries.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {stop.stop_type === 'restaurant' && (
          <div className="col-span-2">
            <select
              value={stop.restaurant_id || ''}
              onChange={(e) => onUpdate({ restaurant_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select restaurant...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} - {r.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {stop.stop_type === 'hotel' && (
          <div className="col-span-2">
            <select
              value={stop.hotel_id || ''}
              onChange={(e) => onUpdate({ hotel_id: parseInt(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select hotel...</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} - {h.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {['custom', 'activity', 'pickup', 'dropoff'].includes(stop.stop_type) && (
          <>
            <div>
              <input
                type="text"
                value={stop.custom_name || ''}
                onChange={(e) => onUpdate({ custom_name: e.target.value })}
                placeholder="Name"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <input
                type="text"
                value={stop.custom_address || ''}
                onChange={(e) => onUpdate({ custom_address: e.target.value })}
                placeholder="Address"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </>
        )}

        {/* Time and Duration */}
        <div>
          <input
            type="time"
            value={stop.scheduled_time || ''}
            onChange={(e) => onUpdate({ scheduled_time: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>

        <div>
          <input
            type="number"
            min="0"
            value={stop.duration_minutes || ''}
            onChange={(e) => onUpdate({ duration_minutes: parseInt(e.target.value) || undefined })}
            placeholder="Min"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Cost Note (informational, not calculated) */}
      <div className="mt-2">
        <input
          type="text"
          value={stop.cost_note || ''}
          onChange={(e) => onUpdate({ cost_note: e.target.value })}
          placeholder="e.g., Tasting fee ~$25/pp, paid at winery"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 italic"
        />
      </div>

      {/* Client Notes */}
      <div className="mt-2">
        <input
          type="text"
          value={stop.client_notes || ''}
          onChange={(e) => onUpdate({ client_notes: e.target.value })}
          placeholder="Notes for client..."
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
    </div>
  );
}
