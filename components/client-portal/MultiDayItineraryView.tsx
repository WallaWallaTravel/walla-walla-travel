'use client';

import { useState } from 'react';

interface ItineraryStop {
  id: number;
  name: string;
  city: string;
  address: string;
  arrival_time: string;
  departure_time: string;
  stop_order: number;
  day_number?: number;
}

interface MultiDayItineraryViewProps {
  stops: ItineraryStop[];
  startDate: Date;
  endDate: Date;
}

export function MultiDayItineraryView({ stops, startDate, endDate }: MultiDayItineraryViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  // Calculate number of days
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Group stops by day
  const stopsByDay = new Map<number, ItineraryStop[]>();
  for (let day = 1; day <= dayCount; day++) {
    stopsByDay.set(day, []);
  }

  stops.forEach((stop) => {
    const day = stop.day_number || 1;
    const dayStops = stopsByDay.get(day) || [];
    dayStops.push(stop);
    stopsByDay.set(day, dayStops);
  });

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const expandAll = () => {
    const allDays = new Set<number>();
    for (let day = 1; day <= dayCount; day++) {
      allDays.add(day);
    }
    setExpandedDays(allDays);
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  const formatDayDate = (dayNumber: number) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          <span className="text-lg">🗓️</span>
          {dayCount}-Day Itinerary
        </h2>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Guideline Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Please Note:</span> This itinerary is a guideline.
          The final order of winery visits will be confirmed by your tour guide based on actual
          appointment times and availability.
        </p>
      </div>

      <div className="divide-y divide-stone-100">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
          const dayStops = stopsByDay.get(day) || [];
          const isExpanded = expandedDays.has(day);

          return (
            <div key={day}>
              {/* Day Header - Clickable */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {day}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-stone-900">Day {day}</h3>
                    <p className="text-sm text-stone-600">{formatDayDate(day)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-stone-500">
                    {dayStops.length} {dayStops.length === 1 ? 'stop' : 'stops'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-stone-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Day Stops - Collapsible */}
              {isExpanded && (
                <div className="p-4 space-y-3 bg-white">
                  {dayStops.length > 0 ? (
                    dayStops
                      .sort((a, b) => a.stop_order - b.stop_order)
                      .map((stop) => (
                        <div
                          key={stop.id}
                          className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg"
                        >
                          <div className="w-7 h-7 bg-[#8B1538]/10 text-[#8B1538] rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                            {stop.stop_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-stone-900 truncate">
                              {stop.name}
                            </h4>
                            <p className="text-stone-600 text-sm truncate">
                              {stop.address}, {stop.city}
                            </p>
                            {stop.arrival_time && stop.departure_time && (
                              <p className="text-stone-500 text-sm mt-1">
                                {stop.arrival_time} - {stop.departure_time}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-6 text-stone-500">
                      <p className="text-sm">Itinerary to be finalized</p>
                      <p className="text-xs mt-1">
                        Our team will work with you to plan this day
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-stone-100 grid grid-cols-2 gap-3">
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-medium text-sm transition-colors"
        >
          Print
        </button>
        <button
          onClick={() => {
            // Would trigger PDF download
            alert('PDF download coming soon');
          }}
          className="px-4 py-2.5 bg-[#8B1538] hover:bg-[#722F37] text-white rounded-lg font-medium text-sm transition-colors"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
