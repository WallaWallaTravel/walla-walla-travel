'use client';

import type { FormData, StopData, Winery, Restaurant, Hotel, SavedMenuOption } from './types';
import { STOP_TYPES } from './types';
import StopCard from './StopCard';

interface DaysTabProps {
  formData: FormData;
  wineries: Winery[];
  restaurants: Restaurant[];
  hotels: Hotel[];
  savedMenus: SavedMenuOption[];
  onAddStop: (dayIndex: number, stopType: string) => void;
  onUpdateStop: (dayIndex: number, stopIndex: number, updates: Partial<StopData>) => void;
  onRemoveStop: (dayIndex: number, stopIndex: number) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export default function DaysTab({
  formData,
  wineries,
  restaurants,
  hotels,
  savedMenus,
  onAddStop,
  onUpdateStop,
  onRemoveStop,
  setFormData,
}: DaysTabProps) {
  if (formData.days.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-gray-600 font-bold mb-2">No days configured</p>
        <p className="text-sm text-gray-500">
          Set start and end dates in the Details tab to create days
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {formData.days.map((day, dayIndex) => (
        <div
          key={day.id}
          className="border-2 border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="bg-brand-light p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <input
                  type="text"
                  value={day.title}
                  onChange={(e) => {
                    const newDays = [...formData.days];
                    newDays[dayIndex].title = e.target.value;
                    setFormData(prev => ({ ...prev, days: newDays }));
                  }}
                  className="font-bold text-gray-900 bg-transparent border-0 focus:ring-0 p-0"
                />
                <div className="text-sm text-gray-600">{day.date}</div>
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Stops */}
            {day.stops.map((stop, stopIndex) => (
              <StopCard
                key={stop.id}
                stop={stop}
                wineries={wineries}
                restaurants={restaurants}
                hotels={hotels}
                savedMenus={savedMenus}
                onUpdate={(updates) => onUpdateStop(dayIndex, stopIndex, updates)}
                onRemove={() => onRemoveStop(dayIndex, stopIndex)}
              />
            ))}

            {/* Add Stop Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              {STOP_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onAddStop(dayIndex, type.value)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
