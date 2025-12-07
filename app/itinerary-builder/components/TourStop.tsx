// Tour Stop Component - Individual winery stop

import React from 'react';
import { Stop } from '../types';

interface TourStopProps {
  stop: Stop;
  index: number;
  cascadeEnabled: boolean;
  onRemove: () => void;
  onTimeChange: (field: 'arrival_time' | 'departure_time', value: string) => void;
  onToggleLunch: () => void;
  onNudgeDuration: (adjustment: number) => void;
  onNudgeDriveTime: (adjustment: number) => void;
  onToggleCascade: () => void;
  onReservationChange: (confirmed: boolean) => void;
  onNotesChange: (notes: string | null) => void;
  onDurationChange: (minutes: number) => void;
  onDriveTimeChange: (minutes: number) => void;
  onCalculateTravelTime: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  showAutoCalculate: boolean;
  handleFocusSelect: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TourStop: React.FC<TourStopProps> = ({
  stop,
  index,
  cascadeEnabled,
  onRemove,
  onTimeChange,
  onToggleLunch,
  onNudgeDuration,
  onNudgeDriveTime,
  onToggleCascade,
  onReservationChange,
  onNotesChange,
  onDurationChange,
  onDriveTimeChange,
  onCalculateTravelTime,
  onDragStart,
  onDragOver,
  onDragEnd,
  showAutoCalculate,
  handleFocusSelect,
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className="bg-white rounded-lg shadow-md p-6 cursor-move hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-blue-400"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {stop.stop_order}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{stop.winery?.name}</h3>
            
            {/* Editable Times */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Arrival:</label>
                <input
                  type="time"
                  value={stop.arrival_time}
                  onChange={(e) => onTimeChange('arrival_time', e.target.value)}
                  onFocus={handleFocusSelect}
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg text-blue-600 font-bold text-lg focus:border-blue-500"
                />
              </div>
              <span className="text-gray-500 font-bold">→</span>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Departure:</label>
                <input
                  type="time"
                  value={stop.departure_time}
                  onChange={(e) => onTimeChange('departure_time', e.target.value)}
                  onFocus={handleFocusSelect}
                  className="px-3 py-1 border-2 border-gray-300 rounded-lg text-blue-600 font-bold text-lg focus:border-blue-500"
                />
              </div>
              <button
                onClick={onToggleLunch}
                className={`ml-4 px-3 py-1 rounded-full font-semibold text-sm ${
                  stop.is_lunch_stop
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🍽️ {stop.is_lunch_stop ? 'Lunch Stop' : 'Set as Lunch'}
              </button>
            </div>

            <div className="text-base font-semibold text-gray-700">
              {stop.winery?.address}, {stop.winery?.city}
            </div>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 font-bold text-lg ml-4"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-200">
        {/* Duration Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-900">Duration at Winery</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNudgeDuration(-5)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
            >
              ⬇️ -5
            </button>
            <input
              type="number"
              value={stop.duration_minutes}
              onChange={(e) => onDurationChange(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-gray-900 font-bold text-lg focus:border-blue-500"
            />
            <span className="text-gray-700 font-semibold">min</span>
            <button
              onClick={() => onNudgeDuration(5)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
            >
              ⬆️ +5
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cascadeEnabled}
              onChange={onToggleCascade}
              className="w-5 h-5"
            />
            <span className="text-sm font-semibold text-gray-700">Adjust following times</span>
          </label>
        </div>

        {/* Drive Time Controls */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-900">Drive to Next Stop</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNudgeDriveTime(-5)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
            >
              ⬇️ -5
            </button>
            <input
              type="number"
              value={stop.drive_time_to_next_minutes}
              onChange={(e) => onDriveTimeChange(parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-gray-900 font-bold text-lg focus:border-blue-500"
            />
            <span className="text-gray-700 font-semibold">min</span>
            <button
              onClick={() => onNudgeDriveTime(5)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900 transition-colors"
            >
              ⬆️ +5
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={cascadeEnabled}
                onChange={onToggleCascade}
                className="w-5 h-5"
              />
              <span className="text-sm font-semibold text-gray-700">Adjust following times</span>
            </label>
            {showAutoCalculate && (
              <button
                onClick={onCalculateTravelTime}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                📍 Auto-Calculate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stop.reservation_confirmed}
            onChange={(e) => onReservationChange(e.target.checked)}
            className="w-6 h-6"
          />
          <span className="text-base font-bold text-gray-900">Reservation Confirmed</span>
        </label>

        {/* Optional Notes Section */}
        <div>
          <button
            type="button"
            onClick={() => {
              if (!stop.special_notes) {
                onNotesChange('');
              }
            }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {stop.special_notes ? '📝 Edit Notes' : '+ Add Notes'}
          </button>
          
          {(stop.special_notes !== undefined && stop.special_notes !== null) && (
            <div className="mt-2">
              <textarea
                value={stop.special_notes}
                onChange={(e) => onNotesChange(e.target.value)}
                onFocus={handleFocusSelect}
                rows={3}
                placeholder="Add special notes for this stop..."
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => onNotesChange(null)}
                className="mt-1 text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Remove Notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




